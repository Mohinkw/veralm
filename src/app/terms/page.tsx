import Link from 'next/link';
import { FileCheck } from 'lucide-react';
import { Navbar } from '@/components/navbar';

export const metadata = {
  title: 'Terms of Service | VeraLM',
  description:
    'VeraLM Terms of Service — AI transparency, creator licensing, Pro subscriptions, DMCA/DSA compliance, and international consumer rights.',
};

const SECTIONS = [
  {
    title: '1. Acceptance & Universal Account',
    body: `By accessing or using VeraLM ("Platform"), you agree to these Terms of Service and our Privacy Policy. VeraLM provides a single universal account for AI chat, Knowledge Vault reading, VeraLM Pro, and Creator Studio.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 13 years old (or 16 in the EEA/UK where required) to use VeraLM chat features, and at least 18 years old to purchase a Pro subscription or register as a paid Creator.`,
  },
  {
    title: '3. AI Transparency & Output Disclaimers (EU AI Act & Global Standards)',
    body: `In accordance with international AI transparency standards (including the EU AI Act), answers generated in VeraLM Chat are produced by artificial intelligence synthesized from cited Knowledge Vault articles. AI outputs may contain inaccuracies or omissions and are provided for informational purposes only — they do not constitute professional legal, medical, financial, or tax advice. Always verify critical decisions with qualified primary sources.`,
  },
  {
    title: '4. Creator Content & Intellectual Property',
    body: `Creators retain full ownership of their original articles. By publishing to the Knowledge Vault, you grant VeraLM a non-exclusive, royalty-bearing, worldwide license as detailed in our Creator Licensing Agreement. VeraLM's software, brand, UI, and retrieval systems remain the intellectual property of VeraLM Inc.`,
  },
  {
    title: '5. Revenue Pool & Creator Payouts',
    body: `VeraLM allocates up to 90% of net revenue (gross ad and Pro subscription revenue minus direct AI inference and server/database expenses, retaining a 10% platform fee) to the Creator Royalty Pool. Royalties are distributed monthly based on verified query citations once a creator's accrued balance reaches the $50.00 USD minimum payout threshold.`,
  },
  {
    title: '6. VeraLM Pro Subscriptions & Refunds',
    body: `VeraLM Pro subscriptions are billed monthly or annually via Polar.sh (our Merchant of Record) and renew automatically unless canceled prior to the renewal date. EU and UK consumers retain any mandatory statutory 14-day withdrawal/cooling-off rights applicable to digital services under local consumer law.`,
  },
  {
    title: '7. Acceptable Use & Anti-Scraping',
    body: `You agree not to: (a) scrape, crawl, bulk-download, or systematically extract Knowledge Vault articles or AI outputs to train competing models; (b) attempt prompt injection, rate-limit circumvention, or unauthorized access to admin/API endpoints; (c) submit plagiarized, defamatory, illegal, or undisclosed synthetic spam content; or (d) artificially inflate citation or ad metrics.`,
  },
  {
    title: '8. Copyright (DMCA) & EU DSA Notice-and-Action',
    body: `We respect intellectual property and comply with the US Digital Millennium Copyright Act (DMCA) and the EU Digital Services Act (DSA). To report copyright infringement or illegal content, send a detailed notice (identifying the work, the URL on VeraLM, and your contact/authority statement) to admin@veralm.com. Repeat infringers will have their accounts terminated.`,
  },
  {
    title: '9. Disclaimers & Limitation of Liability',
    body: `To the fullest extent permitted by applicable law, VeraLM is provided "as is" and "as available" without warranties of uninterrupted uptime or specific earnings. To the extent permitted by law, VeraLM's aggregate liability shall not exceed the greater of $100 USD or the amounts paid by or distributed to you in the preceding 3 months. Nothing in these Terms excludes liability that cannot be excluded under EU, UK, or other mandatory consumer protection laws.`,
  },
  {
    title: '10. Governing Law & International Consumer Carve-Out',
    body: `These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles. However, if you are a consumer residing in the European Union, the United Kingdom, or another jurisdiction with mandatory consumer protection laws, you retain the benefit of any mandatory provisions and local court rights of your country of residence.`,
  },
  {
    title: '11. Changes to Terms',
    body: `We will provide at least 14 days' notice via email or prominent platform notice before material updates take effect. Continued use after the effective date constitutes acceptance of the updated Terms.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <FileCheck className="h-3.5 w-3.5" />
            <span>Platform Rules & AI Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">
            Last updated: November 2026 · Effective globally
          </p>
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
          <h3 className="font-semibold mb-2">Legal, DMCA & DSA Notices</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Send legal inquiries, DMCA takedown notices, or EU DSA reports to{' '}
            <a href="mailto:admin@veralm.com" className="text-primary hover:underline font-medium">
              admin@veralm.com
            </a>
            . For account or billing support, contact{' '}
            <a href="mailto:support@veralm.com" className="text-primary hover:underline font-medium">
              support@veralm.com
            </a>
            .
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/licensing" className="text-primary hover:underline">Creator Licensing</Link>
            <Link href="/contact" className="text-primary hover:underline">Contact Us</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
