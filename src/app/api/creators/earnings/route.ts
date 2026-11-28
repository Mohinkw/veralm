import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { requireCreator } from '@/lib/auth/request';
import { db } from '@/db/client';
import { creatorEarnings, creatorProfiles } from '@/db/schema';

export async function GET(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  try {
    const [profile] = await db
      .select({
        id: creatorProfiles.id,
        totalLifetimeEarnings: creatorProfiles.totalLifetimeEarnings,
        minimumPayout: creatorProfiles.minimumPayout,
        paymentEmail: creatorProfiles.paymentEmail,
        reputationScore: creatorProfiles.reputationScore,
        reputationTier: creatorProfiles.reputationTier,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.id, auth.creatorId))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        {
          earnings: [],
          summary: {
            lifetimePaid: 0,
            minimumPayout: 50,
            paymentEmail: auth.user.email || null,
            reputationScore: 0,
            reputationTier: 'new',
          },
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const rows = await db
      .select({
        id: creatorEarnings.id,
        revenuePeriod: creatorEarnings.revenuePeriod,
        totalQueryContributions: creatorEarnings.totalQueryContributions,
        contributionSharePct: creatorEarnings.contributionSharePct,
        creatorGrossEarnings: creatorEarnings.creatorGrossEarnings,
        creatorNetEarnings: creatorEarnings.creatorNetEarnings,
        articleCount: creatorEarnings.articleCount,
        status: creatorEarnings.status,
        paidAt: creatorEarnings.paidAt,
        stripeTransferId: creatorEarnings.stripeTransferId,
        notes: creatorEarnings.notes,
      })
      .from(creatorEarnings)
      .where(eq(creatorEarnings.creatorId, profile.id))
      .orderBy(desc(creatorEarnings.revenuePeriod))
      .limit(36);

    return NextResponse.json(
      {
        earnings: rows,
        summary: {
          lifetimePaid: Number(profile.totalLifetimeEarnings || 0),
          minimumPayout: Number(profile.minimumPayout || 50),
          paymentEmail: profile.paymentEmail || auth.user.email || null,
          reputationScore: Number(profile.reputationScore || 0),
          reputationTier: profile.reputationTier || 'new',
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Creator Earnings GET] Error:', err);
    return NextResponse.json({ error: 'Could not load earnings history.' }, { status: 500 });
  }
}
