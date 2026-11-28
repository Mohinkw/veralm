import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { parseJsonObject } from '@/lib/auth/request';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';
import { generateSlug, sanitizeHttpUrl } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request);
  if (await isRateLimited(`apply:ip:${ip}`, 5)) {
    return NextResponse.json(
      { error: 'Too many applications from this IP. Please try again later.' },
      { status: 429 }
    );
  }

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  const db = createServerClient();

  try {
    const body = parsed.data;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const country = typeof body.country === 'string' ? body.country.trim() : '';
    const websiteRaw = typeof body.website === 'string' ? body.website.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
    const primaryCategory = typeof body.primaryCategory === 'string' ? body.primaryCategory.trim() : '';
    const secondaryCategories = Array.isArray(body.secondaryCategories)
      ? body.secondaryCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : [];
    const qualifications = typeof body.qualifications === 'string' ? body.qualifications.trim() : '';
    const yearsExperience = body.yearsExperience;
    const agreedToTerms = body.agreedToTerms === true;
    const agreedToLicensing = body.agreedToLicensing === true;

    if (!fullName || !EMAIL_RE.test(email) || !country || !bio || !primaryCategory || !qualifications) {
      return NextResponse.json({ error: 'All required fields must be filled out validly.' }, { status: 400 });
    }
    if (!agreedToTerms || !agreedToLicensing) {
      return NextResponse.json({ error: 'Must agree to Terms of Service and Licensing Agreement.' }, { status: 400 });
    }

    let safeWebsite: string | null = null;
    if (websiteRaw) {
      safeWebsite = sanitizeHttpUrl(websiteRaw);
      if (!safeWebsite) {
        return NextResponse.json({ error: 'Website must be a valid http:// or https:// URL.' }, { status: 400 });
      }
    }

    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Create auth user requiring email verification / password recovery before sign-in
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        role: 'creator',
      },
    });

    if (authError || !authData.user) {
      console.error('[Creator Apply] Auth creation error:', authError);
      return NextResponse.json({ error: 'Failed to submit application.' }, { status: 400 });
    }

    const userId = authData.user.id;

    // Insert public.users row before creator_profiles FK
    const { error: userRowError } = await db.from('users').insert({
      id: userId,
      email,
      role: 'creator',
      is_active: true,
    });
    if (userRowError) {
      await db.auth.admin.deleteUser(userId).catch(() => null);
      return NextResponse.json({ error: 'Failed to provision user record.' }, { status: 500 });
    }

    const slugBase = generateSlug(fullName) || 'creator';
    const slug = `${slugBase}-${userId.slice(0, 8)}`;

    const parsedYears =
      yearsExperience !== undefined && yearsExperience !== null && String(yearsExperience).trim() !== ''
        ? Number.parseInt(String(yearsExperience), 10)
        : null;

    const { data: createdProfile, error: profileError } = await db
      .from('creator_profiles')
      .insert({
        user_id: userId,
        display_name: fullName.slice(0, 100),
        slug,
        bio: bio.slice(0, 2000),
        country: country.slice(0, 80),
        website_url: safeWebsite,
        primary_categories: Array.from(new Set([primaryCategory, ...secondaryCategories])).slice(0, 8),
        qualifications: qualifications.slice(0, 500),
        years_of_experience: parsedYears !== null && Number.isFinite(parsedYears) ? parsedYears : null,
        onboarding_completed: true,
        agreed_to_terms_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (profileError || !createdProfile) {
      console.error('[Creator Apply] Profile error:', profileError);
      await Promise.allSettled([
        db.from('users').delete().eq('id', userId),
        db.auth.admin.deleteUser(userId),
      ]);
      return NextResponse.json({ error: 'Failed to create creator profile.' }, { status: 500 });
    }

    const agreementText = `VeraLM Creator Licensing Agreement v1.1 - Accepted on ${new Date().toISOString()}`;
    const agreementHash = crypto.createHash('sha256').update(agreementText).digest('hex');
    const cleanIp = ip === 'unknown-ip' ? null : ip;

    const { error: agreementError } = await db.from('licensing_agreements').insert({
      creator_id: createdProfile.id,
      agreement_version: 'v1.1',
      agreement_text_hash: agreementHash,
      ip_address: cleanIp,
      user_agent: (request.headers.get('user-agent') || 'unknown').slice(0, 500),
      is_current: true,
    });

    if (agreementError) {
      console.error('[Creator Apply] Agreement error:', agreementError);
      return NextResponse.json(
        { error: 'Failed to record licensing agreement acceptance.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully',
        creator_slug: slug,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Creator Apply] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
