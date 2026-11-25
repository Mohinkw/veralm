import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { auditLog, creatorPayoutMethods, creatorProfiles, users } from '@/db/schema';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const rows = await db
      .select({
        id: creatorProfiles.id,
        userId: creatorProfiles.userId,
        displayName: creatorProfiles.displayName,
        slug: creatorProfiles.slug,
        email: users.email,
        primaryCategories: creatorProfiles.primaryCategories,
        reputationTier: creatorProfiles.reputationTier,
        totalArticlesApproved: creatorProfiles.totalArticlesApproved,
        totalQueryContributions: creatorProfiles.totalQueryContributions,
        totalLifetimeEarnings: creatorProfiles.totalLifetimeEarnings,
        stripeAccountId: creatorProfiles.stripeAccountId,
        isActive: creatorProfiles.isActive,
        createdAt: creatorProfiles.createdAt,
        payoutMethodsCount: sql<number>`(
          SELECT count(*)::int FROM creator_payout_methods cpm WHERE cpm.creator_id = ${creatorProfiles.id}
        )`,
      })
      .from(creatorProfiles)
      .innerJoin(users, eq(creatorProfiles.userId, users.id))
      .orderBy(desc(creatorProfiles.createdAt))
      .limit(200);

    return NextResponse.json(
      { creators: rows },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Admin Creators GET] Error:', err);
    return NextResponse.json({ error: 'Could not load creators.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const creatorId = typeof body.creatorId === 'string' ? body.creatorId.trim() : '';
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : null;

    if (!creatorId || isActive === null) {
      return NextResponse.json({ error: 'creatorId and isActive are required.' }, { status: 400 });
    }

    const [updated] = await db
      .update(creatorProfiles)
      .set({
        isActive,
        suspendedAt: isActive ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creatorProfiles.id, creatorId))
      .returning({ id: creatorProfiles.id, isActive: creatorProfiles.isActive });

    if (!updated) {
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }

    await db.insert(auditLog).values({
      actorId: auth.account.id,
      actorRole: 'admin',
      action: isActive ? 'admin.creator_activated' : 'admin.creator_suspended',
      entityType: 'creator_profiles',
      entityId: creatorId,
      metadata: { isActive },
    });

    return NextResponse.json({ creator: updated });
  } catch (err) {
    console.error('[Admin Creators PATCH] Error:', err);
    return NextResponse.json({ error: 'Could not update creator status.' }, { status: 500 });
  }
}
