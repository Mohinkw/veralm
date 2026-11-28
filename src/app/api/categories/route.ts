import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories } from '@/db/schema';

export async function GET() {
  try {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return NextResponse.json({ categories: rows });
  } catch (err) {
    console.error('[Categories GET] Error:', err);
    return NextResponse.json({ error: 'Could not load categories.' }, { status: 500 });
  }
}
