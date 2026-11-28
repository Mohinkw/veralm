import { NextRequest, NextResponse } from 'next/server';
import { bearerToken } from '@/lib/auth/request';
import { createServerClient } from '@/lib/supabase';
import { executeRawSQL } from '@/db/client';
import { generateSessionId } from '@/lib/utils';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';
import { rewriteFollowUpQuery, type ChatTurn } from '@/lib/ai-providers';
import {
  extractCitedIndices,
  mapArticle,
  mapCitation,
  searchKnowledgeBase,
  synthesizeSearchAnswer,
} from '@/lib/services/search';
import type { SearchApiResponse } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  try {
    const { query, session_id, history, category } = body;

    if (typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    const cleanQuery = query.trim();
    if (cleanQuery.length > 4000) {
      return NextResponse.json(
        { error: 'Prompt must be 4,000 characters or less' },
        { status: 400 }
      );
    }

    const sanitizedHistory: ChatTurn[] = Array.isArray(history)
      ? history
        .filter(
          (m): m is ChatTurn =>
            Boolean(m) &&
            typeof m === 'object' &&
            ((m as ChatTurn).role === 'user' || (m as ChatTurn).role === 'assistant') &&
            typeof (m as ChatTurn).content === 'string' &&
            (m as ChatTurn).content.trim().length > 0
        )
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }))
      : [];

    const rawSessionId = typeof session_id === 'string' ? session_id : typeof body.sessionId === 'string' ? body.sessionId : '';
    const sessionId = rawSessionId.trim() ? rawSessionId.trim().slice(0, 128) : generateSessionId();

    const categorySlug =
      typeof category === 'string' && category.trim() ? category.trim().slice(0, 80) : null;

    // Rate-limit by IP so rotating session_id cannot bypass quota
    const ip = extractClientIp(request);
    if (await isRateLimited(`search:ip:${ip}`)) {
      return NextResponse.json(
        { error: 'Too many messages. Please slow down.' },
        { status: 429 }
      );
    }

    // Optional authenticated user lookup for query logging
    let userId: string | null = null;
    const token = bearerToken(request);
    if (token) {
      try {
        const db = createServerClient();
        const { data } = await db.auth.getUser(token);
        if (data.user?.id) userId = data.user.id;
      } catch {
        // Proceed anonymously
      }
    }

    const startTime = Date.now();
    const country = request.headers.get('x-vercel-ip-country');
    const regionHint = country && country !== 'XX' ? `Country code ${country}` : null;

    const searchQuery =
      sanitizedHistory.length > 0
        ? await rewriteFollowUpQuery(cleanQuery, sanitizedHistory)
        : cleanQuery;

    const { vaultResults, vaultSource } = await searchKnowledgeBase(searchQuery, {
      categorySlug,
    });
    const { answer, aiSource, modelUsed } = await synthesizeSearchAnswer(
      cleanQuery,
      vaultResults,
      { history: sanitizedHistory, regionHint }
    );

    const latencyMs = Date.now() - startTime;
    const citedIndices = extractCitedIndices(answer, vaultResults.length);
    const revenuePeriod = new Date().toISOString().slice(0, 7);

    // Record search query & per-article usage attribution (only real UUID articles, never demo IDs)
    let queryId: string | undefined;
    try {
      const realArticles = vaultResults.filter((r) => UUID_RE.test(r.article_id));
      const citedArticleIds = realArticles.map((r) => r.article_id);

      const qRes = await executeRawSQL(
        `INSERT INTO search_queries (
           session_id, user_id, query_text, response_text, latency_ms,
           model_used, was_cached, articles_cited, revenue_period
         ) VALUES ($1, $2, $3, $4, $5, $6, false, $7::uuid[], $8)
         RETURNING id`,
        [
          sessionId,
          userId,
          cleanQuery.slice(0, 2000),
          answer.slice(0, 20000),
          latencyMs,
          modelUsed || aiSource,
          citedArticleIds,
          revenuePeriod,
        ]
      );
      queryId = qRes?.rows?.[0]?.id;

      if (queryId && realArticles.length > 0) {
        const isInsufficientSources =
          citedIndices.size === 0 &&
          /do(?:es)? not contain|don't contain|no (?:relevant )?information|couldn't locate/i.test(answer);
        for (let idx = 0; idx < realArticles.length; idx++) {
          const row = realArticles[idx];
          const originalIdx = vaultResults.indexOf(row) + 1;
          const wasCited =
            citedIndices.size > 0
              ? citedIndices.has(originalIdx)
              : !isInsufficientSources && originalIdx === 1;
          const sim = typeof row.similarity === 'number' ? row.similarity : null;
          const bm25 = typeof row.bm25_score === 'number' ? row.bm25_score : null;

          // Lookup creator_id and insert usage attribution event
          await executeRawSQL(
            `WITH target AS (
               SELECT id, creator_id FROM articles WHERE id = $2 LIMIT 1
             ),
             ins AS (
               INSERT INTO article_usage_events (
                 query_id, article_id, creator_id, retrieval_rank,
                 cosine_similarity, bm25_score, was_primary_source, was_cited,
                 chunks_used, revenue_period
               )
               SELECT $1, target.id, target.creator_id, $3, $4, $5, $6, $7, 1, $8
               FROM target
               RETURNING article_id, creator_id
             ),
             upd_art AS (
               UPDATE articles
               SET total_query_contributions = total_query_contributions + CASE WHEN $7 THEN 1 ELSE 0 END
               WHERE id IN (SELECT article_id FROM ins)
             )
             UPDATE creator_profiles
             SET total_query_contributions = total_query_contributions + CASE WHEN $7 THEN 1 ELSE 0 END
             WHERE id IN (SELECT creator_id FROM ins)`,
            [
              queryId,
              row.article_id,
              originalIdx,
              sim,
              bm25,
              originalIdx === 1,
              wasCited,
              revenuePeriod,
            ]
          ).catch(() => null);
        }
      }
    } catch (logErr) {
      console.warn('[Search API] Query attribution logging warning:', logErr);
    }

    const payload: SearchApiResponse = {
      ...(queryId ? { query_id: queryId } : {}),
      answer,
      citations: vaultResults.map((r, i) => mapCitation(r, i, sessionId)),
      articles_used: vaultResults.map((r) => mapArticle(r, sessionId)),
      latency_ms: latencyMs,
      was_cached: false,
      vault_source: vaultSource,
      ai_source: aiSource,
      ...(modelUsed ? { model_used: modelUsed } : {}),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[Search API] Unhandled error:', error);
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 });
  }
}
