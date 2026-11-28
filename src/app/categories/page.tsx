import Link from 'next/link';
import {
  Code,
  LineChart,
  Stethoscope,
  Plane,
  Utensils,
  Briefcase,
  Atom,
  GraduationCap,
  Search,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';

export const metadata = {
  title: 'Browse Vault Knowledge Categories',
  description: 'Explore verified human knowledge categories licensed in the VeraLM private vault.',
};

const CATEGORIES = [
  {
    name: 'Technology',
    slug: 'technology',
    icon: Code,
    description:
      'Software engineering, distributed systems, AI/RAG architecture, pgvector optimization, and cloud infrastructure.',
    sampleQuestions: [
      'How to optimize PostgreSQL for vector search at scale with HNSW?',
      'Explain the latest architectures in enterprise RAG and vector retrieval',
    ],
  },
  {
    name: 'Personal Finance',
    slug: 'personal-finance',
    icon: LineChart,
    description:
      'Tax planning, portfolio strategy, quantitative investing, retirement compounding, and personal wealth management.',
    sampleQuestions: [
      'How do index expense ratios compound over 30 years?',
      'Tax-advantaged retirement account strategies for freelancers',
    ],
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    icon: Stethoscope,
    description:
      'Evidence-based nutrition, sleep science, preventive medicine, clinical research synthesis, and longevity.',
    sampleQuestions: [
      'What does peer-reviewed evidence show about zone 2 aerobic training?',
      'Clinical nutrition principles for metabolic health',
    ],
  },
  {
    name: 'Business',
    slug: 'business',
    icon: Briefcase,
    description:
      'SaaS metrics, B2B growth strategy, unit economics, founder playbooks, and corporate operations.',
    sampleQuestions: [
      'How do subscription cohorts correlate with net revenue retention?',
      'Transitioning from sales-led to product-led growth in B2B',
    ],
  },
  {
    name: 'Science',
    slug: 'science',
    icon: Atom,
    description:
      'Physics, chemistry, biology, climate systems, materials science, and reproducible research insights.',
    sampleQuestions: [
      'Solid-state battery electrolyte degradation mechanisms',
      'How CRISPR prime editing improves genomic precision',
    ],
  },
  {
    name: 'Education',
    slug: 'education',
    icon: GraduationCap,
    description:
      'Learning science, curriculum design, technical pedagogy, spaced repetition, and academic writing.',
    sampleQuestions: [
      'How effective is active recall vs passive rereading in STEM courses?',
      'Designing practical project-based technical curricula',
    ],
  },
  {
    name: 'Travel',
    slug: 'travel',
    icon: Plane,
    description:
      'In-depth regional field guides, visa and logistics briefings, safety advisories, and transit planning.',
    sampleQuestions: [
      'Essential transit pass tips for two weeks across Japan',
      'Digital nomad visa requirements in EU countries',
    ],
  },
  {
    name: 'Food & Cooking',
    slug: 'food-cooking',
    icon: Utensils,
    description:
      'Culinary food science, fermentation techniques, recipe engineering, and regional cooking traditions.',
    sampleQuestions: [
      'Science behind Maillard browning and pan temperature control',
      'Traditional fermentation temperature and salinity ratios',
    ],
  },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Shared Navbar — preserves logged-in user session */}
      <Navbar />

      {/* Hero */}
      <section className="py-12 sm:py-16 bg-muted/20 border-b border-border">
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
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid sm:grid-cols-2 gap-6">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.slug}
                  className="min-w-0 bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                        Verified Knowledge
                      </span>
                    </div>

                    <h2 className="text-xl font-bold mb-2">
                      <Link
                        href={`/categories/${category.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {category.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      {category.description}
                    </p>

                    <div className="mb-5 min-w-0">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Common Vault Queries:
                      </div>
                      <div className="space-y-2">
                        {category.sampleQuestions.map((q, i) => (
                          <Link
                            key={i}
                            href={`/?category=${encodeURIComponent(category.slug)}&q=${encodeURIComponent(q)}`}
                            className="flex items-center gap-2 py-1 text-xs text-foreground/80 hover:text-primary transition-colors min-w-0"
                          >
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{q}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/categories/${category.slug}`}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 py-1"
                    >
                      Browse {category.name} articles
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/creators/articles/new"
                      className="text-xs text-muted-foreground hover:text-foreground py-1"
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
      <footer className="py-8 px-4 text-center text-xs text-muted-foreground border-t border-border">
        © 2026 VeraLM Inc. AI-Powered Exclusive Content Publishing & Knowledge Search Platform.
      </footer>
    </div>
  );
}
