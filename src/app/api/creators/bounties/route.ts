import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth/request';
import { executeRawSQL } from '@/db/client';

export async function GET(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  try {
    const res = await executeRawSQL(
      `SELECT
         MIN(query_text) AS topic,
         COUNT(*)::int AS request_count,
         MAX(created_at) AS last_asked_at
       FROM search_queries
       WHERE (articles_cited IS NULL OR array_length(articles_cited, 1) IS NULL OR articles_cited = '{}')
         AND length(trim(query_text)) BETWEEN 12 AND 180
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY lower(trim(query_text))
       ORDER BY request_count DESC, last_asked_at DESC
       LIMIT 10`
    );

    const bounties = (res?.rows || []).map((r: Record<string, unknown>) => ({
      topic: String(r.topic),
      requestCount: Number(r.request_count || 1),
      lastAskedAt: r.last_asked_at ? new Date(String(r.last_asked_at)).toISOString() : null,
    }));

    return NextResponse.json({ bounties }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('[Creator Bounties GET] Error:', err);
    return NextResponse.json({ error: 'Could not load topic bounties.' }, { status: 500 });
  }
}
