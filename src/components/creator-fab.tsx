'use client';

import Link from 'next/link';
import { PenLine, DollarSign, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function CreatorFab() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Expanded menu */}
      {expanded && (
        <div className="mb-1 flex flex-col items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <Link
            href="/creators/articles/new"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-primary/90 transition-all"
          >
            <PenLine className="h-4 w-4" />
            Submit Article
          </Link>
          <Link
            href="/creators/dashboard"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2 rounded-full bg-card border border-border text-foreground px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-accent transition-all"
          >
            <DollarSign className="h-4 w-4 text-green-500" />
            Creator Studio
          </Link>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label="Creator options"
        className={`group flex items-center gap-2 rounded-full px-4 py-3 font-semibold text-sm shadow-xl transition-all duration-200 ${
          expanded
            ? 'bg-muted text-foreground border border-border'
            : 'bg-gradient-to-br from-primary to-blue-600 text-white hover:scale-105'
        }`}
      >
        <DollarSign className="h-5 w-5" />
        <span className="hidden sm:inline">Earn as Creator</span>
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-200 ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>
    </div>
  );
}
