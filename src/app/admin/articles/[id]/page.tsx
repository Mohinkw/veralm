import Link from "next/link";

export const metadata = {
  title: "Article Review | VeraLM Admin",
};

// Demo article data
const article = {
  id: "demo-article-1",
  title: "Optimising PostgreSQL for Vector Search at Scale",
  author: "Alex Rivers",
  authorEmail: "alex@example.com",
  specialty: "Database Engineering",
  submittedAt: "2026-11-15T09:30:00Z",
  wordCount: 2847,
  status: "pending_review",
  qualityScore: 87,
  originalityScore: 96,
  aiDetectionScore: 3,
  excerpt:
    "A practitioner's guide to deploying pgvector with HNSW indexes, tuning parameters, and designing partition strategies for production-scale vector workloads.",
  content: `## Introduction

PostgreSQL's pgvector extension has matured rapidly. In production at scale, however, default settings leave significant performance on the table...

## HNSW vs IVFFlat

HNSW (Hierarchical Navigable Small World) graphs offer better recall at the same query latency compared to IVFFlat for most workloads. The key parameters are:

- **ef_construction** (128–256): Controls build quality. Higher = better recall, slower build.
- **m** (16–32): Graph connectivity. Higher = better recall, more memory.

## Partitioning Strategy

For tables exceeding 10M embeddings, partition by category or time range. Each partition maintains its own HNSW index, dramatically reducing per-query scan size.

## Query Optimisation

Always run \`SET LOCAL enable_seqscan = off\` within your search transaction to force index use. Combine with \`SET LOCAL hnsw.ef_search = 100\` for high-recall requirements.`,
};

export default async function AdminArticleReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await params; // Next.js 15 requires awaiting params
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/admin" className="hover:text-white">Admin</Link>
          <span>›</span>
          <Link href="/admin" className="hover:text-white">Articles</Link>
          <span>›</span>
          <span className="text-white">Review</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main article */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-white leading-tight">{article.title}</h1>
                <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded-full shrink-0 ml-3">
                  Pending Review
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                <span>By <strong className="text-white">{article.author}</strong></span>
                <span>{article.wordCount.toLocaleString()} words</span>
                <span>Submitted {new Date(article.submittedAt).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-400 text-sm italic border-l-4 border-blue-700 pl-4 mb-6">
                {article.excerpt}
              </p>
              <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-xs bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                {article.content}
              </div>
            </div>
          </div>

          {/* Sidebar: Scores + Actions */}
          <div className="space-y-4">
            {/* Quality scores */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-bold text-white mb-4">Quality Scores</h2>
              {[
                { label: "Overall Quality", score: article.qualityScore, threshold: 70 },
                { label: "Originality", score: article.originalityScore, threshold: 85 },
                { label: "AI-Generated Content", score: article.aiDetectionScore, threshold: 20, inverted: true },
              ].map((s) => (
                <div key={s.label} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{s.label}</span>
                    <span
                      className={
                        s.inverted
                          ? s.score <= s.threshold
                            ? "text-green-400"
                            : "text-red-400"
                          : s.score >= s.threshold
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {s.score}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full">
                    <div
                      className={`h-2 rounded-full ${
                        s.inverted
                          ? s.score <= s.threshold
                            ? "bg-green-500"
                            : "bg-red-500"
                          : s.score >= s.threshold
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Creator info */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-bold text-white mb-3">Creator</h2>
              <div className="text-sm space-y-1">
                <div className="text-white font-medium">{article.author}</div>
                <div className="text-gray-400">{article.authorEmail}</div>
                <div className="text-gray-400">{article.specialty}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="font-bold text-white mb-1">Actions</h2>
              <button className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-sm font-medium">
                ✓ Approve Article
              </button>
              <button className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium">
                ↩ Request Revision
              </button>
              <button className="w-full bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium">
                ✕ Reject Article
              </button>
            </div>

            {/* Notes */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-bold text-white mb-2">Review Notes</h2>
              <textarea
                rows={3}
                placeholder="Add notes for the creator (sent in email)…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
