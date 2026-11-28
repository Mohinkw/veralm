import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { parseJsonObject, requireCreator } from '@/lib/auth/request';
import { db } from '@/db/client';
import { auditLog, creatorProfiles } from '@/db/schema';

function parseStoredTaxId(raw: string | null): { taxFormType: 'w9' | 'w8ben' | null; taxIdMasked: string | null } {
  if (!raw) return { taxFormType: null, taxIdMasked: null };
  const [prefix, value] = raw.includes(':') ? raw.split(':', 2) : ['', raw];
  const formType = prefix.toLowerCase() === 'w9' ? 'w9' : prefix.toLowerCase() === 'w8ben' ? 'w8ben' : null;
  const clean = value || raw;
  const masked = clean.length <= 4 ? '****' : `****${clean.slice(-4)}`;
  return { taxFormType: formType, taxIdMasked: masked };
}

export async function GET(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  try {
    const [profile] = await db
      .select({
        taxCountry: creatorProfiles.taxCountry,
        taxId: creatorProfiles.taxId,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.id, auth.creatorId))
      .limit(1);

    const parsed = parseStoredTaxId(profile?.taxId || null);
    return NextResponse.json(
      {
        hasTaxInfo: Boolean(profile?.taxCountry && profile?.taxId),
        taxCountry: profile?.taxCountry || '',
        taxFormType: parsed.taxFormType,
        taxIdMasked: parsed.taxIdMasked,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[TaxInfo GET] Error:', err);
    return NextResponse.json({ error: 'Could not load tax information.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  try {
    const body = parsed.data;
    const taxFormType = body.taxFormType === 'w9' ? 'w9' : body.taxFormType === 'w8ben' ? 'w8ben' : null;
    const taxCountry = typeof body.taxCountry === 'string' ? body.taxCountry.trim() : '';
    const taxId = typeof body.taxId === 'string' ? body.taxId.trim() : '';

    if (!taxFormType) {
      return NextResponse.json({ error: 'Select W-9 or W-8BEN.' }, { status: 400 });
    }
    if (!taxCountry || taxCountry.length < 2 || taxCountry.length > 80) {
      return NextResponse.json({ error: 'Valid tax country is required.' }, { status: 400 });
    }
    if (!taxId || taxId.length < 4 || taxId.length > 40) {
      return NextResponse.json({ error: 'Valid TIN / SSN / Foreign Tax ID is required.' }, { status: 400 });
    }

    const [updated] = await db
      .update(creatorProfiles)
      .set({
        taxCountry,
        taxId: `${taxFormType.toUpperCase()}:${taxId}`,
        updatedAt: new Date(),
      })
      .where(eq(creatorProfiles.id, auth.creatorId))
      .returning({ id: creatorProfiles.id });

    if (!updated) {
      return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
    }

    await db.insert(auditLog).values({
      actorId: auth.user.id,
      actorRole: 'creator',
      action: 'creator.tax_info_updated',
      entityType: 'creator_profiles',
      entityId: updated.id,
      metadata: { taxFormType, taxCountry },
    });

    return NextResponse.json(
      {
        saved: true,
        taxFormType,
        taxCountry,
        taxIdMasked: `****${taxId.slice(-4)}`,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[TaxInfo POST] Error:', err);
    return NextResponse.json({ error: 'Could not save tax information.' }, { status: 500 });
  }
}
