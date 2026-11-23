'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  CreditCard,
  Download,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  User,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useAccount } from '@/lib/account-context';
import { supabase } from '@/lib/supabase';

type Article = {
  id: string;
  title: string;
  status: string;
  total_query_contributions: number | null;
  total_earnings_attributed: number | null;
};

export default function CreatorEarningsPage() {
  const { user } = useAccount();
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

  const totalEarnings = articles.reduce((sum, a) => sum + (Number(a.total_earnings_attributed) || 0), 0);
  const totalCitations = articles.reduce((sum, a) => sum + (a.total_query_contributions || 0), 0);
  const displayName = user.name || user.email?.split('@')[0] || 'Creator';
  const initial = displayName.charAt(0).toUpperCase();

  const earningsSummary = {
    currentUnpaid: totalEarnings,
    nextPayoutDate: '1st of next month',
    minimumPayoutThreshold: 50.00,
    lifetimePaid: 0.00,
    stripeAccountStatus: user.isLoggedIn ? 'Active & Universal' : 'Pending Sign In',
    paymentEmail: user.email || 'Not configured',
    currency: 'USD',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>VeraLM</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Creator Studio</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/creators/dashboard" className="text-muted-foreground hover:text-foreground">Overview</Link>
              <Link href="/creators/articles" className="text-muted-foreground hover:text-foreground">My Articles</Link>
              <Link href="/creators/earnings" className="text-foreground">Earnings & Payouts</Link>
              <Link href="/creators/analytics" className="text-muted-foreground hover:text-foreground">Analytics</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/creators/articles/new">
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="h-4 w-4" />
                Submit Article
              </Button>
            </Link>
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Earnings & Royalty Payouts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review current accrued royalties, payout status, and historical distributions for {displayName}.
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Accrued Royalties</span>
              <div className="text-2xl font-bold mt-2 text-emerald-600">{formatCurrency(earningsSummary.currentUnpaid)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Threshold for direct deposit: {formatCurrency(earningsSummary.minimumPayoutThreshold)}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next Scheduled Distribution</span>
              <div className="text-xl font-bold mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{earningsSummary.nextPayoutDate}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Automatic direct transfer</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Query Citations</span>
              <div className="text-2xl font-bold mt-2">{totalCitations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Attributed in VeraLM AI responses</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payout Account</span>
              <div className="text-sm font-semibold mt-2 truncate flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate">{earningsSummary.paymentEmail}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{earningsSummary.stripeAccountStatus}</p>
            </div>
          </div>

          {/* Articles generating royalties */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Article Royalty Breakdown</h2>
                <p className="text-xs text-muted-foreground">Royalties generated per verified article</p>
              </div>
              <Link href="/creators/articles/new">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  New Article
                </Button>
              </Link>
            </div>

            {articles.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center bg-card/50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <DollarSign className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm">No article royalties accrued yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Submit verified technical or domain knowledge to the Vault. When user queries cite your articles in AI answers, earnings are automatically calculated and attributed to your universal account.
                </p>
                <Link href="/creators/articles/new" className="inline-block mt-2">
                  <Button size="sm">Submit Your First Article</Button>
                </Link>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Citations</th>
                      <th className="py-3 px-4 text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {articles.map((art) => (
                      <tr key={art.id}>
                        <td className="py-3 px-4 font-medium">{art.title}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            art.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                          }`}>
                            {art.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{art.total_query_contributions || 0}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          {formatCurrency(Number(art.total_earnings_attributed) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historical Payouts */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Payout Distribution History</h2>
            <div className="p-8 rounded-xl border border-dashed border-border text-center bg-card/50 space-y-2">
              <p className="text-xs text-muted-foreground">
                No past payout distributions yet. Distributions are executed on the 1st of each month when earnings meet the $50.00 minimum threshold.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
