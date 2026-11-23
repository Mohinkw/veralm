import crypto from 'crypto';

const CITATION_SECRET =
  process.env.CITATION_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  'veralm-vault-protected-knowledge-secret-2026';

/**
 * Creates a cryptographically signed token proving that this specific article
 * was cited in an answer generated for the user.
 */
export function createCitationToken(slugOrId: string, sessionId?: string): string {
  const timestamp = Date.now();
  const normalized = slugOrId.toLowerCase().trim();
  const payload = `${normalized}:${sessionId || 'anon'}:${timestamp}`;
  const hmac = crypto
    .createHmac('sha256', CITATION_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 32);

  return Buffer.from(
    JSON.stringify({ s: normalized, sid: sessionId || 'anon', t: timestamp, h: hmac })
  ).toString('base64url');
}

/**
 * Verifies that a citation token is authentic, unexpired, and matches the requested article slug/id.
 */
export function verifyCitationToken(token?: string, slugOrId?: string): boolean {
  if (!token || !slugOrId) return false;

  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const { s, sid, t, h } = JSON.parse(raw);
    if (!s || !t || !h) return false;

    // Token expires after 24 hours
    const MAX_AGE = 24 * 60 * 60 * 1000;
    if (Date.now() - t > MAX_AGE) return false;

    const normalized = slugOrId.toLowerCase().trim();
    if (s !== normalized) return false;

    const payload = `${normalized}:${sid || 'anon'}:${t}`;
    const expected = crypto
      .createHmac('sha256', CITATION_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 32);

    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(expected));
  } catch {
    return false;
  }
}
