'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/lib/account-context';
import { AdminHeader } from '@/components/admin-header';

type CreatorRow = {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  email: string;
  primaryCategories: string[] | null;
  reputationTier: string;
  totalArticlesApproved: number;
  totalQueryContributions: number;
  totalLifetimeEarnings: string;
  stripeAccountId: string | null;
  isActive: boolean;
  createdAt: string;
  payoutMethodsCount: number;
};

export default function AdminCreatorsPage() {
  const { user, isLoading: authLoading } = useAccount();
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchCreators = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in as an administrator.');
      const res = await fetch('/api/admin/creators', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load creators.');
      setCreators(body.creators || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load creators.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      void fetchCreators();
    }
  }, [authLoading, user.id, fetchCreators]);

  const toggleStatus = async (creatorId: string, nextActive: boolean) => {
    setBusyId(creatorId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in as an administrator.');
      const res = await fetch('/api/admin/creators', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ creatorId, isActive: nextActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Update failed.');
      await fetchCreators();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update creator.');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = ['Name', 'Email', 'Tier', 'Approved Articles', 'Citations', 'Lifetime Earned', 'Payout Methods', 'Status'];
    const lines = creators.map((c) => [
      `"${c.displayName.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      c.reputationTier,
      c.totalArticlesApproved,
      c.totalQueryContributions,
      Number(c.totalLifetimeEarnings || 0).toFixed(2),
      c.payoutMethodsCount,
      c.isActive ? 'active' : 'suspended',
    ].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veralm-creators-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeCount = creators.filter((c) => c.isActive).length;
  const payoutReadyCount = creators.filter((c) => c.stripeAccountId || c.payoutMethodsCount > 0).length;
  const totalPaid = creators.reduce((s, c) => s + Number(c.totalLifetimeEarnings || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader activeTab="creators" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Creator Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">{creators.length} registered creators</p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={creators.length === 0}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium self-start sm:self-auto"
          >
            Export CSV
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            {error} <Link href="/login" className="underline ml-2">Sign in</Link>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Creators', value: creators.length },
            { label: 'Active', value: activeCount },
            { label: 'Payout Ready', value: payoutReadyCount },
            { label: 'Total Paid Out', value: `$${totalPaid.toFixed(2)}` },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                {['Creator', 'Categories', 'Articles', 'Total Earned', 'Payout', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading creators...</td>
                </tr>
              ) : creators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No creators found.</td>
                </tr>
              ) : (
                creators.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/creators/${c.slug}`} className="font-medium hover:underline">
                        {c.displayName}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(c.primaryCategories || []).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">{c.totalArticlesApproved}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                      ${Number(c.totalLifetimeEarnings || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {c.stripeAccountId || c.payoutMethodsCount > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs">Configured ({c.payoutMethodsCount})</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-xs">Not configured</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          c.isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
                        }`}
                      >
                        {c.isActive ? 'active' : 'suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => toggleStatus(c.id, !c.isActive)}
                        className="text-xs px-2.5 py-1 rounded border border-border hover:bg-accent disabled:opacity-50"
                      >
                        {c.isActive ? 'Suspend' : 'Activate'}
                      </button>
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
