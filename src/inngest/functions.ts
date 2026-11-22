import { inngest } from "./client";
import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processArticleEmbeddings } from "@/lib/ai";

export const verifyArticle = inngest.createFunction(
  { id: "verify-article", triggers: [{ event: "article/submitted" }] },
  async ({ event, step }: any) => {
    // Unconfigured checks must not invent scores or disclose article content.
    const article = await step.run("check-review-queue", async () => {
      const [result] = await db.select({ status: articles.status }).from(articles)
        .where(eq(articles.id, event.data.articleId));
      return result;
    });
    return { status: article?.status === 'pending_review' ? 'human_review' : 'skipped' };
  }
);

export const processEmbedding = inngest.createFunction(
  { id: "process-embedding", triggers: [{ event: "article/approved" }] },
  async ({ event, step }: any) => {
    const { articleId, content } = event.data;

    const chunkCount = await step.run("generate-and-store-embeddings", async () => {
      return await processArticleEmbeddings(articleId, content);
    });

    return { status: "success", articleId, chunkCount };
  }
);
