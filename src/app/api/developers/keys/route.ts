import crypto from 'crypto';
import net from 'net';
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiCreditTransactions, apiKeys, users } from '@/db/schema';
import {
  FREE_HOURLY_LIMIT,
  FREE_MONTHLY_QUOTA,
  PAYG_HOURLY_LIMIT,
  PRO_HOURLY_LIMIT,
  PRO_MONTHLY_QUOTA,
  type ApiScope,
} from '@/lib/api-key-auth';
import { bearerToken, isValidUuid, parseJsonObject, requireUser } from '@/lib/auth/request';
import { createServerClient } from '@/lib/supabase';

const VALID_SCOPES: ApiScope[] = ['ground:read', 'chat:write', 'mcp:read'];

function sanitizeScopes(raw: unknown): ApiScope[] {
  if (!Array.isArray(raw)) return [...VALID_SCOPES];
  const filtered = raw.filter(
    (s): s is ApiScope => typeof s === 'string' && (VALID_SCOPES as string[]).includes(s)
  );
  return filtered.length > 0 ? Array.from(new Set(filtered)) : [...VALID_SCOPES];
}

function sanitizeAllowedIps(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return [];
  const items = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const ip = item.trim();
    if (!ip) continue;
    if (net.isIP(ip) === 0) return null;
    if (!out.includes(ip)) out.push(ip);
    if (out.length >= 10) break;
  }
  return out;
}

