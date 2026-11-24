'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Crown,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/lib/account-context';
import { supabase } from '@/lib/supabase';

export default function VeraLMProPage() {
  const { user, refreshProStatus } = useAccount();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('Please sign in first to upgrade to VeraLM Pro.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/pro/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ billingCycle }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.upgraded) {
        await refreshProStatus();
        setMessage('VeraLM Pro is now active on your account!');
      } else {
        setError(data.error || 'Unable to start Pro checkout.');
      }
    } catch {
      setError('Network error starting Pro checkout.');
    } finally {
      setLoading(false);
    }
  };

  const price = billingCycle === 'annual' ? '$79' : '$9';
  const period = billingCycle === 'annual' ? '/year' : '/month';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>VeraLM</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold">
              Pro
            </span>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
        </div>
      </header>

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold">
              <Crown className="h-3.5 w-3.5" />
              VeraLM Pro Membership
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ad-Free AI Chat &amp; Unlimited Full Articles
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Support verified human knowledge creators directly while unlocking an uninterrupted, ad-free research experience.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl border border-border p-1 bg-muted/40">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                Annual (Save 27%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Tier */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold">Free</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Standard AI chat &amp; citation-gated articles
                </p>
                <div className="mt-4 text-3xl font-bold">$0</div>
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  Grounded AI search with verified citations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  Read cited articles via temporary Citation Pass
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  Ad-supported reading experience
                </li>
              </ul>
            </div>

            {/* Pro Tier */}
            <div className="bg-card border-2 border-primary rounded-2xl p-6 space-y-5 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    VeraLM Pro
                    <Crown className="h-4 w-4 text-amber-500" />
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Zero ads + full vault access
                  </p>
                </div>
                {user.isPro && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                    Active
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{price}</span>
                <span className="text-sm text-muted-foreground">{period}</span>
              </div>

              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <strong>100% Ad-Free</strong> chat &amp; article reader
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <strong>Unlimited Full Article Access</strong> across all categories
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  90% of net subscription revenue funds creator royalties
                </li>
              </ul>

              {user.isPro ? (
                <Button disabled className="w-full">
                  VeraLM Pro Active
                </Button>
              ) : !user.isLoggedIn ? (
                <Link href="/login" className="block">
                  <Button className="w-full">Sign In to Upgrade</Button>
                </Link>
              ) : (
                <Button onClick={handleUpgrade} disabled={loading} className="w-full">
                  {loading ? 'Starting Checkout...' : `Upgrade to Pro (${price}${period})`}
                </Button>
              )}

              {message && <p className="text-xs text-emerald-600 font-medium">{message}</p>}
              {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
