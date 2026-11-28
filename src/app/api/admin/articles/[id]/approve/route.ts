import { NextRequest } from 'next/server';
import { reviewArticle } from '@/lib/admin/review';
import { parseJsonObject } from '@/lib/auth/request';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;
  return reviewArticle(request, (await params).id, 'approve', null, parsed.data.version);
}
