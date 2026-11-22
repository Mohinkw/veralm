import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, ShieldCheck, Lock, Calendar, User, BookOpen, Search, ArrowRight, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePreviewPage({ params }: Props) {
  const { slug } = await params;

  // Formatted title fallback
  const displayTitle = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>VeraLM</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground">Search</Link>
            <Link href="/categories" className="text-sm font-medium text-muted-foreground hover:text-foreground">Categories</Link>
            <Link href="/creators" className="text-sm font-medium text-muted-foreground hover:text-foreground">For Creators</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Main Preview */}
      <main className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <Link href="/categories" className="hover:text-foreground">Vault</Link>
            <span>/</span>
            <span>Articles</span>
            <span>/</span>
            <span className="text-foreground truncate max-w-xs">{displayTitle}</span>
          </div>

          {/* Badge & Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Vault Article
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold">
              <Lock className="h-3.5 w-3.5" />
              Exclusively Licensed
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 leading-tight">
            {displayTitle}
          </h1>

          {/* Author Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              VK
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Verified Domain Expert</span>
                <Award className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Peer-reviewed author in Artificial Intelligence & High-Performance Distributed Systems
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground hidden sm:block">
              <div>Licensed: Nov 2026</div>
              <div className="text-emerald-600 font-medium">Quality Score: 94/100</div>
            </div>
          </div>

          {/* Protected Vault Excerpt */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Licensed Knowledge Excerpt
              </h2>
              <p className="text-base text-foreground/90 leading-relaxed italic">
                &ldquo;Modern AI retrieval systems require hybrid rank-fusion between dense embedding vectors and sparse lexical tsvectors to eliminate semantic hallucination. By isolating licensed source documents within protected vector partitions, attribution events can be deterministically calculated down to sentence-level token references.&rdquo;
              </p>
            </div>

            {/* Anti-Scraping / Vault Notice */}
            <div className="p-6 rounded-2xl bg-muted/40 border border-border text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold mb-1">Full Article Is Protected In Vault</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6">
                To prevent uncompensated AI scraping, full raw texts are never published openly.
                Ask any question below to retrieve direct, synthesized answers powered by this article.
              </p>
              <div className="flex justify-center gap-3">
                <Link href={`/search?q=${encodeURIComponent(displayTitle)}`}>
                  <Button className="gap-2">
                    <Search className="h-4 w-4" />
                    Query This Knowledge In Search
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline">
                    How Attribution Works
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quality Report Card */}
            <div className="border border-border rounded-xl p-5 bg-card">
              <h4 className="font-semibold text-sm mb-3">Verification & Licensing Audit</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xl font-bold text-emerald-600">98%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Originality Score</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">&lt; 3%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">AI Probability</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xl font-bold text-primary">1536d</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Vector Chunks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-muted-foreground border-t border-border mt-16">
        © 2026 VeraLM Inc. AI-Powered Verified Knowledge Search. All rights reserved.
      </footer>
    </div>
  );
}
