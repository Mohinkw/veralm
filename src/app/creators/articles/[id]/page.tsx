'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/lib/account-context';
import { Button } from '@/components/ui/button';
import { CreatorHeader } from '@/components/creator-header';
import { formatCurrency } from '@/lib/utils';

type Article = {
  title: string;
  content: string;
  status: string;
  licensing_status: string;
  withdrawal_effective_at: string | null;
  freshness_status: string;
  freshness_checked_at: string | null;
  freshness_notes: string | null;
  total_earnings_attributed: number;
  total_query_contributions: number;
  word_count: number | null;
  submitted_at: string | null;
  revision_instructions: string | null;
  rejection_reason: string | null;
  composite_quality_score: number | null;
  originality_score: number | null;
  ai_probability_score: number | null;
};

type Version = {
  version_number: number;
  title: string;
  content: string;
  change_summary: string | null;
  created_at: string;
};

const date = (value: string) => new Date(value).toLocaleDateString();

export default function CreatorArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAccount();
  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingPublished, setEditingPublished] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      setJustSubmitted(qs.get('submitted') === 'true');
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const { id } = await params;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to view your article.');
      const response = await fetch(`/api/articles/${encodeURIComponent(id)}/lifecycle`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load article.');
      setArticle(data.article);
      setVersions(data.versions || []);
      setTitle(data.article.title);
      setContent(data.article.content);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load article.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
  }, [authLoading, user.id, load]);

  async function runAction(
    action: 'update_draft' | 'publish_draft' | 'resubmit' | 'update_published' | 'withdraw',
    confirmMessage?: string
  ) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setError('');
    setNotice('');

    if (action === 'update_draft') {
      if (!title.trim() || title.trim().length < 3) {
        setError('Title must be at least 3 characters.');
        return;
      }
      if (content.trim().length < 20) {
        setError('Draft content must be at least 20 characters.');
        return;
      }
    } else if (action === 'publish_draft') {
      if (!title.trim() || title.trim().length < 5) {
        setError('Title must be at least 5 characters.');
        return;
      }
      if (content.trim().length < 100) {
        setError('Article must be at least 100 characters before publishing.');
        return;
      }
    } else if (action === 'resubmit' || action === 'update_published') {
      if (!title.trim() || content.trim().length < 150) {
        setError('Please provide a title and at least 150 characters of content.');
        return;
      }
    }

    setBusy(true);
    try {
      const { id } = await params;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in required.');

      const payload: Record<string, unknown> = { action };
      if (action !== 'withdraw') {
        payload.title = title.trim();
        payload.content = content.trim();
      }

      const response = await fetch(`/api/articles/${encodeURIComponent(id)}/lifecycle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed.');

      if (action === 'update_draft') setNotice('Draft saved.');
      else if (action === 'publish_draft') {
        setNotice(
          data.status === 'approved'
            ? 'Article approved and indexed into the VeraLM AI Model!'
            : data.status === 'requires_revision'
              ? 'Submitted, but AI quality audit requested revisions.'
              : 'Submitted to the editorial review queue.'
        );
      } else if (action === 'resubmit') setNotice('Revised article resubmitted for review.');
      else if (action === 'update_published') {
        setEditingPublished(false);
        setNotice('Published article updated and queued/indexed.');
      } else if (action === 'withdraw') {
        setNotice('30-day withdrawal notice recorded.');
      }

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteArticle() {
    if (!confirm('Permanently delete this article? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      const { id } = await params;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in required.');
      const response = await fetch(`/api/articles/${encodeURIComponent(id)}/lifecycle`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed.');
      router.push('/creators/articles');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <CreatorHeader activeTab="articles" />
      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Link href="/creators/articles" className="inline-block text-sm text-primary hover:underline">
          &larr; Your articles
        </Link>
        {loading && <p className="text-sm text-muted-foreground">Loading article…</p>}
        {justSubmitted && article && !notice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {article.status === 'approved'
              ? 'Published! Your article passed verification and is active in the VeraLM AI Knowledge Vault.'
              : article.status === 'draft'
                ? 'Draft saved. You can continue editing and publish whenever ready.'
                : article.status === 'requires_revision'
                  ? 'Submission received. Please review the quality guidance below and resubmit.'
                  : 'Submitted! Your article is in the review queue.'}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {notice}
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {article && (
          <>
            <header className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold break-words">{article.title}</h1>
              <p className="text-sm">
                Status: <strong className="capitalize">{article.status.replaceAll('_', ' ')}</strong> &middot; License:{' '}
                <strong className="capitalize">{article.licensing_status}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {article.submitted_at && `Submitted ${date(article.submitted_at)} · `}
                {article.word_count ?? 'Unknown'} words &middot; {article.total_query_contributions ?? 0} citations &middot;{' '}
                {formatCurrency(Number(article.total_earnings_attributed ?? 0))} attributed
              </p>
            </header>

            {article.rejection_reason && article.status === 'rejected' && (
              <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-2">
                <h2 className="text-lg font-bold text-destructive">Rejection Feedback</h2>
                <p className="text-sm whitespace-pre-wrap">{article.rejection_reason}</p>
              </section>
            )}

            {article.status === 'draft' && (
              <section className="rounded-xl border p-6 space-y-4 bg-card">
                <h2 className="text-xl font-bold">Edit &amp; Publish Draft</h2>
                <div>
                  <label htmlFor="draft-title" className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <input
                    id="draft-title"
                    className="block w-full border border-input rounded-lg p-2.5 bg-background text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="draft-content" className="block text-sm font-medium mb-1">
                    Content (Markdown, min 100 characters to publish)
                  </label>
                  <textarea
                    id="draft-content"
                    className="block w-full border border-input rounded-lg p-3 bg-background text-sm font-mono"
                    rows={15}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} variant="outline" onClick={() => runAction('update_draft')}>
                    {busy ? 'Saving…' : 'Save Draft'}
                  </Button>
                  <Button disabled={busy} onClick={() => runAction('publish_draft')}>
                    {busy ? 'Publishing…' : 'Publish to AI Model'}
                  </Button>
                  <Button disabled={busy} variant="destructive" onClick={deleteArticle}>
                    Delete Draft
                  </Button>
                </div>
              </section>
            )}

            {article.status === 'requires_revision' && (
              <section className="rounded-xl border p-6 space-y-3 bg-card">
                <h2 className="text-xl font-bold">Revise and resubmit</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {article.revision_instructions || 'No revision instructions provided.'}
                </p>
                <div>
                  <label htmlFor="rev-title" className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <input
                    id="rev-title"
                    className="block w-full border border-input rounded-lg p-2.5 bg-background text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="rev-content" className="block text-sm font-medium mb-1">
                    Content (min 150 characters)
                  </label>
                  <textarea
                    id="rev-content"
                    className="block w-full border border-input rounded-lg p-3 bg-background text-sm font-mono"
                    rows={15}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => runAction('resubmit')}>
                    {busy ? 'Submitting…' : 'Resubmit for review'}
                  </Button>
                  <Button disabled={busy} variant="destructive" onClick={deleteArticle}>
                    Delete Article
                  </Button>
                </div>
              </section>
            )}

            {article.status === 'approved' && (
              <section className="rounded-xl border p-6 space-y-4 bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold">Published Article Controls</h2>
                    <p className="text-xs text-muted-foreground">
                      Updating saves the previous version in history and refreshes AI embeddings.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPublished((prev) => !prev)}
                  >
                    {editingPublished ? 'Cancel Edit' : 'Edit Published Article'}
                  </Button>
                </div>

                {editingPublished && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div>
                      <label htmlFor="pub-title" className="block text-sm font-medium mb-1">
                        Title
                      </label>
                      <input
                        id="pub-title"
                        className="block w-full border border-input rounded-lg p-2.5 bg-background text-sm"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="pub-content" className="block text-sm font-medium mb-1">
                        Content (min 150 characters)
                      </label>
                      <textarea
                        id="pub-content"
                        className="block w-full border border-input rounded-lg p-3 bg-background text-sm font-mono"
                        rows={15}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                      />
                    </div>
                    <Button disabled={busy} onClick={() => runAction('update_published')}>
                      {busy ? 'Updating…' : 'Save Published Update'}
                    </Button>
                  </div>
                )}
              </section>
            )}

            {article.status === 'rejected' && (
              <section className="rounded-xl border p-6 space-y-2 bg-card">
                <h2 className="text-lg font-bold">Remove Rejected Submission</h2>
                <Button disabled={busy} variant="destructive" onClick={deleteArticle}>
                  Delete Article
                </Button>
              </section>
            )}

            <section className="rounded-xl border p-6 space-y-2 bg-card">
              <h2 className="text-xl font-bold">Freshness: {article.freshness_status}</h2>
              <p className="text-sm">{article.freshness_notes || 'No freshness notes.'}</p>
              <p className="text-sm text-muted-foreground">
                {article.freshness_checked_at ? `Last checked ${date(article.freshness_checked_at)}` : 'Not yet checked'} &middot; Versions are marked aging after 180 days and outdated after 365 days.
              </p>
            </section>

            <section className="rounded-xl border p-6 space-y-2 bg-card">
              <h2 className="text-xl font-bold">Withdrawal</h2>
              {article.withdrawal_effective_at ? (
                <p className="text-sm">
                  Withdrawal requested for {date(article.withdrawal_effective_at)}. Processing may take up to 15 minutes after this date.
                </p>
              ) : article.status === 'approved' && article.licensing_status === 'active' ? (
                <>
                  <p className="text-sm">
                    Withdrawal takes effect after 30 days. Already-attributed earnings remain payable.
                  </p>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        'withdraw',
                        'Request withdrawal in 30 days? Already-attributed earnings remain payable.'
                      )
                    }
                  >
                    {busy ? 'Submitting…' : 'Request withdrawal'}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">This article is not eligible for withdrawal.</p>
              )}
            </section>

            <section className="rounded-xl border p-6 space-y-3 bg-card">
              <h2 className="text-xl font-bold">Verification scores</h2>
              <p className="text-sm">
                Quality: <strong>{article.composite_quality_score != null ? `${article.composite_quality_score}/100` : 'Pending'}</strong>
                {' · '}
                Originality: <strong>{article.originality_score != null ? `${article.originality_score}/100` : 'Pending'}</strong>
                {' · '}
                AI Risk: <strong>{article.ai_probability_score != null ? `${article.ai_probability_score}%` : 'Pending'}</strong>
                <span className="text-muted-foreground text-xs ml-2">(each scored independently; lower AI Risk is better)</span>
              </p>
            </section>

            <section className="rounded-xl border p-6 space-y-3 bg-card">
              <h2 className="text-xl font-bold">Current content</h2>
              <div className="whitespace-pre-wrap break-words text-sm">{article.content}</div>
            </section>

            <section className="rounded-xl border p-6 space-y-3 bg-card">
              <h2 className="text-xl font-bold">Version history</h2>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prior versions recorded yet.</p>
              ) : (
                versions.map((v) => (
                  <details key={v.version_number} className="border-t pt-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Version {v.version_number} &middot; {date(v.created_at)} &middot; {v.title}
                    </summary>
                    {v.change_summary && <p className="text-xs text-muted-foreground mt-1">{v.change_summary}</p>}
                    <div className="whitespace-pre-wrap break-words mt-3 text-sm">{v.content}</div>
                  </details>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
