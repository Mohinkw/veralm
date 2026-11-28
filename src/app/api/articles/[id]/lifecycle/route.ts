import { NextRequest, NextResponse } from 'next/server';
import { isValidUuid, parseJsonObject, requireCreator } from '@/lib/auth/request';
import { deleteArticleEmbeddings, processArticleEmbeddings } from '@/lib/ai';
import { auditArticleSubmission } from '@/lib/ai-detector';
import { executeRawSQL } from '@/db/client';

type Context = { params: Promise<{ id: string }> };

async function handle(request: NextRequest, { params }: Context) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;
  const { db, user, creatorId } = auth;
  const { id } = await params;

  const notFound = () => NextResponse.json({ error: 'Article not found.' }, { status: 404 });
  const failure = () => NextResponse.json({ error: 'Could not access article lifecycle.' }, { status: 500 });
  if (!isValidUuid(id)) return notFound();

  const { data: article, error } = await db
    .from('articles')
    .select(
      'id, creator_id, title, content, status, licensing_status, withdrawal_effective_at, freshness_status, freshness_checked_at, freshness_notes, total_earnings_attributed, total_query_contributions, word_count, submitted_at, revision_instructions, rejection_reason, composite_quality_score, originality_score, ai_probability_score, version_number'
    )
    .eq('id', id)
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (error) return failure();
  if (!article) return notFound();

  if (request.method === 'DELETE') {
    if (article.status !== 'draft' && article.status !== 'rejected' && article.status !== 'requires_revision') {
      return NextResponse.json(
        { error: 'Approved or published articles must use the withdrawal workflow.' },
        { status: 409 }
      );
    }
    await deleteArticleEmbeddings(id).catch(() => null);
    const { error: delErr } = await db
      .from('articles')
      .delete()
      .eq('id', id)
      .eq('creator_id', creatorId);
    if (delErr) return failure();
    return NextResponse.json({ deleted: true });
  }

  if (request.method === 'POST') {
    const parsed = await parseJsonObject(request);
    if ('error' in parsed) return parsed.error;
    const body = parsed.data;
    const action = body.action;

    // 1. Update Draft / Publish Draft
    if (action === 'update_draft' || action === 'publish_draft') {
      if (article.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft articles can be updated with this action.' }, { status: 409 });
      }
      const nextTitle = typeof body.title === 'string' ? body.title.trim() : '';
      const nextContent = typeof body.content === 'string' ? body.content.trim() : '';
      if (!nextTitle || nextTitle.length < 3 || nextTitle.length > 300) {
        return NextResponse.json({ error: 'Title must be 3 to 300 characters.' }, { status: 400 });
      }
      const minLen = action === 'publish_draft' ? 100 : 20;
      if (nextContent.length < minLen || nextContent.length > 200_000) {
        return NextResponse.json(
          { error: `Content must be between ${minLen} and 200,000 characters.` },
          { status: 400 }
        );
      }

      const wordCount = nextContent.split(/\s+/).filter(Boolean).length;
      const excerpt = nextContent.replace(/[#*`>\[\]]+/g, '').replace(/\s+/g, ' ').slice(0, 180).trim();

      if (action === 'update_draft') {
        const { error: updErr } = await db
          .from('articles')
          .update({
            title: nextTitle,
            content: nextContent,
            excerpt,
            word_count: wordCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('creator_id', creatorId)
          .eq('status', 'draft');
        if (updErr) return failure();
        return NextResponse.json({ ok: true, status: 'draft' });
      }

      // publish_draft
      const audit = await auditArticleSubmission(nextTitle, nextContent);
      const nextStatus =
        audit.verdict === 'approved'
          ? 'approved'
          : audit.verdict === 'revision_requested'
            ? 'requires_revision'
            : 'pending_review';

      const { error: pubErr } = await db
        .from('articles')
        .update({
          title: nextTitle,
          content: nextContent,
          excerpt,
          word_count: wordCount,
          status: nextStatus,
          licensing_status: nextStatus === 'approved' ? 'active' : 'pending',
          approved_at: nextStatus === 'approved' ? new Date().toISOString() : null,
          submitted_at: new Date().toISOString(),
          composite_quality_score: audit.compositeQualityScore.toFixed(2),
          originality_score: audit.originalityScore.toFixed(2),
          ai_probability_score: audit.aiProbabilityScore.toFixed(2),
          revision_instructions: nextStatus === 'requires_revision' ? audit.flaggedSignals.join(' ') : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('creator_id', creatorId)
        .eq('status', 'draft');

      if (pubErr) return failure();

      if (nextStatus === 'approved') {
        await executeRawSQL(
          `UPDATE creator_profiles SET total_articles_approved = total_articles_approved + 1 WHERE id = $1`,
          [creatorId]
        ).catch(() => null);
        await processArticleEmbeddings(id, nextContent).catch(() => null);
      }
      return NextResponse.json({ ok: true, status: nextStatus, audit });
    }

    // 2. Revise & Resubmit (from requires_revision) or Update Approved Article (creating version snapshot)
    if (action === 'resubmit' || action === 'update_published') {
      const nextTitle = typeof body.title === 'string' ? body.title.trim() : '';
      const nextContent = typeof body.content === 'string' ? body.content.trim() : '';
      if (!nextTitle || nextTitle.length > 300 || nextContent.length < 150 || nextContent.length > 200_000) {
        return NextResponse.json(
          { error: 'A valid title and at least 150 characters of content are required.' },
          { status: 400 }
        );
      }

      if (action === 'resubmit') {
        if (article.status !== 'requires_revision') {
          return NextResponse.json({ error: 'Article is no longer awaiting revision.' }, { status: 409 });
        }
        await deleteArticleEmbeddings(id).catch(() => null);
        const { data, error: rpcErr } = await db.rpc('resubmit_article', {
          p_article_id: id,
          p_creator_id: creatorId,
          p_title: nextTitle,
          p_content: nextContent,
        });
        if (rpcErr) return failure();
        if (!data) return NextResponse.json({ error: 'Article is no longer awaiting revision.' }, { status: 409 });
        return NextResponse.json({ ok: true, status: 'pending_review' });
      }

      // update_published: save previous version snapshot, run audit, re-index embeddings
      if (article.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved articles can be updated inline.' }, { status: 409 });
      }

      const prevVersion = Number(article.version_number || 1);
      await executeRawSQL(
        `INSERT INTO article_versions (article_id, version_number, title, content, change_summary, changed_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (article_id, version_number) DO NOTHING`,
        [id, prevVersion, article.title, article.content, 'Creator content update', user.id]
      );

      const audit = await auditArticleSubmission(nextTitle, nextContent);
      const nextStatus =
        audit.verdict === 'revision_requested'
          ? 'requires_revision'
          : audit.verdict === 'review_required'
            ? 'pending_review'
            : 'approved';

      const wordCount = nextContent.split(/\s+/).filter(Boolean).length;
      const excerpt = nextContent.replace(/[#*`>\[\]]+/g, '').replace(/\s+/g, ' ').slice(0, 180).trim();

      await executeRawSQL(
        `UPDATE articles
         SET title = $1, content = $2, excerpt = $3, word_count = $4,
             version_number = $5, status = $6,
             licensing_status = $7,
             composite_quality_score = $8, originality_score = $9, ai_probability_score = $10,
             freshness_status = 'current', freshness_checked_at = NOW(), updated_at = NOW()
         WHERE id = $11 AND creator_id = $12`,
        [
          nextTitle,
          nextContent,
          excerpt,
          wordCount,
          prevVersion + 1,
          nextStatus,
          nextStatus === 'approved' ? 'active' : 'pending',
          audit.compositeQualityScore.toFixed(2),
          audit.originalityScore.toFixed(2),
          audit.aiProbabilityScore.toFixed(2),
          id,
          creatorId,
        ]
      );

      if (nextStatus === 'approved') {
        await processArticleEmbeddings(id, nextContent).catch(() => null);
      } else {
        await deleteArticleEmbeddings(id).catch(() => null);
      }

      return NextResponse.json({ ok: true, status: nextStatus });
    }

    // 3. Withdraw approved article (30-day schedule)
    if (action !== 'withdraw') {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }
    if (article.withdrawal_effective_at) {
      return NextResponse.json({ effectiveAt: article.withdrawal_effective_at });
    }
    const effectiveAt = new Date(Date.now() + 30 * 86400_000).toISOString();
    const { data, error: withdrawErr } = await db
      .from('articles')
      .update({ withdrawal_effective_at: effectiveAt })
      .eq('id', id)
      .eq('creator_id', creatorId)
      .eq('status', 'approved')
      .eq('licensing_status', 'active')
      .is('withdrawal_effective_at', null)
      .select('withdrawal_effective_at')
      .maybeSingle();
    if (withdrawErr) return failure();
    if (!data) {
      return NextResponse.json(
        { error: 'Article is no longer eligible or withdrawal was already requested. Refresh to check.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ effectiveAt: data.withdrawal_effective_at });
  }

  const { data: versions, error: versionError } = await db
    .from('article_versions')
    .select('version_number, title, content, change_summary, created_at')
    .eq('article_id', id)
    .order('version_number', { ascending: false });
  if (versionError) return failure();
  return NextResponse.json({ article, versions }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export { handle as GET, handle as POST, handle as DELETE };
