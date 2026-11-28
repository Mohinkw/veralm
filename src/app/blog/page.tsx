import Link from 'next/link';
import { Newspaper, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { BLOG_POSTS as posts } from '@/lib/blog-posts';

export const metadata = {
  title: 'Blog & Release Notes',
  description:
    'Platform updates, release notes, and knowledge economy insights from the VeraLM team.',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        {/* Header */}
        <section className="border-b border-border py-14 sm:py-16 px-4 sm:px-6 text-center bg-muted/20">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Newspaper className="h-3.5 w-3.5" />
              <span>VeraLM Blog &amp; Release Notes</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Platform Updates &amp; Insights
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Release notes, attribution engineering, and essays on the future of human-grounded AI.
            </p>
          </div>
        </section>

        {/* Posts */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {post.category}
                </span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h2 className="text-xl font-bold mb-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium"
              >
                Read article
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
