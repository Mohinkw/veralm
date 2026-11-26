import { supabase, createServerClient } from '@/lib/supabase';
import { executeRawSQL } from '@/db/client';
import { generateChatAnswer, generateEmbedding, hasAnyAI, type ChatTurn } from '@/lib/ai-providers';
import { createCitationToken } from '@/lib/citation-token';
import type {
  FreshnessStatus,
  SearchArticleUsed,
  SearchCitation,
  SearchVaultRow,
} from '@/types';

const VAULT_DEMO: SearchVaultRow[] = [
  {
    article_id: 'demo-1',
    slug: 'optimising-postgresql-for-vector-search-at-scale',
    title: 'Optimising PostgreSQL for Vector Search at Scale',
    author_name: 'Alex Rivers',
    author_slug: 'alex-rivers',
    chunk_text:
      'Use pgvector with HNSW indexes for sub-millisecond approximate nearest neighbour search. Tune `ef_construction` to 128 and `m` to 16 for a good speed/recall balance. Partition large embedding tables by category to reduce index scan size.',
    excerpt:
      'Expert guidance on pgvector HNSW indexes, partitioning strategies, and tuning parameters for production-scale vector workloads.',
    freshness_status: 'current',
    approved_at: '2026-10-01',
    similarity: 0.91,
  },
  {
    article_id: 'demo-2',
    slug: 'rag-pipeline-best-practices',
    title: 'RAG Pipeline Best Practices',
    author_name: 'Priya Sharma',
    author_slug: 'priya-sharma',
    chunk_text:
      'Retrieval-Augmented Generation (RAG) works best with hybrid search: combine dense vector similarity with BM25 sparse retrieval, then rerank using a cross-encoder. Keep chunks to 300-500 tokens to maximise context precision.',
    excerpt:
      'How to build production RAG pipelines with hybrid retrieval, reranking, and optimal chunk sizing.',
    freshness_status: 'current',
    approved_at: '2026-09-15',
    similarity: 0.87,
  },
  {
    article_id: 'demo-3',
    slug: 'choosing-the-right-llm-for-enterprise-applications',
    title: 'Choosing the Right LLM for Enterprise Applications',
    author_name: 'James Wu',
    author_slug: 'james-wu',
    chunk_text:
      'For enterprise RAG, Gemini 2.0 Flash offers the best cost-to-quality ratio for answer synthesis. Use GPT-4o-mini as a fallback. Always benchmark on your own domain queries rather than generic leaderboards.',
    excerpt:
      "A practitioner's guide to selecting and benchmarking LLMs for enterprise knowledge retrieval.",
    freshness_status: 'current',
    approved_at: '2026-11-01',
    similarity: 0.82,
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function normalizeFreshness(value?: string | null): FreshnessStatus {
  if (
    value === 'current' ||
    value === 'aging' ||
    value === 'outdated' ||
    value === 'flagged' ||
    value === 'superseded'
  ) {
    return value;
  }
  return 'current';
}

export function matchDemoVault(query: string): SearchVaultRow[] {
  const q = query.toLowerCase();
  return VAULT_DEMO.filter(
    (d) =>
      d.title.toLowerCase().split(' ').some((w) => w.length > 3 && q.includes(w)) ||
      (d.chunk_text || '').toLowerCase().split(' ').some((w) => w.length > 4 && q.includes(w))
  );
}

export function mapCitation(
  row: SearchVaultRow,
  index: number,
  sessionId?: string
): SearchCitation {
  const slug = row.slug || slugify(row.title) || row.article_id;
  const citationToken = createCitationToken(slug, sessionId);
  return {
    index: index + 1,
    article_id: row.article_id,
    article_title: row.title,
    slug,
    url: `/articles/${slug}?token=${citationToken}`,
    citation_token: citationToken,
    author_name: row.author_name || 'Domain Expert',
    approved_at: row.approved_at || new Date().toISOString(),
    freshness_status: normalizeFreshness(row.freshness_status),
    excerpt: row.excerpt || row.chunk_text?.slice(0, 200) || '',
  };
}

export function mapArticle(row: SearchVaultRow, sessionId?: string): SearchArticleUsed {
  const slug = row.slug || slugify(row.title) || row.article_id;
  const citationToken = createCitationToken(slug, sessionId);
  return {
    article_id: row.article_id,
    title: row.title,
    slug,
    url: `/articles/${slug}?token=${citationToken}`,
    citation_token: citationToken,
    author_slug: row.author_slug || 'author',
    author_name: row.author_name || 'Domain Expert',
    approved_at: row.approved_at || new Date().toISOString(),
    freshness_status: normalizeFreshness(row.freshness_status),
    excerpt: row.excerpt || row.chunk_text?.slice(0, 200) || '',
  };
}

/**
 * Retrieve relevant verified articles using hybrid pgvector search when available,
 * falling back to GIN-indexed PostgreSQL full-text search (tsvector).
 * Demo vault fallback is strictly disabled in production.
 */
export async function searchKnowledgeBase(query: string): Promise<{
  vaultResults: SearchVaultRow[];
  vaultSource: 'pgvector' | 'pg-fts' | 'demo-vault' | 'none';
}> {
  let vaultResults: SearchVaultRow[] = [];
  let vaultSource: 'pgvector' | 'pg-fts' | 'demo-vault' | 'none' = 'none';

  // Tier 1: Hybrid pgvector + BM25 RPC
  try {
    const embedding = await generateEmbedding(query);
    if (embedding) {
      const client =
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
          ? createServerClient()
          : supabase;

      const { data, error } = await client.rpc('hybrid_search', {
        query_embedding: embedding,
        query_text: query,
        match_count: 5,
      });

      const relevant = ((data || []) as SearchVaultRow[]).filter(
        (r) => (r.similarity && r.similarity >= 0.35) || (r.bm25_score && r.bm25_score > 0)
      );

      if (!error && relevant.length > 0) {
        vaultResults = relevant;
        vaultSource = 'pgvector';
      }
    }
  } catch (err) {
    console.warn('[Search Service] Vector search failed, falling back to PostgreSQL FTS:', err);
  }

  // Tier 2: GIN-indexed PostgreSQL full-text search on articles.search_vector
  if (vaultResults.length === 0) {
    try {
      const trimmed = query.trim();
      if (trimmed.length > 0) {
        const sql = `
          SELECT
            a.id AS article_id,
            a.title,
            a.slug,
            a.excerpt,
            LEFT(a.content, 2400) AS chunk_text,
            a.approved_at,
            a.freshness_status,
            a.composite_quality_score,
            COALESCE(cp.display_name, 'Verified Contributor') AS author_name,
            COALESCE(cp.slug, 'author') AS author_slug
          FROM articles a
          LEFT JOIN creator_profiles cp ON a.creator_id = cp.id
          WHERE a.status = 'approved'
            AND a.search_vector @@ plainto_tsquery('english', $1)
          ORDER BY
            ts_rank_cd(a.search_vector, plainto_tsquery('english', $1)) DESC,
            a.composite_quality_score DESC NULLS LAST,
            a.approved_at DESC
          LIMIT 5;
        `;
        const dbRes = await executeRawSQL(sql, [trimmed]);
        if (dbRes?.rows && dbRes.rows.length > 0) {
          vaultResults = dbRes.rows as SearchVaultRow[];
          vaultSource = 'pg-fts';
        }
      }
    } catch (err) {
      console.warn('[Search Service] PostgreSQL FTS query failed:', err);
    }
  }

  // Tier 3: Demo vault strictly gated to non-production environments
  if (
    vaultResults.length === 0 &&
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_DEMO_VAULT === 'true'
  ) {
    const demoMatches = matchDemoVault(query);
    if (demoMatches.length > 0) {
      vaultResults = demoMatches;
      vaultSource = 'demo-vault';
    }
  }

  return { vaultResults, vaultSource };
}

/**
 * Synthesize an answer grounded in retrieved articles (or fall back gracefully when offline).
 */
export async function synthesizeSearchAnswer(
  query: string,
  vaultResults: SearchVaultRow[],
  options?: { history?: ChatTurn[]; regionHint?: string | null }
): Promise<{
  answer: string;
  aiSource: string;
  modelUsed?: string;
}> {
  if (!hasAnyAI()) {
    const fallbackAnswer = vaultResults.length
      ? `Here are verified findings from our knowledge base on this topic:\n\n${vaultResults
          .map(
            (r, i) =>
              `### ${i + 1}. ${r.title}\n*By ${r.author_name || 'Domain Expert'}*\n\n${r.chunk_text || r.excerpt || ''}`
          )
          .join('\n\n')}`
      : `I couldn't locate specific verified entries matching "${query}" in our directory, and external AI services are currently connecting. Please try your question again in a moment.`;

    return { answer: fallbackAnswer, aiSource: 'fallback' };
  }

  const regionLine = options?.regionHint ? `\nUser region context (non-PII): ${options.regionHint}` : '';

  if (vaultResults.length > 0) {
    const context = vaultResults
      .map(
        (r, i) =>
          `[Source ${i + 1}: "${r.title}" by ${r.author_name || 'Domain Expert'}]\n${r.chunk_text || r.excerpt || ''}`
      )
      .join('\n\n---\n\n');

    const systemPrompt = `You are VeraLM, answering questions using verified human-written articles from the VeraLM Knowledge Vault.

Rules:
1. Match depth to the user's INTENT (not word count):
   - For narrow factual questions, definitions, or when the user asks for a concise/short answer: reply briefly and directly (1-4 sentences).
   - For broad or open-ended prompts ("describe", "explain", "how does", "compare", "overview", "guide"): give a thorough, well-structured explanation covering all relevant details from the sources.
2. Preserve the original article's wording, terminology, facts, and phrasing as closely as possible. Quote or extract directly with minimal stitching—avoid rewriting into generic AI-sounding prose.
3. Rely strictly on the verified excerpts provided below when they answer the question, and cite sources inline as [1], [2]. Only use outside knowledge if the excerpts do not cover a part of a follow-up question.
4. No filler, disclaimers, or repetitive intros.${regionLine}`;

    const userPrompt = `Question: ${query}\n\nVerified Knowledge Vault Excerpts:\n${context}`;
    const result = await generateChatAnswer(systemPrompt, userPrompt, 0.1, {
      history: options?.history,
      maxOutputTokens: 2000,
    });
    return { answer: result.answer, aiSource: result.source, modelUsed: result.modelUsed };
  }

  const systemPrompt = `You are VeraLM, an AI knowledge model powered by real, human-verified creator publications—delivering grounded answers with source citations and sharing up to 90% of net revenue (after infrastructure costs; 10% platform fee) with the human experts who wrote the content.

No matching article was found in the VeraLM Knowledge Vault for this question, so answer using your own knowledge.

Rules:
1. If asked who or which model you are, briefly explain that you are VeraLM—powered by real, human-verified creator content rather than uncredited scraping.
2. Match depth to the user's INTENT (not word count):
   - Narrow factoid/definition questions or explicit requests for a short/concise answer → keep it brief and direct (1-4 sentences).
   - Broad/analytical prompts ("describe", "explain", "compare", "how does", "guide", "overview") → provide a thorough, well-structured breakdown with clear sections or bullet points covering key aspects.
3. Continue the conversation naturally using prior turns when relevant.
4. No boilerplate disclaimers or unnecessary filler.${regionLine}`;

  const result = await generateChatAnswer(systemPrompt, query, 0.2, {
    history: options?.history,
    maxOutputTokens: 2000,
  });
  return { answer: result.answer, aiSource: result.source, modelUsed: result.modelUsed };
}
