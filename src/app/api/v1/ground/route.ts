import { NextRequest, NextResponse } from 'next/server';
import { db, executeRawSQL } from '@/db/client';
import { searchQueries } from '@/db/schema';
import { authenticateAndMeterApiKey } from '@/lib/api-key-auth';
import { parseJsonObject } from '@/lib/auth/request';
import { mapCitation, mapArticle, searchKnowledgeBase } from '@/lib/services/search';
import type { SearchArticleUsed } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const keyResult = await authenticateAndMeterApiKey(request, 'ground:read');
  if ('error' in keyResult) return keyResult.error;
  const keyAuth = keyResult.auth;

  try {
    const parsed = await parseJsonObject(request);
    if ('error' in parsed) return parsed.error;

    const query = typeof parsed.data.query === 'string' ? parsed.data.query.trim() : '';
    const category = typeof parsed.data.category === 'string' ? parsed.data.category.trim() : undefined;
    const rawLimit = Number(parsed.data.limit ?? 5);
    const limit = Number.isFinite(rawLimit) ? Math.min(10, Math.max(1, Math.floor(rawLimit))) : 5;

    if (query.length < 2 || query.length > 500) {
      return NextResponse.json(
        { error: 'query must be between 2 and 500 characters.' },
        { status: 400, headers: keyAuth.headers }
      );
    }

    const startMs = Date.now();
    const { vaultResults, vaultSource } = await searchKnowledgeBase(query, {
      categorySlug: category,
      limit,
    });
    const sessionId = `api:${keyAuth.keyPrefix}`;
    const citations = vaultResults.map((row, idx) => mapCitation(row, idx, sessionId));

    const articlesMap = new Map<string, SearchArticleUsed>();
    for (const row of vaultResults) {
      if (!articlesMap.has(row.article_id)) {
        articlesMap.set(row.article_id, mapArticle(row));
      }
    }
    const articlesUsed = Array.from(articlesMap.values());

    // Log attribution so creators earn royalties from Grounding API calls
    try {
      const realRows = vaultResults.filter((r) => UUID_RE.test(r.article_id));
      const [savedQuery] = await db
        .insert(searchQueries)
        .values({
          userId: keyAuth.userId,
          sessionId,
          queryText: query,
          modelUsed: 'grounding-api-v1',
          articlesCited: realRows.map((r) => r.article_id),
          latencyMs: Date.now() - startMs,
          revenuePeriod: new Date().toISOString().slice(0, 7),
        })
        .returning({ id: searchQueries.id });

      if (savedQuery && realRows.length > 0) {
        const share = 1 / realRows.length;
        for (let idx = 0; idx < realRows.length; idx++) {
          const row = realRows[idx];
          await executeRawSQL(
            `WITH target AS (SELECT creator_id FROM articles WHERE id = $2::uuid)
             INSERT INTO article_usage_events (
               query_id, article_id, creator_id, retrieval_rank,
               relevance_score, contribution_weight, was_cited
             )
             SELECT $1::uuid, $2::uuid, creator_id, $3, $4, $5, true
             FROM target`,
            [savedQuery.id, row.article_id, idx + 1, row.similarity ?? 0.5, share]
          );
        }
      }
    } catch (attrErr) {
      console.error('[Grounding API] Attribution log error:', attrErr);
    }

    return NextResponse.json(
      {
        query,
        vault_source: vaultSource,
        sources: articlesUsed,
        citations,
        quota: {
          plan: keyAuth.plan,
          billed_to_wallet: keyAuth.billedToWallet,
          hourly_used: keyAuth.hourlyUsed,
          hourly_limit: keyAuth.hourlyLimit,
          monthly_used: keyAuth.requestsUsed,
          monthly_limit: keyAuth.monthlyLimit,
          credit_balance_cents: keyAuth.creditBalanceCents,
        },
      },
      { headers: keyAuth.headers }
    );
  } catch (err) {
    console.error('[Grounding API v1] Error:', err);
    return NextResponse.json({ error: 'Grounding query failed.' }, { status: 500 });
  }
}
