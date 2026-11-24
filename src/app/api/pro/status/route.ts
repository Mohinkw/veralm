import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/request';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const [row] = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        proExpiresAt: users.proExpiresAt,
      })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);

    const isPro =
      row?.subscriptionTier === 'pro' &&
      (!row.proExpiresAt || new Date(row.proExpiresAt).getTime() > Date.now());

    const res = NextResponse.json({
      isPro,
      subscriptionTier: isPro ? 'pro' : 'free',
      proExpiresAt: row?.proExpiresAt || null,
    });

    // Lightweight server-readable cookies so RSC article reader can recognize signed-in / Pro members
    res.cookies.set('veralm_reader_uid', auth.user.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    if (isPro) {
      res.cookies.set('veralm_pro_uid', auth.user.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    } else {
      res.cookies.delete('veralm_pro_uid');
    }

    return res;
  } catch (err) {
    console.error('[Pro Status] Error:', err);
    return NextResponse.json({ isPro: false, subscriptionTier: 'free', proExpiresAt: null });
  }
}
