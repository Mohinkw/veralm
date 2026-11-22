'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingUp, BarChart3, Search, Calendar, Award, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreatorAnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  const topQuestions = [
    {
      query: 'How to implement hybrid dense-sparse vector retrieval in pgvector?',
      citations: 284,
      relevanceAvg: '97.4%',
      article: 'Optimizing PostgreSQL for Vector RAG Workflows',
    },
    {
      query: 'What is the optimal chunk size for technical documentation embeddings?',
      citations: 195,
      relevanceAvg: '94.8%',
      article: 'Chunking Strategies for Deep Technical Documentation',
    },
    {
      query: 'How does reciprocal rank fusion balance keyword vs semantic matches?',
      citations: 168,
      relevanceAvg: '96.1%',
      article: 'Optimizing PostgreSQL for Vector RAG Workflows',
    },
    {
      query: 'Why does HNSW maintenance_work_mem setting matter in Postgres?',
      citations: 114,
      relevanceAvg: '98.0%',
      article: 'Optimizing PostgreSQL for Vector RAG Workflows',
    },
    {
      query: 'Comparing overlapping sliding-window vs semantic paragraph chunking',
      citations: 81,
      relevanceAvg: '93.2%',
      article: 'Chunking Strategies for Deep Technical Documentation',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>VeraLM</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Creator Studio</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/creators/dashboard" className="text-muted-foreground hover:text-foreground">Overview</Link>
              <Link href="/creators/articles" className="text-muted-foreground hover:text-foreground">My Articles</Link>
              <Link href="/creators/earnings" className="text-muted-foreground hover:text-foreground">Earnings & Payouts</Link>
              <Link href="/creators/analytics" className="text-foreground">Analytics</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                  range === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attribution Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analyze how often and where your knowledge passages are cited by our AI search engine.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid sm:grid-cols-4 gap-5">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Citations</span>
              <div className="text-3xl font-black mt-2">842</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">↑ 24% vs last period</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distinct Queries</span>
              <div className="text-3xl font-black mt-2">619</div>
              <p className="text-xs text-muted-foreground mt-1">Unique search intents</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg. Semantic Match</span>
              <div className="text-3xl font-black mt-2">96.2%</div>
              <p className="text-xs text-muted-foreground mt-1">Cosine vector similarity</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Citations</span>
              <div className="text-3xl font-black mt-2">78%</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">Rank #1 cited source</p>
            </div>
          </div>

          {/* Visual Activity Simulation */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Query Citation Volume</h2>
                <p className="text-xs text-muted-foreground">Daily citation events over the past 30 days</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
                <span>Postgres Vector</span>
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block ml-3"></span>
                <span>Chunking Strategies</span>
              </div>
            </div>

            {/* Simulated Bar Chart */}
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 pt-8 border-b border-border">
              {[22, 28, 19, 34, 45, 41, 38, 52, 48, 60, 55, 62, 58, 67, 72, 65, 78, 82, 80, 88, 92, 85, 96, 94, 102, 98, 105, 110, 118, 124].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-primary hover:bg-primary/80 transition-all rounded-t-sm"
                    style={{ height: `${(val / 130) * 100}%` }}
                  ></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
              <span>30 days ago</span>
              <span>15 days ago</span>
              <span>Today (842 total citations)</span>
            </div>
          </div>

          {/* Top Queries Table */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold">Top Search Queries Satisfied</h2>
              <p className="text-xs text-muted-foreground">The most frequent user searches where your vault articles were cited</p>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="py-3 px-4">User Query</th>
                    <th className="py-3 px-4">Cited Article</th>
                    <th className="py-3 px-4">Times Cited</th>
                    <th className="py-3 px-4 text-right">Avg Semantic Fit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topQuestions.map((q, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{q.query}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">{q.article}</td>
                      <td className="py-3.5 px-4 font-bold">{q.citations}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">{q.relevanceAvg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
