'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, User, Mail, Globe, Save, CheckCircle2, ShieldCheck, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CreatorProfilePage() {
  const [displayName, setDisplayName] = useState('Alex Rivers');
  const [email, setEmail] = useState('alex.rivers@cloudsystems.io');
  const [website, setWebsite] = useState('https://cloudsystems.io');
  const [bio, setBio] = useState('Staff Infrastructure Engineer specializing in distributed databases, PostgreSQL internal storage architecture, and large-scale semantic vector retrieval pipelines.');
  const [primaryNiche, setPrimaryNiche] = useState('Software Engineering & Cloud');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
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
          <Link href="/creators/dashboard">
            <Button size="sm" variant="outline">Back to Studio</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile & Payment Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your public author attribution, verified domain credentials, and payout settings.
            </p>
          </div>

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
                Author Identity & Credentials
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email (Notifications & Payouts)</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Website / Technical Blog</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="pl-9" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author Bio</label>
                <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Appears alongside excerpt citations in search results.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Subject Specialization</label>
                <Input value={primaryNiche} onChange={(e) => setPrimaryNiche(e.target.value)} />
              </div>
            </div>

            {/* Payment & Verification Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Stripe Connect & Payout Status
              </h2>

              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">Direct Deposit (Bank ACH)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Account ending in •••• 4242 (USD)</div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Identity Verified (W-9 on file)
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => alert('Redirecting to Stripe dashboard...')}>
                  Update Details
                </Button>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>All banking data is processed securely through Stripe. VeraLM never stores your raw bank or card credentials.</span>
              </div>
            </div>

            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Save Profile Changes
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
