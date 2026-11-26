import Link from "next/link";
import { Target, Globe, DollarSign } from "lucide-react";

export const metadata = {
  title: "Careers | VeraLM",
  description: "Join the VeraLM team and help build the future of verified AI knowledge.",
};

const roles = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Own the creator portal and AI search pipeline. TypeScript, Next.js, Supabase, pgvector. You'll write code that directly pays domain experts.",
  },
  {
    title: "ML Engineer — Embeddings & RAG",
    team: "AI",
    location: "Remote",
    type: "Full-time",
    description:
      "Design our hybrid retrieval pipeline, improve citation accuracy, and maintain embedding versioning. Experience with pgvector, LangChain or similar.",
  },
  {
    title: "Head of Creator Growth",
    team: "Creator Success",
    location: "Remote",
    type: "Full-time",
    description:
      "Recruit and onboard the first 500 expert creators. Build the playbook for creator success. Prior experience growing a creator or expert community.",
  },
  {
    title: "Content Quality Reviewer (Freelance)",
    team: "Editorial",
    location: "Remote",
    type: "Contract",
    description:
      "Review submitted articles for accuracy, depth, and expertise. We're hiring domain-specific reviewers across tech, finance, medicine, and law.",
  },
];

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <section className="border-b border-gray-800 py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">We&apos;re Hiring</span>
          <h1 className="text-4xl font-bold mt-3 mb-4">Build the future of verified AI knowledge</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            VeraLM is a small, mission-driven team. We believe the best AI answers should come from real experts — not
            scraped content. Join us.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-4xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-6">
        {[
          {
            icon: Target,
            title: "Mission-first",
            desc: "We work on hard problems that matter: ensuring expert knowledge is fairly valued in the AI era.",
          },
          {
            icon: Globe,
            title: "Fully remote",
            desc: "No offices. No commutes. Work from wherever you do your best thinking.",
          },
          {
            icon: DollarSign,
            title: "Competitive equity",
            desc: "Early employees share meaningfully in VeraLM's upside. Transparent salary bands.",
          },
        ].map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white mb-1">{v.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
            </div>
          );
        })}
      </section>

      {/* Roles */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold mb-6">Open Roles</h2>
        <div className="space-y-4">
          {roles.map((role) => (
            <div
              key={role.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-purple-700 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{role.title}</h3>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full">
                      {role.team}
                    </span>
                    <span className="text-xs text-gray-500">{role.location}</span>
                    <span className="text-xs text-gray-500">{role.type}</span>
                  </div>
                </div>
                <a
                  href={`mailto:admin@veralm.com?subject=Application: ${role.title}`}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0"
                >
                  Apply
                </a>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* General application */}
      <section className="bg-gray-900 border-t border-gray-800 py-12 text-center px-6">
        <h2 className="text-2xl font-bold mb-3">Don&apos;t see your role?</h2>
        <p className="text-gray-400 mb-6">
          We&apos;re always looking for exceptional people. Send us a note.
        </p>
        <a
          href="mailto:admin@veralm.com"
          className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-semibold"
        >
          admin@veralm.com
        </a>
      </section>
    </main>
  );
}
