import Link from "next/link";

export const metadata = {
  title: "Licensing Agreement | VeraLM",
  description: "VeraLM creator content licensing agreement and revenue formula.",
};

export default function LicensingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-blue-400 hover:underline text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-4xl font-bold mb-4">Creator Licensing Agreement</h1>
        <p className="text-gray-400 mb-10 text-sm">Version 1.0 — November 2026</p>

        {/* Revenue Formula */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-6 mb-10">
          <h2 className="text-2xl font-bold text-blue-300 mb-4">Revenue & Royalty Formula</h2>
          <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
            <p>
              <strong className="text-white">Net Revenue Pool</strong> = Gross Ad &amp; Subscription Revenue − (Direct AI Engine API Costs + Server/Database Expenses)
            </p>
            <p>
              <strong className="text-white">Monthly Creator Royalty Pool</strong> = Net Revenue Pool × Up to 90%
            </p>
            <p>
              <strong className="text-white">Creator Payout</strong> = Monthly Creator Royalty Pool × Contribution Score
            </p>
            <p>
              <strong className="text-white">Contribution Score</strong> = Based on each question &amp; answer: frequency, rank, and quality of citations credited to your verified articles.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Up to 90% of net profits from ad impressions &amp; subscriptions go directly to data providers</li>
              <li>Operational costs (AI model inference tokens &amp; cloud servers) are transparently subtracted first</li>
              <li>Platform retains a modest 10% operating margin</li>
              <li>Minimum payout: $50 USD. Unpaid balances roll over automatically.</li>
            </ul>
          </div>
        </div>

        {[
          {
            title: "1. Grant of License",
            body: `By submitting an article you grant VeraLM Inc. a non-exclusive, worldwide, royalty-bearing license to: (a) store your article in our private Knowledge Vault; (b) generate and store vector embeddings of your content; (c) retrieve and cite excerpts in AI-generated search answers; (d) display your name and professional profile alongside citations.`,
          },
          {
            title: "2. Exclusivity",
            body: `This license is non-exclusive. You may publish your content elsewhere, including your own blog, Medium, LinkedIn, or other platforms. VeraLM does not claim exclusivity.`,
          },
          {
            title: "3. Content Standards",
            body: `All submitted content must be: original (not AI-generated prose); factually accurate at time of submission; within your domain of professional expertise; free of plagiarism; compliant with applicable laws.`,
          },
          {
            title: "4. Verification Process",
            body: `Submitted articles undergo automated checks (originality score, format, duplicate detection) followed by human expert review. VeraLM reserves the right to reject any submission that does not meet quality standards without obligation to explain.`,
          },
          {
            title: "5. Freshness & Updates",
            body: `Creators are notified when content is flagged as potentially outdated (12-month review cycle). You may submit revised versions at any time. Outdated articles that are not updated within 60 days of notification may be delisted.`,
          },
          {
            title: "6. Content Withdrawal",
            body: `You may withdraw your content at any time via your dashboard. Withdrawal takes effect within 48 hours. Withdrawn articles are removed from the vault and will no longer appear in new search results. Attribution records are retained for audit purposes.`,
          },
          {
            title: "7. Payment Terms",
            body: `Revenue is calculated monthly and distributed by the 15th of the following month via Stripe Connect. VeraLM may withhold payment for accounts under compliance review. Tax reporting is the creator's responsibility.`,
          },
          {
            title: "8. Termination",
            body: `VeraLM may terminate this agreement immediately for material breach (plagiarism, fraud, repeated policy violations). Upon termination, pending earnings are forfeited for accounts in breach. Good-standing accounts in voluntary closure receive their final payout within 60 days.`,
          },
          {
            title: "9. Governing Law",
            body: `This Agreement is governed by the laws of the State of Delaware, USA.`,
          },
        ].map((s) => (
          <section key={s.title} className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-white">{s.title}</h2>
            <p className="text-gray-400 leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div className="border-t border-gray-800 pt-8 mt-8">
          <p className="text-gray-500 text-sm">
            Questions about licensing? Contact{" "}
            <a href="mailto:support@veralm.com" className="text-blue-400 hover:underline">
              support@veralm.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
