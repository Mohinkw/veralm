import crypto from 'crypto';

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  return (
    process.env.CITATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_JWT_SECRET ||
    EPHEMERAL_FALLBACK_SECRET
  );
}

/**
 * Creates a cryptographically signed token proving that this specific article
 * was cited in an answer generated for the user.
 */
export function createCitationToken(slugOrId: string, sessionId?: string): string {
  const secret = getSigningSecret();
  const timestamp = Date.now();
  const normalized = slugOrId.toLowerCase().trim();
  const payload = `${normalized}:${sessionId || 'anon'}:${timestamp}`;
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 32);

  return Buffer.from(
    JSON.stringify({ s: normalized, sid: sessionId || 'anon', t: timestamp, h: hmac })
  ).toString('base64url');
}

const EXTERNAL_SEARCH_HOSTS = [
  'google.',
  'bing.com',
  'duckduckgo.com',
  'search.yahoo.',
  'yahoo.com',
  'yandex.',
  'baidu.com',
  'ecosia.org',
  'search.brave.com',
  'perplexity.ai',
  'chatgpt.com',
];

/**
 * Returns true if the HTTP Referer belongs to an external search engine or AI aggregator.
 * Used to ensure visitors clicking through from external search engines see the gated teaser.
 */
export function isExternalSearchEngineReferer(referer?: string | null): boolean {
  if (!referer) return false;
  try {
    const host = new URL(referer).hostname.toLowerCase();
    return EXTERNAL_SEARCH_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}

/**
 * Verifies that a citation token is authentic, unexpired, and matches the requested article slug/id.
 */
export function verifyCitationToken(token?: string, slugOrId?: string): boolean {
  if (!token || !slugOrId) return false;

  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    const { s, sid, t, h } = parsed ?? {};
    if (typeof s !== 'string' || typeof t !== 'number' || typeof h !== 'string') return false;
    if (!Number.isFinite(t)) return false;

    const now = Date.now();
    const MAX_AGE = 24 * 60 * 60 * 1000;
    if (t > now + 60_000 || now - t > MAX_AGE) return false;

    const normalized = slugOrId.toLowerCase().trim();
    const tokenSlug = s.toLowerCase().trim();
    if (!normalized || !tokenSlug) return false;

    const alphaA = tokenSlug.replace(/[^a-z0-9]/g, '');
    const alphaB = normalized.replace(/[^a-z0-9]/g, '');
    const isSlugMatch =
      tokenSlug === normalized || (alphaA.length > 0 && alphaA === alphaB);

    if (!isSlugMatch) return false;

    const payload = `${s}:${sid || 'anon'}:${t}`;
    const expected = crypto
      .createHmac('sha256', getSigningSecret())
      .update(payload)
      .digest('hex')
      .slice(0, 32);

    const hBuf = Buffer.from(h, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (hBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(hBuf, expBuf);
  } catch {
    return false;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Signs a session reader/pro cookie so clients cannot forge another user's UUID.
 * Format: `<uid>.<expiresMs>.<hmac32>`
 */
export function signSessionCookie(userId: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  const exp = Date.now() + maxAgeSeconds * 1000;
  const payload = `${userId}.${exp}`;
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex')
    .slice(0, 32);
  return `${payload}.${sig}`;
}

/**
 * Verifies a signed reader/pro cookie and returns the authenticated userId if valid.
 */
export function verifySignedSessionCookie(cookieValue?: string | null): string | null {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;
  const [uid, expStr, sig] = parts;
  if (!UUID_RE.test(uid)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  const expected = crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${uid}.${expStr}`)
    .digest('hex')
    .slice(0, 32);

  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return uid;
}
