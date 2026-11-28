import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { bearerToken, parseJsonObject } from '@/lib/auth/request';
import { createServerClient } from '@/lib/supabase';
import { executeRawSQL } from '@/db/client';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request);
  if (await isRateLimited(`share:ip:${ip}`, 20)) {
    return NextResponse.json({ error: 'Too many share requests. Please wait.' }, { status: 429 });
  }

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const query = typeof body.query === 'string' ? body.query.trim().slice(0, 2000) : '';
  const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 30000) : '';
  if (!query || !answer) {
    return NextResponse.json({ error: 'Query and answer are required to share.' }, { status: 400 });
  }

  const citations = Array.isArray(body.citations) ? body.citations.slice(0, 12) : [];
  const articles = Array.isArray(body.articles_used) ? body.articles_used.slice(0, 12) : [];

  let userId: string | null = null;
  const token = bearerToken(request);
  if (token) {
    try {
      const db = createServerClient();
      const { data } = await db.auth.getUser(token);
      if (data.user?.id) userId = data.user.id;
    } catch {
      // Allow anonymous share
    }
  }

  const slug = `ans-${crypto.randomBytes(5).toString('hex')}`;

  try {
    await executeRawSQL(
      `INSERT INTO shared_answers (slug, query_text, answer_text, citations_json, articles_json, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
      [slug, query, answer, JSON.stringify(citations), JSON.stringify(articles), userId]
    );
    return NextResponse.json({ slug, url: `/share/${slug}` }, { status: 201 });
  } catch (err) {
    console.error('[Share POST] Error:', err);
    return NextResponse.json({ error: 'Could not create share link.' }, { status: 500 });
  }
}
