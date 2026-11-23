import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { verifyArticle, processEmbedding } from "@/inngest/functions";
import { completeArticleWithdrawals, monitorArticleFreshness } from "@/inngest/article-lifecycle";

// Create an API that serves zero-infrastructure background functions
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    verifyArticle,
    processEmbedding,
    completeArticleWithdrawals,
    monitorArticleFreshness,
  ],
});
