import { executeRawSQL } from '@/db/client';
import { createServerClient } from '@/lib/supabase';
import { inngest } from './client';

export const completeArticleWithdrawals = inngest.createFunction(
  { id: 'complete-article-withdrawals', triggers: [{ cron: '*/15 * * * *' }] },
  async () => {
    const { error } = await createServerClient().rpc('complete_article_withdrawals');
    if (error) throw new Error(error.message);

    // Purge vector embeddings for any newly withdrawn articles so they stop appearing in RAG retrieval
    await executeRawSQL(
      `DELETE FROM article_embeddings ae
       USING articles a
       WHERE ae.article_id = a.id AND a.status = 'withdrawn'`
    );
  },
);

export const monitorArticleFreshness = inngest.createFunction(
  { id: 'monitor-article-freshness', triggers: [{ cron: '0 3 * * 1' }] },
  async () => {
    const { error } = await createServerClient().rpc('refresh_article_freshness');
    if (error) throw new Error(error.message);
  },
);
