import { NextRequest, NextResponse } from "next/server";
import { supabase, createServerClient } from "@/lib/supabase";
import { generateSessionId } from "@/lib/utils";
import { generateChatAnswer, generateEmbedding, hasAnyAI } from "@/lib/ai-providers";

// ---- Rate limiting (in-memory, per session) ----
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 30;
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ---- Demo vault for dev / sample articles ----
const VAULT_DEMO = [
  {
    article_id: "demo-1",
    slug: "optimising-postgresql-for-vector-search-at-scale",
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
    slug: "rag-pipeline-best-practices",
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
    slug: "choosing-the-right-llm-for-enterprise-applications",
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
      d.title.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w)) ||
      d.chunk_text.toLowerCase().split(" ").some((w) => w.length > 4 && q.includes(w))
  );
}

function mapCitation(r: any, i: number) {
  const slug = r.slug || slugify(r.title) || r.article_id;
  return {
    index: i + 1,
    article_id: r.article_id,
    article_title: r.title,
    slug,
    url: `/articles/${slug}`,
    author_name: r.author_name || "Domain Expert",
    approved_at: r.approved_at || new Date().toISOString(),
    freshness_status: r.freshness_status || "current",
    excerpt: r.excerpt || r.chunk_text?.slice(0, 200) || "",
  };
}

function mapArticle(r: any) {
  const slug = r.slug || slugify(r.title) || r.article_id;
  return {
    article_id: r.article_id,
    title: r.title,
    slug,
    url: `/articles/${slug}`,
    author_slug: r.author_slug || "author",
    author_name: r.author_name || "Domain Expert",
    approved_at: r.approved_at || new Date().toISOString(),
    freshness_status: r.freshness_status || "current",
    excerpt: r.excerpt || r.chunk_text?.slice(0, 200) || "",
  };
}

// ---- Main handler ----
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, session_id } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const sessionId = session_id || generateSessionId();
    if (isRateLimited(sessionId)) {
      return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
    }

    const startTime = Date.now();

    // ---- TIER 1: Search verified database knowledge ----
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

          const relevant = (data || []).filter(
            (r: any) => (r.similarity && r.similarity >= 0.35) || (r.bm25_score && r.bm25_score > 0)
          );

          if (!error && relevant.length > 0) {
            vaultResults = relevant;
            vaultSource = "pgvector";
          }
        }
      } catch (err) {
        console.warn("[Chat API] Database vector search failed, checking demo vault:", err);
      }
    }

    // Fallback to demo vault if no supabase matches
    if (vaultResults.length === 0) {
      const demoMatches = keywordMatch(query);
      if (demoMatches.length > 0) {
        vaultResults = demoMatches;
        vaultSource = "demo-vault";
      }
    }

    // ---- TIER 2: AI Answer Synthesis (ChatGPT-style formatting) ----
    if (!hasAnyAI()) {
      const fallbackAnswer = vaultResults.length
        ? `Here are verified findings from our knowledge base on this topic:\n\n${vaultResults
            .map((r, i) => `### ${i + 1}. ${r.title}\n*By ${r.author_name}*\n\n${r.chunk_text || r.excerpt}`)
            .join("\n\n")}`
        : `I'm VeraLM, an AI chatbot built to provide direct, grounded answers. AI keys are currently in demo mode.`;

      return NextResponse.json({
        answer: fallbackAnswer,
        citations: vaultResults.map(mapCitation),
        articles_used: vaultResults.map(mapArticle),
        latency_ms: Date.now() - startTime,
        was_cached: false,
        vault_source: vaultSource,
        ai_source: "fallback",
      });
    }

    let answer: string;
    let modelUsed: string;
    let aiSource: string;

    if (vaultResults.length > 0) {
      // Database content available: answer directly and naturally integrate verified findings
      const context = vaultResults
        .map((r, i) => `[Source ${i + 1}: "${r.title}" by ${r.author_name}]\n${r.chunk_text || r.excerpt}`)
        .join("\n\n---\n\n");

      const systemPrompt = `You are VeraLM, an intelligent, modern AI chatbot powered by grounded human knowledge and the latest intelligence.
Your answering style is direct, clear, articulate, and well-structured—just like ChatGPT.

Instructions:
1. Deliver a comprehensive, beautifully formatted answer directly addressing the user's prompt (using clear markdown headings, concise paragraphs, bullet points, and code blocks if technical).
2. Integrate the verified human expert findings from the database provided below as authoritative ground truth. Reference findings naturally and mention sources or citations where helpful (e.g. [1], [2]).
3. If the user's prompt covers topics beyond what the source excerpts provide, answer them thoroughly using your full knowledge base. Always provide a complete and deeply satisfying response.
4. Do not include repetitive disclaimers, apologies, or boilerplate phrases. Answer directly.`;

      const userPrompt = `User Prompt: ${query}\n\nVerified Knowledge from VeraLM Database:\n${context}`;

      const result = await generateChatAnswer(systemPrompt, userPrompt);
      answer = result.answer;
      modelUsed = result.modelUsed;
      aiSource = result.source;
    } else {
      // Query outside database: answer directly, intelligently, and thoroughly using general AI knowledge
      const systemPrompt = `You are VeraLM, an intelligent, modern AI chatbot with up-to-date knowledge.
Your answering style is direct, clear, articulate, and well-structured—just like ChatGPT.

Instructions:
1. Directly answer the user's prompt with high accuracy, clarity, and depth.
2. Structure your response with clean markdown formatting (headings, bullet points, clear paragraphs, code formatting where applicable).
3. Be conversational, direct, and helpful without unnecessary fluff, disclaimers, or generic apologies.`;

      const result = await generateChatAnswer(systemPrompt, query);
      answer = result.answer;
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
    console.error("[Chat API] Unhandled error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate answer" }, { status: 500 });
  }
}
