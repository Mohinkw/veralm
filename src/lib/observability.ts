/**
 * Lightweight Sentry HTTP envelope reporter (zero external SDK required).
 * No-ops safely when SENTRY_DSN is not configured.
 */
export function parseSentryDsn(dsn: string): {
  envelopeUrl: string;
  publicKey: string;
} | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\/+/, '');
    if (!publicKey || !projectId) return null;
    return {
      envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey,
    };
  } catch {
    return null;
  }
}

export async function captureServerException(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const eventId = crypto.randomUUID().replace(/-/g, '');
  const envelopeHeader = JSON.stringify({ event_id: eventId, dsn });
  const itemHeader = JSON.stringify({ type: 'event' });
  const payload = JSON.stringify({
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: 'node',
    level: 'error',
    environment: process.env.NODE_ENV || 'production',
    exception: {
      values: [{ type: err.name, value: err.message }],
    },
    extra: context || {},
  });

  try {
    await fetch(parsed.envelopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=veralm/1.0`,
      },
      body: `${envelopeHeader}\n${itemHeader}\n${payload}`,
    });
  } catch {
    // Avoid cascading failures from telemetry
  }
}
