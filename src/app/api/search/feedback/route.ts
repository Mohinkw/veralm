import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { searchQueries } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { query_id, rating } = body ?? {};

    if (typeof query_id !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(query_id) || (rating !== 1 && rating !== -1)) {
      return NextResponse.json({ error: 'Valid query_id and rating required' }, { status: 400 });
    }

    const [updated] = await db.update(searchQueries)
      .set({ userRating: rating })
      .where(eq(searchQueries.id, query_id))
      .returning({ id: searchQueries.id });

    if (!updated) {
      return NextResponse.json({ error: 'Search query not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Feedback recorded' });
  } catch {
    return NextResponse.json({ error: 'Unable to record feedback' }, { status: 500 });
  }
}
