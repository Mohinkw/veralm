import { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_IN_MEMORY_KEYS = 5000;

const requestLog = new Map<string, number[]>();

/**
 * Extracts best-effort client IP from trusted proxy headers.
 */
export function extractClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',').pop()?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return vercelIp || realIp || forwardedFor || 'unknown-ip';
}

/**
 * Derive a rate-limit key from the caller's IP address (and optional session ID).
 */
export function getRateLimitKey(request: NextRequest, sessionId?: string): string {
  const ip = extractClientIp(request);
  return sessionId ? `${ip}:${sessionId}` : ip;
}

/**
 * Prune expired timestamps and evict oldest entries without wiping active buckets.
 */
function checkInMemoryRateLimit(
  key: string,
  now = Date.now(),
  windowMs = RATE_LIMIT_WINDOW_MS,
  maxRequests = MAX_REQUESTS_PER_WINDOW
): boolean {
  if (requestLog.size > MAX_IN_MEMORY_KEYS) {
    for (const [k, timestamps] of requestLog.entries()) {
      const valid = timestamps.filter((ts) => now - ts < windowMs);
      if (valid.length === 0) requestLog.delete(k);
      else requestLog.set(k, valid);
    }
    if (requestLog.size > MAX_IN_MEMORY_KEYS) {
      const evictCount = Math.ceil(requestLog.size * 0.25);
      let removed = 0;
      for (const k of requestLog.keys()) {
        requestLog.delete(k);
        if (++removed >= evictCount) break;
      }
    }
  }

  const recent = (requestLog.get(key) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= maxRequests) {
    requestLog.set(key, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

/**
 * Distributed fixed-window rate limit via Upstash Redis REST API when configured;
 * automatically falls back to bounded in-memory rate limiting in local/dev environments.
 */
export async function isRateLimited(
  key: string,
  maxRequests = MAX_REQUESTS_PER_WINDOW
): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const safeKey = key.replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 128);

  if (redisUrl && redisToken) {
    try {
      const windowBucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);
      const redisKey = `rl:search:${safeKey}:${windowBucket}`;
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['EXPIRE', redisKey, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) + 5],
        ]),
      });

      if (res.ok) {
        const data = (await res.json()) as Array<{ result?: number }>;
        const count = data?.[0]?.result;
        if (typeof count === 'number') {
          return count > maxRequests;
        }
      }
    } catch (err) {
      console.warn('[RateLimit] Upstash Redis unavailable, using in-memory fallback:', err);
    }
  }

  return checkInMemoryRateLimit(key, Date.now(), RATE_LIMIT_WINDOW_MS, maxRequests);
}

export function resetInMemoryRateLimitForTests(): void {
  requestLog.clear();
}
