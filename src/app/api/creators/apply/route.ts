import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSlug } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      country,
      website,
      bio,
      primaryCategory,
      secondaryCategories,
      qualifications,
      yearsExperience,
      agreedToTerms,
      agreedToLicensing,
    } = body;

    // Validate required fields
    if (!fullName || !email || !country || !bio || !primaryCategory || !qualifications) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!agreedToTerms || !agreedToLicensing) {
      return NextResponse.json({ error: 'Must agree to all terms' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'creator',
      },
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const userId = authData.user.id;

    // Create creator profile
    const slugBase = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let slug = slugBase;
    let counter = 0;
    
    while (true) {
      const { data: existing } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existing) break;
      counter++;
      slug = `${slugBase}-${counter}`;
    }

    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('name', primaryCategory)
      .single();

    const { error: profileError } = await supabase
      .from('creator_profiles')
      .insert({
        user_id: userId,
        display_name: fullName,
        slug,
        bio,
        country,
        website_url: website || null,
        primary_categories: [primaryCategory, ...secondaryCategories],
        qualifications,
        years_of_experience: yearsExperience ? parseInt(yearsExperience) : null,
        onboarding_completed: true,
        agreed_to_terms_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Failed to create creator profile' }, { status: 500 });
    }

    // Record licensing agreement acceptance
    const agreementText = `VeraLM Creator Licensing Agreement v1.0 - Accepted on ${new Date().toISOString()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(agreementText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const agreementHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: profileData } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { error: agreementError } = await supabase
      .from('licensing_agreements')
      .insert({
        creator_id: profileData!.id,
        agreement_version: 'v1.0',
        agreement_text_hash: agreementHash,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        is_current: true,
      });

    if (agreementError) {
      console.error('Agreement error:', agreementError);
    }

    // Send welcome email (would integrate with Resend)
    // await sendWelcomeEmail(email, fullName);

    return NextResponse.json({ 
      success: true, 
      message: 'Application submitted successfully',
      creator_slug: slug,
    });
  } catch (error) {
    console.error('Creator application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}