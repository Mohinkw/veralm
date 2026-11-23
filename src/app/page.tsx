'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PenSquare,
  Sparkles,
  BookOpen,
  Users,
  Compass,
  Plus,
  ArrowUp,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Menu,
  Loader2,
  DollarSign,
  MessageSquare,
  LayoutDashboard,
  FilePlus,
  FileText,
  TrendingUp,
  LogIn,
  UserCheck,
  User,
  ArrowLeftRight,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAccount } from '@/lib/account-context';

/* ─── Types ─────────────────────────────────────────────── */
interface Citation {
  article_id: string;
  article_title: string;
  slug?: string;
  author_name: string;
  approved_at: string;
  freshness_status: string;
  excerpt: string;
}
interface ArticleUsed {
  article_id: string;
  title: string;
  slug: string;
  url: string;
  author_slug: string;
  author_name: string;
  approved_at: string;
  freshness_status: string;
  excerpt?: string;
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
interface StoredConv {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

/* ─── Persistence ─────────────────────────────────────────── */
function loadConvs(): StoredConv[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('veralm_chats') || '[]');
  } catch {
    return [];
  }
}
function saveConvs(convs: StoredConv[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('veralm_chats', JSON.stringify(convs.slice(0, 60)));
}

/* ─── Prompt suggestions ──────────────────────────────────── */
const SUGGESTIONS = [
  { icon: Sparkles,   label: 'Latest AI Architecture', query: 'Explain the latest architectures in enterprise RAG and vector retrieval' },
  { icon: BookOpen,   label: 'PostgreSQL Optimization', query: 'How to optimize PostgreSQL for vector search at scale with HNSW?' },
  { icon: PenSquare,  label: 'Write or summarize',      query: 'Draft a concise executive briefing on AI model monetization for creators' },
];

/* ─── Freshness badge ─────────────────────────────────────── */
function freshnessColor(s: string) {
  return s === 'current'
    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
    : s === 'aging'
    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
    : s === 'outdated'
    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
}

/* ═══════════════════════════════════════════════════════════
   MAIN CHATBOT PAGE
════════════════════════════════════════════════════════════ */
export default function AIChatPage() {
  const { mode, toggleMode, user } = useAccount();

  const [messages, setMessages] = useState<Message[]>([]);
  const [convs, setConvs] = useState<StoredConv[]>([]);
  const [currentId, setCurrentId] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionId] = useState(() => crypto.randomUUID());

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load stored convs on mount
  useEffect(() => {
    setConvs(loadConvs());
    setCurrentId(crypto.randomUUID());

    // Check URL query param e.g. /?q=...
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setTimeout(() => ask(q), 300);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Adjust textarea height without unmounting
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  };

  // Persist conversation
  useEffect(() => {
    if (!messages.length || !currentId) return;
    const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '…' : '');
    const conv: StoredConv = {
      id: currentId,
      title,
      messages: messages.map(m => ({ ...m, copied: false })),
      updatedAt: new Date().toISOString(),
    };
    setConvs(prev => {
      const updated = [conv, ...prev.filter(c => c.id !== currentId)];
      saveConvs(updated);
      return updated;
    });
  }, [messages, currentId]);

  /* ── Send Prompt ── */
  const ask = useCallback(
    async (queryText: string) => {
      if (!queryText.trim() || loading) return;
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const userId = crypto.randomUUID();
      const asstId = crypto.randomUUID();

      setMessages(prev => [
        ...prev,
        { id: userId, role: 'user', content: queryText },
        { id: asstId, role: 'assistant', content: '', sourcesOpen: false },
      ]);
      setLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryText.trim(), session_id: sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate response');

        setMessages(prev =>
          prev.map(m =>
            m.id === asstId ? { ...m, content: data.answer, response: data } : m
          )
        );
      } catch (err: any) {
        setMessages(prev =>
          prev.map(m =>
            m.id === asstId
              ? { ...m, error: err?.message || 'Something went wrong while generating response.' }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId]
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

  const newChat = () => {
    setMessages([]);
    setInput('');
    setCurrentId(crypto.randomUUID());
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const loadConv = (c: StoredConv) => {
    setMessages(c.messages);
    setCurrentId(c.id);
  };

  const sendFeedback = async (queryId: string, msgId: string, rating: 1 | -1) => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, feedback: rating } : m)));
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
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, copied: true } : m)));
    setTimeout(
      () => setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, copied: false } : m))),
      2000
    );
  };

  const toggleSources = (msgId: string) =>
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, sourcesOpen: !m.sourcesOpen } : m))
    );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ════════════ SIDEBAR ════════════ */}
      <aside
        className={cn(
          'flex flex-col shrink-0 overflow-hidden transition-all duration-200 border-r border-border',
          'bg-card dark:bg-[#171717]',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-base tracking-tight">VeraLM</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={newChat}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="New Chat"
              aria-label="New Chat"
            >
              <PenSquare className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* New chat action button */}
        <div className="px-2 pb-2 shrink-0">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-accent text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Account Mode Switcher Banner */}
        <div className="px-2 pb-2 shrink-0">
          <div className="p-2.5 rounded-xl bg-accent/60 border border-border/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {mode === 'creator' ? (
                  <>
                    <DollarSign className="h-3.5 w-3.5 text-green-500" />
                    <span>Creator Mode</span>
                  </>
                ) : (
                  <>
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>User Mode</span>
                  </>
                )}
              </div>
              <button
                onClick={toggleMode}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                title="Switch mode"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Switch
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {mode === 'creator'
                ? 'Publish articles, view citations, and earn royalties from your data.'
                : 'Free AI chatbot with verified human knowledge.'}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="px-2 space-y-0.5 shrink-0">
          {mode === 'creator' ? (
            <>
              <Link
                href="/creators/dashboard"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <span>Creator Dashboard</span>
              </Link>
              <Link
                href="/creators/articles/new"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <FilePlus className="h-4 w-4 text-green-500" />
                <span>Submit New Article</span>
              </Link>
              <Link
                href="/creators/articles"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>My Articles</span>
              </Link>
              <Link
                href="/creators/earnings"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span>Royalties & Earnings</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/categories"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Compass className="h-4 w-4" />
                <span>Knowledge Vault</span>
              </Link>
              <Link
                href="/about"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                <span>How VeraLM Works</span>
              </Link>
            </>
          )}
        </nav>

        <div className="mx-3 my-2 border-t border-border shrink-0" />

        {/* Recent Chats Section */}
        <div className="px-3 pb-1 shrink-0 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recents
          </span>
          {convs.length > 0 && (
            <button
              onClick={() => {
                setConvs([]);
                localStorage.removeItem('veralm_chats');
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2 min-h-0">
          {convs.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No recent conversations</p>
          ) : (
            convs.map(c => (
              <button
                key={c.id}
                onClick={() => loadConv(c)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-xs truncate transition-colors flex items-center gap-2',
                  c.id === currentId
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <MessageSquare className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">{c.title}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer Account Card */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">
                {user.name || 'VeraLM User'}
              </div>
              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                <span className="capitalize">{mode}</span> mode
              </div>
            </div>
            {user.isLoggedIn ? (
              <button
                onClick={toggleMode}
                className="shrink-0 px-2.5 py-1 rounded-lg border border-border text-[11px] font-medium hover:bg-accent transition-colors"
                title="Switch mode"
              >
                {mode === 'creator' ? 'User' : 'Creator'}
              </button>
            ) : (
              <Link
                href="/register"
                className="shrink-0 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ════════════ MAIN CONTENT ════════════ */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background">
        {/* Floating Topbar */}
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card/80 backdrop-blur text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>VeraLM 2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Mode quick switch */}
            <button
              onClick={toggleMode}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                mode === 'creator'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
                  : 'bg-accent/80 text-foreground border-border hover:bg-accent'
              )}
            >
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <span>{mode === 'creator' ? 'Creator Mode' : 'Earn from Data'}</span>
            </button>

            <ThemeToggle />

            {!user.isLoggedIn ? (
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Create Account</span>
              </Link>
            ) : (
              <Link
                href="/creators/profile"
                className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Profile"
              >
                <User className="h-4 w-4" />
              </Link>
            )}
          </div>
        </header>

        {/* ── EMPTY STATE (Centered like ChatGPT) ── */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 pt-20 overflow-y-auto">
            <div className="w-full max-w-2xl text-center space-y-6">
              <div className="space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  What's on the agenda today?
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ask anything—I provide direct, verified answers powered by expert creator knowledge.
                </p>
              </div>

              {/* Directly inlined Prompt Input Box (Fixes textarea unmounting bug) */}
              <form
                onSubmit={handleSubmit}
                className="w-full rounded-2xl border border-border bg-card p-3 shadow-md focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all text-left"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Ask VeraLM anything…"
                    disabled={loading}
                    className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed max-h-[200px] overflow-y-auto disabled:opacity-50 py-1"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      aria-label="Voice input"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      aria-label="Send prompt"
                      className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Prompt Suggestion Chips */}
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {SUGGESTIONS.map(({ icon: Icon, label, query }) => (
                  <button
                    key={label}
                    onClick={() => ask(query)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Free AI Chatbot</span>
                <span>•</span>
                <span>Real Human Knowledge</span>
                <span>•</span>
                <Link href="/creators/apply" className="text-primary hover:underline">
                  Earn Royalties as Creator →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── CONVERSATION ACTIVE STATE ── */}
        {!isEmpty && (
          <>
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto pt-16 pb-4">
              <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
                {messages.map(msg => (
                  <div key={msg.id}>
                    {/* User Message */}
                    {msg.role === 'user' && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm leading-relaxed shadow-sm">
                          {msg.content}
                        </div>
                      </div>
                    )}

                    {/* Assistant Message */}
                    {msg.role === 'assistant' && (
                      <div className="flex gap-3">
                        <div className="shrink-0 mt-0.5 h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Loading state */}
                          {!msg.content && !msg.error && (
                            <div className="space-y-2 mt-1">
                              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                              <div className="h-4 w-full rounded bg-muted animate-pulse" />
                              <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                            </div>
                          )}

                          {/* Error state */}
                          {msg.error && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">
                              {msg.error}
                            </div>
                          )}

                          {/* Response Content */}
                          {msg.content && (
                            <>
                              <div className="text-sm leading-7 text-foreground whitespace-pre-wrap">
                                {msg.content}
                              </div>

                              {/* Action Bar */}
                              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                                <button
                                  onClick={() => copyText(msg.content, msg.id)}
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors',
                                    msg.copied
                                      ? 'text-green-600 dark:text-green-400 font-medium'
                                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                  )}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>{msg.copied ? 'Copied' : 'Copy'}</span>
                                </button>

                                {msg.response && (
                                  <>
                                    <button
                                      onClick={() => sendFeedback(msg.response!.query_id, msg.id, 1)}
                                      className={cn(
                                        'p-1.5 rounded-lg text-xs transition-colors',
                                        msg.feedback === 1
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                      )}
                                      title="Helpful"
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => sendFeedback(msg.response!.query_id, msg.id, -1)}
                                      className={cn(
                                        'p-1.5 rounded-lg text-xs transition-colors',
                                        msg.feedback === -1
                                          ? 'text-red-500'
                                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                      )}
                                      title="Not helpful"
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5" />
                                    </button>

                                    <span className="ml-auto text-[11px] text-muted-foreground">
                                      {msg.response.was_cached ? '⚡ cached' : `${msg.response.latency_ms}ms`}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Sources Collapsible */}
                              {msg.response && msg.response.articles_used.length > 0 && (
                                <div className="mt-4 rounded-xl border border-border bg-card/60 overflow-hidden">
                                  <button
                                    onClick={() => toggleSources(msg.id)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-accent/40 hover:bg-accent transition-colors text-xs font-semibold"
                                  >
                                    <span className="flex items-center gap-2 text-foreground">
                                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                                      {msg.response.articles_used.length} Verified Knowledge Source
                                      {msg.response.articles_used.length !== 1 ? 's' : ''}
                                    </span>
                                    {msg.sourcesOpen ? (
                                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </button>

                                  {msg.sourcesOpen && (
                                    <div className="divide-y divide-border">
                                      {msg.response.articles_used.map((art, i) => (
                                        <div
                                          key={art.article_id}
                                          className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-accent/30 transition-colors"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs font-bold text-primary">
                                                [{i + 1}]
                                              </span>
                                              <span className="text-xs font-semibold truncate text-foreground">
                                                {art.title}
                                              </span>
                                              <span
                                                className={cn(
                                                  'px-1.5 py-0.5 text-[10px] rounded font-medium',
                                                  freshnessColor(art.freshness_status)
                                                )}
                                              >
                                                {art.freshness_status}
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                              By {art.author_name} &bull; {formatRelativeTime(art.approved_at)}
                                            </p>
                                          </div>
                                          <Link
                                            href={`/articles/${art.slug || art.article_id}`}
                                            className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                            View Source
                                          </Link>
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
            </div>

            {/* Fixed Bottom Input Bar */}
            <div className="px-4 pb-4 bg-background/95 backdrop-blur">
              <div className="max-w-3xl mx-auto space-y-2">
                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-border bg-card p-3 shadow-md focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all text-left"
                >
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder="Ask VeraLM anything…"
                      disabled={loading}
                      className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed max-h-[200px] overflow-y-auto disabled:opacity-50 py-1"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        aria-label="Voice input"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        aria-label="Send prompt"
                        className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="flex items-center justify-between px-2 text-[11px] text-muted-foreground">
                  <button
                    onClick={newChat}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    New chat
                  </button>
                  <span>
                    VeraLM delivers grounded answers.{' '}
                    <Link href="/creators/apply" className="text-primary hover:underline">
                      Earn as creator →
                    </Link>
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
