'use client';

import Link from 'next/link';
import { TrendingUp, LogOut, Crown, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { VeraLMLogo } from '@/components/veralm-logo';
import { useAccount } from '@/lib/account-context';

export function Navbar({ activePage }: { activePage?: string }) {
  const { user, logout } = useAccount();
  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-2 sm:px-4 h-16 flex items-center justify-between gap-1 sm:gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-xl shrink-0">
          <VeraLMLogo className="h-5 w-5 sm:h-6 sm:w-6" />
          <span>VeraLM</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <Link
            href="/"
            className={`hidden md:inline-flex text-sm font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activePage === 'chat' || activePage === 'search'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            AI Model
          </Link>
          <Link
            href="/about"
            className={`hidden md:inline-flex text-sm font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activePage === 'about'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            How It Works
          </Link>
          <Link
            href="/developers"
            className={`hidden lg:inline-flex text-sm font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activePage === 'developers'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            API &amp; MCP
          </Link>

          {/* Earn as a Creator */}
          <Link
            href={user.isLoggedIn ? '/creators/dashboard' : '/creators'}
            className={`inline-flex items-center gap-1 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activePage === 'creators'
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
            title="Earn as a Creator — dashboard, articles, earnings & more"
          >
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden lg:inline">Earn as a Creator</span>
            <span className="lg:hidden">Earn</span>
          </Link>

          {user.isLoggedIn ? (
            <div className="flex items-center gap-1 sm:gap-2">
              {user.isAdmin && (
                <Link
                  href="/admin"
                  aria-label="Admin Dashboard"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <ShieldCheck className="h-3.5 w-3.5 sm:hidden" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link
                href="/creators/profile"
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors whitespace-nowrap"
                title={`${displayName} (Universal Account)`}
              >
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                  {initial}
                </div>
                <span className="max-w-[90px] truncate hidden sm:inline">{displayName}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-3 py-1.5 rounded-md hover:bg-accent whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-primary text-primary-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors hidden sm:inline-flex whitespace-nowrap"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Upgrade to Pro */}
          {!user.isPro ? (
            <Link
              href="/pro"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0"
            >
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="hidden lg:inline">Upgrade to Pro</span>
              <span className="lg:hidden">Pro</span>
            </Link>
          ) : (
            <Link
              href="/pro"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0"
            >
              <Crown className="h-3 w-3 shrink-0" />
              <span>PRO</span>
            </Link>
          )}

          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
