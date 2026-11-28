'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/lib/account-context';
import { AdminHeader } from '@/components/admin-header';

type ArticleDetail = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  wordCount: number | null;
  status: string;
  version: number;
  submittedAt: string | null;
  createdAt: string;
  compositeQualityScore: string | null;
  originalityScore: string | null;
  aiProbabilityScore: string | null;
  reviewNotes: string | null;
  authorName: string;
  authorEmail: string;
  categoryName: string | null;
};

export default function AdminArticleReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAccount();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadArticle = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in as an administrator.');
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load article.');
      setArticle(body.article);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load article.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) {
      void loadArticle();
    }
  }, [authLoading, user.id, loadArticle]);

  const handleAction = async (action: 'approve' | 'reject' | 'request_revision') => {
    if (!article) return;
    if (action !== 'approve' && !notes.trim()) {
      setError('Enter review feedback before rejecting or requesting a revision.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in as an administrator.');
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          articleId: article.id,
          version: article.version,
          action,
          notes,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Action failed.');
      const verb =
        action === 'approve'
          ? 'approved'
          : action === 'reject'
            ? 'rejected'
            : 'marked for revision';
      setMessage(`Article ${verb} successfully.`);
      setNotes('');
      await loadArticle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AdminHeader activeTab="articles" />
        <main className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading article...</p>
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AdminHeader activeTab="articles" />
        <main className="max-w-2xl mx-auto p-6 sm:p-10 space-y-4">
          <Link href="/admin" className="text-sm text-primary hover:underline">&larr; Back to Admin</Link>
          <div role="alert" className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            {error || 'Article not found.'}
          </div>
        </main>
      </div>
    );
  }

  const qualityScore = Number(article.compositeQualityScore || 0);
  const originalityScore = Number(article.originalityScore || 0);
  const aiScore = Number(article.aiProbabilityScore || 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader activeTab="articles" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/admin" className="hover:text-foreground">Admin</Link>
          <span>&rsaquo;</span>
          <span className="text-foreground font-medium">Article Review</span>
        </div>

        {error && (
          <div role="alert" className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <h1 className="text-2xl font-bold leading-tight break-words">{article.title}</h1>
                <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full shrink-0 font-medium capitalize">
                  {article.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <span>By <strong className="text-foreground">{article.authorName}</strong> ({article.authorEmail})</span>
                <span>{article.categoryName || 'Uncategorized'}</span>
                <span>{(article.wordCount || 0).toLocaleString()} words</span>
                <span>Submitted {new Date(article.submittedAt || article.createdAt).toLocaleDateString()}</span>
              </div>
              {article.excerpt && (
                <p className="text-muted-foreground text-sm italic border-l-4 border-primary pl-4 mb-6">
                  {article.excerpt}
                </p>
              )}
              <div className="max-w-none leading-relaxed whitespace-pre-wrap break-words font-mono text-xs bg-muted/50 border border-border rounded-lg p-4 max-h-[520px] overflow-y-auto">
                {article.content}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="font-bold mb-4">Quality Scores</h2>
              {[
                { label: 'Overall Quality', score: qualityScore, threshold: 70 },
                { label: 'Originality', score: originalityScore, threshold: 85 },
                { label: 'AI-Generated Content', score: aiScore, threshold: 20, inverted: true },
              ].map((s) => (
                <div key={s.label} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span
                      className={
                        s.inverted
                          ? s.score <= s.threshold ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-destructive font-medium'
                          : s.score >= s.threshold ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'
                      }
                    >
                      {s.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, s.score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {article.reviewNotes && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
                <h2 className="font-bold text-sm">Latest Review Notes</h2>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {article.reviewNotes}
                </p>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
              <h2 className="font-bold">Decision</h2>
              <div>
                <label htmlFor="review-notes" className="text-xs font-medium text-muted-foreground block mb-1">
                  Feedback for Creator (required for rejection/revision)
                </label>
                <textarea
                  id="review-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter editorial guidance visible on the creator's article page..."
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('approve')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Approve Article
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('request_revision')}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Request Revision
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('reject')}
                className="w-full bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-destructive-foreground py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Reject Article
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
