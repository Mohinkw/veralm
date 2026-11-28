'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/lib/account-context';
import { Button } from '@/components/ui/button';
import { AdminHeader } from '@/components/admin-header';

type Article = { id: string; version: number; title: string; content: string; author_name: string; category_name: string | null; submitted_at: string; word_count: number | null };
type Stats = { total_articles: number; pending_review: number; approved: number; rejected: number };

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAccount();
  const [queue, setQueue] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const request = useCallback(async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in as an administrator.');
    const response = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Request failed.');
    return body;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [queueData, statsData] = await Promise.all([request('/api/admin/articles/queue'), request('/api/admin/stats')]);
      setQueue(queueData.articles);
      setStats(statsData.stats);
      setError(null);
    } catch (err) {
      setQueue([]); setStats(null);
      setError(err instanceof Error ? err.message : 'Unable to load review queue.');
    } finally { setLoading(false); }
  }, [request]);
  useEffect(() => {
    if (!authLoading) {
      void refresh();
    }
  }, [authLoading, user.id, refresh]);

  const act = async (articleId: string, version: number, action: 'approve' | 'reject' | 'request_revision') => {
    if (action !== 'approve' && !feedback.trim()) { setError('Enter feedback before rejecting or requesting a revision.'); return; }
    setBusy(true); setError(null);
    try {
      await request('/api/admin/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId, version, action, notes: feedback }) });
      setSelected(null); setFeedback('');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Review failed.'); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-background">
    <AdminHeader activeTab="articles" />
    <main className="container mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
    <div className="flex justify-between items-center"><h1 className="text-2xl sm:text-3xl font-bold">Article Review Queue</h1><Button variant="outline" onClick={refresh}>Refresh</Button></div>
    {loading && <p>Loading…</p>}
    {error && <p role="alert" className="text-destructive">{error} <a className="underline" href="/login">Sign in</a></p>}
    {stats && <p>{stats.pending_review} awaiting review · {stats.approved} approved · {stats.rejected} rejected · {stats.total_articles} total</p>}
    {stats && queue.length === 0 && <p>No articles awaiting review.</p>}
    {queue.map(article => <section key={article.id} className="border rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-xl">{article.title}</h2>
      <p className="text-sm text-muted-foreground">{article.author_name} · {article.category_name || 'Uncategorized'} · {article.word_count ?? 'Unknown'} words · {new Date(article.submitted_at).toLocaleDateString()}</p>
      <p className="text-sm text-muted-foreground">Automated verification unavailable; human review required.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => { setSelected(selected === article.id ? null : article.id); setFeedback(''); }}> {selected === article.id ? 'Close' : 'Review article'} </Button>
        <Link href={`/admin/articles/${article.id}`}>
          <Button variant="ghost">Full review view</Button>
        </Link>
      </div>
      {selected === article.id && <div className="space-y-4">
        <div className="whitespace-pre-wrap break-words border rounded p-4 max-h-96 overflow-auto">{article.content}</div>
        <label className="block">Feedback for the author (required for rejection or revision)
          <textarea className="block w-full border rounded p-2 mt-1 bg-background" maxLength={5000} value={feedback} onChange={e => setFeedback(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => act(article.id, article.version, 'approve')}>Approve</Button>
          <Button disabled={busy} variant="outline" onClick={() => act(article.id, article.version, 'request_revision')}>Request revision</Button>
          <Button disabled={busy} variant="outline" onClick={() => act(article.id, article.version, 'reject')}>Reject</Button>
        </div>
      </div>}
    </section>)}
    </main>
  </div>;
}
