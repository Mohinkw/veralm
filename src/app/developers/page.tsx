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
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function DevelopersPage() {
  const { user, isLoading: authLoading } = useAccount();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [keyName, setKeyName] = useState('');
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setKeys([]);
        return;
      }
      const res = await fetch('/api/developers/keys', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const body = await res.json();
        setKeys(body.keys || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (!authLoading) void loadKeys();
  }, [authLoading, user.id, loadKeys]);

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
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not create key.');
      setRawKey(body.rawKey || null);
      setKeyName('');
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create API key.');
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
            Ground your AI agents, RAG pipelines, and IDE assistants on verified human-authored knowledge. Every API query attributes original authors.
          </p>
        </div>

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

          {!authLoading && !user.isLoggedIn ? (
            <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Sign in to mint and manage <code className="text-xs">vlm_live_...</code> API keys (1,000 free monthly grounding requests).
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
              <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Key label (e.g. Claude Desktop MCP or Production Agent)"
                  className="w-full sm:flex-1 min-w-0"
                  maxLength={60}
                />
                <Button type="submit" disabled={busy} className="gap-1.5 shrink-0">
                  <Plus className="h-4 w-4" />
                  Create Key
                </Button>
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
                    <div key={k.id} className="p-3.5 flex items-center justify-between gap-3 bg-background/60">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{k.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {k.keyPrefix}… &middot; {k.requestsUsed}/{k.monthlyQuota} reqs ({k.tier})
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleRevoke(k.id)}
                        className="text-destructive hover:text-destructive shrink-0"
                        aria-label={`Revoke ${k.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
