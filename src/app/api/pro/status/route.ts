import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/request';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { signSessionCookie } from '@/lib/citation-token';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    let [row] = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        proExpiresAt: users.proExpiresAt,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);

    // Auto-provision public.users record for newly registered Supabase Auth members
    if (!row) {
      const safeEmail = auth.user.email || `${auth.user.id}@veralm.user`;
      await db
        .insert(users)
        .values({
          id: auth.user.id,
          email: safeEmail,
          role: 'creator',
          isActive: true,
        })
        .onConflictDoNothing();

      [row] = await db
        .select({
          subscriptionTier: users.subscriptionTier,
          proExpiresAt: users.proExpiresAt,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, auth.user.id))
        .limit(1);
    }

    const isAdmin = Boolean(row?.isActive && ['admin', 'superadmin'].includes(row.role));
    const isPro =
      Boolean(row?.isActive !== false) &&
      (isAdmin ||
        (row?.subscriptionTier === 'pro' &&
          (!row.proExpiresAt || new Date(row.proExpiresAt).getTime() > Date.now())));

    const res = NextResponse.json(
      {
        isPro,
        isAdmin,
        subscriptionTier: isPro ? 'pro' : 'free',
        proExpiresAt: row?.proExpiresAt || null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );

    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    };

    // Cryptographically signed cookies so RSC reader verifies real authenticated sessions
    res.cookies.set('veralm_reader_uid', signSessionCookie(auth.user.id), cookieOpts);
    if (isPro) {
      res.cookies.set('veralm_pro_uid', signSessionCookie(auth.user.id), cookieOpts);
    } else {
      res.cookies.delete('veralm_pro_uid');
    }

    return res;
  } catch (err) {
    console.error('[Pro Status] Error:', err);
    return NextResponse.json(
      { error: 'Unable to determine subscription status.' },
      { status: 500 }
    );
  }
}

/**
 * Clears session reader/pro cookies cleanly on sign-out.
 */
export async function DELETE() {
  const res = NextResponse.json({ cleared: true });
  res.cookies.delete('veralm_reader_uid');
  res.cookies.delete('veralm_pro_uid');
  return res;
}
