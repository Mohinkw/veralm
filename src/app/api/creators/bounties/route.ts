import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth/request';
import { executeRawSQL } from '@/db/client';
import { isEligibleKnowledgeBounty } from '@/lib/rag-utils';

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
         AND COALESCE(session_id, '') NOT LIKE 'qa-%'
         AND length(trim(query_text)) BETWEEN 15 AND 180
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY lower(trim(query_text))
       ORDER BY request_count DESC, last_asked_at DESC
       LIMIT 40`
    );

    const bounties = (res?.rows || [])
      .filter((r: Record<string, unknown>) => isEligibleKnowledgeBounty(String(r.topic || '')))
      .slice(0, 8)
      .map((r: Record<string, unknown>) => {
        const cnt = Number(r.request_count || 1);
        return {
          topic: String(r.topic),
          count: cnt,
          requestCount: cnt,
          lastAskedAt: r.last_asked_at ? new Date(String(r.last_asked_at)).toISOString() : null,
        };
      });

    return NextResponse.json({ bounties }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('[Creator Bounties GET] Error:', err);
    return NextResponse.json({ error: 'Could not load topic bounties.' }, { status: 500 });
  }
}
