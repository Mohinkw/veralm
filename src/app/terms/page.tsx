import Link from "next/link";

export const metadata = {
  title: "Terms of Service | VeraLM",
  description: "VeraLM terms of service for creators and users.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-blue-400 hover:underline text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-gray-400 mb-10 text-sm">Last updated: November 2026</p>

        {[
          {
            title: "1. Acceptance",
            body: "By accessing or using VeraLM you agree to be bound by these Terms. If you do not agree, please do not use the platform.",
          },
          {
            title: "2. Eligibility",
            body: "You must be 18 years or older and a qualified domain expert to register as a creator. User accounts (search-only) have no age restriction beyond applicable local law.",
          },
          {
            title: "3. Creator Obligations",
            body: "Creators must submit only original work. Plagiarised, AI-generated, or factually inaccurate content will be rejected or removed. Repeated violations may result in permanent account termination without payout of pending earnings.",
          },
          {
            title: "4. Content License",
            body: "You grant VeraLM a non-exclusive, royalty-bearing, worldwide license to index, embed, store, and serve your articles inside the VeraLM platform. This license is revocable by withdrawing your content, subject to a 90-day wind-down period to protect ongoing attribution integrity.",
          },
          {
            title: "5. Revenue Distribution",
            body: "Royalties are calculated and distributed monthly. The platform allocates up to 90% of net earnings (gross ad and subscription revenue minus direct AI engine API costs and server/database hosting expenses) to the Creator Royalty Pool. Payouts are distributed based on actual query citations. Minimum payout threshold is $50 USD.",
          },
          {
            title: "6. Prohibited Uses",
            body: "You may not: scrape, reverse-engineer, or reproduce platform content; submit content to train competing AI systems; impersonate other experts; manipulate search rankings; or use the platform for illegal activity.",
          },
          {
            title: "7. Intellectual Property",
            body: "The VeraLM platform, branding, and software are the exclusive property of VeraLM Inc. Creator articles remain the property of their respective authors.",
          },
          {
            title: "8. Disclaimers",
            body: 'The platform is provided "as is." VeraLM does not guarantee uptime, earnings levels, or answer accuracy. AI-generated answers may contain errors — always verify critical information from primary sources.',
          },
          {
            title: "9. Limitation of Liability",
            body: "VeraLM's total liability for any claim shall not exceed the total earnings distributed to you in the 3 months preceding the claim.",
          },
          {
            title: "10. Governing Law",
            body: "These Terms are governed by the laws of Delaware, USA. Any disputes shall be resolved by binding arbitration under AAA rules.",
          },
          {
            title: "11. Changes",
            body: "We may update these Terms with 14 days' notice via email. Continued use constitutes acceptance.",
          },
          {
            title: "12. Contact",
            body: "Legal inquiries: legal@veralm.com",
          },
        ].map((s) => (
          <section key={s.title} className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-white">{s.title}</h2>
            <p className="text-gray-400 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
