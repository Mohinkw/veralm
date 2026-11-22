import Link from "next/link";

export const metadata = {
  title: "Blog | VeraLM",
  description: "Platform updates, creator spotlights, and knowledge economy insights from the VeraLM team.",
};

const posts = [
  {
    slug: "introducing-aisas",
    date: "November 2026",
    category: "Platform",
    title: "Introducing VeraLM: Where Expert Knowledge Powers AI Answers",
    excerpt:
      "We built VeraLM to fix a broken incentive loop — AI gets smarter, creators get nothing. Here's how we're changing that.",
  },
  {
    slug: "how-rag-pays-creators",
    date: "November 2026",
    category: "Technology",
    title: "How RAG-Based Attribution Pays the Right People",
    excerpt:
      "Every AI-generated answer cites a source. We track those citations and distribute revenue proportionally. Here's the math.",
  },
  {
    slug: "quality-over-volume",
    date: "October 2026",
    category: "Editorial",
    title: "Quality Over Volume: Why We Reject 70% of Submissions",
    excerpt:
      "Our three-stage verification process — automated checks, originality scoring, and human expert review — ensures only the best content enters the vault.",
  },
  {
    slug: "creator-spotlight-alex-rivers",
    date: "October 2026",
    category: "Creator Spotlight",
    title: "Creator Spotlight: Alex Rivers on Database Expertise",
    excerpt:
      "How a PostgreSQL performance specialist turned a decade of hard-won knowledge into a sustainable income stream on VeraLM.",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <section className="border-b border-gray-800 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">VeraLM Blog</span>
          <h1 className="text-4xl font-bold mt-3 mb-4">Platform Updates & Insights</h1>
          <p className="text-gray-400 text-lg">
            Creator spotlights, product updates, and essays on the future of AI-powered knowledge.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-700 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">
                {post.category}
              </span>
              <span className="text-xs text-gray-500">{post.date}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2 hover:text-blue-300">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{post.excerpt}</p>
            <Link href={`/blog/${post.slug}`} className="text-blue-400 hover:underline text-sm">
              Read more →
            </Link>
          </article>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-gray-900 border-t border-gray-800 py-12 text-center px-6">
        <h2 className="text-2xl font-bold mb-4">Ready to contribute?</h2>
        <p className="text-gray-400 mb-6">Join 150+ verified experts already earning on VeraLM.</p>
        <Link
          href="/creators/apply"
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold"
        >
          Apply as a Creator
        </Link>
      </section>
    </main>
  );
}
