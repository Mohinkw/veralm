import Link from 'next/link';
import { Scale } from 'lucide-react';
import { Navbar } from '@/components/navbar';

export const metadata = {
  title: 'Creator Licensing Agreement',
  description:
    'VeraLM Creator Content Licensing Agreement, 90% net royalty formula, global payout methods, and content rights.',
};

const SECTIONS = [
  {
    title: '1. Grant of Non-Exclusive License',
    body: `By submitting an article to VeraLM, you grant VeraLM Inc. a non-exclusive, worldwide, royalty-bearing license to: (a) store your article in our private Knowledge Vault; (b) generate and store vector embeddings for semantic retrieval; (c) retrieve and cite excerpts in AI-generated answers; and (d) display your author name, profile, and article preview alongside citations.`,
  },
  {
    title: '2. You Keep Full Ownership & Can Publish Elsewhere',
    body: `You retain 100% copyright ownership of your work. This license is non-exclusive — you are free to publish the same or updated content on your personal blog, Substack, Medium, LinkedIn, or elsewhere.`,
  },
  {
    title: '3. Originality & Editorial Standards',
    body: `Submissions must be accurate, authored with genuine human expertise, free of third-party copyright infringement, and compliant with our quality guidelines. Every article undergoes automated quality, originality, and AI-probability screening, followed by editorial review where required.`,
  },
  {
    title: '4. Anti-Scraping & Vault Protection',
    body: `Full article bodies are stored in our private Knowledge Vault and protected against unauthorized third-party LLM training crawlers. Unauthenticated visitors and free-tier users see only a limited preview unless signed in as a VeraLM Pro member or authorized user.`,
  },
  {
    title: '5. Freshness & 12-Month Review Cycle',
    body: `To maintain high answer accuracy, articles may be flagged for freshness review after 12 months. Creators can submit updated versions anytime in Creator Studio.`,
  },
  {
    title: '6. Content Withdrawal (48-Hour Takedown)',
    body: `You may unpublish or withdraw your article at any time from Creator Studio. Withdrawal removes the article from new AI retrieval and search results within 48 hours. Historical attribution records are preserved strictly for financial audit and royalty accounting.`,
  },
  {
    title: '7. Global Payouts & Tax Compliance',
    body: `Royalties are calculated monthly and paid once your balance reaches $50.00 USD via your chosen payout method (Stripe Connect, Payoneer, Wise, PayPal, Bank Wire/IBAN/SWIFT, or USDC/USDT/BTC). Unpaid balances below $50.00 USD roll over automatically. Creators are responsible for providing accurate tax documentation (such as IRS W-9, W-8BEN, or local EU/UK tax identifiers where applicable) and reporting their own income.`,
  },
  {
    title: '8. Termination',
    body: `VeraLM may suspend or terminate accounts engaged in plagiarism, citation manipulation, or fraud. For voluntary closures in good standing, accrued eligible balances above the payout minimum are settled in the next monthly cycle (within 60 days).`,
  },
  {
    title: '9. Governing Law & International Compliance',
    body: `This Agreement is governed by the laws of the State of Delaware, USA, subject to any mandatory statutory protections applicable to creators in the EU, UK, or other jurisdictions.`,
  },
];

export default function LicensingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
            <Scale className="h-3.5 w-3.5" />
            <span>Creator Rights & Royalties</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Creator Licensing Agreement
          </h1>
          <p className="text-muted-foreground text-sm">Version 1.1 — November 2026</p>
        </div>

        {/* Revenue Formula */}
        <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-6 mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">
            Revenue &amp; Royalty Formula
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Net Revenue Pool</strong> = Gross Ad &amp; Pro
              Subscription Revenue − (Direct AI Inference + Server/Database Expenses)
            </p>
            <p>
              <strong className="text-foreground">Monthly Creator Royalty Pool</strong> = Up to 90%
              of Net Revenue Pool (10% platform fee)
            </p>
            <p>
              <strong className="text-foreground">Creator Payout</strong> = Monthly Creator Royalty
              Pool × Verified Citation Share
            </p>
            <ul className="list-disc list-inside space-y-1 pt-2">
              <li>Up to 90% of net revenue goes directly to verified creators</li>
              <li>Infrastructure &amp; AI API costs are transparently deducted first</li>
              <li>Supported payouts: Stripe Connect, Payoneer, Wise, PayPal, Bank Wire, Crypto</li>
              <li>Minimum payout: $50.00 USD (balances below $50 roll over automatically)</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="border-b border-border/60 pb-6 last:border-b-0">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">{s.title}</h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 p-6 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground">
            Questions about licensing or payouts? Contact{' '}
            <a href="mailto:support@veralm.com" className="text-primary hover:underline font-medium">
              support@veralm.com
            </a>{' '}
            or view the{' '}
            <Link href="/creators" className="text-primary hover:underline font-medium">
              Creator Overview
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
