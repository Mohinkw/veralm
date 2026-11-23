'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/lib/account-context';

export default function RegisterPage() {
  const router = useRouter();
  const { setMode } = useAccount();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      setMode('user');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'user',
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
        router.push('/');
      } else {
        setSuccessMessage('Account created! Check your email to confirm, or sign in.');
        setTimeout(() => router.push('/'), 2000);
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
      setMode('user');
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google sign-in.');
    }
  };

  const handleAppleSignUp = async () => {
    setError(null);
    try {
      setMode('user');
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Apple sign-in.');
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create an Account</h1>
            <p className="text-xs text-muted-foreground mt-1.5">
              One universal account for VeraLM AI Chat and Creator Royalties
            </p>
          </div>

          {/* Social Sign-in Buttons */}
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-accent flex items-center justify-center gap-3 text-sm font-medium transition-colors"
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

            <button
              type="button"
              onClick={handleAppleSignUp}
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-accent flex items-center justify-center gap-3 text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.59-7.71-11.66-14.01-6.1-9.45-10.87-20.15-14.34-32.08-3.48-11.94-5.22-23.2-5.22-33.79 0-14.78 3.8-27.17 11.41-37.19 7.6-10.01 17.29-15.11 29.07-15.3 4.57 0 9.79 1.15 15.65 3.44 5.87 2.3 9.79 3.51 11.75 3.65 1.52-.27 5.6-1.57 12.24-3.9 6.63-2.32 12.18-3.32 16.63-2.99 12.4.67 22.42 4.95 30.06 12.83-10.89 6.64-16.22 15.82-16 27.53.22 9.13 3.69 16.85 10.42 23.16 6.74 6.31 14.89 9.87 24.46 10.67-2.18 6.74-4.89 13.38-8.14 19.93zM119.22 31.84c0-7.72 2.76-14.99 8.28-21.81 5.53-6.82 12.39-10.74 20.6-11.77.22 1.09.33 2.18.33 3.27 0 7.5-2.93 14.72-8.8 21.66-5.87 6.95-12.83 10.82-20.87 11.61-.1-1-.15-1.98-.15-2.96z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or with email</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? 'Creating Account...' : 'Create Account'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By signing up, you agree to VeraLM's{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms</Link> &{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy</Link>.
          </p>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        © 2026 VeraLM Inc. Grounded AI Chatbot. All rights reserved.
      </footer>
    </div>
  );
}
