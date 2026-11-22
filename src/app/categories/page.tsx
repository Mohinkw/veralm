import Link from 'next/link';
import { Sparkles, Code, Cpu, LineChart, Stethoscope, Scale, Palette, Briefcase, GraduationCap, Search, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Browse Vault Knowledge Categories - VeraLM',
  description: 'Explore verified human knowledge categories licensed in the VeraLM private vault.',
};

const CATEGORIES = [
  {
    name: 'Artificial Intelligence & ML',
    slug: 'ai-ml',
    icon: Cpu,
    count: 38,
    description: 'Deep learning architectures, LLM fine-tuning, RAG deployment, and agent frameworks.',
    sampleQuestions: [
      'How to build an agentic RAG pipeline with hybrid search?',
      'Comparing LoRA vs full fine-tuning for domain adaptation',
    ],
  },
  {
    name: 'Software Engineering & Cloud',
    slug: 'software-cloud',
    icon: Code,
    count: 52,
    description: 'Distributed systems, Kubernetes deployment patterns, database indexing, and Rust concurrency.',
    sampleQuestions: [
      'PostgreSQL query planner optimization for vector search',
      'Zero-downtime database migration strategies at scale',
    ],
  },
  {
    name: 'Finance & Quantitative Markets',
    slug: 'finance-markets',
    icon: LineChart,
    count: 24,
    description: 'Algorithmic trading, macroeconomics, SaaS revenue attribution, and venture economics.',
    sampleQuestions: [
      'How do subscription cohorts correlate with net revenue retention?',
      'Risk modeling techniques for multi-asset portfolios',
    ],
  },
  {
    name: 'Biomedicine & Health Tech',
    slug: 'biomedicine',
    icon: Stethoscope,
    count: 19,
    description: 'Clinical trial evaluation, genomics pipelines, bioinformatics, and healthcare AI compliance.',
    sampleQuestions: [
      'Interpreting single-cell RNA-seq clustering results',
      'FDA guidance on clinical decision support software',
    ],
  },
  {
    name: 'Legal Tech & Regulatory Compliance',
    slug: 'legal-tech',
    icon: Scale,
    count: 15,
    description: 'AI copyright licensing, EU AI Act compliance, international data governance, and IP protection.',
    sampleQuestions: [
      'How does the EU AI Act classify GPAI model copyright liabilities?',
      'Best practices for training data provenance and creator licensing',
    ],
  },
  {
    name: 'Product Design & UX Research',
    slug: 'product-design',
    icon: Palette,
    count: 27,
    description: 'Design systems, accessibility compliance, conversational UI paradigms, and user journey analytics.',
    sampleQuestions: [
      'Design heuristics for AI copilot streaming interfaces',
      'Measuring mental model fidelity in generative interfaces',
    ],
  },
  {
    name: 'Entrepreneurship & Growth',
    slug: 'growth-strategy',
    icon: Briefcase,
    count: 31,
    description: 'Product-led growth, founder playbooks, pricing experiments, and technical recruiting.',
    sampleQuestions: [
      'Transitioning from sales-led to product-led growth in B2B',
      'Structuring early employee equity grants and 83(b) elections',
    ],
  },
  {
    name: 'Applied Science & Research',
    slug: 'applied-science',
    icon: GraduationCap,
    count: 21,
    description: 'Quantum computing fundamentals, material sciences, renewable energy storage, and robotics.',
    sampleQuestions: [
      'Solid-state battery electrolyte degradation mechanisms',
      'Quantum error correction threshold theorems explained',
    ],
  },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>VeraLM</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground">Search</Link>
            <Link href="/creators" className="text-sm font-medium text-muted-foreground hover:text-foreground">For Creators</Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground">How It Works</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
            <Link href="/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Vault Categories</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Browse Verified Knowledge
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            Discover peer-reviewed articles submitted by industry experts, licensed exclusively for AI answer synthesis.
          </p>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.slug}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        {category.count} Verified Articles
                      </span>
                    </div>

                    <h2 className="text-xl font-bold mb-2">{category.name}</h2>
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                      {category.description}
                    </p>

                    <div className="mb-6">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Common Vault Queries:
                      </div>
                      <div className="space-y-1.5">
                        {category.sampleQuestions.map((q, i) => (
                          <Link
                            key={i}
                            href={`/search?q=${encodeURIComponent(q)}`}
                            className="block text-xs text-foreground/80 hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                          >
                            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{q}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <Link
                      href={`/search?category=${category.slug}`}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Search this category
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/creators/apply"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Write in this niche →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-muted-foreground border-t border-border">
        © 2026 VeraLM Inc. AI-Powered Exclusive Content Publishing & Knowledge Search Platform.
      </footer>
    </div>
  );
}
