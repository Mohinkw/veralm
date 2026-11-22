import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type Db = ReturnType<typeof createServerClient>;
type Fail = { error: NextResponse };

export function bearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1] ?? null;
}

export async function requireUser(request: NextRequest): Promise<Fail | { db: Db; user: { id: string; email: string | null } }> {
  const token = bearerToken(request);
  if (!token) return { error: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };
  const db = createServerClient();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return { error: NextResponse.json({ error: 'Invalid session.' }, { status: 401 }) };
  return { db, user: { id: user.id, email: user.email ?? null } };
}

export async function requireCreator(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth;
  const { data: account } = await auth.db.from('users').select('is_active').eq('id', auth.user.id).maybeSingle();
  if (account && account.is_active === false) return { error: NextResponse.json({ error: 'Account disabled.' }, { status: 403 }) } as Fail;
  const { data: profile, error } = await auth.db.from('creator_profiles')
    .select('id, is_active').eq('user_id', auth.user.id).maybeSingle();
  if (error) return { error: NextResponse.json({ error: 'Could not load creator profile.' }, { status: 500 }) } as Fail;
  if (!profile) return { error: NextResponse.json({ error: 'Creator profile not found. Complete the creator application.' }, { status: 404 }) } as Fail;
  if (!profile.is_active) return { error: NextResponse.json({ error: 'Creator account suspended.' }, { status: 403 }) } as Fail;
  return { ...auth, creatorId: profile.id as string };
}

export async function currentAgreementId(db: Db, creatorId: string) {
  const { data } = await db.from('licensing_agreements').select('id')
    .eq('creator_id', creatorId).eq('is_current', true).is('revoked_at', null)
    .order('agreed_at', { ascending: false }).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
