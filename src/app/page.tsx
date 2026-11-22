import Link from 'next/link';
import { Search, Sparkles, Shield, Users, ArrowRight, CheckCircle, BarChart3, Lock, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
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
            <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Search
            </Link>
            <Link href="/creators" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              For Creators
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              <span>The Grounded AI Knowledge Model</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              The AI Model with <span className="text-primary">Real Human Answers</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Ask anything and receive instant, up-to-date AI chat replies grounded in actual human expertise. 
              Users get free answers supported by sponsored ads — and expert bloggers &amp; data providers earn royalties for every citation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link 
                href="/search" 
                className="group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Search className="h-5 w-5" />
                Ask AI Now
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link 
                href="/creators/apply" 
                className="inline-flex items-center justify-center gap-2 border border-input bg-background px-8 py-3 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
              >
                Earn as Data Provider
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>100% Real Human Knowledge</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Ad-Supported Free Intelligence</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Direct Royalties to Creators</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How VeraLM Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A new model for knowledge sharing: creators contribute, AI searches, everyone benefits.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Creators Submit Knowledge',
                description: 'Experts write in-depth articles on their domains. Content is verified for quality, originality, and accuracy before entering the knowledge vault.',
                steps: ['Write or upload articles', 'Automated quality checks', 'Admin review & approval', 'Licensed exclusively to VeraLM'],
              },
              {
                icon: Lock,
                title: 'Secure Knowledge Vault',
                description: 'Approved articles are chunked, embedded, and stored in a private vector database. Full content never leaves our servers — AI only sees relevant excerpts per query.',
                steps: ['Semantic chunking (10-15 chunks)', 'Vector embeddings generated', 'Encrypted at rest', 'Row-level security enforced'],
              },
              {
                icon: Search,
                title: 'AI Answers with Citations',
                description: 'Users ask questions. Our RAG engine retrieves relevant chunks, the LLM generates an answer citing sources, and attribution scores are logged for revenue sharing.',
                steps: ['Hybrid vector + keyword search', 'LLM generates cited answer', 'Attribution scores calculated', 'Creator earnings accumulate'],
              },
            ].map((step, index) => (
              <div key={index} className="bg-card p-8 rounded-xl border border-border hover:border-primary/50 transition-colors">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-6">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground mb-6">{step.description}</p>
                <ul className="space-y-2 text-sm">
                  {step.steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why VeraLM Is Different</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Traditional search sends traffic. AI search answers directly. We bridge the gap.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: 'Verified Content Only',
                desc: 'Every article passes plagiarism checks, AI detection, and human review before it can answer questions.',
              },
              {
                icon: BarChart3,
                title: 'Transparent Royalty Sharing',
                desc: 'Up to 90% of net revenue (after AI engine & server expenses) is distributed to human data providers based on real Q&A citations.',
              },
              {
                icon: Lock,
                title: 'Content Stays Private',
                desc: 'Full articles are never public, never fed to model training. AI sees only relevant excerpts per query.',
              },
              {
                icon: Globe,
                title: 'Global Creator Payments',
                desc: 'Stripe Connect handles payouts to 100+ countries. No minimum traffic — earnings from knowledge, not clicks.',
              },
            ].map((item, index) => (
              <div key={index} className="p-6 rounded-xl border border-border hover:border-primary/50 transition-colors">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Creators Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Turn Your Expertise Into Recurring Revenue</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Write once, earn forever. Your articles generate income every time they help answer a question — no traffic required, no ads on your site.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Exclusive AI search licensing — you keep all other rights',
                  'Transparent earnings dashboard with per-article breakdown',
                  'Monthly payouts via Stripe (global, $50 minimum)',
                  'Quality scores help you improve and earn more',
                  'Full control: withdraw articles with 30 days notice',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link 
                href="/creators/apply" 
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Apply to Join
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="bg-card p-8 rounded-xl border border-border">
              <h3 className="text-xl font-bold mb-6 text-center">Creator Earnings Example</h3>
              <div className="space-y-4">
                {[
                  { name: 'Sarah Chen', niche: 'Tech Reviews', articles: 12, monthly: 960 },
                  { name: 'Mike Tanaka', niche: 'Photography', articles: 8, monthly: 480 },
                  { name: 'James Liu', niche: 'Finance', articles: 5, monthly: 360 },
                ].map((creator, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{creator.name}</p>
                      <p className="text-sm text-muted-foreground">{creator.niche} • {creator.articles} articles</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">${creator.monthly}/mo</p>
                      <p className="text-xs text-muted-foreground">Estimated</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Based on $5,000 monthly platform revenue, 60% creator pool. 
                <br />Early creators earn more as platform grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Demo */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Try It Now</h2>
            <p className="text-lg text-muted-foreground">
              Ask any question. Get an answer backed by verified expert articles.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <form className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="e.g., Best budget camera for video 2026?"
                className="flex-1 px-4 py-3 border border-input bg-background rounded-lg text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors">
                Search
              </button>
            </form>
            
            <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
              {['Budget cameras 2026', 'Roth IRA vs 401k', 'Best hiking trails Colorado', 'Python async patterns'].map((q, i) => (
                <button 
                  key={i}
                  className="px-3 py-1 rounded border border-border hover:bg-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Experience Better Search?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join 50+ expert creators building the web's most trusted knowledge base. 
            Early creators lock in better revenue shares as the platform grows.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/search" className="bg-primary-foreground text-primary px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Start Searching
            </Link>
            <Link href="/creators/apply" className="border-2 border-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary-foreground/10 transition-colors">
              Apply as Creator
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
                <Sparkles className="h-6 w-6" />
                <span>VeraLM</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                The AI model answering with actual, verified human truth — users access answers free through sponsored ads, while bloggers &amp; data providers earn direct royalties.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/search" className="hover:text-foreground transition-colors">AI Search</Link></li>
                <li><Link href="/creators" className="hover:text-foreground transition-colors">Creator Portal</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Creators</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/creators/apply" className="hover:text-foreground transition-colors">Apply to Join</Link></li>
                <li><Link href="/creators/earnings" className="hover:text-foreground transition-colors">Earnings Calculator</Link></li>
                <li><Link href="/creators/guidelines" className="hover:text-foreground transition-colors">Content Guidelines</Link></li>
                <li><Link href="/creators/faq" className="hover:text-foreground transition-colors">Creator FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 VeraLM. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/licensing" className="hover:text-foreground transition-colors">Licensing</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}