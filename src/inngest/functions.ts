import { inngest } from "./client";
import { db } from "@/db/client";
import { articles, creatorProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { deleteArticleEmbeddings, processArticleEmbeddings } from "@/lib/ai";
import { auditArticleSubmission } from "@/lib/ai-detector";

export const verifyArticle = inngest.createFunction(
  { id: "verify-article", triggers: [{ event: "article/submitted" }] },
  async ({ event, step }: any) => {
    const article = await step.run("fetch-article", async () => {
      const [result] = await db
        .select({
          id: articles.id,
          creatorId: articles.creatorId,
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

    if (!article.qualityScore && article.content) {
      const audit = await step.run("run-ai-quality-audit", async () => {
        return await auditArticleSubmission(article.title, article.content);
      });

      const nextStatus =
        audit.verdict === 'approved'
          ? 'approved'
          : audit.verdict === 'revision_requested'
            ? 'requires_revision'
            : 'pending_review';

      await step.run("persist-audit-scores", async () => {
        await db
          .update(articles)
          .set({
            compositeQualityScore: audit.compositeQualityScore.toFixed(2),
            originalityScore: audit.originalityScore.toFixed(2),
            aiProbabilityScore: audit.aiProbabilityScore.toFixed(2),
            status: nextStatus,
            licensingStatus: nextStatus === 'approved' ? 'active' : 'pending',
            approvedAt: nextStatus === 'approved' ? new Date() : null,
            revisionInstructions: nextStatus === 'requires_revision' ? audit.flaggedSignals.join(' ') : null,
          })
          .where(eq(articles.id, article.id));

        if (nextStatus === 'approved') {
          await db
            .update(creatorProfiles)
            .set({ totalArticlesApproved: sql`${creatorProfiles.totalArticlesApproved} + 1` })
            .where(eq(creatorProfiles.id, article.creatorId));
        }
      });

      if (nextStatus === 'approved') {
        await step.run("index-approved-article", async () => {
          return await processArticleEmbeddings(article.id, article.content);
        });
      } else {
        await step.run("purge-non-approved-embeddings", async () => {
          await deleteArticleEmbeddings(article.id);
        });
      }

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
