import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Award,
  BookOpen,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles, categories, creatorProfiles } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ad-slot';
import { Navbar } from '@/components/navbar';
import { getSiteUrl, safeJsonLd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCategoryHub(slug: string) {
  const [category] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    })
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .limit(1);

  if (!category) return null;

  const hubArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      wordCount: articles.wordCount,
      approvedAt: articles.approvedAt,
      totalQueryContributions: articles.totalQueryContributions,
      authorName: creatorProfiles.displayName,
      authorSlug: creatorProfiles.slug,
    })
    .from(articles)
    .innerJoin(creatorProfiles, eq(articles.creatorId, creatorProfiles.id))
    .where(and(eq(articles.categoryId, category.id), eq(articles.status, 'approved')))
    .orderBy(desc(articles.totalQueryContributions), desc(articles.approvedAt))
    .limit(30);

  // Deduplicate top contributors in this category
  const expertMap = new Map<
    string,
    { name: string; slug: string; count: number; citations: number }
  >();
  for (const a of hubArticles) {
    const cur = expertMap.get(a.authorSlug) || {
      name: a.authorName,
      slug: a.authorSlug,
      count: 0,
      citations: 0,
    };
    cur.count += 1;
    cur.citations += a.totalQueryContributions || 0;
    expertMap.set(a.authorSlug, cur);
  }

  const experts = Array.from(expertMap.values())
    .sort((a, b) => b.citations - a.citations || b.count - a.count)
    .slice(0, 8);

  return { category, articles: hubArticles, experts };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryHub(slug);
  if (!data) return { title: 'Category Not Found | VeraLM' };

  const siteUrl = getSiteUrl();
  const description =
    data.category.description ||
    `Verified expert publications and AI-grounded research in ${data.category.name} on VeraLM.`;

  return {
    title: `${data.category.name} — Verified Knowledge Hub`,
    description,
    alternates: { canonical: `${siteUrl}/categories/${data.category.slug}` },
    openGraph: {
      title: `${data.category.name} | VeraLM Knowledge Hub`,
      description,
      url: `${siteUrl}/categories/${data.category.slug}`,
    },
  };
}

export default async function CategoryHubPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCategoryHub(slug);
  if (!data) notFound();

  const { category, articles: hubArticles, experts } = data;
  const siteUrl = getSiteUrl();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} — VeraLM Knowledge Hub`,
    description: category.description || undefined,
    url: `${siteUrl}/categories/${category.slug}`,
    numberOfItems: hubArticles.length,
    publisher: {
      '@type': 'Organization',
      name: 'VeraLM',
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionJsonLd) }}
      />

      <Navbar />

      <main className="py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/categories"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Categories
              </Link>
              <Link href={`/?category=${encodeURIComponent(category.slug)}&q=${encodeURIComponent(category.name)}`}>
                <Button size="sm" className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask AI about {category.name}
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{category.name}</h1>
            <p className="text-muted-foreground max-w-2xl">
              {category.description ||
                `Explore verified, citation-backed knowledge in ${category.name} powering VeraLM's AI answers.`}
            </p>
          </div>

          {/* Top Experts in Category */}
          {experts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Top Verified Contributors
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {experts.map((exp) => (
                  <Link
                    key={exp.slug}
                    href={`/creators/${exp.slug}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border hover:border-primary/40 text-xs font-medium transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{exp.name}</span>
                    <span className="text-muted-foreground">({exp.count})</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Crawlable Article Teaser Index */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Verified Topic Index ({hubArticles.length})
              </h2>
            </div>

            {hubArticles.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                Publications in {category.name} are currently being indexed.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hubArticles.map((art) => (
                  <article
                    key={art.id}
                    className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base leading-snug">{art.title}</h3>
                      {art.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {art.excerpt}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60 text-xs">
                      <Link
                        href={`/creators/${art.authorSlug}`}
                        className="font-medium text-primary hover:underline py-1"
                      >
                        {art.authorName}
                      </Link>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-3 w-3 text-primary" />
                          {art.totalQueryContributions}
                        </span>
                        <Link
                          href={`/articles/${art.slug}`}
                          className="font-semibold text-foreground hover:text-primary py-1"
                        >
                          Read →
                        </Link>
                        <Link
                          href={`/?q=${encodeURIComponent(art.title)}`}
                          className="font-semibold text-foreground hover:text-primary py-1"
                        >
                          Ask AI →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <AdSlot />
        </div>
      </main>
    </div>
  );
}
