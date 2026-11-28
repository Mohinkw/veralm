import { and, gte, eq } from "drizzle-orm";
import { db, executeRawSQL } from "@/db/client";
import { articleEmbeddings } from "@/db/schema";
import { generateEmbedding as generateGeminiEmbedding } from "@/lib/ai-providers";
import { chunkText, chunkTextWithMeta, type ChunkWithMeta } from "@/lib/rag-utils";

export { chunkText, chunkTextWithMeta, type ChunkWithMeta };

export interface ContextualEmbeddingMeta {
  title?: string | null;
  categoryName?: string | null;
  authorName?: string | null;
}

/**
 * Invalidates cached search answers that cite a modified or withdrawn article.
 */
export async function invalidateQueryCacheForArticle(articleId: string): Promise<void> {
  await executeRawSQL(
    `DELETE FROM query_cache WHERE $1::uuid = ANY(articles_cited)`,
    [articleId]
  ).catch(() => null);
}

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
  await invalidateQueryCacheForArticle(articleId);
}

/**
 * Chunk an approved article with contextual retrieval metadata headers,
 * generate 1536d Gemini Free Tier embeddings, upsert chunks, and prune trailing stale chunks.
 */
export async function processArticleEmbeddings(
  articleId: string,
  content: string,
  meta?: ContextualEmbeddingMeta
): Promise<number> {
  const chunks = chunkTextWithMeta(content);
  if (chunks.length === 0) {
    await deleteArticleEmbeddings(articleId);
    return 0;
  }

  const contextPrefixParts: string[] = [];
  if (meta?.title) contextPrefixParts.push(`Article: ${meta.title}`);
  if (meta?.categoryName) contextPrefixParts.push(`Category: ${meta.categoryName}`);
  if (meta?.authorName) contextPrefixParts.push(`Author: ${meta.authorName}`);
  const globalPrefix = contextPrefixParts.join(" | ");

  let stored = 0;

  for (const chunk of chunks) {
    const header = [globalPrefix, chunk.heading ? `Section: ${chunk.heading}` : ""]
      .filter(Boolean)
      .join(" | ");
    const embedding = await generateEmbedding(
      header ? `${header}\n\n${chunk.text}` : chunk.text
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
    await invalidateQueryCacheForArticle(articleId);
  }

  return stored;
}
