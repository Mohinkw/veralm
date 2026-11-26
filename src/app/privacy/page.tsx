import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | VeraLM",
  description: "VeraLM privacy policy — how we collect, use and protect your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-blue-400 hover:underline text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-gray-400 mb-10 text-sm">Last updated: November 2026</p>

        {[
          {
            title: "1. Information We Collect",
            body: `We collect information you provide directly (name, email, professional bio, submitted articles) and usage data (search queries, page views, feature interactions). We do not sell your personal data.`,
          },
          {
            title: "2. How We Use Your Data",
            body: `Your data powers the VeraLM platform: creator accounts, article verification, AI-search attribution, and revenue distribution. Search queries are logged to calculate per-article royalties and improve answer quality.`,
          },
          {
            title: "3. AI-Search Query Logging",
            body: `Every search query is stored in our private vault for attribution purposes. Query text, generated answer, and cited article IDs are retained for 24 months. We do not expose individual queries to other users or third parties.`,
          },
          {
            title: "4. Data Sharing",
            body: `We share data only with: Supabase (database hosting), Stripe (payment processing), Resend (transactional email), and Originality.ai (plagiarism detection). Each is bound by GDPR-compliant data processing agreements.`,
          },
          {
            title: "5. Creator Content Rights",
            body: `You retain intellectual property rights to articles you submit. By submitting, you grant VeraLM a non-exclusive, worldwide license to index, embed, and serve your content within the platform under our Licensing Agreement.`,
          },
          {
            title: "6. Data Retention",
            body: `Account data is retained for the life of your account plus 90 days after deletion. Article embeddings are retained to protect attribution history. Contact us to request full deletion.`,
          },
          {
            title: "7. Your Rights",
            body: `You may access, correct, export, or delete your data at any time via your profile settings or by emailing support@veralm.com. EU/EEA residents have additional rights under GDPR Article 17–21.`,
          },
          {
            title: "8. Security",
            body: `All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Supabase Row-Level Security policies ensure creators cannot access each other's private data. We conduct regular security audits.`,
          },
          {
            title: "9. Changes to This Policy",
            body: `We will notify registered creators by email at least 14 days before material changes take effect. Continued use after the effective date constitutes acceptance.`,
          },
          {
            title: "10. Contact",
            body: `For privacy inquiries: admin@veralm.com`,
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
