'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

type Article = {
  title: string; content: string; status: string; licensing_status: string;
  withdrawal_effective_at: string | null; freshness_status: string;
  freshness_checked_at: string | null; freshness_notes: string | null;
  total_earnings_attributed: number; total_query_contributions: number;
  word_count: number | null; submitted_at: string | null; revision_instructions: string | null;
  composite_quality_score: number | null; originality_score: number | null; ai_probability_score: number | null;
};
type Version = { version_number: number; title: string; content: string; change_summary: string | null; created_at: string };
const date = (value: string) => new Date(value).toLocaleDateString();

export default function CreatorArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const load = useCallback(async () => {
    try {
      const { id } = await params;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to view your article.');
      const response = await fetch(`/api/articles/${encodeURIComponent(id)}/lifecycle`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load article.');
      setArticle(data.article); setVersions(data.versions); setTitle(data.article.title); setContent(data.article.content); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load article.'); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { void load(); }, [load]);

  async function withdraw() {
    if (!confirm('Request withdrawal in 30 days? Already-attributed earnings remain payable.')) return;
    setBusy(true); setError('');
    try {
      const { id } = await params;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to request withdrawal.');
      const response = await fetch(`/api/articles/${encodeURIComponent(id)}/lifecycle`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'withdraw' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Withdrawal request failed.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Withdrawal request failed.'); }
    finally { setBusy(false); }
  }

  async function resubmit() {
    setBusy(true); setError('');
    try {
      const { id } = await params;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to resubmit.');
      const response = await fetch(`/api/articles/${encodeURIComponent(id)}/lifecycle`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resubmit', title, content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Resubmission failed.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Resubmission failed.'); }
    finally { setBusy(false); }
  }

  return <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
    <Link href="/creators/articles" className="text-sm text-primary">← Your articles</Link>
    {loading && <p>Loading article…</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {article && <>
      <header className="space-y-2"><h1 className="text-3xl font-bold">{article.title}</h1>
        <p>Status: {article.status.replaceAll('_', ' ')} · License: {article.licensing_status}</p>
        <p className="text-sm text-muted-foreground">{article.submitted_at && `Submitted ${date(article.submitted_at)} · `}{article.word_count ?? 'Unknown'} words · {article.total_query_contributions ?? 0} citations · {formatCurrency(Number(article.total_earnings_attributed ?? 0))} attributed</p>
      </header>
      <section className="rounded-xl border p-6 space-y-2"><h2 className="text-xl font-bold">Freshness: {article.freshness_status}</h2>
        <p>{article.freshness_notes || 'No freshness notes.'}</p>
        <p className="text-sm text-muted-foreground">{article.freshness_checked_at ? `Last checked ${date(article.freshness_checked_at)}` : 'Not yet checked'} · Versions are marked aging after 180 days and outdated after 365 days.</p>
      </section>
      <section className="rounded-xl border p-6 space-y-2"><h2 className="text-xl font-bold">Withdrawal</h2>
        {article.withdrawal_effective_at ? <p>Withdrawal requested for {date(article.withdrawal_effective_at)}. Processing may take up to 15 minutes after this date.</p> : article.status === 'approved' && article.licensing_status === 'active' ? <><p>Withdrawal takes effect after 30 days. Already-attributed earnings remain payable.</p><Button disabled={busy} onClick={withdraw}>{busy ? 'Submitting…' : 'Request withdrawal'}</Button></> : <p>This article is not eligible for withdrawal.</p>}
      </section>
      {article.status === 'requires_revision' && <section className="rounded-xl border p-6 space-y-3"><h2 className="text-xl font-bold">Revise and resubmit</h2>
        <p className="whitespace-pre-wrap">{article.revision_instructions || 'No revision instructions provided.'}</p>
        <label className="block">Title<input className="block w-full border rounded p-2 bg-background" value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="block">Content<textarea className="block w-full border rounded p-2 bg-background" rows={15} value={content} onChange={e => setContent(e.target.value)} /></label>
        <Button disabled={busy} onClick={resubmit}>Resubmit for review</Button>
      </section>}
      <section className="rounded-xl border p-6 space-y-3"><h2 className="text-xl font-bold">Verification scores</h2><p>Quality: {article.composite_quality_score ?? 'Pending'} · Originality: {article.originality_score ?? 'Pending'} · AI probability: {article.ai_probability_score ?? 'Pending'}</p></section>
      <section className="rounded-xl border p-6 space-y-3"><h2 className="text-xl font-bold">Current content</h2><div className="whitespace-pre-wrap">{article.content}</div></section>
      <section className="rounded-xl border p-6 space-y-3"><h2 className="text-xl font-bold">Version history</h2>
        {versions.length === 0 ? <p>No versions available.</p> : versions.map(v => <details key={v.version_number} className="border-t pt-3"><summary className="cursor-pointer">Version {v.version_number} · {date(v.created_at)} · {v.title}</summary>{v.change_summary && <p>{v.change_summary}</p>}<div className="whitespace-pre-wrap mt-3">{v.content}</div></details>)}
      </section>
    </>}
  </main>;
}
