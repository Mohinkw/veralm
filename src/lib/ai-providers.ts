/**
 * VeraLM AI Provider Abstraction
 * Priority Formula:
 * 1) Google Gemini Free Tier Pool (rotates through all 4 configured Gemini API keys across independent projects)
 * 2) OpenAI API: TEMPORARILY EXEMPTED / DISABLED to guarantee $0.00 expenses.
 * 3) Static Graceful Fallback
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_GEMINI_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-flash-lite-latest";

// REMARK: OpenAI API is currently completely exempt/disabled to prevent any paid billing.
// To re-enable in the future, set ENABLE_OPENAI_FALLBACK=true.
const ENABLE_OPENAI_FALLBACK = false;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

// Prioritized list of active Gemini models to try per key before rotating
const GEMINI_CANDIDATES = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
  ])
);

/**
 * Returns all distinct, active Gemini API keys configured in environment variables.
 * Supports comma-separated GEMINI_API_KEYS, GOOGLE_AI_API_KEY, GEMINI_API_KEY, GEMINI_API_KEY_1..4
 */
export function getGeminiKeys(): string[] {
  const sources = [
    process.env.GEMINI_API_KEYS,
    process.env.GOOGLE_AI_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
  ];

  const keys: string[] = [];
  for (const src of sources) {
    if (!src) continue;
    const parts = src.split(/[,\n\r]+/).map((k) => k.trim()).filter(Boolean);
    for (const key of parts) {
      if (!key.includes("placeholder") && !keys.includes(key)) {
        keys.push(key);
      }
    }
  }

  return keys;
}

// In-memory cursor to distribute requests evenly across the pool
let currentKeyCursor = 0;

export function hasGemini(): boolean {
  return getGeminiKeys().length > 0;
}

/**
 * Check if OpenAI is available and active.
 * REMARK: Currently returns false to completely exempt OpenAI and prevent any billing charges.
 */
export function hasOpenAI(): boolean {
  if (!ENABLE_OPENAI_FALLBACK) return false;
  return !!OPENAI_API_KEY && !OPENAI_API_KEY.includes("placeholder");
}

/** Check if any AI provider is available */
export function hasAnyAI(): boolean {
  return hasGemini() || hasOpenAI();
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateChatOptions {
  history?: ChatTurn[];
  maxOutputTokens?: number;
}

function toGeminiHistory(history: ChatTurn[] = []) {
  const cleaned = history
    .filter((t) => (t.role === "user" || t.role === "assistant") && t.content.trim().length > 0)
    .slice(-8);

  // Gemini startChat history must begin with a 'user' turn
  const firstUserIdx = cleaned.findIndex((t) => t.role === "user");
  const sliced = firstUserIdx >= 0 ? cleaned.slice(firstUserIdx) : [];

  return sliced.map((t) => ({
    role: t.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: t.content.slice(0, 2000) }],
  }));
}

/**
 * Rewrites a follow-up question into a standalone Knowledge Vault search query
 * using recent conversation context (e.g. resolving "they" / "it").
 */
