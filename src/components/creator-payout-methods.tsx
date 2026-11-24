'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  Lock,
  Plus,
  Coins,
  Star,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/lib/account-context';

export type PayoutMethodType =
  | 'stripe_connect'
  | 'payoneer'
  | 'wise'
  | 'paypal'
  | 'bank_wire'
  | 'crypto';

interface PayoutMethod {
  id: string;
  methodType: PayoutMethodType;
  label: string;
  accountIdentifier: string;
  currency: string;
  detailsJson?: Record<string, string>;
  isDefault: boolean;
  isVerified: boolean;
}

const METHOD_OPTIONS: Array<{
  type: PayoutMethodType;
  name: string;
  hint: string;
  placeholder: string;
  defaultCurrency: string;
  icon: typeof CreditCard;
}> = [
  {
    type: 'stripe_connect',
    name: 'Stripe Connect (ACH / SEPA)',
    hint: 'US, UK, EU, UAE, SG bank direct deposit',
    placeholder: 'Stripe payout email (e.g. you@domain.com)',
    defaultCurrency: 'USD',
    icon: CreditCard,
  },
  {
    type: 'payoneer',
    name: 'Payoneer',
    hint: 'Global payouts (ideal for South Asia & MENA)',
    placeholder: 'Payoneer account email',
    defaultCurrency: 'USD',
    icon: Globe,
  },
  {
    type: 'wise',
    name: 'Wise (TransferWise)',
    hint: 'Low-fee multi-currency bank transfer',
    placeholder: 'Wise email or @wisetag',
    defaultCurrency: 'USD',
    icon: Wallet,
  },
  {
    type: 'paypal',
    name: 'PayPal',
    hint: 'Fast global wallet payout',
    placeholder: 'PayPal email address',
    defaultCurrency: 'USD',
    icon: Wallet,
  },
  {
    type: 'bank_wire',
    name: 'Bank Wire / IBAN / SWIFT',
    hint: 'International wire transfer',
    placeholder: 'IBAN or Account Number',
    defaultCurrency: 'USD',
    icon: Building2,
  },
  {
    type: 'crypto',
    name: 'Crypto (USDC / USDT / BTC)',
    hint: 'Global borderless payouts (Base, Polygon, TRC20, BTC)',
    placeholder: 'Wallet address (0x..., T..., or bc1...)',
    defaultCurrency: 'USDC',
    icon: Coins,
  },
];

function maskIdentifier(id: string): string {
  if (id.includes('@')) {
    const [local, domain] = id.split('@');
    if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  }
  if (id.length <= 4) return id;
  return `•••• ${id.slice(-4)}`;
}

export function CreatorPayoutMethods() {
  const { user } = useAccount();
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [minimumPayout, setMinimumPayout] = useState(50);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [methodType, setMethodType] = useState<PayoutMethodType>('payoneer');
  const [label, setLabel] = useState('');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bankSwift, setBankSwift] = useState('');
  const [bankName, setBankName] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('USDC (Base / Polygon)');
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMethods = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/creators/payout-methods', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
        if (typeof data.minimumPayout === 'number') setMinimumPayout(data.minimumPayout);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMethods();
  }, [loadMethods, user.isLoggedIn]);

  const selectedMeta =
    METHOD_OPTIONS.find((m) => m.type === methodType) || METHOD_OPTIONS[0];

  const handleSelectType = (nextType: PayoutMethodType) => {
    setMethodType(nextType);
    const meta = METHOD_OPTIONS.find((m) => m.type === nextType);
    if (meta) {
      setCurrency(meta.defaultCurrency);
      if (!label) setLabel(meta.name.split(' (')[0]);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in first to add a payment method.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/creators/payout-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          methodType,
          label: label.trim() || selectedMeta.name.split(' (')[0],
          accountIdentifier: accountIdentifier.trim(),
          currency,
          isDefault,
          details:
            methodType === 'bank_wire'
              ? { bankName: bankName.trim(), swift: bankSwift.trim() }
              : methodType === 'crypto'
              ? { network: cryptoNetwork }
              : {},
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save payment method.');
      } else {
        setAccountIdentifier('');
        setBankName('');
        setBankSwift('');
        setLabel('');
        setShowForm(false);
        await loadMethods();
      }
    } catch {
      setError('Network error saving payment method.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch('/api/creators/payout-methods', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    });
    await loadMethods();
  };

  const handleDelete = async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/creators/payout-methods?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await loadMethods();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Creator Payout Methods
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receive 90% of net post revenue (after server costs &amp; 10% platform fee). Minimum payout: ${minimumPayout.toFixed(2)} USD.
          </p>
        </div>

        {user.isLoggedIn && (
          <Button
            type="button"
            size="sm"
            variant={showForm ? 'outline' : 'default'}
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Add Payment Method'}
          </Button>
        )}
      </div>

      {/* Saved Methods List */}
      {loading ? (
        <div className="text-xs text-muted-foreground py-3">Loading saved payout methods...</div>
      ) : methods.length === 0 ? (
        <div className="p-4 rounded-xl bg-muted/40 border border-dashed border-border text-sm text-muted-foreground">
          No payout methods added yet. Add Stripe Connect, Payoneer, Wise, PayPal, Bank Wire, or Crypto to receive monthly royalty payouts.
        </div>
      ) : (
        <div className="space-y-2.5">
          {methods.map((m) => {
            const meta = METHOD_OPTIONS.find((o) => o.type === m.methodType);
            const Icon = meta?.icon || CreditCard;
            return (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{m.label}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {meta?.name.split(' (')[0] || m.methodType} · {m.currency}
                      </span>
                      {m.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {maskIdentifier(m.accountIdentifier)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!m.isDefault && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => handleSetDefault(m.id)}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(m.id)}
                    title="Remove payment method"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Payment Method Form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Payment Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {METHOD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = methodType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleSelectType(opt.type)}
                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                      active
                        ? 'border-primary bg-background shadow-sm'
                        : 'border-border bg-background/60 hover:border-primary/40'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <div className="text-xs font-semibold">{opt.name}</div>
                      <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Account Label</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={selectedMeta.name.split(' (')[0]}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Payout Currency</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={6}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Account Email / ID / Number</label>
            <Input
              required
              value={accountIdentifier}
              onChange={(e) => setAccountIdentifier(e.target.value)}
              placeholder={selectedMeta.placeholder}
            />
          </div>

          {methodType === 'bank_wire' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Bank Name</label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Citibank / HSBC"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">SWIFT / BIC Code</label>
                <Input
                  value={bankSwift}
                  onChange={(e) => setBankSwift(e.target.value)}
                  placeholder="e.g. CITIUS33"
                />
              </div>
            </div>
          )}

          {methodType === 'crypto' && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Blockchain Network</label>
              <select
                value={cryptoNetwork}
                onChange={(e) => setCryptoNetwork(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="USDC (Base / Polygon)">USDC (Base / Polygon — lowest fee)</option>
                <option value="USDC (Ethereum ERC20)">USDC (Ethereum ERC20)</option>
                <option value="USDT (TRC20)">USDT (Tron TRC20)</option>
                <option value="USDT (ERC20)">USDT (Ethereum ERC20)</option>
                <option value="Solana (USDC / SOL)">Solana (USDC / SOL)</option>
                <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-border"
            />
            Set as default payout method
          </label>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Payment Method'}
            </Button>
          </div>
        </form>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>
          Payout identifiers are stored securely and masked in the UI. VeraLM never stores raw card numbers or banking passwords.
        </span>
      </div>
    </div>
  );
}
