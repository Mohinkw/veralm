import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/request';

type Context = { params: Promise<{ id: string }> };

async function handle(request: NextRequest, { params }: Context) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;
  const { db, user } = auth;
  const { id } = await params;
  const notFound = () => NextResponse.json({ error: 'Article not found.' }, { status: 404 });
  const failure = () => NextResponse.json({ error: 'Could not access article lifecycle.' }, { status: 500 });
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return notFound();
  const { data: article, error } = await db.from('articles')
    .select('id, creator_id, creator_profiles!inner(), title, content, status, licensing_status, withdrawal_effective_at, freshness_status, freshness_checked_at, freshness_notes, total_earnings_attributed, total_query_contributions, word_count, submitted_at, revision_instructions, composite_quality_score, originality_score, ai_probability_score')
    .eq('id', id).eq('creator_profiles.user_id', user.id).maybeSingle();
  if (error) return failure();
  if (!article) return notFound();

  if (request.method === 'POST') {
    let body: { action?: string; title?: unknown; content?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
    if (body?.action === 'resubmit') {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 500 || typeof body.content !== 'string' || body.content.trim().length < 500) {
        return NextResponse.json({ error: 'A title and at least 500 characters of content are required.' }, { status: 400 });
      }
      const { data, error } = await db.rpc('resubmit_article', { p_article_id: id, p_creator_id: article.creator_id, p_title: body.title.trim(), p_content: body.content });
      if (error) return failure();
      if (!data) return NextResponse.json({ error: 'Article is no longer awaiting revision.' }, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    if (body?.action !== 'withdraw') return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    if (article.withdrawal_effective_at) return NextResponse.json({ effectiveAt: article.withdrawal_effective_at });
    const effectiveAt = new Date(Date.now() + 30 * 86400_000).toISOString();
    const { data, error } = await db.from('articles').update({ withdrawal_effective_at: effectiveAt })
      .eq('id', id).eq('creator_id', article.creator_id).eq('status', 'approved')
      .eq('licensing_status', 'active').is('withdrawal_effective_at', null)
      .select('withdrawal_effective_at').maybeSingle();
    if (error) return failure();
    if (!data) return NextResponse.json({ error: 'Article is no longer eligible or withdrawal was already requested. Refresh to check.' }, { status: 409 });
    return NextResponse.json({ effectiveAt: data.withdrawal_effective_at });
  }

  const { data: versions, error: versionError } = await db.from('article_versions')
    .select('version_number, title, content, change_summary, created_at')
    .eq('article_id', id).order('version_number', { ascending: false });
  if (versionError) return failure();
  return NextResponse.json({ article, versions }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export { handle as GET, handle as POST };
