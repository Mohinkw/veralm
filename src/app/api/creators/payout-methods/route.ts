import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { isValidUuid, parseJsonObject, requireCreator } from '@/lib/auth/request';
import { db } from '@/db/client';
import { creatorPayoutMethods, creatorProfiles } from '@/db/schema';

const ALLOWED_TYPES = new Set([
  'stripe_connect',
  'payoneer',
  'wise',
  'paypal',
  'bank_wire',
  'crypto',
]);

type PayoutMethodType =
  | 'stripe_connect'
  | 'payoneer'
  | 'wise'
  | 'paypal'
  | 'bank_wire'
  | 'crypto';

function sanitizeDetails(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 8)) {
    if (typeof v === 'string' && v.trim()) {
      out[k.slice(0, 40)] = v.trim().slice(0, 120);
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  try {
    const [profile] = await db
      .select({
        id: creatorProfiles.id,
        minimumPayout: creatorProfiles.minimumPayout,
        paymentEmail: creatorProfiles.paymentEmail,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.id, auth.creatorId))
      .limit(1);

    const methods = await db
      .select()
      .from(creatorPayoutMethods)
      .where(eq(creatorPayoutMethods.creatorId, auth.creatorId))
      .orderBy(desc(creatorPayoutMethods.isDefault), desc(creatorPayoutMethods.createdAt));

    return NextResponse.json(
      {
        methods,
        minimumPayout: Number(profile?.minimumPayout || '50'),
        paymentEmail: profile?.paymentEmail || auth.user.email || null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[PayoutMethods GET] Error:', err);
    return NextResponse.json({ error: 'Could not load payout methods.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  try {
    const body = parsed.data;
    const methodType = body.methodType as PayoutMethodType;
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const accountIdentifier =
      typeof body.accountIdentifier === 'string' ? body.accountIdentifier.trim() : '';
    const currency =
      typeof body.currency === 'string' && body.currency.trim()
        ? body.currency.trim().toUpperCase().slice(0, 6)
        : 'USD';
    const isDefault = Boolean(body.isDefault);
    const detailsJson = sanitizeDetails(body.details);

    if (!ALLOWED_TYPES.has(methodType)) {
      return NextResponse.json({ error: 'Invalid payment method type.' }, { status: 400 });
    }
    if (!label || label.length > 80) {
      return NextResponse.json({ error: 'Label is required (max 80 chars).' }, { status: 400 });
    }
    if (!accountIdentifier || accountIdentifier.length > 160) {
      return NextResponse.json(
        { error: 'Account email, ID, or number is required.' },
        { status: 400 }
      );
    }

    const created = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: creatorPayoutMethods.id })
        .from(creatorPayoutMethods)
        .where(eq(creatorPayoutMethods.creatorId, auth.creatorId));

      const shouldBeDefault = isDefault || existing.length === 0;

      if (shouldBeDefault) {
        await tx
          .update(creatorPayoutMethods)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(creatorPayoutMethods.creatorId, auth.creatorId));
      }

      const [inserted] = await tx
        .insert(creatorPayoutMethods)
        .values({
          creatorId: auth.creatorId,
          methodType,
          label,
          accountIdentifier,
          currency,
          detailsJson,
          isDefault: shouldBeDefault,
        })
        .returning();

      if (shouldBeDefault && accountIdentifier.includes('@')) {
        await tx
          .update(creatorProfiles)
          .set({ paymentEmail: accountIdentifier, updatedAt: new Date() })
          .where(eq(creatorProfiles.id, auth.creatorId));
      }

      return inserted;
    });

    return NextResponse.json({ method: created }, { status: 201 });
  } catch (err) {
    console.error('[PayoutMethods POST] Error:', err);
    return NextResponse.json({ error: 'Could not save payout method.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  try {
    const methodId = parsed.data.id;
    if (!isValidUuid(methodId)) {
      return NextResponse.json({ error: 'Valid method ID is required.' }, { status: 400 });
    }

    const updated = await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: creatorPayoutMethods.id })
        .from(creatorPayoutMethods)
        .where(
          and(
            eq(creatorPayoutMethods.id, methodId),
            eq(creatorPayoutMethods.creatorId, auth.creatorId)
          )
        )
        .limit(1);

      if (!target) return null;

      await tx
        .update(creatorPayoutMethods)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(creatorPayoutMethods.creatorId, auth.creatorId));

      const [row] = await tx
        .update(creatorPayoutMethods)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(
          and(
            eq(creatorPayoutMethods.id, methodId),
            eq(creatorPayoutMethods.creatorId, auth.creatorId)
          )
        )
        .returning();

      return row;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Payout method not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, method: updated });
  } catch (err) {
    console.error('[PayoutMethods PATCH] Error:', err);
    return NextResponse.json({ error: 'Could not update default method.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  try {
    const methodId = request.nextUrl.searchParams.get('id') || '';
    if (!isValidUuid(methodId)) {
      return NextResponse.json({ error: 'Valid method ID is required.' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(creatorPayoutMethods)
      .where(
        and(
          eq(creatorPayoutMethods.id, methodId),
          eq(creatorPayoutMethods.creatorId, auth.creatorId)
        )
      )
      .returning({ id: creatorPayoutMethods.id, wasDefault: creatorPayoutMethods.isDefault });

    if (!deleted) {
      return NextResponse.json({ error: 'Payout method not found.' }, { status: 404 });
    }

    // Reassign default if the deleted method was active default
    if (deleted.wasDefault) {
      const [nextMethod] = await db
        .select({ id: creatorPayoutMethods.id })
        .from(creatorPayoutMethods)
        .where(eq(creatorPayoutMethods.creatorId, auth.creatorId))
        .orderBy(desc(creatorPayoutMethods.createdAt))
        .limit(1);

      if (nextMethod) {
        await db
          .update(creatorPayoutMethods)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(creatorPayoutMethods.id, nextMethod.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PayoutMethods DELETE] Error:', err);
    return NextResponse.json({ error: 'Could not remove payout method.' }, { status: 500 });
  }
}
