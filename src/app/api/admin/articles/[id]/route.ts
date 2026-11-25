import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles, categories, creatorProfiles, users } from '@/db/schema';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
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
        reviewNotes: articles.rejectionReason,
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
      { article: row },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Admin Article Detail GET] Error:', err);
    return NextResponse.json({ error: 'Could not load article.' }, { status: 500 });
  }
}
