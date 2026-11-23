'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, Loader2 } from 'lucide-react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = searchParams.get('code');
        const next = searchParams.get('next') || '/';

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange failed:', error);
            setErrorMsg(error.message);
            setTimeout(() => router.push('/login?error=auth_failed'), 2000);
            return;
          }
        }

        // Check if session exists (e.g. from implicit hash or PKCE exchange)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace(next);
        } else {
          // Listen once for auth state change
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              authListener.subscription.unsubscribe();
              router.replace(next);
            }
          });

          // Timeout fallback
          setTimeout(() => {
            authListener.subscription.unsubscribe();
            router.replace(next);
          }, 2500);
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setErrorMsg(err?.message || 'Authentication failed');
        setTimeout(() => router.push('/login?error=auth_failed'), 2000);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm max-w-md">
          <p className="font-semibold mb-1">Sign In Issue</p>
          <p className="text-xs">{errorMsg}</p>
          <p className="text-xs mt-2 text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 animate-pulse">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Completing Google sign in…</span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
