import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiCreditTransactions, apiKeys, users } from '@/db/schema';
import { extractClientIp } from '@/lib/rate-limit';

export type ApiScope = 'ground:read' | 'chat:write' | 'mcp:read';

export const FREE_MONTHLY_QUOTA = 500;
export const FREE_HOURLY_LIMIT = 3;
export const PRO_MONTHLY_QUOTA = 1000;
export const PRO_HOURLY_LIMIT = 10;
export const PAYG_HOURLY_LIMIT = 120;
export const API_REQUEST_COST_CENTS = 1; // $0.01 per Pay-As-You-Go API call
export const INACTIVITY_DISABLE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function extractApiKeyFromRequest(request: NextRequest): string {
  const authHeader = request.headers.get('authorization')?.trim() || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('vlm_live_')) return token;
  }
  const xKey = request.headers.get('x-api-key')?.trim() || '';
  return xKey.startsWith('vlm_live_') ? xKey : '';
}

export function resolvePlanLimits(opts: {
  subscriptionTier: string;
  proExpiresAt: Date | null;
  keyTier: string;
  now?: Date;
}): {
  plan: 'free' | 'pro' | 'payg';
  monthlyLimit: number | null;
  hourlyLimit: number;
} {
  const now = opts.now ?? new Date();
  if (opts.keyTier === 'payg') {
    return { plan: 'payg', monthlyLimit: null, hourlyLimit: PAYG_HOURLY_LIMIT };
  }
  const isPro =
    opts.subscriptionTier === 'pro' && (!opts.proExpiresAt || opts.proExpiresAt > now);
  if (isPro) {
    return { plan: 'pro', monthlyLimit: PRO_MONTHLY_QUOTA, hourlyLimit: PRO_HOURLY_LIMIT };
  }
  return { plan: 'free', monthlyLimit: FREE_MONTHLY_QUOTA, hourlyLimit: FREE_HOURLY_LIMIT };
}

export interface AuthenticatedApiKey {
  keyId: string;
  keyPrefix: string;
  userId: string;
  plan: 'free' | 'pro' | 'payg';
  billedToWallet: boolean;
  requestsUsed: number;
  monthlyLimit: number | null;
  hourlyUsed: number;
  hourlyLimit: number;
  creditBalanceCents: number;
  headers: Record<string, string>;
}

