'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, UserCheck, ShieldCheck, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'reader' | 'creator'>('creator');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: accountType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data?.session) {
        // Immediate session created (auto-confirm enabled)
        if (accountType === 'creator') {
          router.push('/creators/apply');
        } else {
          router.push('/search');
        }
      } else {
        // Email confirmation required
        setSuccessMessage('Registration successful! Please check your email inbox to confirm your account.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${
            accountType === 'creator' ? '/creators/apply' : '/search'
          }`,
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google sign-in.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Sparkles className="h-6 w-6 text-primary" />
          <span>VeraLM</span>
        </Link>
        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Already have an account? <span className="text-primary font-semibold">Sign In</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create an Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join the verified human AI knowledge model</p>
          </div>

          {/* Account type choice */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setAccountType('creator')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                accountType === 'creator'
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <UserCheck className="h-5 w-5 text-primary mb-1.5" />
              <div className="font-semibold text-sm">Creator / Author</div>
              <div className="text-xs text-muted-foreground mt-0.5">Publish articles & earn 90% royalties</div>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('reader')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                accountType === 'reader'
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <ShieldCheck className="h-5 w-5 text-primary mb-1.5" />
              <div className="font-semibold text-sm">Search User</div>
              <div className="text-xs text-muted-foreground mt-0.5">Explore grounded answers from experts</div>
            </button>
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full mb-5 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-accent flex items-center justify-center gap-3 text-sm font-medium transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or with email</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  placeholder="Alex Rivers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="alex@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? 'Creating Account...' : accountType === 'creator' ? 'Continue to Creator Application' : 'Create Free Account'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
        © 2026 VeraLM Inc. The Grounded AI Knowledge Model. All rights reserved.
      </footer>
    </div>
  );
}
