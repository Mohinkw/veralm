import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookOpen, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { executeRawSQL } from '@/db/client';
import { createCitationToken } from '@/lib/citation-token';
import { Navbar } from '@/components/navbar';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Button } from '@/components/ui/button';
import type { SearchArticleUsed, SearchCitation } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getSharedAnswer(slug: string) {
  const res = await executeRawSQL(
    `UPDATE shared_answers
     SET views_count = views_count + 1
     WHERE slug = $1
     RETURNING slug, query_text, answer_text, citations_json, articles_json, views_count, created_at`,
    [slug]
  ).catch(() => null);
  return res?.rows?.[0] || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getSharedAnswer(slug);
  if (!row) {
    return { title: 'Shared Answer Not Found' };
  }
  return {
    title: String(row.query_text).slice(0, 70),
    description: String(row.answer_text).replace(/[#*_`>$]/g, '').slice(0, 155),
  };
}

export default async function SharedAnswerPage({ params }: Props) {
  const { slug } = await params;
  const row = await getSharedAnswer(slug);
  if (!row) {
    notFound();
  }

  const rawCitations: SearchCitation[] = Array.isArray(row.citations_json) ? row.citations_json : [];
  const rawArticles: SearchArticleUsed[] = Array.isArray(row.articles_json) ? row.articles_json : [];

  // Mint fresh citation tokens for visitors arriving via a shared link
  const citations = rawCitations.map((c, idx) => {
    const artSlug = c.slug || c.article_id;
    const tok = createCitationToken(artSlug, slug);
    const anchor = typeof c.chunk_index === 'number' ? `#passage-${c.chunk_index}` : '';
    return {
      ...c,
      index: c.index || idx + 1,
      url: `/articles/${artSlug}?token=${tok}${anchor}`,
    };
  });

  const articles = rawArticles.map((a) => {
    const artSlug = a.slug || a.article_id;
    const tok = createCitationToken(artSlug, slug);
    const anchor = typeof a.chunk_index === 'number' ? `#passage-${a.chunk_index}` : '';
    return {
      ...a,
      url: `/articles/${artSlug}?token=${tok}${anchor}`,
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verified VeraLM Shared Answer</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {row.query_text}
          </h1>

          <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm">
            <MarkdownRenderer content={row.answer_text} citations={citations} />
          </div>

          {articles.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Verified Human Sources ({articles.length})
              </h2>
              <div className="space-y-2.5">
                {articles.map((art, i) => (
                  <div
                    key={art.article_id}
                    className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">[{i + 1}]</span>
                        <span className="font-semibold text-sm truncate">{art.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By {art.author_name}
                      </p>
                    </div>
                    <Link href={art.url} className="shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        Read Full Article
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Powered by human-verified knowledge with up to 90% net creator royalties.
            </p>
            <Link href={`/?q=${encodeURIComponent(row.query_text)}`}>
              <Button size="sm" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Ask Follow-up in VeraLM
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
