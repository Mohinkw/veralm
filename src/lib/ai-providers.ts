/**
 * VeraLM AI Provider Abstraction
 * Priority Formula:
 * 1) Google Gemini Free Tier (primary LLM: gemini-flash-lite-latest / gemini-3.5-flash-lite)
 * 2) OpenAI API (secondary fallback only when Gemini quota/rate limit is exceeded)
 * Embeddings: OpenAI text-embedding-3-small (matching 1536d database vector schema)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_GEMINI_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-flash-lite-latest";
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

// Prioritized list of active Gemini models to try before falling back to OpenAI
const GEMINI_CANDIDATES = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
  ])
);

function hasGemini(): boolean {
  return !!GEMINI_API_KEY && !GEMINI_API_KEY.includes("placeholder");
}

function hasOpenAI(): boolean {
  return !!OPENAI_API_KEY && !OPENAI_API_KEY.includes("placeholder");
}

/** Check if any AI provider is available */
export function hasAnyAI(): boolean {
  return hasGemini() || hasOpenAI();
}

/**
 * Generate a chat answer following the strict priority formula:
 * Google Gemini (Primary Free Tier) → OpenAI (Fallback only when Gemini limits are exceeded).
 * Returns { answer, modelUsed, source: 'gemini' | 'openai' | 'fallback' }
 */
export async function generateChatAnswer(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): Promise<{ answer: string; modelUsed: string; source: string }> {
  // ─── TIER 1: Google Gemini (Primary Free Tier) ───
  if (hasGemini()) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

    for (const modelName of GEMINI_CANDIDATES) {
      try {
        console.log(`[AI Providers] ✦ Attempting Google Gemini (${modelName})...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature,
            maxOutputTokens: 2500,
          },
          systemInstruction: systemPrompt,
        });

        const result = await model.generateContent(userPrompt);
        const answer = result.response.text();

        if (answer && answer.trim()) {
          console.log(`[AI Providers] ✓ Successfully answered using Google Gemini (${modelName})`);
          return { answer: answer.trim(), modelUsed: modelName, source: "gemini" };
        }
      } catch (err: any) {
        console.warn(
          `[AI Providers] ⚠ Gemini (${modelName}) failed or limit reached: ${err?.message || err}. Checking next option...`
        );
      }
    }

    console.warn(
      "[AI Providers] ⚠ Google Gemini free tier quota / limit exceeded or unavailable. Activating OpenAI fallback..."
    );
  }

  // ─── TIER 2: OpenAI (Secondary Fallback) ───
  if (hasOpenAI()) {
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
      } else {
        const errBody = await response.text();
        console.warn("[AI Providers] ✖ OpenAI returned error:", errBody);
      }
    } catch (err: any) {
      console.warn("[AI Providers] ✖ OpenAI fallback failed:", err?.message || err);
    }
  }

  // ─── TIER 3: Static Graceful Fallback (if both offline) ───
  return {
    answer:
      "I couldn't generate an answer right now — the AI service is temporarily unavailable. Please try again in a moment.",
    modelUsed: "none",
    source: "fallback",
  };
}

/**
 * Generate an embedding vector using OpenAI text-embedding-3-small
 * (1536-dimensional vectors matching PostgreSQL pgvector schema).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!hasOpenAI()) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_EMBED_MODEL,
        input: text,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}
