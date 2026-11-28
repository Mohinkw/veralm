'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/lib/account-context';
import { AdminHeader } from '@/components/admin-header';

type RevenueRow = {
  id: string;
  revenuePeriod: string;
  subscriptionRevenue: string;
  adRevenue: string;
  grossRevenue: string;
  infrastructureCost: string;
  creatorPool: string;
  creatorPoolPct: string | null;
  status: string;
};

type PendingBatchPayout = {
  earningId: string;
  creatorId: string;
  displayName: string;
  revenuePeriod: string;
  netEarnings: string;
  methodType: string;
  accountReference: string | null;
  currency: string;
};

export default function AdminRevenuePage() {
  const { user, isLoading: authLoading } = useAccount();
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingBatchPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState('');
  const [adRevenue, setAdRevenue] = useState('');

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in as an administrator.');
    return session.access_token;
  };

  const fetchRevenue = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/revenue?pending_batch=1', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load revenue.');
      setRows(body.revenue || []);
      setPendingPayouts(body.pendingPayouts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load revenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      void fetchRevenue();
    }
  }, [authLoading, user.id, fetchRevenue]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          revenuePeriod: month,
          subscriptionRevenue: Number(subscriptionRevenue || 0),
          adRevenue: Number(adRevenue || 0),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save revenue record.');
      setMessage(`Saved revenue entry for ${month}.`);
      setSubscriptionRevenue('');
      setAdRevenue('');
      await fetchRevenue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (pendingPayouts.length === 0) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ['Earning ID', 'Creator', 'Period', 'Rail', 'Reference', 'Amount USD', 'Currency'].join(',');
    const lines = pendingPayouts.map((p) =>
      [
        esc(p.earningId),
        esc(p.displayName),
        esc(p.revenuePeriod),
        esc(p.methodType),
        esc(p.accountReference || ''),
        Number(p.netEarnings || 0).toFixed(2),
        esc(p.currency || 'USD'),
      ].join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veralm-payout-batch-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSettleBatch = async () => {
    if (pendingPayouts.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'mark_batch_settled',
          earningIds: pendingPayouts.map((p) => p.earningId),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Batch settlement failed.');
      setMessage(`Marked ${body.settledCount} queued non-Stripe payout(s) as settled.`);
      await fetchRevenue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch settlement failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRunDistribution = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'distribute' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Distribution failed.');
      const s = body.summary;
      setMessage(
        `Payout run complete: ${s.paidCount} paid ($${Number(s.totalPaidUsd || 0).toFixed(2)}), ${s.queuedCount} queued, ${s.skippedCount} skipped.`
      );
      await fetchRevenue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Distribution failed.');
    } finally {
      setBusy(false);
    }
  };

  const totalGross = rows.reduce((s, r) => s + Number(r.grossRevenue || 0), 0);
  const totalInfra = rows.reduce((s, r) => s + Number(r.infrastructureCost || 0), 0);
  const totalCreatorPool = rows.reduce((s, r) => s + Number(r.creatorPool || 0), 0);
  const totalPlatformMargin = Math.max(0, totalGross - totalInfra - totalCreatorPool);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader activeTab="revenue" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Revenue Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">Monthly distribution history and pending payouts</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            {pendingPayouts.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3.5 py-2 rounded-lg text-sm font-medium"
                >
                  Export Non-Stripe CSV ({pendingPayouts.length})
                </button>
                <button
                  type="button"
                  onClick={handleSettleBatch}
                  disabled={busy}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-sm font-medium"
                >
                  Mark Batch Settled
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleRunDistribution}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {busy ? 'Running...' : 'Run Payout Distribution'}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            {error} <Link href="/login" className="underline ml-2">Sign in</Link>
          </div>
        )}
        {message && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Gross Revenue', value: `$${totalGross.toFixed(2)}`, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'AI & Server Costs', value: `$${totalInfra.toFixed(2)}`, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Creator Royalty Pool (Up to 90%)', value: `$${totalCreatorPool.toFixed(2)}`, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Platform Margin (10%)', value: `$${totalPlatformMargin.toFixed(2)}`, color: 'text-purple-600 dark:text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSaveEntry} className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Record Platform Revenue</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="rev-month" className="text-xs text-muted-foreground block mb-1">Month</label>
              <input
                id="rev-month"
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="rev-sub" className="text-xs text-muted-foreground block mb-1">Subscription Revenue (USD)</label>
              <input
                id="rev-sub"
                type="number"
                step="0.01"
                min="0"
                value={subscriptionRevenue}
                onChange={(e) => setSubscriptionRevenue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="rev-ad" className="text-xs text-muted-foreground block mb-1">Ad Revenue (USD)</label>
              <input
                id="rev-ad"
                type="number"
                step="0.01"
                min="0"
                value={adRevenue}
                onChange={(e) => setAdRevenue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-lg text-sm font-medium"
              >
                Save Entry
              </button>
            </div>
          </div>
        </form>

        <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                {['Period', 'Subscriptions', 'Ads', 'Gross', 'Infra Cost', 'Creator Pool', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading revenue records...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No platform revenue periods recorded yet.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.revenuePeriod}</td>
                    <td className="px-4 py-3 text-muted-foreground">${Number(r.subscriptionRevenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">${Number(r.adRevenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium">${Number(r.grossRevenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">${Number(r.infrastructureCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">${Number(r.creatorPool || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">{r.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
