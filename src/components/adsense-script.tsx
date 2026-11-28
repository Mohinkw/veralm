'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useAccount } from '@/lib/account-context';

export function isLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower.endsWith('.local')
  );
}

/**
 * Loads Google AdSense only in public non-Pro production sessions,
 * preventing local dev/test CSP frame-ancestors console noise.
 */
export function AdSenseScript({ clientId }: { clientId?: string }) {
  const { user, isLoading } = useAccount();
  const [allowAds, setAllowAds] = useState(false);

  useEffect(() => {
    if (isLoading || !clientId || user.isPro) {
      setAllowAds(false);
      return;
    }
    if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)) {
      setAllowAds(true);
    }
  }, [clientId, user.isPro, isLoading]);

  if (!allowAds || !clientId) {
    return null;
  }

  return (
    <Script
      id="adsense-loader"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
