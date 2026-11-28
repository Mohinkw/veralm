import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type Db = ReturnType<typeof createServerClient>;
type Fail = { error: NextResponse };

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export async function parseJsonObject(
  request: NextRequest
): Promise<{ data: Record<string, unknown> } | { error: NextResponse }> {
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 }) };
    }
    return { data: parsed as Record<string, unknown> };
  } catch {
    return { error: NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 }) };
  }
}

export function bearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1] ?? null;
}

export async function requireUser(request: NextRequest): Promise<Fail | { db: Db; user: { id: string; email: string | null; fullName?: string | null } }> {
  const token = bearerToken(request);
  if (!token) return { error: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };
  const db = createServerClient();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return { error: NextResponse.json({ error: 'Invalid session.' }, { status: 401 }) };
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  return { db, user: { id: user.id, email: user.email ?? null, fullName } };
}

export async function requireCreator(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth;

  const { data: account } = await auth.db
    .from('users')
    .select('is_active')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (account && account.is_active === false) {
    return { error: NextResponse.json({ error: 'Account disabled.' }, { status: 403 }) } as Fail;
  }

  // Ensure public.users record exists without reactivating suspended accounts
  if (!account) {
    const safeEmail = auth.user.email || `${auth.user.id}@veralm.user`;
    await auth.db
      .from('users')
      .upsert(
        { id: auth.user.id, email: safeEmail, role: 'creator', is_active: true },
        { onConflict: 'id', ignoreDuplicates: true }
      );
  }

  let { data: profile, error } = await auth.db
    .from('creator_profiles')
    .select('id, is_active')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: 'Could not load creator profile.' }, { status: 500 }) } as Fail;
  }

  if (!profile) {
    const displayName = auth.user.fullName || auth.user.email?.split('@')[0] || 'Creator';
    const slugBase =
      displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'creator';
    const slug = `${slugBase}-${auth.user.id.slice(0, 8)}`;

    const { data: newProfile } = await auth.db
      .from('creator_profiles')
      .insert({
        user_id: auth.user.id,
        display_name: displayName,
        slug,
        bio: 'VeraLM Verified Knowledge Contributor',
        primary_categories: ['Technology'],
        onboarding_completed: true,
        is_active: true,
      })
      .select('id, is_active')
      .maybeSingle();

    if (newProfile) {
      profile = newProfile;
    } else {
      // Handle concurrent first-request race condition
      const retry = await auth.db
        .from('creator_profiles')
        .select('id, is_active')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      profile = retry.data;
    }
  }

  if (!profile) {
    return { error: NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 }) } as Fail;
  }
  if (!profile.is_active) {
    return { error: NextResponse.json({ error: 'Creator account suspended.' }, { status: 403 }) } as Fail;
  }

  return { ...auth, creatorId: profile.id as string };
}

export async function currentAgreementId(db: Db, creatorId: string) {
  const { data } = await db.from('licensing_agreements').select('id')
    .eq('creator_id', creatorId).eq('is_current', true).is('revoked_at', null)
    .order('agreed_at', { ascending: false }).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
