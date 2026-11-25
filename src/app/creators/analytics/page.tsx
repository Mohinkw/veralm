'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  BarChart3,
  Search,
  Calendar,
  Award,
  CheckCircle2,
  ChevronRight,
  FileText,
  User,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VeraLMLogo } from '@/components/veralm-logo';
import { useAccount } from '@/lib/account-context';
import { supabase } from '@/lib/supabase';

type Article = {
  id: string;
  title: string;
  status: string;
  submitted_at: string | null;
  created_at: string | null;
  composite_quality_score: number | null;
  total_query_contributions: number | null;
  total_earnings_attributed: number | null;
};

export default function CreatorAnalyticsPage() {
  const { user } = useAccount();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
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

  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoffMs = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  const filteredArticles = articles.filter((a) => {
    const ts = a.submitted_at || a.created_at;
    if (!ts) return true;
    const ms = new Date(ts).getTime();
    return Number.isFinite(ms) ? ms >= cutoffMs : true;
  });

  const totalCitations = filteredArticles.reduce((sum, a) => sum + (a.total_query_contributions || 0), 0);
  const approvedArticles = filteredArticles.filter((a) => a.status === 'approved');
  const scoredArticles = filteredArticles.filter((a) => a.composite_quality_score !== null && a.composite_quality_score !== undefined);
  const avgQuality =
    scoredArticles.length > 0
      ? `${(scoredArticles.reduce((sum, a) => sum + Number(a.composite_quality_score || 0), 0) / scoredArticles.length).toFixed(0)}%`
      : 'N/A';
  const citedApprovedCount = approvedArticles.filter((a) => (a.total_query_contributions || 0) > 0).length;
  const attributionRate =
    approvedArticles.length > 0
      ? `${Math.round((citedApprovedCount / approvedArticles.length) * 100)}%`
      : 'N/A';
  const displayName = user.name || user.email?.split('@')[0] || 'Creator';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <VeraLMLogo className="h-6 w-6" />
              <span>VeraLM</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Creator Studio</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/creators/dashboard" className="text-muted-foreground hover:text-foreground">Overview</Link>
              <Link href="/creators/articles" className="text-muted-foreground hover:text-foreground">My Articles</Link>
              <Link href="/creators/earnings" className="text-muted-foreground hover:text-foreground">Earnings & Payouts</Link>
              <Link href="/creators/analytics" className="text-foreground">Analytics</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    range === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r === '7d' ? '7D' : r === '30d' ? '30D' : '90D'}
                </button>
              ))}
            </div>
            <Link
              href="/creators/profile"
              className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold hover:ring-2 hover:ring-primary transition-all"
              title={`${displayName} - Profile Settings`}
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attribution Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analyze how often and where your knowledge passages are cited by VeraLM AI searches for {displayName}.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid sm:grid-cols-4 gap-5">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Citations</span>
              <div className="text-3xl font-black mt-2">{totalCitations}</div>
              <p className="text-xs text-muted-foreground mt-1">Direct query citations</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Vault Articles</span>
              <div className="text-3xl font-black mt-2">{approvedArticles.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Verified indexed ({range.toUpperCase()})</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Quality Score</span>
              <div className="text-3xl font-black mt-2">{avgQuality}</div>
              <p className="text-xs text-muted-foreground mt-1">AI and editorial audits</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Citation Coverage</span>
              <div className="text-3xl font-black mt-2">{attributionRate}</div>
              <p className="text-xs text-muted-foreground mt-1">Approved articles cited</p>
            </div>
          </div>

          {/* Detailed Question Citation Breakdown */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Top Search Queries Attributing Your Content</h2>

            {totalCitations === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-border text-center bg-card/50 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base">No citation queries recorded yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  When users ask questions that cite your articles in AI answers, detailed attribution analytics, query texts, and semantic relevance scores will appear here.
                </p>
                <Link href="/creators/articles/new" className="inline-block mt-2">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Submit Article to Knowledge Vault
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.filter(a => (a.total_query_contributions || 0) > 0).map((art) => (
                  <div key={art.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{art.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Status: {art.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">{art.total_query_contributions} citations</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
