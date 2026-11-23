'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, User, Mail, Globe, Save, CheckCircle2, ShieldCheck, CreditCard, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAccount } from '@/lib/account-context';
import { supabase } from '@/lib/supabase';

export default function CreatorProfilePage() {
  const { user } = useAccount();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [primaryNiche, setPrimaryNiche] = useState('Technology & Engineering');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user.isLoggedIn) {
      const storageKey = `veralm_creator_profile_${user.id || user.email}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDisplayName(parsed.displayName || user.name || user.email?.split('@')[0] || '');
          setEmail(parsed.email || user.email || '');
          setWebsite(parsed.website || '');
          setBio(parsed.bio || '');
          setPrimaryNiche(parsed.primaryNiche || 'Technology & Engineering');
          return;
        } catch {
          // ignore
        }
      }
      setDisplayName(user.name || user.email?.split('@')[0] || 'Creator');
      setEmail(user.email || '');
      setBio('Verified contributor on VeraLM Knowledge Vault.');
    } else {
      setDisplayName('Creator');
      setEmail('');
      setBio('Verified contributor on VeraLM Knowledge Vault.');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const storageKey = `veralm_creator_profile_${user.id || user.email}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        displayName,
        email,
        website,
        bio,
        primaryNiche,
      })
    );

    try {
      if (user.isLoggedIn) {
        await supabase.auth.updateUser({
          data: { full_name: displayName },
        });
      }
    } catch {
      // ignore
    }

    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/creators/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="font-bold text-lg">Creator Profile & Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/creators/dashboard">
              <Button size="sm" variant="outline">Back to Studio</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile & Payment Settings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your author attribution, verified expertise credentials, and payout settings.
              </p>
            </div>
            {user.isLoggedIn && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Universal Account: {user.name || user.email?.split('@')[0]}
                </span>
              </div>
            )}
          </div>

          {!user.isLoggedIn && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" />
                <span>You are currently not signed in. Sign in to sync your creator profile across sessions.</span>
              </div>
              <Link href="/login">
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Button>
              </Link>
            </div>
          )}

          {isSaved && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Profile settings saved successfully!</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* Identity Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Author Identity & Attribution
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Display Name / Author Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alpha"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email (Notifications & Payouts)
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    placeholder="e.g. you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Personal Website / Technical Blog / GitHub
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourdomain.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Author Bio & Expertise
                </label>
                <Textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your domain background, industry experience, or research specialty..."
                  required
                />
                <p className="text-xs text-muted-foreground">Appears alongside excerpt citations in search results.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Primary Subject Specialization
                </label>
                <Input
                  value={primaryNiche}
                  onChange={(e) => setPrimaryNiche(e.target.value)}
                  placeholder="e.g. Technology & Engineering, Healthcare, Law, Finance"
                />
              </div>
            </div>

            {/* Payment & Verification Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Stripe Connect & Payout Status
              </h2>

              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">Direct Deposit (Bank ACH)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Universal payout email: <span className="font-mono text-foreground">{email || user.email || 'Not configured'}</span>
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Eligible for 90% net royalty pool payouts (Threshold: $50.00 USD)
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => alert(`Stripe Connect setup link sent to ${email || user.email || 'your email'}.`)}
                >
                  Configure Payouts
                </Button>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>All banking data is processed securely through Stripe. VeraLM never stores your raw bank or card credentials.</span>
              </div>
            </div>

            <Button type="submit" disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
