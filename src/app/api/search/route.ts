import { NextRequest, NextResponse } from 'next/server';
import { generateSessionId } from '@/lib/utils';
import { getRateLimitKey, isRateLimited } from '@/lib/rate-limit';
import {
  mapArticle,
  mapCitation,
  searchKnowledgeBase,
  synthesizeSearchAnswer,
} from '@/lib/services/search';
import type { SearchApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, session_id } = body ?? {};

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const sessionId = typeof session_id === 'string' && session_id.trim()
      ? session_id.trim()
      : generateSessionId();

    const rateLimitKey = getRateLimitKey(request, sessionId);
    if (await isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many messages. Please slow down.' },
        { status: 429 }
      );
    }

    const startTime = Date.now();
    const { vaultResults, vaultSource } = await searchKnowledgeBase(query);
    const { answer, aiSource, modelUsed } = await synthesizeSearchAnswer(query, vaultResults);

    const payload: SearchApiResponse = {
      answer,
      citations: vaultResults.map((r, i) => mapCitation(r, i, sessionId)),
      articles_used: vaultResults.map((r) => mapArticle(r, sessionId)),
      latency_ms: Date.now() - startTime,
      was_cached: false,
      vault_source: vaultSource,
      ai_source: aiSource,
      ...(modelUsed ? { model_used: modelUsed } : {}),
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate answer';
    console.error('[Search API] Unhandled error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
