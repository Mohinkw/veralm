import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ArticleNestedPage({ params }: Props) {
  const { slug, id } = await params;
  // Redirect /articles/author/article-id to /articles/article-id or /articles/slug
  redirect(`/articles/${slug || id}`);
}
