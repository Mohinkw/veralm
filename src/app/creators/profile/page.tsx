'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Globe, Save, CheckCircle2, ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAccount } from '@/lib/account-context';
import { supabase } from '@/lib/supabase';
import { CreatorHeader } from '@/components/creator-header';
import { CreatorPayoutMethods } from '@/components/creator-payout-methods';

export default function CreatorProfilePage() {
  const { user, isLoading: authLoading } = useAccount();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [primaryNiche, setPrimaryNiche] = useState('Technology');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function loadProfile() {
      if (!user.isLoggedIn) {
        if (!cancelled) {
          setDisplayName('Creator');
          setEmail('');
          setBio('Verified contributor on VeraLM Knowledge Vault.');
          setLoadingProfile(false);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/creators/profile', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            const p = data.profile;
            if (!cancelled && p) {
              setDisplayName(p.displayName || user.name || user.email?.split('@')[0] || '');
              setEmail(p.email || user.email || '');
              setWebsite(p.websiteUrl || '');
              setBio(p.bio || '');
              setPrimaryNiche(
                Array.isArray(p.primaryCategories) && p.primaryCategories.length > 0
                  ? p.primaryCategories.join(', ')
                  : 'Technology'
              );
              setError('');
              setLoadingProfile(false);
              return;
            }
          }
        }
      } catch {
        // Fallback below if session unavailable
      }

      if (!cancelled) {
        setDisplayName(user.name || user.email?.split('@')[0] || 'Creator');
        setEmail(user.email || '');
        setBio('Verified contributor on VeraLM Knowledge Vault.');
        setLoadingProfile(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user.id, user.isLoggedIn, user.name, user.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaved(false);
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Please sign in to save your creator profile.');
        setIsSaving(false);
        return;
      }

      const res = await fetch('/api/creators/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          website: website.trim(),
          bio: bio.trim(),
          primaryNiche: primaryNiche.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Could not save profile.');
        setIsSaving(false);
        return;
      }

      await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      }).catch(() => null);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      setError('Network error saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CreatorHeader activeTab="profile" />

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile &amp; Payment Settings</h1>
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

          {!authLoading && !user.isLoggedIn && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm flex flex-wrap items-center justify-between gap-3">
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

          {error && (
            <div role="alert" className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSaved && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Profile settings saved to your account!</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* Identity Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Author Identity &amp; Attribution
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="profile-display-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Display Name / Author Name
                  </label>
                  <Input
                    id="profile-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    disabled={loadingProfile}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="profile-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Account Email
                  </label>
                  <Input
                    id="profile-email"
                    value={email}
                    readOnly
                    type="email"
                    className="bg-muted/40"
                    placeholder="you@example.com"
                  />
                  <p className="text-[11px] text-muted-foreground">Managed via your account login.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-website" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Personal Website / Technical Blog / GitHub
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profile-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourdomain.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-bio" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Author Bio &amp; Expertise
                </label>
                <Textarea
                  id="profile-bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your domain background, industry experience, or research specialty..."
                  required
                />
                <p className="text-xs text-muted-foreground">Appears alongside excerpt citations in search results.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-niche" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Primary Subject Specialization
                </label>
                <Input
                  id="profile-niche"
                  value={primaryNiche}
                  onChange={(e) => setPrimaryNiche(e.target.value)}
                  placeholder="e.g. Technology, Science, Finance"
                />
              </div>
            </div>

            {/* Payment Methods Manager */}
            <CreatorPayoutMethods />

            <Button type="submit" disabled={isSaving || !user.isLoggedIn} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
