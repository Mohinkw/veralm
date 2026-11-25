import crypto from 'crypto';

export interface Ga4ArticleRevenueRow {
  slug: string;
  views: number;
  adRevenue: number;
}

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function getGa4Credentials(): ServiceAccountCredentials | null {
  const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const decoded = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, '\n'),
        };
      }
    } catch (err) {
      console.warn('[GA4] Failed to parse GA4_SERVICE_ACCOUNT_JSON:', err);
    }
  }

  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA4_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

async function getGoogleAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = `${header}.${claimSet}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(creds.privateKey);
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error_description?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || 'Failed to obtain Google OAuth2 access token');
  }

  return tokenData.access_token;
}

/**
 * Extracts an article slug from paths like `/articles/my-slug` or `/articles/my-slug/123`.
 */
export function extractArticleSlugFromPath(pagePath: string): string | null {
  const cleanPath = pagePath.split('?')[0].split('#')[0];
  const match = cleanPath.match(/^\/articles\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Queries Google Analytics 4 Data API for per-article views and AdSense ad revenue.
 */
export async function fetchGa4ArticleRevenue(opts: {
  propertyId: string;
  startDate: string;
  endDate: string;
}): Promise<Ga4ArticleRevenueRow[]> {
  const creds = getGa4Credentials();
  if (!creds) {
    console.warn('[GA4] Service account credentials not configured; skipping GA4 fetch.');
    return [];
  }

  const accessToken = await getGoogleAccessToken(creds);
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(opts.propertyId)}:runReport`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: opts.startDate, endDate: opts.endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'totalAdRevenue' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'BEGINS_WITH',
            value: '/articles/',
          },
        },
      },
      limit: 10000,
    }),
  });

  const data = (await response.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || `GA4 runReport failed (${response.status})`);
  }

  const aggregated = new Map<string, Ga4ArticleRevenueRow>();
  for (const row of data.rows ?? []) {
    const pagePath = row.dimensionValues?.[0]?.value ?? '';
    const slug = extractArticleSlugFromPath(pagePath);
    if (!slug) continue;

    const views = Number(row.metricValues?.[0]?.value ?? 0) || 0;
    const adRevenue = Number(row.metricValues?.[1]?.value ?? 0) || 0;

    const existing = aggregated.get(slug);
    if (existing) {
      existing.views += views;
      existing.adRevenue += adRevenue;
    } else {
      aggregated.set(slug, { slug, views, adRevenue });
    }
  }

  return Array.from(aggregated.values());
}
