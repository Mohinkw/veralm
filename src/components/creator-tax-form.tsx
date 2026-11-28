'use client';

import { useEffect, useState } from 'react';
import { FileCheck2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

export function CreatorTaxForm() {
  const [taxFormType, setTaxFormType] = useState<'w9' | 'w8ben'>('w9');
  const [taxCountry, setTaxCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxIdMasked, setTaxIdMasked] = useState<string | null>(null);
  const [hasTaxInfo, setHasTaxInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/creators/tax-info', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setHasTaxInfo(Boolean(data.hasTaxInfo));
          if (data.taxCountry) setTaxCountry(data.taxCountry);
          if (data.taxFormType) setTaxFormType(data.taxFormType);
          if (data.taxIdMasked) setTaxIdMasked(data.taxIdMasked);
        }
      } catch {
        // ignore background fetch errors on mount
      }
    }
    void load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to save tax information.');
      const res = await fetch('/api/creators/tax-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ taxFormType, taxCountry, taxId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save tax details.');
      setHasTaxInfo(true);
      setTaxIdMasked(body.taxIdMasked);
      setTaxId('');
      setMessage('Tax details saved securely.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <span>Tax Compliance (W-9 / W-8BEN)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Required before automated monthly royalty payouts are released.
          </p>
        </div>
        {hasTaxInfo && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            On File ({taxFormType.toUpperCase()} {taxIdMasked})
          </span>
        )}
      </div>

      {message && <p className="text-xs text-emerald-600 font-medium">{message}</p>}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <label htmlFor="tax-form-type" className="text-xs font-medium text-muted-foreground block mb-1">Form Type</label>
          <select
            id="tax-form-type"
            value={taxFormType}
            onChange={(e) => setTaxFormType(e.target.value as 'w9' | 'w8ben')}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="w9">W-9 (US Person / Entity)</option>
            <option value="w8ben">W-8BEN (Non-US)</option>
          </select>
        </div>
        <div>
          <label htmlFor="tax-country" className="text-xs font-medium text-muted-foreground block mb-1">Tax Country</label>
          <Input
            id="tax-country"
            required
            value={taxCountry}
            onChange={(e) => setTaxCountry(e.target.value)}
            placeholder="e.g. United States"
          />
        </div>
        <div>
          <label htmlFor="tax-id" className="text-xs font-medium text-muted-foreground block mb-1">
            {taxFormType === 'w9' ? 'SSN / EIN' : 'Foreign Tax ID'}
          </label>
          <Input
            id="tax-id"
            required
            type="password"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder={taxIdMasked ? `Saved (${taxIdMasked})` : 'Enter tax identifier'}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : hasTaxInfo ? 'Update Tax Info' : 'Save Tax Info'}
        </Button>
      </form>
    </div>
  );
}
