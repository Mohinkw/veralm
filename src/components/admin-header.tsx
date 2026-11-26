'use client';

import Link from 'next/link';
import { ShieldCheck, FileText, Users, DollarSign, MessageSquare, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VeraLMLogo } from '@/components/veralm-logo';

interface AdminHeaderProps {
  activeTab: 'articles' | 'creators' | 'revenue';
}

const ADMIN_TABS: Array<{
  key: AdminHeaderProps['activeTab'];
  href: string;
  label: string;
  icon: typeof FileText;
}> = [
    { key: 'articles', href: '/admin', label: 'Articles Queue', icon: FileText },
    { key: 'creators', href: '/admin/creators', label: 'Creators', icon: Users },
    { key: 'revenue', href: '/admin/revenue', label: 'Revenue & Payouts', icon: DollarSign },
  ];

export function AdminHeader({ activeTab }: AdminHeaderProps) {
  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl hover:opacity-80 transition-opacity">
              <VeraLMLogo className="h-6 w-6" />
              <span>VeraLM</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/25 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {ADMIN_TABS.map(({ key, href, label, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${activeTab === key
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/creators/dashboard">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Creator Studio</span>
            </Button>
          </Link>
          <Link href="/">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Chat</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile & Tablet sub-navigation */}
      <nav className="md:hidden border-t border-border/60 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
        {ADMIN_TABS.map(({ key, href, label, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
