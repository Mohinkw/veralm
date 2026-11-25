import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { auditLog, platformRevenue } from '@/db/schema';
import { requireAdmin } from '@/lib/admin/auth';
import { executeCreatorPayouts } from '@/lib/revenue/payouts';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const rows = await db
      .select()
      .from(platformRevenue)
      .orderBy(desc(platformRevenue.revenuePeriod))
      .limit(36);

    return NextResponse.json(
      { revenue: rows },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Admin Revenue GET] Error:', err);
    return NextResponse.json({ error: 'Could not load revenue history.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'distribute') {
      const period = typeof body.period === 'string' && /^\d{4}-\d{2}$/.test(body.period)
        ? body.period
        : undefined;
      const summary = await executeCreatorPayouts({
        period,
        actorId: auth.account.id,
      });
      return NextResponse.json({ summary });
    }

    const revenuePeriod = typeof body.revenuePeriod === 'string' ? body.revenuePeriod.trim() : '';
    if (!/^\d{4}-\d{2}$/.test(revenuePeriod)) {
      return NextResponse.json({ error: 'revenuePeriod must be YYYY-MM.' }, { status: 400 });
    }

    const subscriptionRevenue = Math.max(0, Number(body.subscriptionRevenue || 0));
    const adRevenue = Math.max(0, Number(body.adRevenue || 0));
    const infrastructureCost = Math.max(0, Number(body.infrastructureCost ?? 45));
    const grossRevenue = subscriptionRevenue + adRevenue;
    const netDistributable = Math.max(0, grossRevenue - infrastructureCost);
    const creatorPool = netDistributable * 0.9;
    const creatorPoolPct = grossRevenue > 0 ? (creatorPool / grossRevenue) * 100 : 0;

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
      actorRole: 'admin',
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
