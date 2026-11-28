import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, avg, count, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articleRatings, articles, users } from '@/db/schema';
import { createServerClient } from '@/lib/supabase';
import { isValidUuid, parseJsonObject } from '@/lib/auth/request';
import { verifySignedSessionCookie } from '@/lib/citation-token';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';

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
      // fall through
    }
  }

  // Only accept cryptographically signed reader cookie
  const signedReader = request.cookies.get('veralm_reader_uid')?.value;
  const verifiedUid = verifySignedSessionCookie(signedReader);
  if (verifiedUid) {
    return { raterKey: `user:${verifiedUid}`, userId: verifiedUid };
  }

  const ip = extractClientIp(request);
  const ua = request.headers.get('user-agent') || 'unknown';
  const hash = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 24);
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
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid article ID.' }, { status: 400 });
  }

  try {
    const [art] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, id), eq(articles.status, 'approved')))
      .limit(1);

    if (!art) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }

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
  const ip = extractClientIp(request);
  if (await isRateLimited(`rating:ip:${ip}`, 30)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid article ID.' }, { status: 400 });
  }

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  try {
    const rating = Number(parsed.data.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      return NextResponse.json({ error: 'Rating must be an integer from 1 to 10.' }, { status: 400 });
    }

    const [exists] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, id), eq(articles.status, 'approved')))
      .limit(1);

    if (!exists) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }

    const { raterKey, userId } = await resolveRater(request);

    // Ensure user FK exists if rating as a signed-in user whose public.users row wasn't created yet
    let safeUserId: string | null = null;
    if (userId) {
      const [uRow] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      safeUserId = uRow ? userId : null;
    }

    await db
      .insert(articleRatings)
      .values({
        articleId: id,
        raterKey,
        userId: safeUserId,
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
