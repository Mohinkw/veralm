import { redirect } from 'next/navigation';

export default async function SearchRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.category) sp.set('category', params.category);
  const qs = sp.toString();
  redirect(qs ? `/?${qs}` : '/');
}
