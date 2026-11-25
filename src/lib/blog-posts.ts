export interface BlogPost {
  slug: string;
  date: string;
  category: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'introducing-veralm',
    date: 'November 2026',
    category: 'Platform',
    title: 'Introducing VeraLM: Where Expert Knowledge Powers AI Answers',
    excerpt:
      "We built VeraLM to fix a broken incentive loop — AI gets smarter, creators get nothing. Here's how we're changing that.",
    paragraphs: [
      'Traditional AI assistants train on the open web without compensating the domain experts who write the original guides, benchmarks, and postmortems.',
      'VeraLM flips that model: vetted creators publish directly into a private, cryptographically protected Knowledge Vault. Every time a user asks a question, VeraLM retrieves relevant passages via hybrid vector + full-text search and synthesizes an answer with explicit source citations.',
      'Up to 90% of net platform revenue (after infrastructure costs) is distributed proportionally to the creators whose articles actually grounded those answers.',
    ],
  },
  {
    slug: 'how-rag-pays-creators',
    date: 'November 2026',
    category: 'Technology',
    title: 'How RAG-Based Attribution Pays the Right People',
    excerpt:
      "Every AI-generated answer cites a source. We track those citations and distribute revenue proportionally. Here's the math.",
    paragraphs: [
      'When VeraLM answers a query, the retrieval pipeline scores candidate chunks using Reciprocal Rank Fusion (RRF) across pgvector cosine similarity and PostgreSQL full-text search.',
      'Each cited article receives a normalized contribution weight recorded in article_usage_events. At month-end, net revenue (gross subscription + ad revenue minus server costs, less a 10% platform fee) is allocated in proportion to each creator’s verified query contributions.',
      'Creators can inspect their citation counts, per-article earnings, and payout distribution history directly from Creator Studio.',
    ],
  },
  {
    slug: 'quality-over-volume',
    date: 'October 2026',
    category: 'Editorial',
    title: 'Quality Over Volume: Why We Reject 70% of Submissions',
    excerpt:
      'Our three-stage verification process — automated checks, originality scoring, and human expert review — ensures only the best content enters the vault.',
    paragraphs: [
      'AI answers are only as reliable as the knowledge base behind them. Low-effort summaries and AI-generated filler degrade retrieval precision for everyone.',
      'Every submission to VeraLM passes through structural heuristics, duplicate detection against existing embeddings, AI-generation probability scoring, and human editorial review before entering the Knowledge Vault.',
    ],
  },
  {
    slug: 'creator-spotlight-alex-rivers',
    date: 'October 2026',
    category: 'Creator Spotlight',
    title: 'Creator Spotlight: Database Engineering at Scale',
    excerpt:
      'How specialized practitioners turn years of production debugging and architecture notes into recurring royalties on VeraLM.',
    paragraphs: [
      'Deep, production-tested engineering notes—such as tuning pgvector HNSW indexes or diagnosing connection pool saturation—are the hardest content to find and the most valuable to developers.',
      'On VeraLM, those detailed guides remain protected from external search scraping while earning royalties every time they help resolve a real engineering question.',
    ],
  },
];
