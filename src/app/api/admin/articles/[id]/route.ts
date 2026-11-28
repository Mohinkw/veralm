import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles, categories, creatorProfiles, users } from '@/db/schema';
import { requireAdmin } from '@/lib/admin/auth';
import { isValidUuid } from '@/lib/auth/request';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid article ID.' }, { status: 400 });
    }

    const [row] = await db
      .select({
        id: articles.id,
        title: articles.title,
        excerpt: articles.excerpt,
        content: articles.content,
        wordCount: articles.wordCount,
        status: articles.status,
        version: articles.versionNumber,
        submittedAt: articles.submittedAt,
        createdAt: articles.createdAt,
        compositeQualityScore: articles.compositeQualityScore,
        originalityScore: articles.originalityScore,
        aiProbabilityScore: articles.aiProbabilityScore,
        rejectionReason: articles.rejectionReason,
        revisionInstructions: articles.revisionInstructions,
        authorName: creatorProfiles.displayName,
        authorEmail: users.email,
        categoryName: categories.name,
      })
      .from(articles)
      .innerJoin(creatorProfiles, eq(articles.creatorId, creatorProfiles.id))
      .innerJoin(users, eq(creatorProfiles.userId, users.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(eq(articles.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }

    return NextResponse.json(
      {
        article: {
          ...row,
          reviewNotes: row.rejectionReason || row.revisionInstructions || null,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Admin Article Detail GET] Error:', err);
    return NextResponse.json({ error: 'Could not load article.' }, { status: 500 });
  }
}
