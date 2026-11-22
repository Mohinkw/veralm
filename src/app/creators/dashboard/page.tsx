'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, FileText, DollarSign, TrendingUp, Plus, ArrowUpRight, CheckCircle2, Clock, AlertCircle, BarChart3, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

export default function CreatorDashboardPage() {
  const [timeframe, setTimeframe] = useState<'30d' | 'all'>('30d');

  // Realistic sample metrics for active creator experience
  const stats = {
    monthlyEarnings: 348.50,
    lifetimeEarnings: 1420.00,
    totalArticles: 6,
    approvedArticles: 5,
    pendingArticles: 1,
    queryCitations30d: 842,
    reputationScore: 94.5,
    nextPayoutDate: 'Dec 1, 2026',
  };

  const recentContributions = [
    {
      id: '1',
      query: 'How to implement hybrid dense-sparse vector retrieval in pgvector?',
      articleTitle: 'Optimizing PostgreSQL for Vector RAG Workflows',
      citedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      earned: 0.42,
      citationsCount: 3,
    },
    {
      id: '2',
      query: 'What is the optimal chunk size for technical documentation embeddings?',
      articleTitle: 'Chunking Strategies for Deep Technical Documentation',
      citedAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
      earned: 0.38,
      citationsCount: 2,
    },
    {
      id: '3',
      query: 'How does reciprocal rank fusion balance keyword vs semantic matches?',
      articleTitle: 'Optimizing PostgreSQL for Vector RAG Workflows',
      citedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      earned: 0.55,
      citationsCount: 4,
    },
  ];

  const recentArticles = [
    {
      id: 'art-1',
      title: 'Optimizing PostgreSQL for Vector RAG Workflows',
      status: 'approved',
      category: 'Software Engineering & Cloud',
      citations: 512,
      earnings: 218.40,
      updatedAt: '2 days ago',
      qualityScore: 96,
    },
    {
      id: 'art-2',
      title: 'Chunking Strategies for Deep Technical Documentation',
      status: 'approved',
      category: 'Artificial Intelligence & ML',
      citations: 330,
      earnings: 130.10,
      updatedAt: '5 days ago',
      qualityScore: 92,
    },
    {
      id: 'art-3',
      title: 'Measuring Hallucination Drift in Enterprise LLM Agents',
      status: 'under_ai_review',
      category: 'Artificial Intelligence & ML',
      citations: 0,
      earnings: 0.00,
      updatedAt: '1 hour ago',
      qualityScore: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>VeraLM</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Creator Studio</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/creators/dashboard" className="text-foreground">Overview</Link>
              <Link href="/creators/articles" className="text-muted-foreground hover:text-foreground">My Articles</Link>
              <Link href="/creators/earnings" className="text-muted-foreground hover:text-foreground">Earnings & Payouts</Link>
              <Link href="/creators/analytics" className="text-muted-foreground hover:text-foreground">Analytics</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/creators/articles/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Submit Article
              </Button>
            </Link>
            <Link href="/creators/profile" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-primary">
              <User className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Welcome Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Creator Studio</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track your verified articles, citation royalties, and monthly payout pool share.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Stripe Connected
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                Reputation: {stats.reputationScore}/100
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Est. Monthly Earnings</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-medium">Payout on {stats.nextPayoutDate}</span>
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Query Citations (30d)</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.queryCitations30d.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Across 5 active vault articles</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Active Vault Articles</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.approvedArticles} / {stats.totalArticles}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.pendingArticles} currently in AI audit</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Lifetime Royalties</span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.lifetimeEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">100% paid on time</p>
            </div>
          </div>

          {/* 2-Column Split: Recent Query Contributions & My Articles */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left 3 cols: Real-time query citations */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Live Query Attribution Events</h2>
                  <p className="text-xs text-muted-foreground">Recent user searches citing your verified articles</p>
                </div>
                <Link href="/creators/analytics" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  View full analytics <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentContributions.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground leading-snug">
                          &ldquo;{c.query}&rdquo;
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>Source: <strong className="text-foreground/80">{c.articleTitle}</strong></span>
                          <span>•</span>
                          <span>{formatRelativeTime(c.citedAt)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-emerald-600">+{formatCurrency(c.earned)}</div>
                        <div className="text-[11px] text-muted-foreground">{c.citationsCount} citations</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 2 cols: Quick Articles Overview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">My Articles</h2>
                  <p className="text-xs text-muted-foreground">Manage your vault knowledge</p>
                </div>
                <Link href="/creators/articles" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  All ({stats.totalArticles}) <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentArticles.map((art) => (
                  <Link
                    key={art.id}
                    href={`/creators/articles/${art.id}`}
                    className="block p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        art.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {art.status === 'approved' ? 'Vault Active' : 'Under AI Review'}
                      </span>
                      {art.qualityScore && (
                        <span className="text-xs font-semibold text-foreground">
                          Score: {art.qualityScore}/100
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold truncate mb-1">{art.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                      <span>{art.citations} citations</span>
                      <span className="font-semibold text-foreground">{formatCurrency(art.earnings)}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <Link href="/creators/articles/new" className="block mt-4">
                <Button variant="outline" className="w-full gap-2 border-dashed py-5">
                  <Plus className="h-4 w-4" />
                  Submit New Article to Vault
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
