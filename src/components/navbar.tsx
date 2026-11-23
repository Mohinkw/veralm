'use client';

import Link from 'next/link';
import { Sparkles, PenLine, User, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAccount } from '@/lib/account-context';

export function Navbar({ activePage }: { activePage?: string }) {
  const { user, mode, toggleMode, logout } = useAccount();
  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <Sparkles className="h-6 w-6 text-primary" />
          <span>VeraLM</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/"
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              activePage === 'chat' || activePage === 'search'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            AI Chat
          </Link>
          <Link
            href="/about"
            className={`hidden sm:inline-flex text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              activePage === 'about'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            How It Works
          </Link>

          {/* Creator link */}
          <Link
            href="/creators/dashboard"
            aria-label="Creator Studio"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Creator Studio"
          >
            <PenLine className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline">Creators</span>
          </Link>

          {user.isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/creators/profile"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors"
                title={`${displayName} (Universal Account)`}
              >
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                  {initial}
                </div>
                <span className="max-w-[100px] truncate hidden sm:inline">{displayName}</span>
              </Link>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors hidden sm:inline-flex"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
