import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { articles, creatorProfiles, categories } from '@/db/schema';
import { eq, inArray, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const results = await db
      .select({
        id: articles.id,
        version: articles.versionNumber,
        title: articles.title,
        content: articles.content,
        author_name: creatorProfiles.displayName,
        category_name: categories.name,
        submitted_at: articles.submittedAt,
        word_count: articles.wordCount,
        composite_quality_score: articles.compositeQualityScore,
        originality_score: articles.originalityScore,
        ai_probability_score: articles.aiProbabilityScore,
        status: articles.status,
      })
      .from(articles)
      .innerJoin(creatorProfiles, eq(articles.creatorId, creatorProfiles.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(inArray(articles.status, ['pending_review', 'under_ai_review']))
      .orderBy(asc(articles.submittedAt))
      .limit(100);

    return NextResponse.json(
      { articles: results },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Admin Queue GET] Error:', err);
    return NextResponse.json({ error: 'Could not load review queue.' }, { status: 500 });
  }
}
