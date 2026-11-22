import { NextRequest, NextResponse } from 'next/server';
import { reviewArticle } from '@/lib/admin/review';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return reviewArticle(request, body.articleId, body.action, body.notes, body.version);
}

// The queue endpoint is the only supported listing, and always requires admin auth.
export async function GET() {
  return NextResponse.json({ error: 'Use the review queue endpoint.' }, { status: 405 });
}
