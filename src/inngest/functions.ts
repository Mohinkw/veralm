import { inngest } from "./client";
import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processArticleEmbeddings } from "@/lib/ai";
import { auditArticleSubmission } from "@/lib/ai-detector";

export const verifyArticle = inngest.createFunction(
  { id: "verify-article", triggers: [{ event: "article/submitted" }] },
  async ({ event, step }: any) => {
    const article = await step.run("fetch-article", async () => {
      const [result] = await db
        .select({
          id: articles.id,
          title: articles.title,
          content: articles.content,
          status: articles.status,
          qualityScore: articles.compositeQualityScore,
        })
        .from(articles)
        .where(eq(articles.id, event.data.articleId));
      return result;
    });

    if (!article) return { status: 'not_found' };

    // If quality score is missing or needs asynchronous verification
    if (!article.qualityScore && article.content) {
      const audit = await step.run("run-ai-quality-audit", async () => {
        return await auditArticleSubmission(article.title, article.content);
      });

      await step.run("persist-audit-scores", async () => {
        const nextStatus = audit.verdict === 'approved' ? 'approved' : 'pending_review';
        await db
          .update(articles)
          .set({
            compositeQualityScore: audit.compositeQualityScore.toFixed(2),
            originalityScore: audit.originalityScore.toFixed(2),
            aiProbabilityScore: audit.aiProbabilityScore.toFixed(2),
            status: nextStatus,
            approvedAt: nextStatus === 'approved' ? new Date() : null,
          })
          .where(eq(articles.id, article.id));
      });

      return { status: audit.verdict, audit };
    }

    return { status: article.status === 'pending_review' ? 'human_review' : 'completed' };
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
