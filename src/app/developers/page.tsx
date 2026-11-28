'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Terminal,
  Cpu,
  FileText,
  LogIn,
  AlertCircle,
  Wallet,
  Shield,
  RefreshCw,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/lib/account-context';
import { supabase } from '@/lib/supabase';

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  tier: string;
  monthlyQuota: number;
  requestsUsed: number;
  hourlyRequestsUsed?: number;
  scopes?: string[];
  allowedIps?: string[];
  expiresAt?: string | null;
  lastUsedIp?: string | null;
  disabledReason?: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

type AccountSummary = {
  plan: 'free' | 'pro';
  creditBalanceCents: number;
  hourlyLimit: number;
  monthlyLimit: number;
  paygHourlyLimit: number;
  lastSignIn: string;
};

type CreditTx = {
  id: string;
  amountCents: number;
  balanceAfterCents: number;
  txType: string;
  description: string | null;
  createdAt: string;
};

const ALL_SCOPES = [
  { id: 'ground:read', label: 'Grounding API' },
  { id: 'chat:write', label: 'Chat / Search API' },
  { id: 'mcp:read', label: 'MCP Server' },
];

export default function DevelopersPage() {
  const { user, isLoading: authLoading } = useAccount();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [transactions, setTransactions] = useState<CreditTx[]>([]);
  const [keyName, setKeyName] = useState('');
  const [keyTier, setKeyTier] = useState<'standard' | 'payg'>('standard');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'ground:read',
    'chat:write',
    'mcp:read',
  ]);
  const [allowedIpsInput, setAllowedIpsInput] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('90');
  const [topupAmount, setTopupAmount] = useState('25');
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setKeys([]);
        setAccount(null);
        setTransactions([]);
        return;
      }
      const res = await fetch('/api/developers/keys', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const body = await res.json();
        setKeys(body.keys || []);
        setAccount(body.account || null);
        setTransactions(body.transactions || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (!authLoading) void loadKeys();
  }, [authLoading, user.id, loadKeys]);

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.length > 1
          ? prev.filter((s) => s !== scopeId)
          : prev
        : [...prev, scopeId]
    );
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyName.trim().length < 2) {
      setError('Enter a descriptive key name (at least 2 characters).');
      return;
    }
    setBusy(true);
    setError(null);
    setRawKey(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required.');
      const res = await fetch('/api/developers/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: keyName.trim(),
          tier: keyTier === 'payg' ? 'payg' : undefined,
          scopes: selectedScopes,
          allowedIps: allowedIpsInput.trim() || undefined,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not create key.');
      setRawKey(body.rawKey || null);
      setKeyName('');
      setAllowedIpsInput('');
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create API key.');
    } finally {
      setBusy(false);
    }
  };

  const handleTopup = async (amountUsd?: number) => {
    const amount = amountUsd ?? Number(topupAmount);
    if (!Number.isFinite(amount) || amount < 5) {
      setError('Minimum wallet top-up is $5.00 USD.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required.');
      const res = await fetch('/api/developers/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amountUsd: amount }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error || 'Could not start checkout.');
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top-up failed.');
      setBusy(false);
    }
  };

  const handleToggleKey = async (k: ApiKeyRow) => {
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required.');
      const res = await fetch('/api/developers/keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: k.id, isActive: !k.isActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Update failed.');
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRotateKey = async (k: ApiKeyRow) => {
    setBusy(true);
    setError(null);
    setRawKey(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required.');
      const res = await fetch('/api/developers/keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: k.id, rotate: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Key rotation failed.');
      setRawKey(body.rawKey || null);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rotation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required.');
      const res = await fetch(`/api/developers/keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Could not revoke key.');
      }
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed.');
    } finally {
      setBusy(false);
    }
  };

  const copyRawKey = () => {
    if (!rawKey) return;
    navigator.clipboard?.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Navbar activePage="developers" />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-10 space-y-8 overflow-x-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Cpu className="h-3.5 w-3.5" />
            Grounding API &amp; MCP Server
          </div>
          <h1 className="text-3xl font-bold tracking-tight">VeraLM Developer Portal</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Ground your AI agents, RAG pipelines, and IDE assistants on verified human-authored knowledge.
          </p>
        </div>

        {/* Plan Tiers & Rate Limits */}
        <section className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free Plan</div>
            <div className="text-lg font-bold">500 req / month</div>
            <div className="text-xs text-muted-foreground">Max 3 requests / hour</div>
          </div>
          <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Pro Plan</div>
            <div className="text-lg font-bold">1,000 req / month</div>
            <div className="text-xs text-muted-foreground">Max 10 requests / hour</div>
          </div>
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Paid API Wallet
            </div>
            <div className="text-lg font-bold">Unlimited Top-Up</div>
            <div className="text-xs text-muted-foreground">$0.01 / req &middot; 120 req / hour</div>
          </div>
        </section>

        {/* Pay-As-You-Go Wallet (Authenticated) */}
        {user.isLoggedIn && account && (
          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                  Paid API Wallet Balance
                </h2>
                <p className="text-xs text-muted-foreground">
                  Load unlimited non-expiring credits ($0.01/request). Automatically covers overages or dedicated Paid API keys.
                </p>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${(account.creditBalanceCents / 100).toFixed(2)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[10, 25, 100].map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => handleTopup(amt)}
                >
                  +${amt}
                </Button>
              ))}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Input
                  type="number"
                  min={5}
                  step="1"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Custom USD"
                  className="h-9"
                />
                <Button type="button" size="sm" disabled={busy} onClick={() => handleTopup()}>
                  Load Funds
                </Button>
              </div>
            </div>

            {transactions.length > 0 && (
              <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
                {transactions.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <span>{tx.description || tx.txType}</span>
                    <span className={tx.amountCents >= 0 ? 'text-emerald-600 font-semibold' : ''}>
                      {tx.amountCents >= 0 ? '+' : '-'}${Math.abs(tx.amountCents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* API Key Management */}
        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              API Keys
            </h2>
            <Link href="/llms.txt" className="text-xs text-primary hover:underline flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              View /llms.txt
            </Link>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              Security guardrails: Verified account login required to mint keys; SHA-256 hashed at rest; scoped permissions; optional IP allowlists &amp; expiration; keys auto-disable if the owner has not signed in for 30 days.
            </span>
          </div>

          {!authLoading && !user.isLoggedIn ? (
            <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Sign in with a verified account to generate and manage <code className="text-xs">vlm_live_...</code> API keys. Unauthenticated users cannot create API keys.
              </p>
              <Link href="/login">
                <Button size="sm" className="gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleCreateKey} className="space-y-3 p-4 rounded-xl border border-border bg-background/50">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="Key label (e.g. Claude Desktop MCP or Production Agent)"
                    className="w-full sm:flex-1 min-w-0"
                    maxLength={60}
                  />
                  <select
                    value={keyTier}
                    onChange={(e) => setKeyTier(e.target.value as 'standard' | 'payg')}
                    className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium"
                  >
                    <option value="standard">
                      {account?.plan === 'pro' ? 'Pro Plan (1,000/mo · 10/hr)' : 'Free Tier (500/mo · 3/hr)'}
                    </option>
                    <option value="payg">Paid API Wallet ($0.01/req · 120/hr)</option>
                  </select>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium"
                  >
                    <option value="30">Expires in 30d</option>
                    <option value="90">Expires in 90d</option>
                    <option value="365">Expires in 1y</option>
                    <option value="">No expiration</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">Scopes:</span>
                  {ALL_SCOPES.map((s) => (
                    <label key={s.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(s.id)}
                        onChange={() => toggleScope(s.id)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={allowedIpsInput}
                    onChange={(e) => setAllowedIpsInput(e.target.value)}
                    placeholder="Optional IP allowlist (comma-separated, e.g. 203.0.113.10)"
                    className="w-full sm:flex-1 min-w-0 text-xs"
                  />
                  <Button type="submit" disabled={busy} className="gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />
                    Create Key
                  </Button>
                </div>
              </form>

              {error && (
                <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {rawKey && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Copy your new API key now — it will not be shown again:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs bg-background border border-border px-3 py-1.5 rounded-lg font-mono break-all flex-1">
                      {rawKey}
                    </code>
                    <Button type="button" size="sm" variant="outline" onClick={copyRawKey} className="gap-1.5 shrink-0">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}

              {keys.length > 0 && (
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                  {keys.map((k) => (
                    <div key={k.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-background/60">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">{k.name}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              k.isActive
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {k.isActive
                              ? 'Active'
                              : k.disabledReason === 'inactive_account_30d'
                                ? 'Disabled (30d login inactivity)'
                                : 'Paused'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {k.keyPrefix}… &middot;{' '}
                          {k.tier === 'payg'
                            ? `${k.requestsUsed} reqs (Pay-As-You-Go)`
                            : `${k.requestsUsed}/${k.monthlyQuota} monthly`}
                          {k.lastUsedIp ? ` · Last IP ${k.lastUsedIp}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleToggleKey(k)}
                          title={k.isActive ? 'Pause key' : 'Re-enable key'}
                          aria-label={k.isActive ? `Pause ${k.name}` : `Enable ${k.name}`}
                        >
                          {k.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4 text-emerald-500" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleRotateKey(k)}
                          title="Rotate key"
                          aria-label={`Rotate ${k.name}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleRevoke(k.id)}
                          className="text-destructive hover:text-destructive"
                          aria-label={`Revoke ${k.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Grounding REST API & MCP Examples */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3 min-w-0">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              Grounding REST API
            </h2>
            <p className="text-xs text-muted-foreground">
              Retrieve hybrid-ranked verified passages and author citations directly as structured JSON.
            </p>
            <pre className="text-xs bg-muted/60 border border-border rounded-xl p-3 overflow-x-auto max-w-full font-mono">
{`curl -X POST https://veralm.com/api/v1/ground \\
  -H "Authorization: Bearer vlm_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"query":"HNSW index tuning","limit":5}'`}
            </pre>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3 min-w-0">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              MCP Server (JSON-RPC 2.0)
            </h2>
            <p className="text-xs text-muted-foreground">
              Connect AI assistants via Model Context Protocol (<code className="text-[11px]">/api/mcp</code>) using <code className="text-[11px]">query_verified_knowledge</code>.
            </p>
            <pre className="text-xs bg-muted/60 border border-border rounded-xl p-3 overflow-x-auto font-mono">
{`POST https://veralm.com/api/mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}`}
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}
