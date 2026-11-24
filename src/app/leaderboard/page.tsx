import Link from 'next/link';
import type { Metadata } from 'next';
import { Award, BookOpen, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { creatorProfiles } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ad-slot';
import { getSiteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Most Cited Experts Leaderboard | VeraLM',
  description:
    'Discover the highest-cited human knowledge creators powering VeraLM verified AI answers.',
};

export default async function LeaderboardPage() {
  const leaders = await db
    .select({
      id: creatorProfiles.id,
      displayName: creatorProfiles.displayName,
      slug: creatorProfiles.slug,
      qualifications: creatorProfiles.qualifications,
      reputationTier: creatorProfiles.reputationTier,
      reputationScore: creatorProfiles.reputationScore,
      totalArticlesApproved: creatorProfiles.totalArticlesApproved,
      totalQueryContributions: creatorProfiles.totalQueryContributions,
    })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.isActive, true))
    .orderBy(
      desc(creatorProfiles.totalQueryContributions),
      desc(creatorProfiles.totalArticlesApproved),
      desc(creatorProfiles.reputationScore)
    )
    .limit(50);

  const siteUrl = getSiteUrl();
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'VeraLM Most Cited Experts',
    itemListElement: leaders.slice(0, 20).map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.displayName,
      url: `${siteUrl}/creators/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>VeraLM</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/creators/apply">
              <Button variant="outline" size="sm" className="text-xs">
                Become a Creator
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" className="text-xs">
                Ask VeraLM
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold">
              <Trophy className="h-3.5 w-3.5" />
              Verified Knowledge Authority
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Most Cited Experts
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Ranked by verified AI answer citations and approved publications in the VeraLM Knowledge Vault.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Expert</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Articles</th>
                  <th className="py-3 px-4 text-right">AI Citations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaders.map((leader, idx) => (
                  <tr key={leader.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/creators/${leader.slug}`}
                        className="font-semibold text-foreground hover:text-primary inline-flex items-center gap-1.5"
                      >
                        {leader.displayName}
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      </Link>
                      {leader.qualifications && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {leader.qualifications}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 hidden sm:table-cell text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {leader.totalArticlesApproved}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-primary">
                      <span className="inline-flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        {leader.totalQueryContributions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdSlot />
        </div>
      </main>
    </div>
  );
}
