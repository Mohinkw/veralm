import Link from "next/link";
import { Target, Globe, DollarSign, Sparkles } from "lucide-react";
import { Navbar } from "@/components/navbar";

export const metadata = {
  title: "Careers",
  description: "Learn about VeraLM's mission and contributor opportunities.",
};

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border py-16 sm:py-20 px-4 sm:px-6 text-center bg-muted/20">
          <div className="max-w-2xl mx-auto">
            <span className="text-primary text-xs font-semibold uppercase tracking-widest">Careers</span>
            <h1 className="text-3xl sm:text-4xl font-bold mt-3 mb-4 tracking-tight">Build the future of verified AI knowledge</h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              VeraLM is a focused, mission-driven team. We believe the best AI answers should come from real experts — not
              uncredited scraping.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-14 grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: Target,
              title: "Mission-first",
              desc: "We work on hard problems that matter: ensuring expert knowledge is fairly valued in the AI era.",
            },
            {
              icon: Globe,
              title: "Fully remote",
              desc: "No offices. No commutes. Work from wherever you do your best thinking.",
            },
            {
              icon: DollarSign,
              title: "Creator-aligned",
              desc: "Up to 90% of net revenue goes directly to verified contributors whose work powers AI answers.",
            },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-bold text-foreground mb-1">{v.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </section>

        {/* Open Roles Empty State */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
          <h2 className="text-2xl font-bold mb-6">Open Roles</h2>
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm space-y-4">
            <p className="text-base font-semibold text-foreground">
              There are currently no open staff or engineering vacancies.
            </p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              If you are a domain expert, researcher, or technical writer, you can contribute verified articles directly to the Knowledge Vault and earn ongoing royalties.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/creators"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Earn as a Creator
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center border border-border hover:bg-accent text-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* General inquiries */}
        <section className="bg-muted/30 border-t border-border py-12 text-center px-4 sm:px-6">
          <h2 className="text-2xl font-bold mb-3">Want to reach our team?</h2>
          <p className="text-muted-foreground mb-6">
            For partnerships or future opportunities, feel free to send us a note.
          </p>
          <a
            href="mailto:admin@veralm.com"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            admin@veralm.com
          </a>
        </section>
      </main>
    </div>
  );
}
