import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/navbar';
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
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog &amp; Release Notes
          </Link>
          <div className="flex items-center gap-3 mt-6 mb-4 text-xs">
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
              {post.category}
            </span>
            <span className="text-muted-foreground">{post.date}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">{post.title}</h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed border-l-4 border-primary pl-4 mb-8">
            {post.excerpt}
          </p>
          <div className="space-y-5 text-foreground/90 leading-relaxed">
            {post.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}
