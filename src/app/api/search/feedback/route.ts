import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { searchQueries } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { isValidUuid, parseJsonObject } from '@/lib/auth/request';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request);
  if (await isRateLimited(`feedback:ip:${ip}`, 30)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  try {
    const { query_id, rating, session_id } = parsed.data;

    if (!isValidUuid(query_id) || (rating !== 1 && rating !== -1)) {
      return NextResponse.json({ error: 'Valid query_id and rating required' }, { status: 400 });
    }

    const whereClause =
      typeof session_id === 'string' && session_id.trim()
        ? and(eq(searchQueries.id, query_id), eq(searchQueries.sessionId, session_id.trim()))
        : eq(searchQueries.id, query_id);

    const [updated] = await db
      .update(searchQueries)
      .set({ userRating: rating })
      .where(whereClause)
      .returning({ id: searchQueries.id });

    if (!updated) {
      return NextResponse.json({ error: 'Search query not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Feedback recorded' });
  } catch {
    return NextResponse.json({ error: 'Unable to record feedback' }, { status: 500 });
  }
}
