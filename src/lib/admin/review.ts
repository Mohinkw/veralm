import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles, auditLog, creatorProfiles } from '@/db/schema';
import { requireAdmin } from './auth';
import { isValidUuid } from '@/lib/auth/request';
import { deleteArticleEmbeddings, processArticleEmbeddings } from '@/lib/ai';

export async function reviewArticle(
  request: NextRequest,
  articleId: unknown,
  action: unknown,
  notes: unknown,
  version: unknown
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    if (!isValidUuid(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID.' }, { status: 400 });
    }
    if (!Number.isSafeInteger(version) || (version as number) < 1) {
      return NextResponse.json({ error: 'Article version is required.' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject' && action !== 'request_revision') {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }
    if (action !== 'approve' && (typeof notes !== 'string' || !notes.trim() || notes.length > 5000)) {
      return NextResponse.json(
        { error: 'Feedback is required (maximum 5000 characters).' },
        { status: 400 }
      );
    }

    const status =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requires_revision';

    const updated = await db.transaction(async (tx) => {
      const [article] = await tx
        .update(articles)
        .set({
          status,
          reviewedBy: auth.account!.id,
          lastReviewedAt: new Date(),
          approvedAt: action === 'approve' ? new Date() : null,
          licensingStatus: action === 'approve' ? 'active' : 'pending',
          rejectionReason: action === 'reject' ? (notes as string).trim() : null,
          revisionInstructions: action === 'request_revision' ? (notes as string).trim() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(articles.id, articleId),
            inArray(articles.status, ['pending_review', 'under_ai_review']),
            eq(articles.versionNumber, version as number)
          )
        )
        .returning({
          id: articles.id,
          creatorId: articles.creatorId,
          content: articles.content,
        });

      if (!article) return null;

      if (action === 'approve') {
        await tx
          .update(creatorProfiles)
          .set({
            totalArticlesApproved: sql`${creatorProfiles.totalArticlesApproved} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(creatorProfiles.id, article.creatorId));
      }

      await tx.insert(auditLog).values({
        actorId: auth.account!.id,
        actorRole: auth.account!.role,
        action: `article.${action}`,
        entityType: 'article',
        entityId: articleId,
        beforeState: { status: 'pending_review' },
        afterState: { status },
      });

      return article;
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Article not found or no longer awaiting review.' },
        { status: 409 }
      );
    }

    // Keep vector embeddings synchronized with editorial decisions
    if (action === 'approve') {
      await processArticleEmbeddings(updated.id, updated.content).catch((err) => {
        console.warn('[Admin Review] Embedding generation warning:', err);
      });
    } else {
      await deleteArticleEmbeddings(updated.id).catch((err) => {
        console.warn('[Admin Review] Embedding cleanup warning:', err);
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error('[Admin Review] Error:', err);
    return NextResponse.json({ error: 'Could not complete review.' }, { status: 500 });
  }
}
