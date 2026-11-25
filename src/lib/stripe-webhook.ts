import crypto from 'crypto';

/**
 * Verifies a Stripe Webhook `Stripe-Signature` header against the raw request body.
 * Implements Stripe's v1 HMAC-SHA256 scheme with replay-attack timestamp tolerance.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!signatureHeader || !secret) return false;

  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of signatureHeader.split(',')) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    const value = rest.join('=').trim();
    if (!key || !value) continue;

    if (key === 't') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) timestamp = parsed;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  return signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}
