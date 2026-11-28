import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  auditLog,
  creatorEarnings,
  creatorPayoutMethods,
  creatorProfiles,
  platformRevenue,
} from '@/db/schema';
import { requireAdmin } from '@/lib/admin/auth';
import { isValidUuid, parseJsonObject } from '@/lib/auth/request';
import { executeCreatorPayouts } from '@/lib/revenue/payouts';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const rows = await db
      .select()
      .from(platformRevenue)
      .orderBy(desc(platformRevenue.revenuePeriod))
      .limit(36);

    let pendingPayouts: Array<{
      earningId: string;
      creatorId: string;
      displayName: string;
      revenuePeriod: string;
      netEarnings: string;
      methodType: string;
      accountReference: string | null;
      currency: string;
    }> = [];

    if (request.nextUrl.searchParams.get('pending_batch') === '1') {
      pendingPayouts = await db
        .select({
          earningId: creatorEarnings.id,
          creatorId: creatorEarnings.creatorId,
          displayName: creatorProfiles.displayName,
          revenuePeriod: creatorEarnings.revenuePeriod,
          netEarnings: creatorEarnings.creatorNetEarnings,
          methodType: creatorPayoutMethods.methodType,
          accountReference: creatorPayoutMethods.accountIdentifier,
          currency: creatorPayoutMethods.currency,
        })
        .from(creatorEarnings)
        .innerJoin(creatorProfiles, eq(creatorEarnings.creatorId, creatorProfiles.id))
        .innerJoin(
          creatorPayoutMethods,
          and(
            eq(creatorPayoutMethods.creatorId, creatorProfiles.id),
            eq(creatorPayoutMethods.isDefault, true),
            ne(creatorPayoutMethods.methodType, 'stripe_connect')
          )
        )
        .where(eq(creatorEarnings.status, 'pending_payout'))
        .orderBy(desc(creatorEarnings.revenuePeriod))
        .limit(200);
    }

    return NextResponse.json(
      { revenue: rows, pendingPayouts },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Admin Revenue GET] Error:', err);
    return NextResponse.json({ error: 'Could not load revenue history.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const parsed = await parseJsonObject(request);
    if ('error' in parsed) return parsed.error;
    const body = parsed.data;

    if (body.action === 'distribute') {
      let period: string | undefined;
      if (body.period !== undefined && body.period !== null && body.period !== '') {
        if (typeof body.period !== 'string' || !/^\d{4}-\d{2}$/.test(body.period.trim())) {
          return NextResponse.json({ error: 'period must be YYYY-MM.' }, { status: 400 });
        }
        period = body.period.trim();
      }
      const summary = await executeCreatorPayouts({
        period,
        actorId: auth.account.id,
      });
      return NextResponse.json({ summary });
    }

    if (body.action === 'mark_batch_settled') {
      const rawIds = Array.isArray(body.earningIds)
        ? body.earningIds.filter((id): id is string => typeof id === 'string' && isValidUuid(id))
        : [];
      if (rawIds.length === 0) {
        return NextResponse.json({ error: 'earningIds must contain at least one valid ID.' }, { status: 400 });
      }
      const settled = await db
        .update(creatorEarnings)
        .set({ status: 'paid', paidAt: new Date() })
        .where(and(inArray(creatorEarnings.id, rawIds), eq(creatorEarnings.status, 'pending_payout')))
        .returning({ id: creatorEarnings.id });

      await db.insert(auditLog).values({
        actorId: auth.account.id,
        actorRole: auth.account.role,
        action: 'admin.payout_batch_settled',
        entityType: 'creator_earnings',
        entityId: settled[0]?.id ?? null,
        metadata: { count: settled.length, earningIds: settled.map((s) => s.id) },
      });

      return NextResponse.json({ settledCount: settled.length });
    }

    const revenuePeriod = typeof body.revenuePeriod === 'string' ? body.revenuePeriod.trim() : '';
    if (!/^\d{4}-\d{2}$/.test(revenuePeriod)) {
      return NextResponse.json({ error: 'revenuePeriod must be YYYY-MM.' }, { status: 400 });
    }

    const rawSub = Number(body.subscriptionRevenue ?? 0);
    const rawAd = Number(body.adRevenue ?? 0);
    const rawInfra = Number(body.infrastructureCost ?? 45);
    if (!Number.isFinite(rawSub) || !Number.isFinite(rawAd) || !Number.isFinite(rawInfra)) {
      return NextResponse.json({ error: 'Revenue and cost amounts must be valid numbers.' }, { status: 400 });
    }

    const subscriptionRevenue = Math.max(0, rawSub);
    const adRevenue = Math.max(0, rawAd);
    const infrastructureCost = Math.max(0, rawInfra);
    const grossRevenue = subscriptionRevenue + adRevenue;
    const netDistributable = Math.max(0, grossRevenue - infrastructureCost);
    const creatorPool = netDistributable * 0.9;
    const creatorPoolPct = grossRevenue > 0 ? (creatorPool / grossRevenue) * 100 : 0;

    // Protect closed or audited revenue periods from silent mutation
    const [existing] = await db
      .select({ id: platformRevenue.id, status: platformRevenue.status })
      .from(platformRevenue)
      .where(eq(platformRevenue.revenuePeriod, revenuePeriod))
      .limit(1);

    if (existing && (existing.status === 'closed' || existing.status === 'audited')) {
      return NextResponse.json(
        { error: `Revenue period ${revenuePeriod} is already ${existing.status}.` },
        { status: 409 }
      );
    }

    const [saved] = await db
      .insert(platformRevenue)
      .values({
        revenuePeriod,
        subscriptionRevenue: subscriptionRevenue.toFixed(4),
        adRevenue: adRevenue.toFixed(4),
        grossRevenue: grossRevenue.toFixed(4),
        infrastructureCost: infrastructureCost.toFixed(4),
        creatorPool: creatorPool.toFixed(4),
        creatorPoolPct: creatorPoolPct.toFixed(2),
        status: 'open',
      })
      .onConflictDoUpdate({
        target: platformRevenue.revenuePeriod,
        set: {
          subscriptionRevenue: subscriptionRevenue.toFixed(4),
          adRevenue: adRevenue.toFixed(4),
          grossRevenue: grossRevenue.toFixed(4),
          infrastructureCost: infrastructureCost.toFixed(4),
          creatorPool: creatorPool.toFixed(4),
          creatorPoolPct: creatorPoolPct.toFixed(2),
          updatedAt: new Date(),
        },
      })
      .returning();

    await db.insert(auditLog).values({
      actorId: auth.account.id,
      actorRole: auth.account.role,
      action: 'admin.revenue_recorded',
      entityType: 'platform_revenue',
      entityId: saved.id,
      metadata: { revenuePeriod, grossRevenue, creatorPool },
    });

    return NextResponse.json({ record: saved });
  } catch (err) {
    console.error('[Admin Revenue POST] Error:', err);
    return NextResponse.json({ error: 'Could not save revenue record.' }, { status: 500 });
  }
}
