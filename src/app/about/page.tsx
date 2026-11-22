import Link from 'next/link';
import { Sparkles, ShieldCheck, Database, Search, DollarSign, ArrowRight, CheckCircle2, Lock, Award, FileText, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
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
            <Link href="/categories" className="text-sm font-medium text-muted-foreground hover:text-foreground">Categories</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
            <Link href="/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="py-20 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The VeraLM Model</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Reinventing Search to Compensate Human Knowledge
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Traditional AI scrapers ingest blogger content without permission or compensation.
            VeraLM builds a licensed, verified knowledge vault where every answer pays the author who provided the insight.
          </p>
        </div>
      </section>

      {/* 3 Pillars Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Three Products in One Ecosystem</h2>
            <p className="text-muted-foreground">A closed-loop system connecting expert human data providers to direct AI chat intelligence.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-2xl p-8 relative shadow-sm hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-6">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Pillar 1</span>
              <h3 className="text-xl font-bold mt-1 mb-3">Publisher Network</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Expert creators and niche bloggers submit exclusive, high-value articles. Every submission undergoes automated plagiarism checks, AI-detection tests, and editorial quality scoring.
              </p>
              <ul className="text-xs space-y-2 text-foreground/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Exclusive AI search licensing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Multi-factor originality verification</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Transparent reputation scoring</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 relative shadow-sm hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6">
                <Lock className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Pillar 2</span>
              <h3 className="text-xl font-bold mt-1 mb-3">Private Knowledge Vault</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Approved articles are stored in an encrypted vault. High-dimensional vector embeddings allow our RAG engine to semantically retrieve verified knowledge chunks without exposing raw texts to scrapers.
              </p>
              <ul className="text-xs space-y-2 text-foreground/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Zero unauthorized web-scraping</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Chunk-level semantic indexing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Automated freshness monitoring</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 relative shadow-sm hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Search className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Pillar 3</span>
              <h3 className="text-xl font-bold mt-1 mb-3">AI Search Engine</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Users query the search engine and receive accurate, hallucination-free answers synthesized strictly from vault articles. Every cited fact attributes revenue back to its human author.
              </p>
              <ul className="text-xs space-y-2 text-foreground/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 100% cited answers with sources</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Automated attribution logging</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Up to 90% net royalty pool share</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Attribution Model */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">How Bloggers &amp; Data Providers Earn Royalties</h2>
            <p className="text-muted-foreground leading-relaxed">
              VeraLM is powered by a sustainable ecosystem. Users receive actual, verified, latest human answers in their AI chat replies for free by viewing sponsored ads. 
              The revenue generated from these ad impressions goes directly into the Creator Pool, distributing royalties to the bloggers and data providers whose knowledge answered the query.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-card border border-border flex gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary h-fit">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-1">Up to 90% Net Royalty Pool</h4>
                  <p className="text-sm text-muted-foreground">After direct AI engine inference tokens and server hosting expenses, up to 90% of remaining earnings flows directly to the human data providers.</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card border border-border flex gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary h-fit">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-1">Citation Contribution Weighting</h4>
                  <p className="text-sm text-muted-foreground">Each query records citation events. Primary answers provide high contribution scores, ensuring deep, technical articles earn proportionate rewards.</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card border border-border flex gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary h-fit">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-1">Global Stripe Connect Payouts</h4>
                  <p className="text-sm text-muted-foreground">Automated monthly disbursements directly to creator bank accounts in 130+ currencies with transparent audit reports.</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Monthly Platform Split
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between font-medium mb-1.5">
                    <span>Creator Royalties Pool</span>
                    <span className="text-primary font-bold">60%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1.5">
                    <span>Platform Operations & Maintenance</span>
                    <span className="text-muted-foreground font-semibold">25%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/50 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1.5">
                    <span>LLM Inference & Vector Infrastructure</span>
                    <span className="text-muted-foreground font-semibold">15%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                <span>Minimum payout threshold: $50.00</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Direct Deposit
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about publishing and searching on VeraLM.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How does VeraLM protect my article from unauthorized copying?",
                a: "Full articles are never rendered on public web pages. Only our isolated RAG system and vector index query the content to synthesize answers. Search users only see summarized responses and a brief 200-character preview citation."
              },
              {
                q: "What types of articles qualify for the knowledge vault?",
                a: "We accept in-depth, authoritative guides, technical tutorials, expert analyses, and original research. Submissions must score at least 70% on our composite quality score (high originality, low AI probability, strong informational depth)."
              },
              {
                q: "Can I publish articles that are already on my personal blog?",
                a: "VeraLM requires an exclusive AI search license. While you retain full moral copyright, your article cannot be licensed to competing AI training scrapers. You can syndicate summaries or cross-link from your site."
              },
              {
                q: "How are citations determined in search answers?",
                a: "When a user asks a query, our vector similarity engine retrieves top matching article passages. The LLM synthesizes an answer citing source IDs [1], [2], etc. Each cited passage logs an attribution event that counts toward the author's monthly earnings share."
              }
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card">
                <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>

          {/* CTA Banner */}
          <div className="mt-16 p-8 rounded-2xl bg-primary text-primary-foreground text-center flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <h3 className="text-2xl font-bold mb-1">Ready to monetize your knowledge?</h3>
              <p className="text-primary-foreground/80 text-sm">Join the private creator beta and submit your first verified article.</p>
            </div>
            <Link href="/creators/apply" className="bg-background text-foreground px-6 py-3 rounded-lg font-semibold text-sm hover:bg-background/90 shrink-0">
              Apply as Creator →
            </Link>
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
