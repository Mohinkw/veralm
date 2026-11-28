'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { VeraLMLogo } from '@/components/veralm-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot' | 'recovery'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('recovery') === '1') {
      setMode('recovery');
      setInfo('Enter a new password for your account.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfo(null);

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      setIsLoading(false);
      if (resetError) {
        setError(resetError.message || 'Unable to send recovery email.');
        return;
      }
      setInfo('If an account exists for that email, a password reset link has been sent.');
      return;
    }

    if (mode === 'recovery') {
      if (newPassword.length < 6) {
        setIsLoading(false);
        setError('Password must be at least 6 characters.');
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      setIsLoading(false);
      if (updateErr) {
        setError(updateErr.message || 'Unable to update password.');
        return;
      }
      setInfo('Password updated! Redirecting to chat…');
      setTimeout(() => router.push('/'), 1200);
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);
    if (signInErr) {
      setError(signInErr.message || 'Unable to sign in. Check your credentials.');
      return;
    }
    router.push('/');
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Google sign-in.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border py-4 px-4 sm:px-6 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl shrink-0">
          <VeraLMLogo className="h-6 w-6" />
          <span>VeraLM</span>
        </Link>
        <Link href="/register" className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground text-right">
          No account? <span className="text-primary font-semibold">Sign Up</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === 'forgot'
                ? 'Reset Password'
                : mode === 'recovery'
                  ? 'Set New Password'
                  : 'Welcome Back'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'forgot'
                ? 'Enter your account email to receive a reset link'
                : mode === 'recovery'
                  ? 'Choose a new password for your VeraLM account'
                  : 'Sign in to your VeraLM account'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          {mode === 'login' && (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full mb-5 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-3 text-sm font-medium transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'recovery' && (
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setInfo(null);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            )}

            {mode === 'recovery' && (
              <div className="space-y-1.5">
                <label htmlFor="recovery-password" className="text-xs font-semibold text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recovery-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading
                ? 'Please wait...'
                : mode === 'forgot'
                  ? 'Send Reset Link'
                  : mode === 'recovery'
                    ? 'Update Password'
                    : 'Sign In'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {mode !== 'login' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setInfo(null);
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1"
              >
                ← Back to Sign In
              </button>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 text-center text-xs text-muted-foreground border-t border-border">
        © 2026 VeraLM Inc. Grounded AI Chatbot. All rights reserved.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginFormContent />
    </Suspense>
  );
}
