'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
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

export default function AdminRevenuePage() {
  const [rows, setRows] = useState<RevenueRow[]>([]);
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
      const res = await fetch('/api/admin/revenue', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load revenue.');
      setRows(body.revenue || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load revenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <AdminHeader activeTab="revenue" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Revenue Management</h1>
            <p className="text-gray-400 mt-1">Monthly distribution history and pending payouts</p>
          </div>
          <button
            onClick={handleRunDistribution}
            disabled={busy}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {busy ? 'Running...' : 'Run Payout Distribution'}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error} <Link href="/login" className="underline ml-2">Sign in</Link>
          </div>
        )}
        {message && (
          <div className="mb-6 bg-green-950/60 border border-green-800 text-green-200 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div className="grid sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Gross Revenue', value: `$${totalGross.toFixed(2)}`, color: 'text-blue-400' },
            { label: 'AI & Server Costs', value: `$${totalInfra.toFixed(2)}`, color: 'text-yellow-400' },
            { label: 'Creator Royalty Pool (Up to 90%)', value: `$${totalCreatorPool.toFixed(2)}`, color: 'text-green-400' },
            { label: 'Platform Margin (10%)', value: `$${totalPlatformMargin.toFixed(2)}`, color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSaveEntry} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Record Platform Revenue</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Month</label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Subscription Revenue (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subscriptionRevenue}
                onChange={(e) => setSubscriptionRevenue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ad Revenue (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={adRevenue}
                onChange={(e) => setAdRevenue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                Save Entry
              </button>
            </div>
          </div>
        </form>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                {['Period', 'Subscriptions', 'Ads', 'Gross', 'Infra Cost', 'Creator Pool', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading revenue records...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No platform revenue periods recorded yet.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-white">{r.revenuePeriod}</td>
                    <td className="px-4 py-3 text-gray-300">${Number(r.subscriptionRevenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-300">${Number(r.adRevenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-blue-400 font-medium">${Number(r.grossRevenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-yellow-400">${Number(r.infrastructureCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-green-400 font-medium">${Number(r.creatorPool || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-200">{r.status}</span>
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
