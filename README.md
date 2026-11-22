# VeraLM (`veralm.com`)

> **The AI Model with Real Human Answers & Creator Royalties**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

VeraLM is an AI chat and knowledge intelligence platform where answers are synthesized directly from actual, latest, human-verified expert content. Users access direct AI chat replies for free supported by non-intrusive sponsor ads, while expert bloggers and data providers earn up to 90% net royalties every time their knowledge powers an answer.

---

## 🌟 Key Features

- **Direct AI Chat with Ground Truth:** Answers synthesized using verified source excerpts from domain experts with citation attribution (`[1]`, `[2]`).
- **Hybrid Semantic Search (RAG):** Powered by PostgreSQL + `pgvector` HNSW indexes and BM25 full-text search with Reciprocal Rank Fusion (RRF).
- **Dual-Tier AI Engine:** Google Gemini (Primary) with automatic OpenAI (`gpt-4o-mini`) fallback.
- **Creator Royalty Flywheel:** Up to 90% net revenue (after AI inference and server expenses) is distributed to data providers based on real Q&A citations.
- **Automated Verification Pipeline:** Format checking, word count validation, and quality scoring before articles enter the knowledge vault.
- **Creator & Admin Dashboards:** Full visibility into query citations, per-article earnings, and payout histories via Stripe Connect.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, Server Actions, TypeScript)
- **Database:** Supabase PostgreSQL with `pgvector`
- **Styling:** Tailwind CSS + Radix UI / Lucide icons
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **LLM Synthesis:** Google Gemini 2.0 / OpenAI `gpt-4o-mini`
- **Email:** Resend
- **Payments:** Stripe Connect

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Mohinkw/veralm.git
cd veralm
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local` and add your API keys:
```bash
cp .env.example .env.local
```

### 4. Run database migrations
Execute the SQL migrations in `/supabase/migrations/` on your Supabase PostgreSQL instance:
```bash
# 001_initial_schema.sql
# 002_hybrid_search_function.sql
# 003_article_lifecycle.sql
# 004_enhanced_search.sql
# 005_creator_licensing.sql
```

### 5. Start the development server
```bash
npm run dev
```
Open [http://localhost:3005](http://localhost:3005) in your browser.

---

## 📄 License

Proprietary © 2026 VeraLM Inc. All rights reserved.
