'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { VeraLMLogo } from '@/components/veralm-logo';

function sanitizeNextPath(raw: string | null): string {
  if (!raw || typeof raw !== 'string') return '/';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/';
  }
  return trimmed;
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = searchParams.get('code');
        const type = searchParams.get('type');
        const next = sanitizeNextPath(searchParams.get('next'));
        const destination = type === 'recovery' ? '/login?recovery=1' : next;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(error.message);
            setTimeout(() => router.push('/login?error=auth_failed'), 2000);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace(destination);
        } else {
          const { data: authListener } = supabase.auth.onAuthStateChange((event, sess) => {
            if (event === 'PASSWORD_RECOVERY') {
              authListener.subscription.unsubscribe();
              router.replace('/login?recovery=1');
              return;
            }
            if (sess) {
              authListener.subscription.unsubscribe();
              router.replace(destination);
            }
          });

          setTimeout(() => {
            authListener.subscription.unsubscribe();
            router.replace(destination);
          }, 2500);
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
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
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-4 animate-pulse">
        <VeraLMLogo className="h-12 w-12 rounded-2xl" size={48} />
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Completing authentication…</span>
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
