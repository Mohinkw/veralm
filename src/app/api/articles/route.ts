import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { inngest } from '@/inngest/client';
import { supabase, createServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/utils';
import { bearerToken } from '@/lib/auth/request';
import { processArticleEmbeddings } from '@/lib/ai';
import { executeRawSQL } from '@/db/client';
import { auditArticleSubmission } from '@/lib/ai-detector';

const FALLBACK_CREATOR_ID = '8ac8b4f3-b3b8-4d23-9c3f-d3900f84c375';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      content_format,
      excerpt,
      category_id,
      tags,
      author_notes,
      target_audience,
      references,
      images,
      source_links,
      original_created_at,
      status,
    } = body;

    // Validate core required fields
    if (!title || !content || !category_id) {
      return NextResponse.json({ error: 'Title, category, and content are required' }, { status: 400 });
    }

    // Auto-generate clean excerpt from content if not explicitly provided
    const cleanExcerpt = excerpt || content.replace(/^[#*`>\s\n]+/, '').slice(0, 180).trim();

    if (content.length < 100) {
      return NextResponse.json({ error: 'Content must be at least 100 characters' }, { status: 400 });
    }

    // Authenticate user via bearer token or fallback
    const token = bearerToken(request);
    let creatorId: string | null = null;

    if (token) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          // 1. Ensure user exists in users table
          await executeRawSQL(
            `INSERT INTO users (id, email, role, is_active)
             VALUES ($1, $2, 'creator', true)
             ON CONFLICT (id) DO UPDATE SET is_active = true`,
            [user.id, user.email || `${user.id}@veralm.user`]
          ).catch(() => null);

          // 2. Check for existing creator profile in PG
          const profileRes = await executeRawSQL(
            `SELECT id FROM creator_profiles WHERE user_id = $1 LIMIT 1`,
            [user.id]
          ).catch(() => null);

          if (profileRes?.rows && profileRes.rows.length > 0) {
            creatorId = profileRes.rows[0].id;
          } else {
            // Auto-provision creator profile directly via PG
            const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Alpha';
            const slugBase = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'creator';
            const slug = `${slugBase}-${user.id.slice(0, 8)}`;
            const newProfRes = await executeRawSQL(
              `INSERT INTO creator_profiles (user_id, display_name, slug, bio, primary_categories, onboarding_completed, is_active)
               VALUES ($1, $2, $3, $4, $5, true, true)
               RETURNING id`,
              [user.id, displayName, slug, 'VeraLM Verified Knowledge Contributor', ['Technology']]
            ).catch(() => null);

            if (newProfRes?.rows && newProfRes.rows.length > 0) {
              creatorId = newProfRes.rows[0].id;
            }
          }
        }
      } catch (err) {
        console.warn('[Articles API] Token user resolution warning:', err);
      }
    }

    // Fallback 1: Query any existing creator profile via direct PG
    if (!creatorId) {
      try {
        const anyProf = await executeRawSQL(`SELECT id FROM creator_profiles LIMIT 1`);
        if (anyProf?.rows && anyProf.rows.length > 0) {
          creatorId = anyProf.rows[0].id;
        }
      } catch (err) {
        console.warn('[Articles API] Existing profile lookup warning:', err);
      }
    }

    // Fallback 2: Query via Supabase Service Client (HTTPS REST, port 443)
    if (!creatorId) {
      try {
        const adminClient = createServerClient();
        const { data: profs } = await adminClient.from('creator_profiles').select('id').limit(1);
        if (profs && profs.length > 0) {
          creatorId = profs[0].id;
        }
      } catch (adminErr) {
        console.warn('[Articles API] Supabase admin client fallback warning:', adminErr);
      }
    }

    // Ultimate Fail-safe: Use known verified creator profile ID
    if (!creatorId) {
      creatorId = FALLBACK_CREATOR_ID;
    }

    // Sanitize category_id so non-UUID values do not break PostgreSQL
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let validCategoryId: string | null = null;
    if (category_id && uuidRegex.test(String(category_id))) {
      validCategoryId = category_id;
    } else {
      try {
        const catRes = await executeRawSQL(`SELECT id FROM categories LIMIT 1`);
        if (catRes?.rows && catRes.rows.length > 0) {
          validCategoryId = catRes.rows[0].id;
        }
      } catch {
        validCategoryId = null;
      }
    }

    // Generate slug & calculate word count
    const slug = generateSlug(title);
    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;

    // Run dual-engine data validation, AI detection, and quality assessment
    const audit = await auditArticleSubmission(title, content);

    // Determine status: Drafts stay as drafts. Submitted articles are approved if quality standards pass.
    let finalStatus = 'pending_review';
    if (status === 'draft') {
      finalStatus = 'draft';
    } else if (audit.verdict === 'approved') {
      finalStatus = 'approved';
    } else {
      finalStatus = 'pending_review';
    }

    const approvedAt = finalStatus === 'approved' ? new Date().toISOString() : null;

    // Real dynamic quality scores calculated by the AI detector and heuristics engine
    const qualityScoreStr = audit.compositeQualityScore.toFixed(2);
    const originalityScoreStr = audit.originalityScore.toFixed(2);
    const aiProbScoreStr = audit.aiProbabilityScore.toFixed(2);

    // Insert article (Dual-engine: Direct PG first, HTTPS REST fallback)
    let createdArticle: { id: string; slug: string; status: string } | null = null;

    const insertSql = `
      INSERT INTO articles (
        creator_id, category_id, title, slug, content, content_format, excerpt,
        word_count, tags, author_notes, target_audience, references_json, images_json,
        source_links, original_created_at, status, licensing_status, submitted_at,
        approved_at, composite_quality_score, originality_score, ai_probability_score, freshness_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING id, slug, status
    `;

    try {
      const articleRes = await executeRawSQL(insertSql, [
        creatorId,
        validCategoryId,
        title,
        slug,
        content,
        content_format || 'markdown',
        cleanExcerpt,
        wordCount,
        tags || [],
        author_notes || null,
        target_audience || null,
        JSON.stringify(references || []),
        JSON.stringify(images || []),
        JSON.stringify(source_links || []),
        original_created_at || null,
        finalStatus,
        'active',
        new Date().toISOString(),
        approvedAt,
        qualityScoreStr,
        originalityScoreStr,
        aiProbScoreStr,
        'current',
      ]);

      if (articleRes?.rows && articleRes.rows.length > 0) {
        createdArticle = articleRes.rows[0];
      }
    } catch (pgErr: any) {
      console.warn('[Articles API] Direct PG insert warning, trying HTTP REST fallback:', pgErr?.message || pgErr);
    }

    // Fallback: Insert via createServerClient HTTP REST
    if (!createdArticle) {
      const adminClient = createServerClient();
      const { data: art, error: restErr } = await adminClient
        .from('articles')
        .insert({
          creator_id: creatorId,
          category_id: validCategoryId,
          title,
          slug,
          content,
          content_format: content_format || 'markdown',
          excerpt: cleanExcerpt,
          word_count: wordCount,
          tags: tags || [],
          author_notes: author_notes || null,
          target_audience: target_audience || null,
          references_json: references || [],
          images_json: images || [],
          source_links: source_links || [],
          original_created_at: original_created_at || null,
          status: finalStatus,
          licensing_status: 'active',
          submitted_at: new Date().toISOString(),
          approved_at: approvedAt,
          composite_quality_score: qualityScoreStr,
          originality_score: originalityScoreStr,
          ai_probability_score: aiProbScoreStr,
          freshness_status: 'current',
        })
        .select('id, slug, status')
        .single();

      if (restErr) {
        console.error('[Articles API] Rest insert error:', restErr);
        throw new Error(restErr.message || 'Failed to save article');
      }
      createdArticle = art;
    }

    if (!createdArticle) {
      throw new Error('Could not persist article to database.');
    }

    // Increment approved article counter on creator profile if approved
    if (finalStatus === 'approved') {
      executeRawSQL(
        `UPDATE creator_profiles SET total_articles_approved = total_articles_approved + 1 WHERE id = $1`,
        [creatorId]
      ).catch(() => null);

      // Generate vector embeddings in background so article immediately powers the VeraLM AI Model
      try {
        processArticleEmbeddings(createdArticle.id, content).catch((err) => {
          console.warn('[Auto-Approve] Embedding generation warning:', err?.message || err);
        });
      } catch (err) {
        console.warn('[Auto-Approve] Embeddings trigger skipped:', err);
      }
    }

    // Safely notify Inngest if configured
    try {
      await inngest.send({
        name: finalStatus === 'approved' ? 'article/approved' : 'article/submitted',
        data: {
          articleId: createdArticle.id,
          content,
        },
      });
    } catch (inngestErr) {
      console.warn('[Inngest] Background notification warning:', inngestErr);
    }

    return NextResponse.json({
      success: true,
      article_id: createdArticle.id,
      slug: createdArticle.slug,
      status: createdArticle.status,
      audit: {
        composite_quality_score: audit.compositeQualityScore,
        originality_score: audit.originalityScore,
        ai_probability_score: audit.aiProbabilityScore,
        verdict: audit.verdict,
        summary: audit.summary,
        signals: audit.flaggedSignals,
      },
    });
  } catch (error: any) {
    console.error('Article API error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

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
    `;

    const params: any[] = [];
    if (category) {
      params.push(category);
      query += ` AND c.slug = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY a.approved_at DESC LIMIT $${params.length}`;

    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const res = await executeRawSQL(query, params).catch(() => null);

    return NextResponse.json({
      articles: res?.rows || [],
      pagination: { limit, offset, count: res?.rows?.length || 0 },
    });
  } catch (error: any) {
    console.error('Get articles error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch articles' }, { status: 500 });
  }
}
