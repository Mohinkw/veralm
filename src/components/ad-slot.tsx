'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount } from '@/lib/account-context';
import { isLocalHostname } from '@/components/adsense-script';

interface AdSlotProps {
  slot?: string;
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

/**
 * Minimal, non-intrusive AdSense unit.
 * Renders nothing unless NEXT_PUBLIC_ADSENSE_CLIENT and a slot ID are configured on non-local hosts.
 */
export function AdSlot({ slot, className = '', disabled = false }: AdSlotProps) {
  const { user } = useAccount();
  const [isLocalHost, setIsLocalHost] = useState(true);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const resolvedSlot = slot || process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT;
  const pushedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLocalHost(isLocalHostname(window.location.hostname));
    }
  }, []);

  const shouldHide = isLocalHost || !client || !resolvedSlot || disabled || user.isPro;

  useEffect(() => {
    if (shouldHide || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // Ignore AdSense initialization errors when blocked by adblockers
    }
  }, [shouldHide]);

  if (shouldHide) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement"
      className={`my-8 border-y border-border/50 py-4 text-center ${className}`}
    >
      <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Advertisement
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={resolvedSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
