import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiKeys } from '@/db/schema';
import { isValidUuid, parseJsonObject, requireUser } from '@/lib/auth/request';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        tier: apiKeys.tier,
        monthlyQuota: apiKeys.monthlyQuota,
        requestsUsed: apiKeys.requestsUsed,
        isActive: apiKeys.isActive,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, auth.user.id))
      .orderBy(desc(apiKeys.createdAt))
      .limit(20);

    return NextResponse.json({ keys }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('[Developer Keys GET] Error:', err);
    return NextResponse.json({ error: 'Could not load API keys.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  const rawName = typeof parsed.data.name === 'string' ? parsed.data.name.trim() : '';
  if (rawName.length < 2 || rawName.length > 60) {
    return NextResponse.json({ error: 'Key name must be 2 to 60 characters.' }, { status: 400 });
  }

  try {
    const existing = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, auth.user.id), eq(apiKeys.isActive, true)));

    if (existing.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 active API keys reached. Revoke an unused key first.' },
        { status: 400 }
      );
    }

    const rawKey = `vlm_live_${crypto.randomBytes(12).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 15);

    const [created] = await db
      .insert(apiKeys)
      .values({
        userId: auth.user.id,
        name: rawName,
        keyHash,
        keyPrefix,
        tier: 'free',
        monthlyQuota: 1000,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        tier: apiKeys.tier,
        monthlyQuota: apiKeys.monthlyQuota,
        requestsUsed: apiKeys.requestsUsed,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
      });

    return NextResponse.json(
      { key: created, rawKey },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Developer Keys POST] Error:', err);
    return NextResponse.json({ error: 'Could not create API key.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const id = request.nextUrl.searchParams.get('id')?.trim() || '';
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Valid key id is required.' }, { status: 400 });
  }

  try {
    const deleted = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, auth.user.id)))
      .returning({ id: apiKeys.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
    }

    return NextResponse.json({ revoked: true, id });
  } catch (err) {
    console.error('[Developer Keys DELETE] Error:', err);
    return NextResponse.json({ error: 'Could not revoke API key.' }, { status: 500 });
  }
}
