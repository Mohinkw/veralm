import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Navbar } from '@/components/navbar';

export const metadata = {
  title: 'Privacy Policy | VeraLM',
  description:
    'VeraLM Privacy Policy — EU/UK GDPR, US CCPA/CPRA, and international data protection practices for AI search and creator publishing.',
};

const SECTIONS = [
  {
    title: '1. Scope & Data Controller',
    body: `This Privacy Policy explains how VeraLM Inc. ("VeraLM", "we", "us") collects, uses, stores, and protects personal data when you use veralm.com, our AI chat assistant, Knowledge Vault, Creator Studio, and VeraLM Pro subscriptions. This policy is designed to comply with the EU General Data Protection Regulation (GDPR), the UK GDPR and Data Protection Act 2018, the California Consumer Privacy Act as amended by the CPRA (CCPA/CPRA), and other applicable international privacy frameworks.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect: (a) Account Data — name, email address, authentication tokens, and role/subscription status; (b) Creator & Payout Data — professional bio, domain categories, submitted articles, tax residency status (W-9/W-8BEN), and payout method identifiers (such as Stripe Connect, Payoneer, Wise, PayPal, bank wire, or wallet addresses); (c) AI Chat & Usage Data — search queries, conversation context, article ratings, page views, and approximate country-level region headers (without storing raw IP addresses for profiling); (d) Technical & Diagnostic Data — browser type, device viewport, and error logs.`,
  },
  {
    title: '3. How We Use Your Data & Lawful Bases (EU/UK GDPR)',
    body: `We process personal data only where a valid lawful basis applies: (a) Performance of a Contract — to authenticate your universal VeraLM account, deliver AI answers, manage Pro subscriptions, and calculate/pay creator royalties; (b) Legitimate Interests — to prevent fraud, spam, and scraping, secure our infrastructure, and measure anonymized product performance; (c) Legal Obligation — to comply with tax reporting, accounting, and statutory takedown requirements; (d) Consent — for optional analytics/advertising cookies where required by law.`,
  },
  {
    title: '4. AI Processing & Zero-Sale Commitment',
    body: `Your chat queries are processed via server-side API calls to synthesize grounded answers from our Knowledge Vault and to attribute royalties to cited creators. We do not sell your personal information or chat history to data brokers. API inference providers used by VeraLM are configured under commercial API terms that do not use your private queries to train public foundation models.`,
  },
  {
    title: '5. Service Providers & Sub-Processors',
    body: `We share data only with vetted infrastructure and service partners bound by Data Processing Agreements (DPAs): Supabase (authentication and PostgreSQL/pgvector hosting), Vercel (edge hosting and compute), Google Gemini API (AI answer synthesis and embeddings), Polar.sh (Merchant of Record and Pro subscription billing), Google Analytics 4 & Google AdSense (traffic analytics and ad delivery for free-tier users; disabled for Pro and Admin accounts), PostHog (product analytics), and Sentry (error monitoring).`,
  },
  {
    title: '6. Cookies, Analytics & Advertising Choices',
    body: `We use essential cookies for authentication and session security. Free-tier users may see ads served via Google AdSense; VeraLM Pro members and Admins have ads disabled. You can manage cookie preferences in your browser settings or opt out of personalized advertising via Google Ad Settings, YourOnlineChoices (EU/UK), or the NAI/DAA opt-out portals (US).`,
  },
  {
    title: '7. International Data Transfers',
    body: `Because VeraLM operates globally, data may be transferred to and processed in the United States and other jurisdictions where our cloud providers operate. For transfers from the EEA, UK, or Switzerland, we rely on Standard Contractual Clauses (SCCs), the UK International Data Transfer Addendum (IDTA), or adequacy decisions such as the EU-US Data Privacy Framework.`,
  },
  {
    title: '8. Data Retention',
    body: `Account records are kept while your account remains active. Search attribution events are retained for up to 24 months to support royalty auditing and financial reconciliation, after which they are anonymized or deleted. Financial and tax records are retained for 7 years as required by law.`,
  },
  {
    title: '9. Your Privacy Rights (EU/UK GDPR, US State Laws & Global)',
    body: `Depending on your jurisdiction, you have the right to: (a) access and receive a portable copy of your personal data; (b) correct inaccurate information; (c) request deletion ("right to be forgotten"); (d) restrict or object to processing; (e) withdraw consent at any time; (f) opt out of targeted advertising or "sharing" under CCPA/CPRA; and (g) not be discriminated against for exercising your rights. EU/EEA residents may also lodge a complaint with their local Data Protection Authority, and UK residents with the Information Commissioner's Office (ICO).`,
  },
  {
    title: '10. Children’s Privacy',
    body: `VeraLM is not directed to children under 13 (or under 16 in the EEA/UK where required). Creator accounts and Pro subscriptions require users to be at least 18 years old. If we learn we have collected personal data from a minor without required consent, we will delete it promptly.`,
  },
  {
    title: '11. Security & Policy Updates',
    body: `All traffic is encrypted in transit (TLS 1.3) and sensitive data is encrypted at rest (AES-256) with strict Supabase Row-Level Security (RLS). We will notify registered users at least 14 days before material changes to this Privacy Policy take effect.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Shield className="h-3.5 w-3.5" />
            <span>Global Privacy & Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">
            Last updated: November 2026 · Applies to EU/EEA, UK, US, and global users
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
          <h3 className="font-semibold mb-2">Privacy & Data Subject Requests</h3>
          <p className="text-sm text-muted-foreground mb-3">
            To exercise your GDPR, UK GDPR, or CCPA/CPRA rights, email{' '}
            <a href="mailto:admin@veralm.com" className="text-primary hover:underline font-medium">
              admin@veralm.com
            </a>{' '}
            or{' '}
            <a href="mailto:support@veralm.com" className="text-primary hover:underline font-medium">
              support@veralm.com
            </a>
            . We respond to verified requests within 30 days.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            <Link href="/licensing" className="text-primary hover:underline">Creator Licensing</Link>
            <Link href="/contact" className="text-primary hover:underline">Contact Us</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
