import { NextRequest } from 'next/server';
import { reviewArticle } from '@/lib/admin/review';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => ({}));
  return reviewArticle(request, (await params).id, 'approve', null, body.version);
}
