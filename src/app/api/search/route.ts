import { NextRequest, NextResponse } from 'next/server';
import { bearerToken } from '@/lib/auth/request';
import { createServerClient } from '@/lib/supabase';
import { executeRawSQL } from '@/db/client';
import { generateSessionId } from '@/lib/utils';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';
import { rewriteFollowUpQuery, type ChatTurn } from '@/lib/ai-providers';
import {
  extractCitedIndices,
  lookupQueryCache,
  mapArticle,
  mapCitation,
  searchKnowledgeBase,
  storeQueryCache,
  synthesizeSearchAnswer,
  synthesizeSearchAnswerStream,
} from '@/lib/services/search';
import type { SearchApiResponse, SearchVaultRow } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function recordSearchAttribution(params: {
  sessionId: string;
  userId: string | null;
  cleanQuery: string;
  answer: string;
  latencyMs: number;
  modelUsed?: string;
  aiSource: string;
  wasCached: boolean;
  vaultResults: SearchVaultRow[];
}): Promise<string | undefined> {
  const {
    sessionId,
    userId,
    cleanQuery,
    answer,
    latencyMs,
    modelUsed,
    aiSource,
    wasCached,
    vaultResults,
  } = params;

  const citedIndices = extractCitedIndices(answer, vaultResults.length);
  const revenuePeriod = new Date().toISOString().slice(0, 7);

  try {
    const realArticles = vaultResults.filter((r) => UUID_RE.test(r.article_id));
    const citedArticleIds = realArticles.map((r) => r.article_id);

    const qRes = await executeRawSQL(
      `INSERT INTO search_queries (
         session_id, user_id, query_text, response_text, latency_ms,
         model_used, was_cached, articles_cited, revenue_period
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid[], $9)
       RETURNING id`,
      [
        sessionId,
        userId,
        cleanQuery.slice(0, 2000),
        answer.slice(0, 20000),
        latencyMs,
        modelUsed || aiSource,
        wasCached,
        citedArticleIds,
        revenuePeriod,
      ]
    );
    const queryId: string | undefined = qRes?.rows?.[0]?.id;

    if (queryId && realArticles.length > 0) {
      const isInsufficientSources =
        citedIndices.size === 0 &&
        /do(?:es)? not contain|don't contain|no (?:relevant )?information|couldn't locate/i.test(
          answer
        );

      for (let idx = 0; idx < realArticles.length; idx++) {
        const row = realArticles[idx];
        const originalIdx = vaultResults.indexOf(row) + 1;
        const wasCited =
          citedIndices.size > 0
            ? citedIndices.has(originalIdx)
            : !isInsufficientSources && originalIdx === 1;
        const sim = typeof row.similarity === 'number' ? row.similarity : null;
        const bm25 = typeof row.bm25_score === 'number' ? row.bm25_score : null;

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

    return queryId;
  } catch (logErr) {
    console.warn('[Search API] Query attribution logging warning:', logErr);
    return undefined;
  }
}

function encodeSseEvent(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

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
    const { query, session_id, history, category, deep_mode, stream } = body;

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

    const rawSessionId =
      typeof session_id === 'string'
        ? session_id
        : typeof body.sessionId === 'string'
          ? body.sessionId
          : '';
    const sessionId = rawSessionId.trim() ? rawSessionId.trim().slice(0, 128) : generateSessionId();

    const categorySlug =
      typeof category === 'string' && category.trim() && category.trim() !== 'all'
        ? category.trim().slice(0, 80)
        : null;
    const deepMode = deep_mode === true;
    const wantStream = stream === true || request.nextUrl.searchParams.get('stream') === '1';

    const ip = extractClientIp(request);
    if (await isRateLimited(`search:ip:${ip}`)) {
      return NextResponse.json(
        { error: 'Too many messages. Please slow down.' },
        { status: 429 }
      );
    }

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

    // 1. Check semantic/exact query_cache for single-turn queries
    if (sanitizedHistory.length === 0) {
      const cached = await lookupQueryCache(cleanQuery, categorySlug, deepMode);
      if (cached) {
        const latencyMs = Date.now() - startTime;
        const citations = cached.vaultRows.map((r, i) => mapCitation(r, i, sessionId));
        const articlesUsed = cached.vaultRows.map((r) => mapArticle(r, sessionId));
        const queryId = await recordSearchAttribution({
          sessionId,
          userId,
          cleanQuery,
          answer: cached.answer,
          latencyMs,
          modelUsed: cached.modelUsed,
          aiSource: 'cache',
          wasCached: true,
          vaultResults: cached.vaultRows,
        });

        if (wantStream) {
          const streamBody = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encodeSseEvent('status', { step: 'cache_hit', label: 'Retrieved verified cached answer' })
              );
              controller.enqueue(
                encodeSseEvent('sources', {
                  citations,
                  articles_used: articlesUsed,
                  vault_source: cached.vaultSource,
                })
              );
              controller.enqueue(encodeSseEvent('delta', { text: cached.answer }));
              controller.enqueue(
                encodeSseEvent('done', {
                  query_id: queryId,
                  answer: cached.answer,
                  citations,
                  articles_used: articlesUsed,
                  latency_ms: latencyMs,
                  was_cached: true,
                  vault_source: cached.vaultSource,
                  ai_source: 'cache',
                  model_used: cached.modelUsed,
                })
              );
              controller.close();
            },
          });
          return new Response(streamBody, {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
            },
          });
        }

        const cachedPayload: SearchApiResponse = {
          ...(queryId ? { query_id: queryId } : {}),
          answer: cached.answer,
          citations,
          articles_used: articlesUsed,
          latency_ms: latencyMs,
          was_cached: true,
          vault_source: cached.vaultSource,
          ai_source: 'cache',
          ...(cached.modelUsed ? { model_used: cached.modelUsed } : {}),
        };
        return NextResponse.json(cachedPayload);
      }
    }

    // 2. Streaming SSE path
    if (wantStream) {
      const streamBody = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(
              encodeSseEvent('status', {
                step: 'searching',
                label: deepMode
                  ? 'Running deep hybrid search across verified experts...'
                  : 'Searching verified Knowledge Vault...',
              })
            );

            const searchQuery =
              sanitizedHistory.length > 0
                ? await rewriteFollowUpQuery(cleanQuery, sanitizedHistory)
                : cleanQuery;

            const { vaultResults, vaultSource } = await searchKnowledgeBase(searchQuery, {
              categorySlug,
              deepMode,
            });

            const citations = vaultResults.map((r, i) => mapCitation(r, i, sessionId));
            const articlesUsed = vaultResults.map((r) => mapArticle(r, sessionId));

            controller.enqueue(
              encodeSseEvent('status', {
                step: 'synthesizing',
                label:
                  vaultResults.length > 0
                    ? `Synthesizing answer from ${vaultResults.length} verified source${vaultResults.length === 1 ? '' : 's'}...`
                    : 'Generating response...',
              })
            );
            controller.enqueue(
              encodeSseEvent('sources', {
                citations,
                articles_used: articlesUsed,
                vault_source: vaultSource,
              })
            );

            let finalAnswer = '';
            let finalModel: string | undefined;
            let finalAiSource = 'gemini';

            for await (const chunk of synthesizeSearchAnswerStream(cleanQuery, vaultResults, {
              history: sanitizedHistory,
              regionHint,
              deepMode,
            })) {
              if (chunk.type === 'delta') {
                controller.enqueue(encodeSseEvent('delta', { text: chunk.text }));
              } else {
                finalAnswer = chunk.answer;
                finalModel = chunk.modelUsed;
                finalAiSource = chunk.source;
              }
            }

            const latencyMs = Date.now() - startTime;
            const queryId = await recordSearchAttribution({
              sessionId,
              userId,
              cleanQuery,
              answer: finalAnswer,
              latencyMs,
              modelUsed: finalModel,
              aiSource: finalAiSource,
              wasCached: false,
              vaultResults,
            });

            if (sanitizedHistory.length === 0 && finalAiSource === 'gemini' && vaultResults.length > 0) {
              await storeQueryCache(cleanQuery, categorySlug, deepMode, {
                answer: finalAnswer,
                vaultRows: vaultResults,
                vaultSource,
                modelUsed: finalModel,
              });
            }

            controller.enqueue(
              encodeSseEvent('done', {
                query_id: queryId,
                answer: finalAnswer,
                citations,
                articles_used: articlesUsed,
                latency_ms: latencyMs,
                was_cached: false,
                vault_source: vaultSource,
                ai_source: finalAiSource,
                model_used: finalModel,
              })
            );
          } catch (err) {
            controller.enqueue(
              encodeSseEvent('error', {
                error: err instanceof Error ? err.message : 'Streaming failed',
              })
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamBody, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // 3. Standard JSON path
    const searchQuery =
      sanitizedHistory.length > 0
        ? await rewriteFollowUpQuery(cleanQuery, sanitizedHistory)
        : cleanQuery;

    const { vaultResults, vaultSource } = await searchKnowledgeBase(searchQuery, {
      categorySlug,
      deepMode,
    });

    const { answer, aiSource, modelUsed } = await synthesizeSearchAnswer(
      cleanQuery,
      vaultResults,
      { history: sanitizedHistory, regionHint, deepMode }
    );

    const latencyMs = Date.now() - startTime;
    const queryId = await recordSearchAttribution({
      sessionId,
      userId,
      cleanQuery,
      answer,
      latencyMs,
      modelUsed,
      aiSource,
      wasCached: false,
      vaultResults,
    });

    if (sanitizedHistory.length === 0 && aiSource === 'gemini' && vaultResults.length > 0) {
      await storeQueryCache(cleanQuery, categorySlug, deepMode, {
        answer,
        vaultRows: vaultResults,
        vaultSource,
        modelUsed,
      });
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
