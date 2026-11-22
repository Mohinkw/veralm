/**
 * VeraLM AI Provider Abstraction
 * Priority: 1) Google Gemini (primary), 2) OpenAI (secondary fallback)
 * Embeddings: OpenAI text-embedding-3-small (most cost-effective)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp";
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const OPENAI_EMBED_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

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
 * Generate a chat answer using Gemini (primary) → OpenAI (fallback).
 * Returns { answer, modelUsed, source: 'gemini' | 'openai' | 'fallback' }
 */
export async function generateChatAnswer(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.1
): Promise<{ answer: string; modelUsed: string; source: string }> {
  // --- Tier 1: Google Gemini ---
  if (hasGemini()) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          temperature,
          maxOutputTokens: 1500,
        },
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userPrompt);
      const answer = result.response.text();

      if (answer && answer.trim()) {
        return { answer: answer.trim(), modelUsed: GEMINI_MODEL, source: "gemini" };
      }
    } catch (err) {
      console.warn("[AI Providers] Gemini failed, trying OpenAI fallback:", err);
    }
  }

  // --- Tier 2: OpenAI fallback ---
  if (hasOpenAI()) {
    try {
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
          max_tokens: 1500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || "";
        if (answer.trim()) {
          return { answer: answer.trim(), modelUsed: data.model, source: "openai" };
        }
      }
    } catch (err) {
      console.warn("[AI Providers] OpenAI fallback also failed:", err);
    }
  }

  // --- Tier 3: Static fallback (dev / both APIs down) ---
  return {
    answer:
      "I couldn't generate an answer right now — the AI service is temporarily unavailable. Please try again in a moment.",
    modelUsed: "none",
    source: "fallback",
  };
}

/**
 * Generate an embedding vector using OpenAI (the only provider with stable embedding API).
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
