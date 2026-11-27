'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail, HelpCircle, Shield } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help Center &amp; Support</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Contact Us</h1>
          <p className="text-muted-foreground">
            Questions about creator payouts, VeraLM Pro billing, privacy requests, or DMCA notices?
            We&apos;re here to help.
          </p>
        </div>

        {/* Contact info */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            {
              label: 'General & Creator Support',
              desc: 'Accounts, articles, payouts & Pro billing',
              email: 'support@veralm.com',
              icon: Mail,
            },
            {
              label: 'Legal, Privacy & DMCA',
              desc: 'GDPR/CCPA requests, DSA & copyright notices',
              email: 'admin@veralm.com',
              icon: Shield,
            },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span>{c.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{c.desc}</p>
                <a
                  href={`mailto:${c.email}`}
                  className="text-primary hover:underline text-sm font-semibold"
                >
                  {c.email}
                </a>
              </div>
            );
          })}
        </div>

        {/* Form */}
        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center">
            <div className="mb-3 flex justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Message received!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Thank you for reaching out. Our team responds within 1–2 business days. For urgent
              account or legal matters, you can also email{' '}
              <a href="mailto:support@veralm.com" className="text-primary hover:underline">
                support@veralm.com
              </a>{' '}
              directly.
            </p>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Send another message
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4 shadow-sm"
          >
            <h2 className="text-xl font-bold mb-1">Send a message</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Name
                </label>
                <Input
                  required
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Subject
              </label>
              <select
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a topic…</option>
                <option>Creator Account &amp; Articles</option>
                <option>Billing &amp; Payouts</option>
                <option>VeraLM Pro Subscription</option>
                <option>Privacy / GDPR / CCPA Request</option>
                <option>Copyright / DMCA / DSA Notice</option>
                <option>Technical Support</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Message
              </label>
              <textarea
                required
                rows={5}
                placeholder="How can we help?"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit" size="lg" className="w-full">
              Send Message
            </Button>
          </form>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/about" className="hover:text-foreground">How VeraLM Works</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <span>•</span>
          <Link href="/licensing" className="hover:text-foreground">Creator Licensing</Link>
        </div>
      </main>
    </div>
  );
}
