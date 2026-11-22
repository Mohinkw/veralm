'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, DollarSign, ArrowUpRight, TrendingUp, Calendar, CreditCard, Download, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export default function CreatorEarningsPage() {
  const earningsSummary = {
    currentUnpaid: 348.50,
    nextPayoutDate: 'December 1, 2026',
    minimumPayoutThreshold: 50.00,
    lifetimePaid: 1420.00,
    stripeAccountStatus: 'Active & Verified',
    stripeLast4: '4242',
    currency: 'USD',
  };

  const payoutHistory = [
    {
      id: 'po-109',
      period: 'October 2026',
      date: 'Nov 1, 2026',
      amount: 412.30,
      citationsCount: 914,
      status: 'Paid',
      destination: 'Stripe Direct (••4242)',
    },
    {
      id: 'po-108',
      period: 'September 2026',
      date: 'Oct 1, 2026',
      amount: 388.90,
      citationsCount: 860,
      status: 'Paid',
      destination: 'Stripe Direct (••4242)',
    },
    {
      id: 'po-107',
      period: 'August 2026',
      date: 'Sep 1, 2026',
      amount: 320.10,
      citationsCount: 710,
      status: 'Paid',
      destination: 'Stripe Direct (••4242)',
    },
    {
      id: 'po-106',
      period: 'July 2026',
      date: 'Aug 1, 2026',
      amount: 298.70,
      citationsCount: 654,
      status: 'Paid',
      destination: 'Stripe Direct (••4242)',
    },
  ];

  const articleRoyalties = [
    {
      id: 'art-1',
      title: 'Optimizing PostgreSQL for Vector RAG Workflows',
      monthlyCitations: 512,
      currentShare: 62.6,
      currentEarnings: 218.40,
    },
    {
      id: 'art-2',
      title: 'Chunking Strategies for Deep Technical Documentation',
      monthlyCitations: 330,
      currentShare: 37.4,
      currentEarnings: 130.10,
    },
  ];

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

          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => alert('Stripe Express Dashboard is connected and verified.')}>
            <CreditCard className="h-4 w-4" />
            Stripe Account
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Earnings & Royalties</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Every search query citing your knowledge attributes revenue directly from the up to 90% creator royalty pool (after AI engine and server costs).
              </p>
            </div>
            <Link href="/about#revenue" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Read transparent formula docs <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Balance Cards */}
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Estimated Upcoming Payout
              </div>
              <div className="text-3xl font-black text-emerald-600 mb-2">
                {formatCurrency(earningsSummary.currentUnpaid)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Next disbursement: <strong>{earningsSummary.nextPayoutDate}</strong></span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Total Lifetime Paid
              </div>
              <div className="text-3xl font-black text-foreground mb-2">
                {formatCurrency(earningsSummary.lifetimePaid)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Disbursed via automated bank ACH</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Payout Method (Stripe Connect)
              </div>
              <div className="text-base font-bold text-foreground flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Bank Ending in •••• {earningsSummary.stripeLast4}</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Status: {earningsSummary.stripeAccountStatus}</span>
              </div>
            </div>
          </div>

          {/* Per-Article Earnings Table */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">November 2026 Per-Article Attribution</h2>
                <p className="text-xs text-muted-foreground">Breakdown of current monthly earnings by cited vault knowledge</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                Current Pool Share: 4.8%
              </span>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="py-3 px-4">Article Title</th>
                    <th className="py-3 px-4">Queries Cited</th>
                    <th className="py-3 px-4">Weighted Contribution</th>
                    <th className="py-3 px-4 text-right">Attributed Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {articleRoyalties.map((art) => (
                    <tr key={art.id} className="hover:bg-muted/20">
                      <td className="py-3.5 px-4 font-medium">{art.title}</td>
                      <td className="py-3.5 px-4">{art.monthlyCitations.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">{art.currentShare}%</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        {formatCurrency(art.currentEarnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Payouts */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Payout History</h2>
                <p className="text-xs text-muted-foreground">All completed monthly royalty disbursements</p>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="py-3 px-4">Payout Period</th>
                    <th className="py-3 px-4">Disbursement Date</th>
                    <th className="py-3 px-4">Query Citations</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4 text-right">Net Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payoutHistory.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/20">
                      <td className="py-3.5 px-4 font-semibold">{po.period}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{po.date}</td>
                      <td className="py-3.5 px-4">{po.citationsCount} citations</td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">{po.destination}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        {formatCurrency(po.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
