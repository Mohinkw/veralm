import Link from 'next/link';
import { Sparkles, ShieldCheck, Lock, Award, BookOpen, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ slug: string }>;
}

const DEMO_ARTICLES: Record<string, { title: string; author: string; excerpt: string; date: string }> = {
  'demo-1': {
    title: 'Optimising PostgreSQL for Vector Search at Scale',
    author: 'Alex Rivers',
    excerpt: 'Use pgvector with HNSW indexes for sub-millisecond approximate nearest neighbour search. Tune ef_construction to 128 and m to 16 for a good speed/recall balance. Partition large embedding tables by category to reduce index scan size.',
    date: 'Oct 2026',
  },
  'optimising-postgresql-for-vector-search-at-scale': {
    title: 'Optimising PostgreSQL for Vector Search at Scale',
    author: 'Alex Rivers',
    excerpt: 'Use pgvector with HNSW indexes for sub-millisecond approximate nearest neighbour search. Tune ef_construction to 128 and m to 16 for a good speed/recall balance. Partition large embedding tables by category to reduce index scan size.',
    date: 'Oct 2026',
  },
  'demo-2': {
    title: 'RAG Pipeline Best Practices',
    author: 'Priya Sharma',
    excerpt: 'Retrieval-Augmented Generation (RAG) works best with hybrid search: combine dense vector similarity with BM25 sparse retrieval, then rerank using a cross-encoder. Keep chunks to 300–500 tokens to maximise context precision.',
    date: 'Sep 2026',
  },
  'rag-pipeline-best-practices': {
    title: 'RAG Pipeline Best Practices',
    author: 'Priya Sharma',
    excerpt: 'Retrieval-Augmented Generation (RAG) works best with hybrid search: combine dense vector similarity with BM25 sparse retrieval, then rerank using a cross-encoder. Keep chunks to 300–500 tokens to maximise context precision.',
    date: 'Sep 2026',
  },
  'demo-3': {
    title: 'Choosing the Right LLM for Enterprise Applications',
    author: 'James Wu',
    excerpt: 'For enterprise RAG, Gemini 2.0 Flash offers the best cost-to-quality ratio for answer synthesis. Use GPT-4o-mini as a fallback. Always benchmark on your own domain queries rather than generic leaderboards.',
    date: 'Nov 2026',
  },
  'choosing-the-right-llm-for-enterprise-applications': {
    title: 'Choosing the Right LLM for Enterprise Applications',
    author: 'James Wu',
    excerpt: 'For enterprise RAG, Gemini 2.0 Flash offers the best cost-to-quality ratio for answer synthesis. Use GPT-4o-mini as a fallback. Always benchmark on your own domain queries rather than generic leaderboards.',
    date: 'Nov 2026',
  },
};

export default async function ArticlePreviewPage({ params }: Props) {
  const { slug } = await params;

  const matched = DEMO_ARTICLES[slug.toLowerCase()];
  const displayTitle = matched?.title || slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const authorName = matched?.author || 'Domain Expert';
  const excerpt = matched?.excerpt || 'This verified article is part of the VeraLM knowledge database, licensed directly from expert creators.';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>VeraLM</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              AI Chat
            </Link>
            <Link href="/creators" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              For Creators
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Preview */}
      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to AI Chat
            </Link>
          </div>

          {/* Badge & Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Database Knowledge
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              <Lock className="h-3.5 w-3.5" />
              Creator Royalties Protected
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 leading-tight">
            {displayTitle}
          </h1>

          {/* Author Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              {authorName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{authorName}</span>
                <Award className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Verified Creator & Contributor to VeraLM Knowledge Model
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground hidden sm:block">
              <div>Licensed Knowledge</div>
              <div className="text-emerald-600 font-medium">Quality Score: 96/100</div>
            </div>
          </div>

          {/* Protected Excerpt */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Knowledge Base Source Excerpt
              </h2>
              <p className="text-base text-foreground/90 leading-relaxed italic">
                &ldquo;{excerpt}&rdquo;
              </p>
            </div>

            {/* Chat with this Knowledge */}
            <div className="p-6 rounded-2xl bg-muted/40 border border-border text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold mb-1">Explore With VeraLM AI Chatbot</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6">
                Ask our AI chatbot anything about this topic. Answers are grounded directly in this expert knowledge.
              </p>
              <div className="flex justify-center gap-3">
                <Link href={`/?q=${encodeURIComponent(displayTitle)}`}>
                  <Button className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Ask in AI Chat
                  </Button>
                </Link>
                <Link href="/creators/apply">
                  <Button variant="outline">
                    Earn as Creator
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
