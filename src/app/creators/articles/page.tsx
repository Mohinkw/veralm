'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Search, CheckCircle2, Clock, XCircle, AlertCircle, Eye, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatorHeader } from '@/components/creator-header';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { useAccount } from '@/lib/account-context';

type Article = {
  id: string; title: string; status: string; word_count: number | null;
  submitted_at: string | null; created_at: string | null;
  composite_quality_score: number | null; originality_score: number | null; ai_probability_score: number | null;
  total_query_contributions: number | null; total_earnings_attributed: number | null;
  categories: { name: string } | null;
};

export default function CreatorArticlesPage() {
  const { user, isLoading: authLoading } = useAccount();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(''); setArticles([]);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sign in to view your articles.');
        const query = new URLSearchParams({ page: String(page), status: filterStatus, search: searchQuery });
        const response = await fetch(`/api/creators/articles?${query}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load articles.');
        if (!controller.signal.aborted) { setArticles(data.articles); setCount(data.count); }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load articles.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [authLoading, user.id, page, filterStatus, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
      case 'under_ai_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600"><Clock className="h-3 w-3" /> Under review</span>;
      case 'pending_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-600"><Clock className="h-3 w-3" /> Editorial Review</span>;
      case 'requires_revision':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600"><AlertCircle className="h-3 w-3" /> Needs Revision</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600"><XCircle className="h-3 w-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">{status.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <CreatorHeader activeTab="articles" />

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Articles</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage, review, and track earnings for all articles submitted to the private knowledge vault.
              </p>
            </div>
            <Link href="/creators/articles/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Submit New Article
              </Button>
            </Link>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search article titles"
                placeholder="Search article titles..." maxLength={100}
                value={searchQuery}
                onChange={(e) => { setPage(0); setSearchQuery(e.target.value); }}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['all', 'approved', 'pending_review', 'under_ai_review', 'requires_revision', 'draft', 'rejected', 'suspended', 'archived', 'withdrawn'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => { setPage(0); setFilterStatus(status); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    filterStatus === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status === 'all' ? 'All Articles' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Table */}
          <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Quality Score</th>
                  <th className="py-3.5 px-4">Citations</th>
                  <th className="py-3.5 px-4">Total Earned</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Loading articles…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="space-y-3">
                        <p>{error}</p>
                        {error.includes('Sign in') && (
                          <Link href="/login">
                            <Button size="sm" variant="outline">Sign In</Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="space-y-3">
                        <p>No articles found for your account. Submit verified articles to start earning royalties.</p>
                        <Link href="/creators/articles/new">
                          <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Submit Your First Article
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  articles.map((art) => (
                    <tr key={art.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <Link href={`/creators/articles/${art.id}`} className="font-semibold text-foreground hover:text-primary transition-colors block">
                          {art.title}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{art.categories?.name ?? 'Uncategorized'}</span>
                          <span>•</span>
                          <span>{art.word_count ?? 'Unknown'} words</span>
                          <span>•</span>
                          <span>{art.submitted_at || art.created_at ? formatRelativeTime((art.submitted_at || art.created_at)!) : 'Date unavailable'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {getStatusBadge(art.status)}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {art.composite_quality_score != null ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground">{art.composite_quality_score}/100</span>
                            <div className="text-[11px] text-muted-foreground">
                              Orig: {art.originality_score ?? 'Pending'}% | AI: {art.ai_probability_score ?? 'Pending'}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Pending</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-semibold whitespace-nowrap">
                        {(art.total_query_contributions ?? 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 font-bold text-emerald-600 whitespace-nowrap">
                        {formatCurrency(Number(art.total_earnings_attributed ?? 0))}
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/creators/articles/${art.id}`}>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && !error && count > 20 && <div className="flex items-center gap-4">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page + 1} of {Math.ceil(count / 20)}</span>
            <Button variant="outline" disabled={(page + 1) * 20 >= count} onClick={() => setPage(page + 1)}>Next</Button>
          </div>}
        </div>
      </main>
    </div>
  );
}
