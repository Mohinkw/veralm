'use client';

import Link from 'next/link';
import { Sparkles, PenLine } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navbar({ activePage }: { activePage?: string }) {
  return (
    <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <Sparkles className="h-6 w-6 text-primary" />
          <span>VeraLM</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 sm:gap-4">
          <Link
            href="/search"
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              activePage === 'search'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Ask AI
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

          {/* Creator icon link */}
          <Link
            href="/creators"
            aria-label="Creators – Earn from your data"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Earn as a Creator"
          >
            <PenLine className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline">Creators</span>
          </Link>

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

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
