import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BLOG_POSTS } from '@/lib/blog-posts';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: 'Post Not Found | VeraLM' };
  return {
    title: `${post.title} | VeraLM Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/blog" className="text-sm text-blue-400 hover:underline">
          ← Back to Blog
        </Link>
        <div className="flex items-center gap-3 mt-6 mb-4 text-xs">
          <span className="bg-blue-900/60 text-blue-300 px-2.5 py-0.5 rounded-full font-medium">
            {post.category}
          </span>
          <span className="text-gray-500">{post.date}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-6">
          {post.title}
        </h1>
        <p className="text-lg text-gray-300 leading-relaxed border-l-4 border-blue-600 pl-4 mb-8">
          {post.excerpt}
        </p>
        <div className="space-y-5 text-gray-300 leading-relaxed">
          {post.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
