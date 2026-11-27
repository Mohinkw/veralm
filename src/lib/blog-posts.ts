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
    slug: 'veralm-launch-release-notes',
    date: 'November 2026',
    category: 'Release Notes',
    title: 'VeraLM Launch Notes: Universal Account, Multi-Turn Chat & Global Payouts',
    excerpt:
      'One account across AI Chat, Knowledge Vault, VeraLM Pro, and Creator Studio — plus multi-turn conversation memory and 6 global payout methods.',
    paragraphs: [
      'Every VeraLM user now has a single universal account across the entire platform. Sign in once to chat with the AI, rate articles, manage your VeraLM Pro membership, or publish articles in Creator Studio.',
      'Our AI assistant now supports multi-turn follow-up questions with query resolution, intent-aware answer depth (concise for quick lookups, structured and detailed when you ask for explanations), and transparent source citations.',
      'Creators can configure payouts via Stripe Connect, Payoneer, Wise, PayPal, Bank Wire (IBAN/SWIFT), or USDC/USDT/BTC, with up to 90% of net platform revenue allocated to the Creator Royalty Pool.',
    ],
  },
  {
    slug: 'introducing-veralm',
    date: 'November 2026',
    category: 'Platform',
    title: 'Introducing VeraLM: Where Expert Knowledge Powers AI Answers',
    excerpt:
      "We built VeraLM to fix a broken incentive loop — AI gets smarter, creators get nothing. Here's how we're changing that.",
    paragraphs: [
      'Traditional AI assistants train on the open web without compensating the domain experts who write the original guides, benchmarks, and postmortems.',
      'VeraLM flips that model: vetted creators publish directly into a private, protected Knowledge Vault. Every time a user asks a question, VeraLM retrieves relevant passages via hybrid vector + full-text search and synthesizes an answer with explicit source citations.',
      'Up to 90% of net platform revenue (after infrastructure costs; 10% platform fee) is distributed proportionally to the creators whose articles actually grounded those answers.',
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
      'Each cited article receives a normalized contribution weight recorded in article usage events. At month-end, net revenue (gross subscription + ad revenue minus server costs, less a 10% platform fee) is allocated in proportion to each creator’s verified query contributions.',
      'Creators can inspect their citation counts, per-article earnings, and payout distribution history directly from Creator Studio.',
    ],
  },
  {
    slug: 'quality-over-volume',
    date: 'October 2026',
    category: 'Editorial',
    title: 'Quality Over Volume: Automated Screening & Human Review',
    excerpt:
      'Our multi-stage verification process — structural checks, originality scoring, and editorial review — keeps the Knowledge Vault trustworthy.',
    paragraphs: [
      'AI answers are only as reliable as the knowledge base behind them. Low-effort summaries and generic filler degrade retrieval precision for everyone.',
      'Every submission to VeraLM passes through structural heuristics, duplicate detection against existing embeddings, originality & AI-risk scoring, and editorial review before entering the Knowledge Vault.',
    ],
  },
];
