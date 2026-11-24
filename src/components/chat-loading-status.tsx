'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, BookOpen, Users, Award, Loader2 } from 'lucide-react';

const LOADING_MESSAGES = [
  {
    text: 'Searching original articles authored by verified human experts...',
    icon: BookOpen,
  },
  {
    text: 'Consulting peer-reviewed creator knowledge in VeraLM vault...',
    icon: ShieldCheck,
  },
  {
    text: 'Cross-referencing domain literature to eliminate hallucinations...',
    icon: Sparkles,
  },
  {
    text: 'Retrieving primary sources licensed from real human creators...',
    icon: Users,
  },
  {
    text: 'VeraLM is a human-backed AI model protecting creator royalties...',
    icon: Award,
  },
  {
    text: 'Synthesizing answer grounded in verified real-world expertise...',
    icon: Sparkles,
  },
  {
    text: 'Verifying cryptographic citation tokens and author provenance...',
    icon: ShieldCheck,
  },
  {
    text: 'Calibrating model inference against authentic human research...',
    icon: BookOpen,
  },
  {
    text: 'Filtering synthetic noise with authoritative human ground truth...',
    icon: ShieldCheck,
  },
  {
    text: 'Calculating citation attributions for creator royalty compensation...',
    icon: Award,
  },
  {
    text: 'Auditing factual accuracy against expert domain publications...',
    icon: BookOpen,
  },
  {
    text: 'Indexing verified author findings into model reasoning chain...',
    icon: Sparkles,
  },
  {
    text: 'Extracting verifiable data points from human investigative pieces...',
    icon: BookOpen,
  },
  {
    text: 'Grounding AI output in licensed, primary-source human knowledge...',
    icon: Users,
  },
  {
    text: 'Validating factual consensus across our verified creator network...',
    icon: ShieldCheck,
  },
  {
    text: 'Ensuring transparent attribution to original human authors...',
    icon: Award,
  },
  {
    text: 'Finalizing model synthesis with verified citation references...',
    icon: Sparkles,
  },
  {
    text: 'VeraLM: Delivering model intelligence backed by verified human truth...',
    icon: ShieldCheck,
  },
];

export function ChatLoadingStatus() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setFade(true);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const current = LOADING_MESSAGES[index];
  const IconComponent = current.icon;

  return (
    <div className="py-2.5 px-3.5 my-1.5 rounded-2xl bg-card border border-border/70 shadow-sm max-w-lg space-y-3 animate-in fade-in duration-300">
      {/* Top Status Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-xs font-medium text-foreground flex items-center gap-1.5 transition-all duration-200 ${
              fade ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
            }`}
          >
            <IconComponent className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{current.text}</span>
          </div>
        </div>
      </div>

      {/* Subtle Animated Shimmer Skeleton */}
      <div className="space-y-1.5 pl-1 pr-2 pt-0.5">
        <div className="h-2 w-5/6 rounded-full bg-muted/80 animate-pulse" />
        <div className="h-2 w-full rounded-full bg-muted/60 animate-pulse delay-75" />
        <div className="h-2 w-4/6 rounded-full bg-muted/50 animate-pulse delay-150" />
      </div>

      {/* VeraLM Branding Tag */}
      <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1 text-primary">
          <Sparkles className="h-2.5 w-2.5" />
          VeraLM Model Grounding
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80">
          Human-Verified Knowledge
        </span>
      </div>
    </div>
  );
}
