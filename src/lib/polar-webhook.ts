import crypto from 'crypto';

/**
 * Verifies Polar.sh Standard Webhooks signature headers:
 * `webhook-id`, `webhook-timestamp`, `webhook-signature` (`v1,<base64>`).
 */
export function verifyPolarWebhookSignature(
  rawBody: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  },
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(nowSeconds - tsNum) > toleranceSeconds) {
    return false;
  }

  // Standard Webhooks secrets may be prefixed with `whsec_` (base64) or `polar_whs_` or raw UTF-8
  let keyBytes: Buffer;
  if (secret.startsWith('whsec_')) {
    keyBytes = Buffer.from(secret.slice('whsec_'.length), 'base64');
  } else {
    keyBytes = Buffer.from(secret, 'utf8');
  }

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expectedBase64 = crypto
    .createHmac('sha256', keyBytes)
    .update(signedContent, 'utf8')
    .digest('base64');
  const expectedBuf = Buffer.from(expectedBase64, 'utf8');

  const candidates = signature.split(' ').map((part) => {
    const [, sigVal] = part.split(',', 2);
    return sigVal?.trim() || '';
  });

  return candidates.some((candidate) => {
    if (!candidate) return false;
    const candBuf = Buffer.from(candidate, 'utf8');
    if (candBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(candBuf, expectedBuf);
  });
}
