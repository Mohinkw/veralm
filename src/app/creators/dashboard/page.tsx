'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  FileText,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  ChevronRight,
  User,
  MessageSquare,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatorHeader } from '@/components/creator-header';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { useAccount } from '@/lib/account-context';
import { supabase } from '@/lib/supabase';

type Article = {
  id: string;
  title: string;
  status: string;
  word_count: number | null;
  submitted_at: string | null;
  created_at: string | null;
  composite_quality_score: number | null;
  total_query_contributions: number | null;
  total_earnings_attributed: number | null;
  categories: { name: string } | null;
};

export default function CreatorDashboardPage() {
  const { user, toggleMode } = useAccount();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticles() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/creators/articles?page=0&status=all', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setArticles(data.articles || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    loadArticles();
  }, []);

  const approvedArticles = articles.filter(a => a.status === 'approved');
  const pendingArticles = articles.filter(a => a.status === 'under_ai_review' || a.status === 'pending_review');
  const totalCitations = articles.reduce((sum, a) => sum + (a.total_query_contributions || 0), 0);
  const totalEarnings = articles.reduce((sum, a) => sum + (Number(a.total_earnings_attributed) || 0), 0);

  const displayName = user.name || user.email?.split('@')[0] || 'Creator';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <CreatorHeader activeTab="overview" />

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Welcome Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Welcome back, {displayName}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track your verified knowledge articles, citation royalties, and monthly payout pool share.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Universal Account Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                Reputation: 100/100
              </span>
            </div>
          </div>

          {!user.isLoggedIn && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>You are currently browsing as a guest. Sign in to link articles and earnings to your account.</span>
              </div>
              <Link href="/login">
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Button>
              </Link>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Est. Monthly Earnings</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-medium">90% revenue pool share</span>
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Query Citations</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{totalCitations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {approvedArticles.length} active vault {approvedArticles.length === 1 ? 'article' : 'articles'}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Vault Articles</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{approvedArticles.length} / {articles.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingArticles.length} currently in review
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Lifetime Royalties</span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">Monthly automatic payouts</p>
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

              {articles.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border text-center bg-card/50 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-base">No citation attribution events yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Once you submit articles to the VeraLM knowledge vault, every time user search queries match and cite your verified insights, you will see real-time attribution and royalty payouts right here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {articles.filter(a => (a.total_query_contributions || 0) > 0).map((art) => (
                    <div key={art.id} className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground leading-snug">
                            {art.title}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Category: <strong className="text-foreground/80">{art.categories?.name || 'Knowledge'}</strong></span>
                            <span>•</span>
                            <span>{art.submitted_at ? formatRelativeTime(art.submitted_at) : 'Active'}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-emerald-600">
                            +{formatCurrency(Number(art.total_earnings_attributed) || 0)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {art.total_query_contributions || 0} citations
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right 2 cols: Quick Articles Overview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">My Articles</h2>
                  <p className="text-xs text-muted-foreground">Manage your vault knowledge</p>
                </div>
                <Link href="/creators/articles" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  All ({articles.length}) <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {articles.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border text-center bg-card/50 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">You haven&apos;t submitted any articles yet</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share your verified expertise in technology, science, finance, or business to earn continuous royalties.
                    </p>
                  </div>
                  <Link href="/creators/articles/new" className="block">
                    <Button size="sm" className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Submit Your First Article
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {articles.slice(0, 4).map((art) => (
                    <Link
                      key={art.id}
                      href={`/creators/articles/${art.id}`}
                      className="block p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          art.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                        }`}>
                          {art.status === 'approved' ? 'Vault Active' : art.status.replace(/_/g, ' ')}
                        </span>
                        {art.composite_quality_score && (
                          <span className="text-xs font-semibold text-foreground">
                            Score: {art.composite_quality_score}/100
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold truncate mb-1">{art.title}</h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                        <span>{art.total_query_contributions || 0} citations</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Number(art.total_earnings_attributed) || 0)}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <Link href="/creators/articles/new" className="block mt-4">
                    <Button variant="outline" className="w-full gap-2 border-dashed py-5">
                      <Plus className="h-4 w-4" />
                      Submit New Article to Vault
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
