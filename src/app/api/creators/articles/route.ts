import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/request';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;
  const { db, user } = auth;
  const pageText = request.nextUrl.searchParams.get('page') ?? '0';
  if (!/^\d{1,5}$/.test(pageText)) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 });
  const page = Number(pageText);
  const status = request.nextUrl.searchParams.get('status') ?? 'all';
  const statuses = ['all', 'draft', 'pending_review', 'under_ai_review', 'requires_revision', 'approved', 'rejected', 'suspended', 'archived', 'withdrawn'];
  if (!statuses.includes(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim();
  if (search.length > 100) return NextResponse.json({ error: 'Search is too long.' }, { status: 400 });
  let query = db.from('articles').select('id, title, status, word_count, submitted_at, created_at, composite_quality_score, originality_score, ai_probability_score, total_query_contributions, total_earnings_attributed, categories(name), creator_profiles!inner()', { count: 'exact' })
    .eq('creator_profiles.user_id', user.id);
  if (status !== 'all') query = query.eq('status', status);
  if (search) query = query.ilike('title', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 20, page * 20 + 19);
  if (error) return NextResponse.json({ error: 'Could not load articles.' }, { status: 500 });
  return NextResponse.json({ articles: data, count: count ?? 0 }, { headers: { 'Cache-Control': 'private, no-store' } });
}
