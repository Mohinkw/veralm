import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { parseJsonObject, requireCreator } from '@/lib/auth/request';
import { sanitizeHttpUrl } from '@/lib/utils';
import { db } from '@/db/client';
import { creatorProfiles, users } from '@/db/schema';

export async function GET(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  try {
    const [profile] = await db
      .select({
        id: creatorProfiles.id,
        displayName: creatorProfiles.displayName,
        slug: creatorProfiles.slug,
        bio: creatorProfiles.bio,
        websiteUrl: creatorProfiles.websiteUrl,
        primaryCategories: creatorProfiles.primaryCategories,
        verifiedDomain: creatorProfiles.verifiedDomain,
        verificationBadges: creatorProfiles.verificationBadges,
        reputationScore: creatorProfiles.reputationScore,
        reputationTier: creatorProfiles.reputationTier,
        totalArticlesApproved: creatorProfiles.totalArticlesApproved,
        totalQueryContributions: creatorProfiles.totalQueryContributions,
        email: users.email,
      })
      .from(creatorProfiles)
      .innerJoin(users, eq(creatorProfiles.userId, users.id))
      .where(eq(creatorProfiles.id, auth.creatorId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { profile },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[Creator Profile GET] Error:', err);
    return NextResponse.json({ error: 'Could not load profile.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  try {
    const body = parsed.data;
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
    const rawWebsite = typeof body.website === 'string' ? body.website.trim() : '';
    const primaryNiche = typeof body.primaryNiche === 'string' ? body.primaryNiche.trim() : '';
    const rawDomain = typeof body.verifiedDomain === 'string' ? body.verifiedDomain.trim().toLowerCase() : '';
    const rawBadges = Array.isArray(body.verificationBadges)
      ? body.verificationBadges
      : typeof body.verificationBadges === 'string'
        ? body.verificationBadges.split(',')
        : [];
    const badgesList = rawBadges
      .map((b) => (typeof b === 'string' ? b.trim() : ''))
      .filter((b) => b.length > 0 && b.length <= 40)
      .slice(0, 6);
    const verificationBadges: Record<string, string | boolean> = badgesList.length > 0
      ? { credentials: badgesList.join(', ') }
      : {};

    let verifiedDomain: string | null = null;
    if (rawDomain) {
      const cleaned = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned) || cleaned.length > 120) {
        return NextResponse.json(
          { error: 'Verified domain must be a valid hostname (e.g. stanford.edu).' },
          { status: 400 }
        );
      }
      verifiedDomain = cleaned;
    }

    if (!displayName || displayName.length > 100) {
      return NextResponse.json({ error: 'Display name is required (max 100 chars).' }, { status: 400 });
    }
    if (bio.length > 2000) {
      return NextResponse.json({ error: 'Bio must be 2,000 characters or less.' }, { status: 400 });
    }

    let safeWebsite: string | null = null;
    if (rawWebsite) {
      safeWebsite = sanitizeHttpUrl(rawWebsite);
      if (!safeWebsite) {
        return NextResponse.json(
          { error: 'Website must be a valid http:// or https:// URL.' },
          { status: 400 }
        );
      }
    }

    const categoriesArr = primaryNiche
      ? primaryNiche
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 6)
      : ['Technology'];

    const [updated] = await db
      .update(creatorProfiles)
      .set({
        displayName,
        bio: bio || null,
        websiteUrl: safeWebsite,
        primaryCategories: categoriesArr,
        verifiedDomain,
        verificationBadges,
        updatedAt: new Date(),
      })
      .where(eq(creatorProfiles.id, auth.creatorId))
      .returning({
        id: creatorProfiles.id,
        displayName: creatorProfiles.displayName,
        slug: creatorProfiles.slug,
        bio: creatorProfiles.bio,
        websiteUrl: creatorProfiles.websiteUrl,
        primaryCategories: creatorProfiles.primaryCategories,
      });

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error('[Creator Profile PATCH] Error:', err);
    return NextResponse.json({ error: 'Could not update profile.' }, { status: 500 });
  }
}
