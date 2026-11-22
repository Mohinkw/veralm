import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { articles } from '@/db/schema';
import { count, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const [total] = await db.select({ value: count() }).from(articles);
    const [pending] = await db.select({ value: count() }).from(articles).where(eq(articles.status, 'pending_review'));
    const [approved] = await db.select({ value: count() }).from(articles).where(eq(articles.status, 'approved'));
    const [rejected] = await db.select({ value: count() }).from(articles).where(eq(articles.status, 'rejected'));
    return NextResponse.json({ stats: { total_articles: total.value, pending_review: pending.value, approved: approved.value, rejected: rejected.value } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load statistics.' }, { status: 500 });
  }
}