async function touchUserLastSignIn(userId: string, email: string | null) {
  const now = new Date();
  await db
    .insert(users)
    .values({
      id: userId,
      email: email || `${userId}@veralm.user`,
      role: 'creator',
      lastSignIn: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { lastSignIn: now, updatedAt: now },
    });
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    await touchUserLastSignIn(auth.user.id, auth.user.email);

    const [[accountRow], keys, transactions] = await Promise.all([
      db
        .select({
          subscriptionTier: users.subscriptionTier,
          proExpiresAt: users.proExpiresAt,
          apiCreditBalanceCents: users.apiCreditBalanceCents,
          isActive: users.isActive,
          lastSignIn: users.lastSignIn,
        })
        .from(users)
        .where(eq(users.id, auth.user.id))
        .limit(1),
      db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          tier: apiKeys.tier,
          monthlyQuota: apiKeys.monthlyQuota,
          requestsUsed: apiKeys.requestsUsed,
          hourlyRequestsUsed: apiKeys.hourlyRequestsUsed,
          scopes: apiKeys.scopes,
          allowedIps: apiKeys.allowedIps,
          expiresAt: apiKeys.expiresAt,
          lastUsedIp: apiKeys.lastUsedIp,
          disabledReason: apiKeys.disabledReason,
          isActive: apiKeys.isActive,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.userId, auth.user.id))
        .orderBy(desc(apiKeys.createdAt))
        .limit(20),
      db
        .select({
          id: apiCreditTransactions.id,
          amountCents: apiCreditTransactions.amountCents,
          balanceAfterCents: apiCreditTransactions.balanceAfterCents,
          txType: apiCreditTransactions.txType,
          description: apiCreditTransactions.description,
          createdAt: apiCreditTransactions.createdAt,
        })
        .from(apiCreditTransactions)
        .where(eq(apiCreditTransactions.userId, auth.user.id))
        .orderBy(desc(apiCreditTransactions.createdAt))
        .limit(15),
    ]);

    const now = new Date();
    const isPro =
      accountRow?.subscriptionTier === 'pro' &&
      (!accountRow.proExpiresAt || accountRow.proExpiresAt > now);

    return NextResponse.json(
      {
        keys,
        transactions,
        account: {
          plan: isPro ? 'pro' : 'free',
          creditBalanceCents: accountRow?.apiCreditBalanceCents ?? 0,
          hourlyLimit: isPro ? PRO_HOURLY_LIMIT : FREE_HOURLY_LIMIT,
          monthlyLimit: isPro ? PRO_MONTHLY_QUOTA : FREE_MONTHLY_QUOTA,
          paygHourlyLimit: PAYG_HOURLY_LIMIT,
          lastSignIn: accountRow?.lastSignIn ?? now,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Developer Keys GET] Error:', err);
    return NextResponse.json({ error: 'Could not load API keys.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  // Enforce verified account before minting API keys
  const token = bearerToken(request);
  if (token) {
    const sb = createServerClient();
    const { data } = await sb.auth.getUser(token);
    const sbUser = data.user;
    if (!sbUser || (!sbUser.email_confirmed_at && !sbUser.confirmed_at)) {
      return NextResponse.json(
        { error: 'Please verify your account email before generating API keys.' },
        { status: 403 }
      );
    }
  }

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  const rawName = typeof parsed.data.name === 'string' ? parsed.data.name.trim() : '';
  if (rawName.length < 2 || rawName.length > 60) {
    return NextResponse.json({ error: 'Key name must be 2 to 60 characters.' }, { status: 400 });
  }

  const allowedIps = sanitizeAllowedIps(parsed.data.allowedIps);
  if (allowedIps === null) {
    return NextResponse.json(
      { error: 'allowedIps must contain valid IPv4 or IPv6 addresses only.' },
      { status: 400 }
    );
  }

  const scopes = sanitizeScopes(parsed.data.scopes);
  const rawExpDays = parsed.data.expiresInDays;
  let expiresAt: Date | null = null;
  if (rawExpDays !== undefined && rawExpDays !== null && rawExpDays !== '') {
    const days = Number(rawExpDays);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return NextResponse.json(
        { error: 'expiresInDays must be between 1 and 3650 days.' },
        { status: 400 }
      );
    }
    expiresAt = new Date(Date.now() + Math.floor(days) * 24 * 60 * 60 * 1000);
  }

  try {
    await touchUserLastSignIn(auth.user.id, auth.user.email);

    const [accountRow] = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        proExpiresAt: users.proExpiresAt,
        apiCreditBalanceCents: users.apiCreditBalanceCents,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);

    if (accountRow && !accountRow.isActive) {
      return NextResponse.json({ error: 'Suspended accounts cannot create API keys.' }, { status: 403 });
    }

    const now = new Date();
    const isPro =
      accountRow?.subscriptionTier === 'pro' &&
      (!accountRow.proExpiresAt || accountRow.proExpiresAt > now);
    const requestedTier = parsed.data.tier === 'payg' ? 'payg' : isPro ? 'pro' : 'free';

    if (requestedTier === 'payg' && (accountRow?.apiCreditBalanceCents ?? 0) <= 0) {
      return NextResponse.json(
        { error: 'Load funds into your Pay-As-You-Go API wallet before creating a Paid API key.' },
        { status: 402 }
      );
    }

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

    // 192-bit high-entropy key with detectable prefix for secret scanners
    const rawKey = `vlm_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 16);
    const monthlyQuota =
      requestedTier === 'payg' ? 0 : requestedTier === 'pro' ? PRO_MONTHLY_QUOTA : FREE_MONTHLY_QUOTA;
    const nextMonthReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [created] = await db
      .insert(apiKeys)
      .values({
        userId: auth.user.id,
        name: rawName,
        keyHash,
        keyPrefix,
        tier: requestedTier,
        monthlyQuota,
        scopes,
        allowedIps,
        expiresAt,
        quotaResetAt: nextMonthReset,
        hourlyWindowStart: new Date(Math.floor(now.getTime() / (60 * 60 * 1000)) * 60 * 60 * 1000),
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        tier: apiKeys.tier,
        monthlyQuota: apiKeys.monthlyQuota,
        requestsUsed: apiKeys.requestsUsed,
        scopes: apiKeys.scopes,
        allowedIps: apiKeys.allowedIps,
        expiresAt: apiKeys.expiresAt,
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

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  const id = typeof parsed.data.id === 'string' ? parsed.data.id.trim() : '';
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Valid key id is required.' }, { status: 400 });
  }

  try {
    await touchUserLastSignIn(auth.user.id, auth.user.email);

    const updates: Record<string, unknown> = {};
    let rotatedRawKey: string | undefined;

    if (typeof parsed.data.isActive === 'boolean') {
      updates.isActive = parsed.data.isActive;
      updates.disabledReason = parsed.data.isActive ? null : 'manual';
    }
    if (parsed.data.allowedIps !== undefined) {
      const ips = sanitizeAllowedIps(parsed.data.allowedIps);
      if (ips === null) {
        return NextResponse.json({ error: 'Invalid IP address in allowlist.' }, { status: 400 });
      }
      updates.allowedIps = ips;
    }
    if (parsed.data.scopes !== undefined) {
      updates.scopes = sanitizeScopes(parsed.data.scopes);
    }
    if (parsed.data.rotate === true) {
      rotatedRawKey = `vlm_live_${crypto.randomBytes(24).toString('hex')}`;
      updates.keyHash = crypto.createHash('sha256').update(rotatedRawKey).digest('hex');
      updates.keyPrefix = rotatedRawKey.slice(0, 16);
      updates.isActive = true;
      updates.disabledReason = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid update fields supplied.' }, { status: 400 });
    }

    const [updated] = await db
      .update(apiKeys)
      .set(updates)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, auth.user.id)))
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        tier: apiKeys.tier,
        isActive: apiKeys.isActive,
        disabledReason: apiKeys.disabledReason,
        scopes: apiKeys.scopes,
        allowedIps: apiKeys.allowedIps,
      });

    if (!updated) {
      return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { key: updated, ...(rotatedRawKey ? { rawKey: rotatedRawKey } : {}) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Developer Keys PATCH] Error:', err);
    return NextResponse.json({ error: 'Could not update API key.' }, { status: 500 });
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
