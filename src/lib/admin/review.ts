import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles, auditLog } from '@/db/schema';
import { requireAdmin } from './auth';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function reviewArticle(request: NextRequest, articleId: unknown, action: unknown, notes: unknown, version: unknown) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    if (typeof articleId !== 'string' || !uuid.test(articleId)) return NextResponse.json({ error: 'Invalid article ID.' }, { status: 400 });
    if (!Number.isSafeInteger(version) || (version as number) < 1) return NextResponse.json({ error: 'Article version is required.' }, { status: 400 });
    if (action !== 'approve' && action !== 'reject' && action !== 'request_revision') return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    if (action !== 'approve' && (typeof notes !== 'string' || !notes.trim() || notes.length > 5000)) return NextResponse.json({ error: 'Feedback is required (maximum 5000 characters).' }, { status: 400 });
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requires_revision';
    const changed = await db.transaction(async tx => {
      const [article] = await tx.update(articles).set({
        status,
        reviewedBy: auth.account!.id,
        lastReviewedAt: new Date(),
        approvedAt: action === 'approve' ? new Date() : null,
        licensingStatus: action === 'approve' ? 'active' : 'pending',
        rejectionReason: action === 'reject' ? (notes as string).trim() : null,
        revisionInstructions: action === 'request_revision' ? (notes as string).trim() : null,
      }).where(and(eq(articles.id, articleId), eq(articles.status, 'pending_review'), eq(articles.versionNumber, version as number))).returning({ id: articles.id });
      if (!article) return false;
      await tx.insert(auditLog).values({ actorId: auth.account!.id, actorRole: auth.account!.role, action: `article.${action}`, entityType: 'article', entityId: articleId, beforeState: { status: 'pending_review' }, afterState: { status } });
      return true;
    });
    if (!changed) return NextResponse.json({ error: 'Article not found or no longer awaiting review.' }, { status: 409 });
    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: 'Could not complete review.' }, { status: 500 });
  }
}
