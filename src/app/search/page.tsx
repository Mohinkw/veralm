'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  Sparkles,
  ExternalLink,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { CreatorFab } from '@/components/creator-fab';

interface Citation {
  article_id: string;
  article_title: string;
  author_name: string;
  approved_at: string;
  freshness_status: string;
  excerpt: string;
}

interface ArticleUsed {
  article_id: string;
  title: string;
  author_slug: string;
  author_name: string;
  approved_at: string;
  freshness_status: string;
}

interface SearchResponse {
  answer: string;
  citations: Citation[];
  articles_used: ArticleUsed[];
  latency_ms: number;
  was_cached: boolean;
  query_id: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: SearchResponse;
  error?: string;
  feedback?: 1 | -1;
  copied?: boolean;
  sourcesOpen?: boolean;
}

const SUGGESTED = [
  'Best budget camera for video 2026?',
  'Roth IRA vs 401k for young professionals',
  'How to optimize React re-renders',
  'Best hiking trails in Colorado',
  'Python async/await patterns explained',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const ask = useCallback(
    async (query: string) => {
      if (!query.trim() || loading) return;
      setInput('');

      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: query };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', sourcesOpen: false };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim(), session_id: sessionId }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Search failed');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.answer, response: data }
              : m
          )
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, error: err instanceof Error ? err.message : 'An error occurred' }
              : m
          )
        );
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    },
    [loading, sessionId, scrollToBottom]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  const sendFeedback = async (queryId: string, msgId: string, rating: 1 | -1) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: rating } : m))
    );
    try {
      await fetch('/api/search/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_id: queryId, rating }),
      });
    } catch {}
  };

  const copyText = async (text: string, msgId: string) => {
    await navigator.clipboard.writeText(text);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, copied: true } : m))
    );
    setTimeout(
      () =>
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, copied: false } : m))
        ),
      2000
    );
  };

  const toggleSources = (msgId: string) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, sourcesOpen: !m.sourcesOpen } : m))
    );

  const freshnessColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'aging':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'outdated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
      default:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar activePage="search" />

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto">
        {/* Welcome / empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">How can I help you?</h1>
            <p className="text-muted-foreground max-w-sm mb-10">
              Ask anything — I answer using real, verified human knowledge from expert creators.
            </p>
            <div className="grid gap-2 w-full max-w-xl">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 transition-all text-sm text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {!isEmpty && (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {/* User bubble */}
                {msg.role === 'user' && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-5 py-3 text-sm leading-relaxed shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                )}

                {/* Assistant bubble */}
                {msg.role === 'assistant' && (
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1 h-8 w-8 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Loading shimmer */}
                      {!msg.content && !msg.error && (
                        <div className="space-y-2 mt-1">
                          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                          <div className="h-4 w-full rounded bg-muted animate-pulse" />
                          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                        </div>
                      )}

                      {/* Error */}
                      {msg.error && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">
                          {msg.error}
                        </div>
                      )}

                      {/* Answer */}
                      {msg.content && (
                        <>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>

                          {/* Action bar */}
                          <div className="flex items-center gap-1 mt-3 flex-wrap">
                            {/* Copy */}
                            <button
                              onClick={() => copyText(msg.content, msg.id)}
                              title="Copy answer"
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                                msg.copied
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                              )}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {msg.copied ? 'Copied!' : 'Copy'}
                            </button>

                            {/* Thumbs */}
                            {msg.response && (
                              <>
                                <button
                                  onClick={() => sendFeedback(msg.response!.query_id, msg.id, 1)}
                                  title="Good answer"
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                                    msg.feedback === 1
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                  )}
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => sendFeedback(msg.response!.query_id, msg.id, -1)}
                                  title="Bad answer"
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                                    msg.feedback === -1
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                  )}
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}

                            {/* Latency badge */}
                            {msg.response && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {msg.response.was_cached ? '⚡ cached' : `${msg.response.latency_ms}ms`}
                              </span>
                            )}
                          </div>

                          {/* Sources collapsible */}
                          {msg.response && msg.response.articles_used.length > 0 && (
                            <div className="mt-4 rounded-xl border border-border overflow-hidden">
                              <button
                                onClick={() => toggleSources(msg.id)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium"
                              >
                                <span className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  {msg.response.articles_used.length} Source
                                  {msg.response.articles_used.length !== 1 ? 's' : ''}
                                </span>
                                {msg.sourcesOpen ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>

                              {msg.sourcesOpen && (
                                <div className="divide-y divide-border">
                                  {msg.response.articles_used.map((art, i) => (
                                    <div
                                      key={art.article_id}
                                      className="flex items-start justify-between gap-4 px-4 py-3 bg-background hover:bg-accent/40 transition-colors"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-semibold text-primary">
                                            {i + 1}.
                                          </span>
                                          <span className="text-sm font-medium truncate">
                                            {art.title}
                                          </span>
                                          <span
                                            className={cn(
                                              'px-1.5 py-0.5 text-xs rounded font-medium',
                                              freshnessColor(art.freshness_status)
                                            )}
                                          >
                                            {art.freshness_status}
                                          </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          By {art.author_name} &bull; {formatRelativeTime(art.approved_at)}
                                        </p>
                                      </div>
                                      <a
                                        href={`/articles/${art.author_slug}/${art.article_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        View
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Input bar */}
      <div className="border-t border-border bg-background/95 backdrop-blur p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/40 transition-shadow"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask anything…"
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed max-h-[200px] overflow-y-auto disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send"
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        {!isEmpty && (
          <div className="max-w-3xl mx-auto mt-2 flex justify-center">
            <button
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              New conversation
            </button>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground mt-2">
          Answers powered by verified human expertise.{' '}
          <a href="/creators/apply" className="text-primary hover:underline">
            Earn as a creator →
          </a>
        </p>
      </div>

      <CreatorFab />
    </div>
  );
}
