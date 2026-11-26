'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ArticleRatingProps {
  articleId: string;
  platformRatingOutOf10: number;
}

export function ArticleRating({ articleId, platformRatingOutOf10 }: ArticleRatingProps) {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/rating`, {
          headers,
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setAverageRating(data.averageRating ?? null);
          setTotalRatings(Number(data.totalRatings || 0));
          setUserRating(data.userRating ?? null);
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [articleId]);

  const submitRating = async (score: number) => {
    setSaving(true);
    setSavedMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/rating`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rating: score }),
      });
      if (res.ok) {
        const data = await res.json();
        setAverageRating(data.averageRating ?? null);
        setTotalRatings(Number(data.totalRatings || 0));
        setUserRating(data.userRating ?? score);
        setSavedMsg(`You rated this article ${score}/10`);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Rate this article</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Help verify knowledge quality on a 1–10 scale.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Platform Rating: {platformRatingOutOf10.toFixed(1)}/10</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>
              User Rating:{' '}
              {averageRating !== null
                ? `${averageRating.toFixed(1)}/10 (${totalRatings})`
                : `No ratings yet (0)`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: 10 }, (_, idx) => idx + 1).map((score) => {
          const active = userRating === score;
          return (
            <button
              key={score}
              type="button"
              disabled={saving}
              onClick={() => submitRating(score)}
              className={cn(
                'h-9 w-9 rounded-lg text-xs font-bold border transition-all',
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background border-border text-foreground hover:bg-accent hover:border-primary/40'
              )}
              aria-label={`Rate ${score} out of 10`}
            >
              {score}
            </button>
          );
        })}
      </div>

      {savedMsg && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{savedMsg}</p>
      )}
    </div>
  );
}
