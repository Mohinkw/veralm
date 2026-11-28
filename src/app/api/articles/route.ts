import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { inngest } from '@/inngest/client';
import { currentAgreementId, isValidUuid, parseJsonObject, requireCreator } from '@/lib/auth/request';
import { generateSlug, sanitizeHttpUrl } from '@/lib/utils';
import { processArticleEmbeddings } from '@/lib/ai';
import { executeRawSQL } from '@/db/client';
import { auditArticleSubmission } from '@/lib/ai-detector';

const ALLOWED_FORMATS = new Set(['markdown', 'html', 'richtext']);

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const safeBase = baseSlug || `post-${crypto.randomBytes(4).toString('hex')}`;
  const existing = await executeRawSQL(
    `SELECT slug FROM articles WHERE slug = $1 OR slug LIKE $2 LIMIT 20`,
    [safeBase, `${safeBase}-%`]
  );
  const taken = new Set((existing?.rows || []).map((r: { slug: string }) => r.slug));
  if (!taken.has(safeBase)) return safeBase;
  for (let i = 2; i < 100; i++) {
    const candidate = `${safeBase}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${safeBase}-${crypto.randomBytes(3).toString('hex')}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  try {
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const rawContent = typeof body.content === 'string' ? body.content.trim() : '';
    const rawCategoryId = typeof body.category_id === 'string' ? body.category_id.trim() : '';
    const statusArg = body.status === 'draft' ? 'draft' : 'pending_review';
    const contentFormat =
      typeof body.content_format === 'string' && ALLOWED_FORMATS.has(body.content_format)
        ? body.content_format
        : 'markdown';

    if (!rawTitle || rawTitle.length < 3 || rawTitle.length > 300) {
      return NextResponse.json(
        { error: 'Title is required (3 to 300 characters).' },
        { status: 400 }
      );
    }

    if (statusArg === 'draft') {
      if (rawContent.length < 20) {
        return NextResponse.json(
          { error: 'Draft content must be at least 20 characters.' },
          { status: 400 }
        );
      }
    } else if (rawContent.length < 100) {
      return NextResponse.json(
        { error: 'Submitted articles must be at least 100 characters.' },
        { status: 400 }
      );
    }

    if (rawContent.length > 200_000) {
      return NextResponse.json(
        { error: 'Article content exceeds maximum 200,000 character limit.' },
        { status: 400 }
      );
    }

    // Resolve category UUID cleanly
    let validCategoryId: string | null = null;
    if (isValidUuid(rawCategoryId)) {
      const catCheck = await executeRawSQL(
        `SELECT id FROM categories WHERE id = $1 AND is_active = true LIMIT 1`,
        [rawCategoryId]
      );
      if (catCheck?.rows?.length) {
        validCategoryId = catCheck.rows[0].id;
      }
    }
    if (!validCategoryId) {
      return NextResponse.json(
        { error: 'Please select a valid active category.' },
        { status: 400 }
      );
    }

    const cleanTags = Array.isArray(body.tags)
      ? body.tags
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim().slice(0, 50))
          .slice(0, 20)
      : [];

    const cleanImages = Array.isArray(body.images)
      ? body.images
          .map((img) => {
            if (typeof img === 'string') {
              const url = sanitizeHttpUrl(img);
              return url ? { source_url: url, caption: rawTitle, rights_cleared: true } : null;
            }
            if (img && typeof img === 'object' && 'source_url' in img) {
              const obj = img as { source_url?: unknown; caption?: unknown; rights_cleared?: unknown };
              const url = sanitizeHttpUrl(typeof obj.source_url === 'string' ? obj.source_url : '');
              if (!url) return null;
              return {
                source_url: url,
                caption: typeof obj.caption === 'string' ? obj.caption.slice(0, 200) : rawTitle,
                rights_cleared: Boolean(obj.rights_cleared ?? true),
              };
            }
            return null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .slice(0, 15)
      : [];

    const rawExcerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
    const cleanExcerpt =
      rawExcerpt ||
      rawContent
        .replace(/[#*`>\[\]]+/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, 180)
        .trim();

    const slug = await ensureUniqueSlug(generateSlug(rawTitle));
    const wordCount = rawContent.split(/\s+/).filter(Boolean).length;
    const agreementId = await currentAgreementId(auth.db, auth.creatorId);

    let finalStatus: 'draft' | 'approved' | 'pending_review' | 'requires_revision' = 'draft';
    let auditSummary: string | null = null;
    let auditSignals: string[] = [];
    let qualityScoreStr: string | null = null;
    let originalityScoreStr: string | null = null;
    let aiProbScoreStr: string | null = null;
    let verdictStr: string = 'draft';

    if (statusArg !== 'draft') {
      const audit = await auditArticleSubmission(rawTitle, rawContent);
      qualityScoreStr = audit.compositeQualityScore.toFixed(2);
      originalityScoreStr = audit.originalityScore.toFixed(2);
      aiProbScoreStr = audit.aiProbabilityScore.toFixed(2);
      auditSummary = audit.summary;
      auditSignals = audit.flaggedSignals;
      verdictStr = audit.verdict;

      if (audit.verdict === 'approved') {
        finalStatus = 'approved';
      } else if (audit.verdict === 'revision_requested') {
        finalStatus = 'requires_revision';
      } else {
        finalStatus = 'pending_review';
      }
    }

    const approvedAt = finalStatus === 'approved' ? new Date().toISOString() : null;
    const licensingStatus = finalStatus === 'approved' ? 'active' : 'pending';
    const revisionInstructions =
      finalStatus === 'requires_revision' && auditSignals.length > 0
        ? auditSignals.join(' ')
        : null;

    const insertSql = `
      INSERT INTO articles (
        creator_id, category_id, title, slug, content, content_format, excerpt,
        word_count, tags, author_notes, target_audience, references_json, images_json,
        source_links, status, licensing_status, licensing_agreement_id, revision_instructions,
        submitted_at, approved_at, composite_quality_score, originality_score, ai_probability_score, freshness_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'current'
      ) RETURNING id, slug, status
    `;

    const articleRes = await executeRawSQL(insertSql, [
      auth.creatorId,
      validCategoryId,
      rawTitle,
      slug,
      rawContent,
      contentFormat,
      cleanExcerpt,
      wordCount,
      cleanTags,
      typeof body.author_notes === 'string' ? body.author_notes.slice(0, 2000) : null,
      typeof body.target_audience === 'string' ? body.target_audience.slice(0, 300) : null,
      JSON.stringify(Array.isArray(body.references) ? body.references.slice(0, 30) : []),
      JSON.stringify(cleanImages),
      JSON.stringify(Array.isArray(body.source_links) ? body.source_links.slice(0, 30) : []),
      finalStatus,
      licensingStatus,
      agreementId,
      revisionInstructions,
      new Date().toISOString(),
      approvedAt,
      qualityScoreStr,
      originalityScoreStr,
      aiProbScoreStr,
    ]);

    const createdArticle = articleRes?.rows?.[0] as { id: string; slug: string; status: string } | undefined;
    if (!createdArticle) {
      throw new Error('Could not persist article to database.');
    }

    if (finalStatus === 'approved') {
      await executeRawSQL(
        `UPDATE creator_profiles SET total_articles_approved = total_articles_approved + 1 WHERE id = $1`,
        [auth.creatorId]
      ).catch(() => null);

      try {
        await processArticleEmbeddings(createdArticle.id, rawContent);
      } catch (err) {
        console.warn('[Auto-Approve] Embedding generation warning:', err);
      }
    }

    if (finalStatus !== 'draft') {
      try {
        await inngest.send({
          name: finalStatus === 'approved' ? 'article/approved' : 'article/submitted',
          data: {
            articleId: createdArticle.id,
            content: rawContent,
          },
        });
      } catch (inngestErr) {
        console.warn('[Inngest] Background notification warning:', inngestErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        article_id: createdArticle.id,
        slug: createdArticle.slug,
        status: createdArticle.status,
        audit:
          statusArg === 'draft'
            ? null
            : {
                composite_quality_score: Number(qualityScoreStr),
                originality_score: Number(originalityScoreStr),
                ai_probability_score: Number(aiProbScoreStr),
                verdict: verdictStr,
                summary: auditSummary,
                signals: auditSignals,
              },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Articles POST] Error:', error);
    return NextResponse.json({ error: 'Unable to save article.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const rawLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const rawOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

    let query = `
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.word_count, a.tags,
        a.status, a.approved_at, a.composite_quality_score,
        c.name as category_name,
        cp.display_name as author_name, cp.slug as author_slug
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN creator_profiles cp ON a.creator_id = cp.id
      WHERE a.status = 'approved'
        AND a.licensing_status = 'active'
        AND (cp.is_active IS NULL OR cp.is_active = true)
    `;

    const params: unknown[] = [];
    if (category) {
      params.push(category);
      query += ` AND c.slug = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY a.approved_at DESC LIMIT $${params.length}`;

    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const res = await executeRawSQL(query, params);

    return NextResponse.json({
      articles: res?.rows || [],
      pagination: { limit, offset, count: res?.rows?.length || 0 },
    });
  } catch (error) {
    console.error('[Articles GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles.' }, { status: 500 });
  }
}
