import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  ExternalLink,
  Globe,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles, categories, creatorProfiles } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ad-slot';
import { VeraLMLogo } from '@/components/veralm-logo';
import { getSiteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCreatorWithArticles(slug: string) {
  const [creator] = await db
    .select({
      id: creatorProfiles.id,
      displayName: creatorProfiles.displayName,
      slug: creatorProfiles.slug,
      bio: creatorProfiles.bio,
      country: creatorProfiles.country,
      websiteUrl: creatorProfiles.websiteUrl,
      qualifications: creatorProfiles.qualifications,
      yearsOfExperience: creatorProfiles.yearsOfExperience,
      primaryCategories: creatorProfiles.primaryCategories,
      identityVerified: creatorProfiles.identityVerified,
      reputationScore: creatorProfiles.reputationScore,
      reputationTier: creatorProfiles.reputationTier,
      totalArticlesApproved: creatorProfiles.totalArticlesApproved,
      totalQueryContributions: creatorProfiles.totalQueryContributions,
    })
    .from(creatorProfiles)
    .where(and(eq(creatorProfiles.slug, slug), eq(creatorProfiles.isActive, true)))
    .limit(1);

  if (!creator) return null;

  const published = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      wordCount: articles.wordCount,
      approvedAt: articles.approvedAt,
      totalQueryContributions: articles.totalQueryContributions,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.creatorId, creator.id), eq(articles.status, 'approved')))
    .orderBy(desc(articles.totalQueryContributions), desc(articles.approvedAt))
    .limit(40);

  return { creator, articles: published };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCreatorWithArticles(slug);
  if (!data) {
    return { title: 'Creator Not Found | VeraLM' };
  }

  const { creator } = data;
  const siteUrl = getSiteUrl();
  const description =
    creator.bio?.slice(0, 155) ||
    `${creator.displayName} is a verified knowledge contributor on VeraLM (${creator.totalArticlesApproved} approved publications).`;

  return {
    title: `${creator.displayName} — Verified Expert Profile`,
    description,
    alternates: { canonical: `${siteUrl}/creators/${creator.slug}` },
    openGraph: {
      title: `${creator.displayName} | VeraLM Verified Creator`,
      description,
      url: `${siteUrl}/creators/${creator.slug}`,
      type: 'profile',
    },
  };
}

export default async function PublicCreatorProfilePage({ params }: Props) {
  const { slug } = await params;
  const data = await getCreatorWithArticles(slug);
  if (!data) notFound();

  const { creator, articles: published } = data;
  const siteUrl = getSiteUrl();

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creator.displayName,
    url: `${siteUrl}/creators/${creator.slug}`,
    description: creator.bio || undefined,
    sameAs: creator.websiteUrl ? [creator.websiteUrl] : undefined,
    knowsAbout: creator.primaryCategories,
    affiliation: {
      '@type': 'Organization',
      name: 'VeraLM',
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <VeraLMLogo className="h-6 w-6" />
            <span>VeraLM</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <ArrowLeft className="h-4 w-4" />
                Ask VeraLM
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          {/* Authority Profile Header */}
          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
                  {creator.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {creator.displayName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {creator.identityVerified ? 'Identity Verified' : 'Verified Contributor'}
                    </span>
                  </div>

                  {creator.qualifications && (
                    <p className="text-sm text-primary font-medium mt-1">
                      {creator.qualifications}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                    <span className="capitalize">Tier: {creator.reputationTier}</span>
                    {creator.yearsOfExperience && (
                      <span>{creator.yearsOfExperience}+ years experience</span>
                    )}
                    {creator.country && <span>{creator.country}</span>}
                    {creator.websiteUrl && (
                      <a
                        href={creator.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col gap-3 sm:text-right shrink-0">
                <div className="px-3.5 py-2 rounded-xl bg-muted/50 border border-border">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Verified Articles
                  </div>
                  <div className="text-xl font-bold">{published.length}</div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-muted/50 border border-border">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    AI Citations
                  </div>
                  <div className="text-xl font-bold text-primary">
                    {creator.totalQueryContributions}
                  </div>
                </div>
              </div>
            </div>

            {creator.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">{creator.bio}</p>
            )}

            {creator.primaryCategories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {creator.primaryCategories.map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Published Knowledge Contributions (Public Teasers Only) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Verified Knowledge Contributions
              </h2>
              <span className="text-xs text-muted-foreground">
                Full texts protected by VeraLM Citation Pass
              </span>
            </div>

            {published.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                No public publications listed yet.
              </div>
            ) : (
              <div className="space-y-3">
                {published.map((art) => (
                  <article
                    key={art.id}
                    className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-base leading-snug">{art.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {art.categorySlug && art.categoryName && (
                            <Link
                              href={`/categories/${art.categorySlug}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {art.categoryName}
                            </Link>
                          )}
                          {art.wordCount && <span>{art.wordCount} words</span>}
                          {art.approvedAt && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(art.approvedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Award className="h-3 w-3 text-primary" />
                            {art.totalQueryContributions} AI citations
                          </span>
                        </div>
                      </div>

                      <Link href={`/?q=${encodeURIComponent(art.title)}`} className="shrink-0">
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Query AI
                        </Button>
                      </Link>
                    </div>

                    {art.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {art.excerpt}
                      </p>
                    )}
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