export async function authenticateAndMeterApiKey(
  request: NextRequest,
  requiredScope: ApiScope
): Promise<{ error: NextResponse } | { auth: AuthenticatedApiKey }> {
  const rawKey = extractApiKeyFromRequest(request);
  if (!rawKey) {
    return {
      error: NextResponse.json(
        { error: 'Missing or invalid API key. Pass Authorization: Bearer vlm_live_...' },
        { status: 401 }
      ),
    };
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const clientIp = extractClientIp(request);
  const now = new Date();

  const [row] = await db
    .select({
      key: apiKeys,
      user: {
        id: users.id,
        isActive: users.isActive,
        subscriptionTier: users.subscriptionTier,
        proExpiresAt: users.proExpiresAt,
        lastSignIn: users.lastSignIn,
        apiCreditBalanceCents: users.apiCreditBalanceCents,
      },
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) {
    return { error: NextResponse.json({ error: 'API key not found.' }, { status: 401 }) };
  }

  const { key, user } = row;
  if (!user.isActive) {
    return { error: NextResponse.json({ error: 'Account is suspended.' }, { status: 403 }) };
  }

  // 30-day account login inactivity auto-disable guardrail
  const lastLoginRef = user.lastSignIn ?? key.createdAt;
  if (now.getTime() - lastLoginRef.getTime() > INACTIVITY_DISABLE_MS) {
    if (key.isActive) {
      await db
        .update(apiKeys)
        .set({ isActive: false, disabledReason: 'inactive_account_30d' })
        .where(eq(apiKeys.id, key.id));
    }
    return {
      error: NextResponse.json(
        {
          error:
            'API key disabled: this account has not signed in within the last 30 days. Sign in to VeraLM to re-activate your key.',
          code: 'inactive_account_30d',
        },
        { status: 401 }
      ),
    };
  }

  if (!key.isActive) {
    return {
      error: NextResponse.json(
        {
          error:
            key.disabledReason === 'inactive_account_30d'
              ? 'API key disabled due to 30+ days of account inactivity. Re-enable it in /developers.'
              : 'API key is disabled or revoked.',
        },
        { status: 401 }
      ),
    };
  }

  if (key.expiresAt && key.expiresAt <= now) {
    return { error: NextResponse.json({ error: 'API key has expired.' }, { status: 401 }) };
  }

  if (Array.isArray(key.scopes) && !key.scopes.includes(requiredScope)) {
    return {
      error: NextResponse.json(
        { error: `API key lacks required scope: ${requiredScope}` },
        { status: 403 }
      ),
    };
  }

  if (Array.isArray(key.allowedIps) && key.allowedIps.length > 0) {
    if (!key.allowedIps.includes(clientIp)) {
      return {
        error: NextResponse.json(
          { error: 'Request IP is not authorized for this API key.' },
          { status: 403 }
        ),
      };
    }
  }

  // Compute current hourly and monthly usage with automatic window rollovers
  const hourElapsed = now.getTime() - key.hourlyWindowStart.getTime() >= 60 * 60 * 1000;
  const currentHourlyUsed = hourElapsed ? 0 : key.hourlyRequestsUsed;
  const nextHourlyStart = hourElapsed
    ? new Date(Math.floor(now.getTime() / (60 * 60 * 1000)) * 60 * 60 * 1000)
    : key.hourlyWindowStart;

  const monthResetDue = now >= key.quotaResetAt;
  const currentMonthlyUsed = monthResetDue ? 0 : key.requestsUsed;
  const nextQuotaReset = monthResetDue
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    : key.quotaResetAt;

  const limits = resolvePlanLimits({
    subscriptionTier: user.subscriptionTier,
    proExpiresAt: user.proExpiresAt,
    keyTier: key.tier,
    now,
  });

  const withinPlanHourly = currentHourlyUsed < limits.hourlyLimit;
  const withinPlanMonthly =
    limits.monthlyLimit === null || currentMonthlyUsed < limits.monthlyLimit;

  let billedToWallet = false;
  let updatedBalanceCents = user.apiCreditBalanceCents;

  if (limits.plan === 'payg') {
    if (!withinPlanHourly) {
      return {
        error: NextResponse.json(
          { error: `Pay-as-you-go hourly burst limit (${PAYG_HOURLY_LIMIT}/hour) reached.` },
          { status: 429, headers: { 'Retry-After': '3600' } }
        ),
      };
    }
    if (user.apiCreditBalanceCents < API_REQUEST_COST_CENTS) {
      return {
        error: NextResponse.json(
          { error: 'Insufficient API wallet balance. Load funds in /developers to continue.' },
          { status: 402 }
        ),
      };
    }
    billedToWallet = true;
  } else if (!withinPlanHourly || !withinPlanMonthly) {
    // Allow seamless Pay-As-You-Go wallet overflow if user has loaded funds
    if (
      user.apiCreditBalanceCents >= API_REQUEST_COST_CENTS &&
      currentHourlyUsed < PAYG_HOURLY_LIMIT
    ) {
      billedToWallet = true;
    } else {
      const reason = !withinPlanMonthly
        ? `Monthly ${limits.plan} quota (${limits.monthlyLimit}/month) reached.`
        : `Hourly ${limits.plan} rate limit (${limits.hourlyLimit}/hour) reached.`;
      return {
        error: NextResponse.json(
          {
            error: `${reason} Upgrade to Pro or load API credits in /developers for unlimited usage.`,
            plan: limits.plan,
            hourly_limit: limits.hourlyLimit,
            monthly_limit: limits.monthlyLimit,
          },
          {
            status: 429,
            headers: {
              'Retry-After': !withinPlanHourly ? '3600' : '86400',
              'X-RateLimit-Limit-Hour': String(limits.hourlyLimit),
              'X-RateLimit-Remaining-Hour': String(Math.max(0, limits.hourlyLimit - currentHourlyUsed)),
              'X-RateLimit-Limit-Month': String(limits.monthlyLimit ?? 'unlimited'),
              'X-RateLimit-Remaining-Month':
                limits.monthlyLimit === null
                  ? 'unlimited'
                  : String(Math.max(0, limits.monthlyLimit - currentMonthlyUsed)),
            },
          }
        ),
      };
    }
  }

  if (billedToWallet) {
    const deducted = await db
      .update(users)
      .set({
        apiCreditBalanceCents: sql`${users.apiCreditBalanceCents} - ${API_REQUEST_COST_CENTS}`,
        updatedAt: now,
      })
      .where(
        and(eq(users.id, user.id), gte(users.apiCreditBalanceCents, API_REQUEST_COST_CENTS))
      )
      .returning({ balance: users.apiCreditBalanceCents });

    if (deducted.length === 0) {
      return {
        error: NextResponse.json(
          { error: 'Insufficient API wallet balance. Load funds in /developers.' },
          { status: 402 }
        ),
      };
    }
    updatedBalanceCents = deducted[0].balance;

    await db
      .insert(apiCreditTransactions)
      .values({
        userId: user.id,
        amountCents: -API_REQUEST_COST_CENTS,
        balanceAfterCents: updatedBalanceCents,
        txType: 'api_usage',
        description: `API request (${key.keyPrefix}...)`,
      })
      .catch(() => null);
  }

  const newMonthlyUsed = currentMonthlyUsed + 1;
  const newHourlyUsed = currentHourlyUsed + 1;

  await db
    .update(apiKeys)
    .set({
      requestsUsed: newMonthlyUsed,
      quotaResetAt: nextQuotaReset,
      hourlyRequestsUsed: newHourlyUsed,
      hourlyWindowStart: nextHourlyStart,
      lastUsedAt: now,
      lastUsedIp: clientIp !== 'unknown-ip' ? clientIp : null,
    })
    .where(eq(apiKeys.id, key.id));

  const headers: Record<string, string> = {
    'Cache-Control': 'private, no-store',
    'X-RateLimit-Limit-Hour': String(billedToWallet ? PAYG_HOURLY_LIMIT : limits.hourlyLimit),
    'X-RateLimit-Remaining-Hour': String(
      Math.max(0, (billedToWallet ? PAYG_HOURLY_LIMIT : limits.hourlyLimit) - newHourlyUsed)
    ),
    'X-RateLimit-Limit-Month':
      limits.monthlyLimit === null ? 'unlimited' : String(limits.monthlyLimit),
    'X-RateLimit-Remaining-Month':
      limits.monthlyLimit === null
        ? 'unlimited'
        : String(Math.max(0, limits.monthlyLimit - newMonthlyUsed)),
    'X-Credit-Balance-Cents': String(updatedBalanceCents),
  };

  return {
    auth: {
      keyId: key.id,
      keyPrefix: key.keyPrefix,
      userId: user.id,
      plan: limits.plan,
      billedToWallet,
      requestsUsed: newMonthlyUsed,
      monthlyLimit: limits.monthlyLimit,
      hourlyUsed: newHourlyUsed,
      hourlyLimit: billedToWallet ? PAYG_HOURLY_LIMIT : limits.hourlyLimit,
      creditBalanceCents: updatedBalanceCents,
      headers,
    },
  };
}
