import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/request';
import { db } from '@/db/client';
import { creatorEarnings, creatorProfiles } from '@/db/schema';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const [profile] = await db
      .select({
        id: creatorProfiles.id,
        totalLifetimeEarnings: creatorProfiles.totalLifetimeEarnings,
        minimumPayout: creatorProfiles.minimumPayout,
        paymentEmail: creatorProfiles.paymentEmail,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, auth.user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({
        earnings: [],
        summary: {
          lifetimePaid: 0,
          minimumPayout: 50,
          paymentEmail: auth.user.email || null,
        },
      });
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

    return NextResponse.json({
      earnings: rows,
      summary: {
        lifetimePaid: Number(profile.totalLifetimeEarnings || 0),
        minimumPayout: Number(profile.minimumPayout || 50),
        paymentEmail: profile.paymentEmail || auth.user.email || null,
      },
    });
  } catch (err) {
    console.error('[Creator Earnings GET] Error:', err);
    return NextResponse.json({ error: 'Could not load earnings history.' }, { status: 500 });
  }
}
