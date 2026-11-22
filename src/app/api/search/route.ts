import { NextRequest, NextResponse } from "next/server";
import { supabase, createServerClient } from "@/lib/supabase";
import { generateSessionId } from "@/lib/utils";
import { generateChatAnswer, generateEmbedding, hasAnyAI } from "@/lib/ai-providers";

// ---- Rate limiting (in-memory, per session) ----
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 20;
const requestLog = new Map<string, number[]>();

function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const requests = requestLog.get(sessionId) || [];
  const recent = requests.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now);
  requestLog.set(sessionId, recent);
  return false;
}

// ---- Demo vault for dev mode (no DB/API needed) ----
const VAULT_DEMO = [
  {
    article_id: "demo-1",
    title: "Optimising PostgreSQL for Vector Search at Scale",
    author_name: "Alex Rivers",
    author_slug: "alex-rivers",
    chunk_text:
      "Use pgvector with HNSW indexes for sub-millisecond approximate nearest neighbour search. Tune `ef_construction` to 128 and `m` to 16 for a good speed/recall balance. Partition large embedding tables by category to reduce index scan size.",
    excerpt:
      "Expert guidance on pgvector HNSW indexes, partitioning strategies, and tuning parameters for production-scale vector workloads.",
    freshness_status: "current",
    approved_at: "2026-10-01",
    similarity: 0.91,
  },
  {
    article_id: "demo-2",
    title: "RAG Pipeline Best Practices",
    author_name: "Priya Sharma",
    author_slug: "priya-sharma",
    chunk_text:
      "Retrieval-Augmented Generation (RAG) works best with hybrid search: combine dense vector similarity with BM25 sparse retrieval, then rerank using a cross-encoder. Keep chunks to 300–500 tokens to maximise context precision.",
    excerpt:
      "How to build production RAG pipelines with hybrid retrieval, reranking, and optimal chunk sizing.",
    freshness_status: "current",
    approved_at: "2026-09-15",
    similarity: 0.87,
  },
  {
    article_id: "demo-3",
    title: "Choosing the Right LLM for Enterprise Applications",
    author_name: "James Wu",
    author_slug: "james-wu",
    chunk_text:
      "For enterprise RAG, Gemini 2.0 Flash offers the best cost-to-quality ratio for answer synthesis. Use GPT-4o-mini as a fallback. Always benchmark on your own domain queries rather than generic leaderboards.",
    excerpt:
      "A practitioner's guide to selecting and benchmarking LLMs for enterprise knowledge retrieval.",
    freshness_status: "current",
    approved_at: "2026-11-01",
    similarity: 0.82,
  },
];

function keywordMatch(query: string): typeof VAULT_DEMO {
  const q = query.toLowerCase();
  return VAULT_DEMO.filter(
    (d) =>
      d.title.toLowerCase().split(" ").some((w) => q.includes(w)) ||
      d.chunk_text.toLowerCase().split(" ").some((w) => w.length > 4 && q.includes(w))
  );
}

// ---- Main handler ----
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, session_id, category_filter, date_filter_from } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const sessionId = session_id || generateSessionId();
    if (isRateLimited(sessionId)) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const startTime = Date.now();

    // ---- TIER 1: Supabase pgvector vault search ----
    let vaultResults: any[] = [];
    let vaultSource = "none";
    const hasSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (hasSupabase) {
      try {
        const embedding = await generateEmbedding(query);
        if (embedding) {
          const client =
            process.env.SUPABASE_SERVICE_ROLE_KEY &&
            !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
              ? createServerClient()
              : supabase;

          const { data, error } = await client.rpc("hybrid_search", {
            query_embedding: embedding,
            query_text: query,
            match_count: 5,
          });

          // Only treat as vault results if they are actually relevant (similarity threshold)
          const relevant = (data || []).filter(
            (r: any) => (r.similarity && r.similarity >= 0.35) || (r.bm25_score && r.bm25_score > 0)
          );

          if (!error && relevant.length > 0) {
            vaultResults = relevant;
            vaultSource = "pgvector";
          }
        }
      } catch (err) {
        console.warn("[Search] Supabase pgvector failed:", err);
      }
    } else {
      // Dev mode: keyword match against demo vault
      vaultResults = keywordMatch(query);
      vaultSource = vaultResults.length > 0 ? "demo-vault" : "none";
    }

    // ---- TIER 2: AI answer synthesis ----
    if (!hasAnyAI()) {
      // No AI available → return vault excerpts only
      return NextResponse.json({
        answer: vaultResults.length
          ? `Here are the most relevant verified articles:\n\n${vaultResults
              .map((r, i) => `[${i + 1}] **${r.title}** by ${r.author_name}\n${r.excerpt}`)
              .join("\n\n")}`
          : "No relevant verified expert articles found. AI search is currently unavailable.",
        citations: vaultResults.map(mapCitation),
        articles_used: vaultResults.map(mapArticle),
        latency_ms: Date.now() - startTime,
        was_cached: false,
        vault_source: vaultSource,
        ai_source: "none",
      });
    }

    let answer: string;
    let modelUsed: string;
    let aiSource: string;
    let answerLabel = "";

    if (vaultResults.length > 0) {
      // --- Vault content found → synthesize with AI (Gemini primary) ---
      const context = vaultResults
        .map((r, i) => `[Source ${i + 1}: "${r.title}" by ${r.author_name}]\n${r.chunk_text}`)
        .join("\n\n---\n\n");

      const systemPrompt = `You are Vera, the grounded AI assistant developed by VeraLM (veralm.com).
Your purpose is to answer the user's question accurately and helpfully using ONLY the provided verified source excerpts from expert human creators.
Cite sources as [1], [2], etc.
Be direct, conversational, and factual. If the sources do not fully answer the question, state that clearly.`;

      const userPrompt = `Question: ${query}\n\nVerified Sources:\n${context}`;

      const result = await generateChatAnswer(systemPrompt, userPrompt);
      answer = result.answer;
      modelUsed = result.modelUsed;
      aiSource = result.source;
    } else {
      // --- No vault match → general AI knowledge (clearly labelled) ---
      answerLabel =
        "\n\n---\n*⚠️ Note: No matching articles were found in the VeraLM knowledge vault. This answer is from general AI knowledge and has not been verified by domain experts.*";

      const systemPrompt = `You are a helpful AI assistant. Answer accurately and concisely. If you are not certain, say so.`;
      const result = await generateChatAnswer(systemPrompt, query);
      answer = result.answer + answerLabel;
      modelUsed = result.modelUsed;
      aiSource = result.source;
    }

    return NextResponse.json({
      answer,
      citations: vaultResults.map(mapCitation),
      articles_used: vaultResults.map(mapArticle),
      latency_ms: Date.now() - startTime,
      was_cached: false,
      vault_source: vaultSource,
      ai_source: aiSource,
      model_used: modelUsed,
    });
  } catch (error: any) {
    console.error("[Search API] Unhandled error:", error);
    return NextResponse.json({ error: error.message || "Search execution failed" }, { status: 500 });
  }
}

function mapCitation(r: any, i: number) {
  return {
    index: i + 1,
    article_id: r.article_id,
    article_title: r.title,
    author_name: r.author_name,
    approved_at: r.approved_at,
    freshness_status: r.freshness_status,
    excerpt: r.excerpt,
  };
}

function mapArticle(r: any) {
  return {
    article_id: r.article_id,
    title: r.title,
    author_slug: r.author_slug,
    author_name: r.author_name,
    approved_at: r.approved_at,
    freshness_status: r.freshness_status,
  };
}
