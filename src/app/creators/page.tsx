'use client';

import Link from 'next/link';
import { DollarSign, Shield, BookOpen, ArrowRight, CheckCircle2, TrendingUp, Users, Award, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import { useAccount } from '@/lib/account-context';

export default function CreatorLandingPage() {
  const { user } = useAccount();

  return (
    <div className="min-h-screen bg-background">
      {/* Shared Navbar — shows logged-in user state across all pages */}
      <Navbar activePage="creators" />

      {/* Creator Hub strip — all creator features in one place, visible when logged in */}
      {user.isLoggedIn && (
        <div className="bg-emerald-500/5 border-b border-emerald-500/20">
          <div className="container mx-auto px-4 h-11 flex items-center gap-1 overflow-x-auto">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mr-3 shrink-0">Creator Hub:</span>
            {[
              { href: '/creators/dashboard', label: 'Dashboard' },
              { href: '/creators/articles', label: 'My Articles' },
              { href: '/creators/articles/new', label: '+ Submit Article' },
              { href: '/creators/earnings', label: 'Earnings' },
              { href: '/creators/analytics', label: 'Analytics' },
              { href: '/creators/profile', label: 'Profile' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-primary/5 via-background to-background border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <Award className="h-4 w-4" />
            <span>Join 50+ Founding Creators</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 leading-tight">
            Earn Royalties Every Time Your Expertise Powers Our <span className="text-primary">AI Chat Answers</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop letting AI scrapers take your hard-won knowledge for free. 
            Provide verified ground-truth data to the VeraLM AI model. When users view sponsored ads to get your answers, you earn continuous royalties from our up to 90% creator revenue pool (after AI &amp; server costs).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user.isLoggedIn ? (
              <>
                <Link href="/creators/dashboard">
                  <Button size="lg" className="gap-2 text-base px-8 py-6 rounded-xl">
                    Go to Creator Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/creators/articles/new">
                  <Button size="lg" variant="outline" className="text-base px-8 py-6 rounded-xl">
                    Submit an Article
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/creators/apply">
                  <Button size="lg" className="gap-2 text-base px-8 py-6 rounded-xl">
                    Become a Data Provider
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-base px-8 py-6 rounded-xl">
                    Sign In to Dashboard
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Social Proof */}
          <div className="mt-14 pt-8 border-t border-border/60 flex flex-wrap items-center justify-center gap-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Up to 90% Net Royalty Pool</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Stripe Connect Direct Payouts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Full Content Anti-Scrape Protection</span>
            </div>
          </div>
        </div>
      </section>

      {/* Earnings Calculator & Value Comparison */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3">The Old Web vs. The VeraLM Model</h2>
            <p className="text-muted-foreground">Why AI search requires a fundamentally new economic model for writers.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-card border border-destructive/20 rounded-2xl p-8 relative">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive mb-4 inline-block">
                The Broken Status Quo
              </span>
              <h3 className="text-xl font-bold mb-3">Traditional Ad-Supported Blogging</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold text-base">✕</span>
                  <span>AI search synthesizes answers directly; readers never visit your site.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold text-base">✕</span>
                  <span>Ad blockers and cookie deprecation crater display CPMs to pennies.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold text-base">✕</span>
                  <span>Scraper bots steal your prose to train multi-billion dollar foundation models without paying you.</span>
                </li>
              </ul>
            </div>

            <div className="bg-card border border-primary/30 rounded-2xl p-8 relative shadow-sm ring-1 ring-primary/20">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary mb-4 inline-block">
                The VeraLM Solution
              </span>
              <h3 className="text-xl font-bold mb-3">Verified Knowledge Vault</h3>
              <ul className="space-y-4 text-sm text-foreground/90">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Traffic Needed:</strong> You get paid every time our RAG engine cites your article to answer questions.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Up to 90% Revenue Share:</strong> Direct monthly payout distributions from net platform revenue after infrastructure expenses (10% platform fee).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Encrypted Vault:</strong> Raw articles are kept behind private RAG APIs, safe from unauthorized scrapers.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="border border-border rounded-2xl p-8 bg-card">
            <h3 className="text-2xl font-bold text-center mb-10">4 Steps to Start Earning</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  1
                </div>
                <h4 className="font-semibold text-base mb-1">Apply Online</h4>
                <p className="text-xs text-muted-foreground">Submit your writing samples and primary domain expertise.</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  2
                </div>
                <h4 className="font-semibold text-base mb-1">Sign Agreement</h4>
                <p className="text-xs text-muted-foreground">Cryptographically sign the exclusive AI search licensing agreement.</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  3
                </div>
                <h4 className="font-semibold text-base mb-1">Pass AI Audit</h4>
                <p className="text-xs text-muted-foreground">Automated originality check & editorial scoring approves your article.</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  4
                </div>
                <h4 className="font-semibold text-base mb-1">Earn Monthly</h4>
                <p className="text-xs text-muted-foreground">Receive automated payouts into your bank via Stripe Connect.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30 border-t border-border text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">Ready to submit your first article?</h2>
          <p className="text-muted-foreground mb-8">Join the private creator beta. Applications are reviewed within 48 hours.</p>
          <Link href="/creators/apply">
            <Button size="lg" className="gap-2 px-8 py-6 rounded-xl">
              Start Creator Application
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-muted-foreground border-t border-border">
        © 2026 VeraLM Inc. AI-Powered Exclusive Content Publishing & Knowledge Search Platform.
      </footer>
    </div>
  );
}
