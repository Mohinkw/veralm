"use client";
import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In production: POST to /api/contact (Resend)
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-blue-400 hover:underline text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
        <p className="text-gray-400 mb-10">
          Questions about becoming a creator, billing, or the platform? We&apos;re here to help.
        </p>

        {/* Contact info */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            { label: "General", email: "hello@veralm.com" },
            { label: "Creator Support", email: "creators@veralm.com" },
            { label: "Legal / Privacy", email: "legal@veralm.com" },
            { label: "Press", email: "press@veralm.com" },
          ].map((c) => (
            <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">{c.label}</div>
              <a href={`mailto:${c.email}`} className="text-blue-400 hover:underline text-sm">
                {c.email}
              </a>
            </div>
          ))}
        </div>

        {/* Form */}
        {submitted ? (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-green-300 mb-2">Message received!</h2>
            <p className="text-gray-400">We&apos;ll get back to you within 1–2 business days.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-4"
          >
            <h2 className="text-xl font-bold mb-2">Send a message</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Subject</label>
              <select
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select a topic…</option>
                <option>Creator Application</option>
                <option>Billing & Payouts</option>
                <option>Content / Article Issue</option>
                <option>Technical Support</option>
                <option>Partnership</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
