'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { VeraLMLogo } from '@/components/veralm-logo';
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
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  HelpCircle,
  Crown,
  LogOut,
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
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ChatLoadingStatus } from '@/components/chat-loading-status';

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
  const { mode, toggleMode, user, logout } = useAccount();

  const [messages, setMessages] = useState<Message[]>([]);
  const [convs, setConvs] = useState<StoredConv[]>([]);
  const [currentId, setCurrentId] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
        const history = messages
          .filter((m) => m.content && !m.error)
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryText.trim(), session_id: sessionId, history }),
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
            <VeraLMLogo className="h-7 w-7 rounded-lg" size={28} />
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
                ? 'Contribute content to train and ground the VeraLM AI model, earning royalties.'
                : 'Frontier AI model trained and grounded on verified human creator knowledge.'}
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

        {/* Sidebar Upgrade to Pro CTA */}
        {!user.isPro && (
          <div className="px-3 pb-2 shrink-0">
            <Link
              href="/pro"
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">Upgrade to Pro</div>
                  <div className="text-[10px] opacity-80 truncate">Ad-free & full vault access</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                PRO
              </span>
            </Link>
          </div>
        )}

        {/* Footer Account Card with Hamburger Menu */}
        <div className="p-3 border-t border-border shrink-0 relative">
          {accountMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-1.5 z-30 space-y-0.5">
              <Link
                href="/search"
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Search</span>
              </Link>
              <Link
                href="/creators"
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors"
              >
                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                <span>For Creators</span>
              </Link>
              <Link
                href="/about"
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span>How It Works</span>
              </Link>
              {!user.isPro && (
                <Link
                  href="/pro"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span>Upgrade to Pro</span>
                </Link>
              )}
              <div className="my-1 border-t border-border" />
              {user.isLoggedIn ? (
                <>
                  <Link
                    href="/creators/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Account & Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors"
                  >
                    <LogIn className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Get Started</span>
                  </Link>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-lg p-1 -m-1 hover:bg-accent/60 transition-colors"
              aria-expanded={accountMenuOpen}
              aria-label="Open account menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                  <span className="truncate">{user.name || 'VeraLM User'}</span>
                  {user.isPro && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                      PRO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <span className="capitalize">{mode}</span> mode
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAccountMenuOpen((o) => !o)}
              className="shrink-0 p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Account navigation menu"
              title="Menu"
            >
              <Menu className="h-4 w-4" />
            </button>
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
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card/80 backdrop-blur text-xs font-medium">
              <VeraLMLogo className="h-3.5 w-3.5" size={14} />
              <span>VeraLM</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {!user.isPro && (
              <Link
                href="/pro"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Upgrade to Pro</span>
                <span className="sm:hidden">Pro</span>
              </Link>
            )}
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
                className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-primary transition-all"
                title={`Profile: ${user.name || user.email}`}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Link>
            )}
          </div>
        </header>

        {/* ── EMPTY STATE (Centered like ChatGPT) ── */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 pt-20 overflow-y-auto">
            <div className="w-full max-w-2xl text-center space-y-6">
              <div className="space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-2">
                  <VeraLMLogo className="h-12 w-12 rounded-2xl" size={48} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  VeraLM AI Model
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Trained and grounded directly on verified human creator publications. Pure model intelligence with zero hallucinations.
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
                    placeholder="Prompt the VeraLM AI Model…"
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
                        <div className="shrink-0 mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center">
                          <VeraLMLogo className="h-7 w-7 rounded-lg" size={28} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Loading state */}
                          {!msg.content && !msg.error && (
                            <ChatLoadingStatus />
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
                              <div className="text-sm leading-7 text-foreground">
                                <MarkdownRenderer content={msg.content} />
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
                                      {msg.response.was_cached ? 'cached' : `${msg.response.latency_ms}ms`}
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
                                            href={art.url || `/articles/${art.slug || art.article_id}`}
                                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors"
                                          >
                                            <BookOpen className="h-3.5 w-3.5" />
                                            Read Full Article
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Quick Read Full Article CTA Bar */}
                              {msg.response && msg.response.articles_used.length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {msg.response.articles_used.slice(0, 2).map((art) => (
                                    <Link
                                      key={`cta-${art.article_id}`}
                                      href={art.url || `/articles/${art.slug || art.article_id}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-semibold text-primary transition-colors"
                                    >
                                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate max-w-[220px]">
                                        Read Full Article: {art.title}
                                      </span>
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                    </Link>
                                  ))}
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
