import { and, gte, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { articleEmbeddings } from "@/db/schema";
import { generateEmbedding as generateGeminiEmbedding } from "@/lib/ai-providers";
import { chunkText, chunkTextWithMeta, type ChunkWithMeta } from "@/lib/rag-utils";

export { chunkText, chunkTextWithMeta, type ChunkWithMeta };

/**
 * Generate embedding for a text chunk via Gemini Free Tier (`gemini-embedding-001`, 1536d).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  return generateGeminiEmbedding(text);
}

/**
 * Removes all indexed chunks for an article (e.g., on reject, revision, resubmit, or withdrawal).
 */
export async function deleteArticleEmbeddings(articleId: string): Promise<void> {
  await db.delete(articleEmbeddings).where(eq(articleEmbeddings.articleId, articleId));
}

/**
 * Chunk an approved article, generate 1536d Gemini Free Tier embeddings,
 * upsert chunks, and prune any stale trailing chunks from earlier versions.
 */
export async function processArticleEmbeddings(
  articleId: string,
  content: string
): Promise<number> {
  const chunks = chunkTextWithMeta(content);
  if (chunks.length === 0) {
    await deleteArticleEmbeddings(articleId);
    return 0;
  }

  let stored = 0;

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(
      chunk.heading ? `${chunk.heading}\n\n${chunk.text}` : chunk.text
    );
    if (!embedding) continue;

    await db
      .insert(articleEmbeddings)
      .values({
        articleId,
        chunkIndex: chunk.index,
        chunkText: chunk.text,
        chunkHeading: chunk.heading,
        isIntroChunk: chunk.isIntroChunk,
        embedding,
        embeddingModel: "gemini-embedding-001",
        embeddingVersion: 2,
        tokenCount: Math.max(1, chunk.text.split(/\s+/).length),
      })
      .onConflictDoUpdate({
        target: [articleEmbeddings.articleId, articleEmbeddings.chunkIndex],
        set: {
          chunkText: chunk.text,
          chunkHeading: chunk.heading,
          isIntroChunk: chunk.isIntroChunk,
          embedding,
          embeddingModel: "gemini-embedding-001",
          embeddingVersion: 2,
          tokenCount: Math.max(1, chunk.text.split(/\s+/).length),
        },
      });
    stored++;
  }

  // Prune leftover chunks if an updated article became shorter
  if (stored > 0) {
    await db
      .delete(articleEmbeddings)
      .where(
        and(
          eq(articleEmbeddings.articleId, articleId),
          gte(articleEmbeddings.chunkIndex, chunks.length)
        )
      );
  }

  return stored;
}
