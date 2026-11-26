import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, avg, count, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articleRatings, articles } from '@/db/schema';
import { createServerClient } from '@/lib/supabase';

const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

async function resolveRater(request: NextRequest): Promise<{ raterKey: string; userId: string | null }> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (token) {
    try {
      const supabase = createServerClient();
      const { data } = await supabase.auth.getUser(token);
      if (data.user?.id) {
        return { raterKey: `user:${data.user.id}`, userId: data.user.id };
      }
    } catch {
      // fall through to anonymous rater key
    }
  }

  const readerCookie = request.cookies.get('veralm_reader_uid')?.value;
  if (readerCookie && UUID_RE.test(readerCookie)) {
    return { raterKey: `user:${readerCookie}`, userId: readerCookie };
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';
  const hash = crypto.createHash('sha256').update(`${forwarded}|${ua}`).digest('hex').slice(0, 24);
  return { raterKey: `anon:${hash}`, userId: null };
}

async function getStats(articleId: string, raterKey: string) {
  const [agg] = await db
    .select({
      avgRating: avg(articleRatings.rating),
      totalRatings: count(),
    })
    .from(articleRatings)
    .where(eq(articleRatings.articleId, articleId));

  const [own] = await db
    .select({ rating: articleRatings.rating })
    .from(articleRatings)
    .where(and(eq(articleRatings.articleId, articleId), eq(articleRatings.raterKey, raterKey)))
    .limit(1);

  const totalRatings = Number(agg?.totalRatings || 0);
  const averageRating =
    totalRatings > 0 && agg?.avgRating !== null ? Number(Number(agg.avgRating).toFixed(1)) : null;

  return {
    averageRating,
    totalRatings,
    userRating: own?.rating ?? null,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid article ID.' }, { status: 400 });
  }

  try {
    const { raterKey } = await resolveRater(request);
    const stats = await getStats(id, raterKey);
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('[Article Rating GET] Error:', err);
    return NextResponse.json({ error: 'Could not load ratings.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid article ID.' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      return NextResponse.json({ error: 'Rating must be an integer from 1 to 10.' }, { status: 400 });
    }

    const [exists] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!exists) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }

    const { raterKey, userId } = await resolveRater(request);

    await db
      .insert(articleRatings)
      .values({
        articleId: id,
        raterKey,
        userId,
        rating,
      })
      .onConflictDoUpdate({
        target: [articleRatings.articleId, articleRatings.raterKey],
        set: {
          rating,
          updatedAt: new Date(),
        },
      });

    const stats = await getStats(id, raterKey);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[Article Rating POST] Error:', err);
    return NextResponse.json({ error: 'Could not save rating.' }, { status: 500 });
  }
}
