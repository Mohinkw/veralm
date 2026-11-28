'use client';

import Link from 'next/link';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VeraLMLogo } from '@/components/veralm-logo';
import { useAccount } from '@/lib/account-context';

interface CreatorHeaderProps {
  activeTab: 'overview' | 'articles' | 'earnings' | 'analytics' | 'profile';
  rightSlot?: React.ReactNode;
}

const NAV_ITEMS: Array<{ key: CreatorHeaderProps['activeTab']; href: string; label: string }> = [
  { key: 'overview', href: '/creators/dashboard', label: 'Overview' },
  { key: 'articles', href: '/creators/articles', label: 'My Articles' },
  { key: 'earnings', href: '/creators/earnings', label: 'Earnings & Payouts' },
  { key: 'analytics', href: '/creators/analytics', label: 'Analytics' },
];

export function CreatorHeader({ activeTab, rightSlot }: CreatorHeaderProps) {
  const { user } = useAccount();
  const displayName = user.name || user.email?.split('@')[0] || 'Creator';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl shrink-0">
            <VeraLMLogo className="h-6 w-6" />
            <span>VeraLM</span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Creator Studio
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            {NAV_ITEMS.map(({ key, href, label }) => (
              <Link
                key={key}
                href={href}
                className={
                  activeTab === key
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground transition-colors'
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {rightSlot}
          <Link href="/" className="hidden sm:inline-flex">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              AI Chat
            </Button>
          </Link>
          <Link href="/creators/articles/new">
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Submit Article</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
          <Link
            href="/creators/profile"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold hover:ring-2 hover:ring-primary transition-all shrink-0"
            title={`${displayName} - Profile Settings`}
            aria-label={`${displayName} - Profile Settings`}
          >
            {initial}
          </Link>
        </div>
      </div>

      {/* Mobile & Tablet sub-navigation */}
      <nav className="md:hidden border-t border-border/60 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
        {NAV_ITEMS.map(({ key, href, label }) => (
          <Link
            key={key}
            href={href}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/"
          className="sm:hidden shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground hover:text-foreground"
        >
          AI Chat
        </Link>
      </nav>
    </header>
  );
}