export async function rewriteFollowUpQuery(
  query: string,
  history: ChatTurn[]
): Promise<string> {
  if (!history || history.length === 0) return query;

  const recent = history
    .slice(-4)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content.slice(0, 350)}`)
    .join("\n");

  const rewritePrompt = `Given the conversation below, rewrite the latest follow-up question into a concise standalone search query (max 20 words) that resolves any pronouns or references. Output ONLY the rewritten query, nothing else.\n\nConversation:\n${recent}\n\nLatest question: ${query}`;

  try {
    const res = await generateChatAnswer(
      "You rewrite follow-up questions into standalone search queries. Output only the query text.",
      rewritePrompt,
      0.0,
      { maxOutputTokens: 60 }
    );
    const rewritten = res.answer.replace(/^["']|["']$/g, "").trim();
    return rewritten && res.source === "gemini" ? rewritten : query;
  } catch {
    return query;
  }
}

/**
 * Generate a chat answer following the strict priority formula:
 * Google Gemini Pool (Rotates across all free API keys) → Static Fallback.
 * (OpenAI is completely exempted/disabled to prevent paid API costs).
 *
 * Returns { answer, modelUsed, source: 'gemini' | 'fallback' }
 */
export async function generateChatAnswer(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.1,
  options?: GenerateChatOptions
): Promise<{ answer: string; modelUsed: string; source: string }> {
  const geminiKeys = getGeminiKeys();
  const maxOutputTokens = options?.maxOutputTokens ?? 2000;
  const geminiHistory = toGeminiHistory(options?.history);

  // ─── TIER 1: Google Gemini Multi-Key Rotation Pool ───
  if (geminiKeys.length > 0) {
    const totalKeys = geminiKeys.length;

    // Try keys sequentially starting from the rotating cursor
    for (let offset = 0; offset < totalKeys; offset++) {
      const keyIndex = (currentKeyCursor + offset) % totalKeys;
      const currentKey = geminiKeys[keyIndex];
      const maskedKey = `${currentKey.slice(0, 7)}...${currentKey.slice(-4)}`;

      const genAI = new GoogleGenerativeAI(currentKey);

      for (const modelName of GEMINI_CANDIDATES) {
        try {
          console.log(`[AI Providers] ✦ Calling Gemini key #${keyIndex + 1} (${maskedKey}) with model ${modelName}...`);

          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature,
              maxOutputTokens,
            },
            systemInstruction: systemPrompt,
          });

          const result =
            geminiHistory.length > 0
              ? await model.startChat({ history: geminiHistory }).sendMessage(userPrompt)
              : await model.generateContent(userPrompt);
          const answer = result.response.text();

          if (answer && answer.trim()) {
            console.log(`[AI Providers] ✓ Success via Gemini key #${keyIndex + 1} (${modelName})`);
            // Advance cursor for next request so traffic is balanced across keys
            currentKeyCursor = (keyIndex + 1) % totalKeys;
            return { answer: answer.trim(), modelUsed: modelName, source: "gemini" };
          }
        } catch (err: any) {
          console.warn(
            `[AI Providers] ⚠ Gemini key #${keyIndex + 1} (${modelName}) hit limit: ${err?.message || err}. Rotating to next key...`
          );
        }
      }
    }

    console.warn(
      `[AI Providers] ⚠ All ${totalKeys} Google Gemini keys exhausted their free tier quotas.`
    );
  }

  /* ─── TIER 2: OpenAI (REMARK: TEMPORARILY EXEMPTED / DISABLED) ───
   * The code below is retained but completely bypassed to guarantee $0.00 spend.
   * All requests run exclusively on the Google Gemini Free Tier pool.
   */
  if (ENABLE_OPENAI_FALLBACK && hasOpenAI()) {
    try {
      console.log(`[AI Providers] ✦ Calling OpenAI fallback (${OPENAI_CHAT_MODEL})...`);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_CHAT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: 2500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || "";
        if (answer.trim()) {
          console.log(`[AI Providers] ✓ Answered using OpenAI fallback (${data.model})`);
          return { answer: answer.trim(), modelUsed: data.model, source: "openai" };
        }
      }
    } catch (err: any) {
      console.warn("[AI Providers] ✖ OpenAI fallback failed:", err?.message || err);
    }
  }

  // ─── TIER 3: Static Graceful Fallback (if all offline) ───
  return {
    answer:
      "I couldn't generate an answer right now — all free AI services are temporarily reaching their rate window. Please try again in a moment.",
    modelUsed: "none",
    source: "fallback",
  };
}

/**
 * Generate an embedding vector.
 * REMARK: OpenAI embeddings are completely exempted/disabled to prevent billing.
 * VeraLM grounds knowledge directly via PostgreSQL full-text and indexed matching.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // REMARK: Disabled per user instruction (zero OpenAI spend mode).
  return null;
}
