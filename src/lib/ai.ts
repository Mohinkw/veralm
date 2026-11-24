import OpenAI from "openai";
import { db } from "@/db/client";
import { articleEmbeddings } from "@/db/schema";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey });
}

/**
 * Split text into chunks for embedding
 * Goal: chunks of ~500 words with some overlap
 */
export function chunkText(text: string, chunkSize: number = 2000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  
  return chunks;
}

/**
 * Generate embedding for a text chunk using OpenAI's text-embedding-3-small
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  
  return response.data[0].embedding;
}

/**
 * Process an approved article: chunk it and store embeddings
 * REMARK: OpenAI calls are currently exempted/disabled per user instruction to ensure $0.00 spend.
 */
export async function processArticleEmbeddings(articleId: string, content: string) {
  // REMARK: OpenAI calls completely exempted to prevent billing.
  return 0;
}

export async function processArticleEmbeddingsDisabled(articleId: string, content: string) {
  const chunks = chunkText(content);
  
  const embeddingPromises = chunks.map(async (chunk, index) => {
    const embedding = await generateEmbedding(chunk);
    
    return {
      articleId,
      chunkIndex: index,
      chunkText: chunk,
      embedding: embedding,
      tokenCount: Math.ceil(chunk.length / 4), // Rough estimate
    };
  });
  
  const chunkData = await Promise.all(embeddingPromises);
  
  // Store chunks in database
  for (const data of chunkData) {
    await db.insert(articleEmbeddings).values({
      articleId: data.articleId,
      chunkIndex: data.chunkIndex,
      chunkText: data.chunkText,
      embedding: data.embedding,
      tokenCount: data.tokenCount,
    }).onConflictDoUpdate({
      target: [articleEmbeddings.articleId, articleEmbeddings.chunkIndex],
      set: {
        chunkText: data.chunkText,
        embedding: data.embedding,
        tokenCount: data.tokenCount,
      }
    });
  }
  
  return chunks.length;
}
