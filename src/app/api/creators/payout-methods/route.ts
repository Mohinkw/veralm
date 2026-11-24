import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/request';
import { db } from '@/db/client';
import { creatorPayoutMethods, creatorProfiles, users } from '@/db/schema';

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

async function getOrCreateCreatorProfile(userId: string, email?: string | null) {
  const [existing] = await db
    .select({
      id: creatorProfiles.id,
      minimumPayout: creatorProfiles.minimumPayout,
      paymentEmail: creatorProfiles.paymentEmail,
    })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);

  if (existing) return existing;

  const safeEmail = email || `${userId}@veralm.user`;
  await db
    .insert(users)
    .values({ id: userId, email: safeEmail, role: 'creator', isActive: true })
    .onConflictDoNothing();

  const displayName = safeEmail.split('@')[0] || 'Creator';
  const slugBase =
    displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
    'creator';

  const [created] = await db
    .insert(creatorProfiles)
    .values({
      userId,
      displayName,
      slug: `${slugBase}-${userId.slice(0, 8)}`,
      bio: 'Verified contributor on VeraLM Knowledge Vault.',
      primaryCategories: ['Technology'],
      paymentEmail: email || null,
      onboardingCompleted: true,
      isActive: true,
    })
    .returning({
      id: creatorProfiles.id,
      minimumPayout: creatorProfiles.minimumPayout,
      paymentEmail: creatorProfiles.paymentEmail,
    });

  return created;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const profile = await getOrCreateCreatorProfile(auth.user.id, auth.user.email);
    const methods = await db
      .select()
      .from(creatorPayoutMethods)
      .where(eq(creatorPayoutMethods.creatorId, profile.id))
      .orderBy(desc(creatorPayoutMethods.isDefault), desc(creatorPayoutMethods.createdAt));

    return NextResponse.json({
      methods,
      minimumPayout: Number(profile.minimumPayout || '50'),
      paymentEmail: profile.paymentEmail,
    });
  } catch (err) {
    console.error('[PayoutMethods GET] Error:', err);
    return NextResponse.json({ error: 'Could not load payout methods.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const methodType = body.methodType as PayoutMethodType;
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const accountIdentifier =
      typeof body.accountIdentifier === 'string' ? body.accountIdentifier.trim() : '';
    const currency =
      typeof body.currency === 'string' && body.currency.trim()
        ? body.currency.trim().toUpperCase().slice(0, 6)
        : 'USD';
    const isDefault = Boolean(body.isDefault);
    const detailsJson =
      body.details && typeof body.details === 'object' ? body.details : {};

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

    const profile = await getOrCreateCreatorProfile(auth.user.id, auth.user.email);

    const existingCountRes = await db
      .select({ id: creatorPayoutMethods.id })
      .from(creatorPayoutMethods)
      .where(eq(creatorPayoutMethods.creatorId, profile.id));

    const shouldBeDefault = isDefault || existingCountRes.length === 0;

    const created = await db.transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx
          .update(creatorPayoutMethods)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(creatorPayoutMethods.creatorId, profile.id));
      }

      const [inserted] = await tx
        .insert(creatorPayoutMethods)
        .values({
          creatorId: profile.id,
          methodType,
          label,
          accountIdentifier,
          currency,
          detailsJson,
          isDefault: shouldBeDefault,
        })
        .returning();

      if (accountIdentifier.includes('@')) {
        await tx
          .update(creatorProfiles)
          .set({ paymentEmail: accountIdentifier, updatedAt: new Date() })
          .where(eq(creatorProfiles.id, profile.id));
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
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const methodId = typeof body.id === 'string' ? body.id : '';
    if (!methodId) {
      return NextResponse.json({ error: 'Method ID is required.' }, { status: 400 });
    }

    const profile = await getOrCreateCreatorProfile(auth.user.id, auth.user.email);

    await db.transaction(async (tx) => {
      await tx
        .update(creatorPayoutMethods)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(creatorPayoutMethods.creatorId, profile.id));

      await tx
        .update(creatorPayoutMethods)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(
          and(
            eq(creatorPayoutMethods.id, methodId),
            eq(creatorPayoutMethods.creatorId, profile.id)
          )
        );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PayoutMethods PATCH] Error:', err);
    return NextResponse.json({ error: 'Could not update default method.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const methodId = request.nextUrl.searchParams.get('id') || '';
    if (!methodId) {
      return NextResponse.json({ error: 'Method ID is required.' }, { status: 400 });
    }

    const profile = await getOrCreateCreatorProfile(auth.user.id, auth.user.email);

    await db
      .delete(creatorPayoutMethods)
      .where(
        and(
          eq(creatorPayoutMethods.id, methodId),
          eq(creatorPayoutMethods.creatorId, profile.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PayoutMethods DELETE] Error:', err);
    return NextResponse.json({ error: 'Could not remove payout method.' }, { status: 500 });
  }
}
