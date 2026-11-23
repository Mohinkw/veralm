import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { supabase, createServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/utils';
import { bearerToken } from '@/lib/auth/request';

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

    // Validate required fields
    if (!title || !content || !category_id || !excerpt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (content.length < 500) {
      return NextResponse.json({ error: 'Content must be at least 500 characters' }, { status: 400 });
    }

    const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
      ? createServerClient()
      : supabase;

    // Authenticate user via bearer token or fallback
    const token = bearerToken(request);
    let creatorId: string | null = null;

    if (token) {
      const { data: { user }, error: authError } = await dbClient.auth.getUser(token);
      if (!authError && user) {
        let { data: profile } = await dbClient
          .from('creator_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) {
          // Auto-provision creator profile for universal user account
          const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Creator';
          const slugBase = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'creator';
          const slug = `${slugBase}-${user.id.slice(0, 8)}`;
          const { data: newProfile } = await dbClient
            .from('creator_profiles')
            .insert({
              user_id: user.id,
              display_name: displayName,
              slug,
              bio: 'VeraLM Verified Knowledge Contributor',
              primary_categories: ['Technology'],
              onboarding_completed: true,
              is_active: true,
            })
            .select('id')
            .maybeSingle();
          if (newProfile) profile = newProfile;
        }

        creatorId = profile?.id ?? null;
      }
    }

    // Fallback: If no creator profile yet (e.g. demo mode or initial submission), find or create the primary creator profile
    if (!creatorId) {
      const { data: defaultProfile } = await dbClient
        .from('creator_profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      creatorId = defaultProfile?.id ?? null;
    }

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator profile required. Please complete creator setup.' }, { status: 403 });
    }

    // Generate slug
    const slug = generateSlug(title);

    // Calculate word count
    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;

    // Create article
    const { data: article, error: articleError } = await dbClient
      .from('articles')
      .insert({
        creator_id: creatorId,
        category_id,
        title,
        slug,
        content,
        content_format: content_format || 'markdown',
        excerpt,
        word_count: wordCount,
        tags: tags || [],
        author_notes: author_notes || null,
        target_audience: target_audience || null,
        references_json: references || [],
        images_json: images || [],
        source_links: source_links || [],
        original_created_at: original_created_at || null,
        status: status || 'pending_review',
        licensing_status: 'active',
        submitted_at: new Date().toISOString(),
      })
      .select('id, slug, status')
      .single();

    if (articleError) {
      console.error('Article creation error:', articleError);
      return NextResponse.json({ error: 'Failed to create article: ' + articleError.message }, { status: 500 });
    }

    // If submitting for review, enqueue verification job
    if (status === 'pending_review') {
      await inngest.send({
        name: 'article/submitted',
        data: {
          articleId: article.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      article_id: article.id,
      slug: article.slug,
      status: article.status,
    });
  } catch (error) {
    console.error('Article API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');
    const slug = searchParams.get('slug');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator profile
    const { data: profile, error: profileError } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    let query = supabase
      .from('articles')
      .select(`
        id, title, slug, excerpt, status, word_count, tags,
        category_id, submitted_at, approved_at, updated_at,
        composite_quality_score, originality_score, ai_probability_score,
        freshness_status, total_query_contributions, total_earnings_attributed,
        categories (name, slug)
      `)
      .eq('creator_id', profile.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (articleId) {
      query = query.eq('id', articleId);
    }
    if (slug) {
      query = query.eq('slug', slug);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('Articles fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Articles GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { article_id, ...updates } = body;

    if (!article_id) {
      return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator profile
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    // Verify ownership
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, creator_id, version_number')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (article.creator_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create version history if content changed
    if (updates.content || updates.title) {
      const { data: currentArticle } = await supabase
        .from('articles')
        .select('title, content')
        .eq('id', article_id)
        .single();

      if (currentArticle) {
        await supabase
          .from('article_versions')
          .insert({
            article_id,
            version_number: article.version_number + 1,
            title: currentArticle.title,
            content: currentArticle.content,
            change_summary: updates.change_summary || 'Updated via editor',
            changed_by: user.id,
          });

        updates.version_number = article.version_number + 1;
      }
    }

    // Update article
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', article_id)
      .select('id, slug, status')
      .single();

    if (updateError) {
      console.error('Article update error:', updateError);
      return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      article: updatedArticle,
    });
  } catch (error) {
    console.error('Article PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}