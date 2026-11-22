import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return { error: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };
  const { data: { user }, error } = await createServerClient().auth.getUser(token);
  if (error || !user) return { error: NextResponse.json({ error: 'Invalid session.' }, { status: 401 }) };
  const [account] = await db.select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users).where(eq(users.id, user.id));
  if (!account?.isActive || !['admin', 'superadmin'].includes(account.role)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }
  return { account };
}
