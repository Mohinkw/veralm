'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
    loadArticle();
  }, [loadArticle]);

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
      setMessage(`Article ${action.replace('_', ' ')}d successfully.`);
      await loadArticle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading article...</p>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
        <div className="max-w-2xl mx-auto space-y-4">
          <Link href="/admin" className="text-sm text-blue-400 hover:underline">← Back to Admin</Link>
          <div className="bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error || 'Article not found.'}
          </div>
        </div>
      </main>
    );
  }

  const qualityScore = Number(article.compositeQualityScore || 0);
  const originalityScore = Number(article.originalityScore || 0);
  const aiScore = Number(article.aiProbabilityScore || 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/admin" className="hover:text-white">Admin</Link>
          <span>›</span>
          <span className="text-white">Article Review</span>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 bg-green-950/60 border border-green-800 text-green-200 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-white leading-tight">{article.title}</h1>
                <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded-full shrink-0 ml-3">
                  {article.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
                <span>By <strong className="text-white">{article.authorName}</strong> ({article.authorEmail})</span>
                <span>{article.categoryName || 'Uncategorized'}</span>
                <span>{(article.wordCount || 0).toLocaleString()} words</span>
                <span>Submitted {new Date(article.submittedAt || article.createdAt).toLocaleDateString()}</span>
              </div>
              {article.excerpt && (
                <p className="text-gray-400 text-sm italic border-l-4 border-blue-700 pl-4 mb-6">
                  {article.excerpt}
                </p>
              )}
              <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-xs bg-gray-800 rounded-lg p-4 max-h-[520px] overflow-y-auto">
                {article.content}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-bold text-white mb-4">Quality Scores</h2>
              {[
                { label: 'Overall Quality', score: qualityScore, threshold: 70 },
                { label: 'Originality', score: originalityScore, threshold: 85 },
                { label: 'AI-Generated Content', score: aiScore, threshold: 20, inverted: true },
              ].map((s) => (
                <div key={s.label} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{s.label}</span>
                    <span
                      className={
                        s.inverted
                          ? s.score <= s.threshold ? 'text-green-400' : 'text-red-400'
                          : s.score >= s.threshold ? 'text-green-400' : 'text-yellow-400'
                      }
                    >
                      {s.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, s.score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="font-bold text-white">Decision</h2>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for the creator (sent in email)..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                disabled={busy}
                onClick={() => handleAction('approve')}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                Approve Article
              </button>
              <button
                disabled={busy}
                onClick={() => handleAction('request_revision')}
                className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                Request Revision
              </button>
              <button
                disabled={busy}
                onClick={() => handleAction('reject')}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                Reject Article
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
