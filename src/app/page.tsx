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
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Crown,
  LogOut,
  Loader2,
  DollarSign,
  MessageSquare,
  FileText,
  TrendingUp,
  LogIn,
  UserCheck,
  User,
  Share2,
  Layers,
  Check,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAccount } from '@/lib/account-context';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ChatLoadingStatus } from '@/components/chat-loading-status';
import type { SearchArticleUsed, SearchCitation } from '@/types';

/* ─── Types ─────────────────────────────────────────────── */
interface SearchResponse {
  answer: string;
  citations: SearchCitation[];
  articles_used: SearchArticleUsed[];
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
function chatStorageKey(userId?: string): string {
  return `veralm_chats_${userId || 'guest'}`;
}
function loadConvs(userId?: string): StoredConv[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(chatStorageKey(userId)) || '[]');
  } catch {
    return [];
  }
}
function saveConvs(convs: StoredConv[], userId?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(chatStorageKey(userId), JSON.stringify(convs.slice(0, 60)));
}

/* ─── Prompt suggestions ──────────────────────────────────── */
const SUGGESTIONS = [
  { icon: Sparkles,   label: 'Latest AI Architecture', query: 'Explain the latest architectures in enterprise RAG and vector retrieval' },
  { icon: BookOpen,   label: 'PostgreSQL Optimization', query: 'How to optimize PostgreSQL for vector search at scale with HNSW?' },
  { icon: PenSquare,  label: 'Write or summarize',      query: 'Draft a concise executive briefing on AI model monetization for creators' },
];

const FOCUS_PILLS: Array<{ slug: string | null; label: string }> = [
  { slug: null, label: 'All Experts' },
  { slug: 'technology', label: 'Technology' },
  { slug: 'personal-finance', label: 'Finance' },
  { slug: 'health-wellness', label: 'Health' },
  { slug: 'science', label: 'Science' },
  { slug: 'business', label: 'Business' },
  { slug: 'education', label: 'Education' },
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
  const { user, logout } = useAccount();

  const [messages, setMessages] = useState<Message[]>([]);
  const [convs, setConvs] = useState<StoredConv[]>([]);
  const [currentId, setCurrentId] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState('');
  const [deepMode, setDeepMode] = useState(false);
  const [sharedMap, setSharedMap] = useState<Record<string, string>>({});
  const [listening, setListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Load local convs + sync server conversations when signed in
  useEffect(() => {
    setConvs(loadConvs(user.id));
    if (!user.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch('/api/conversations', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (Array.isArray(data.conversations) && data.conversations.length > 0 && !cancelled) {
          setConvs((prev) => {
            const seen = new Set(data.conversations.map((c: StoredConv) => c.id));
            const merged = [...data.conversations, ...prev.filter((c) => !seen.has(c.id))].slice(0, 60);
            saveConvs(merged, user.id);
            return merged;
          });
        }
      } catch {
        // Non-fatal fallback to localStorage
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    setCurrentId(crypto.randomUUID());
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }

    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) setActiveCategory(cat);
    const q = params.get('q');
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (q) {
      timer = setTimeout(() => ask(q, cat), 250);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Persist conversation per user
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
      saveConvs(updated, user.id);
      return updated;
    });
  }, [messages, currentId, user.id]);

  /* ── Send Prompt ── */
  const ask = useCallback(
    async (queryText: string, categoryOverride?: string | null) => {
      if (!queryText.trim() || loading) return;
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const userId = crypto.randomUUID();
      const asstId = crypto.randomUUID();
      const priorHistory = messagesRef.current
        .filter((m) => m.content && !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages(prev => [
        ...prev,
        { id: userId, role: 'user', content: queryText },
        { id: asstId, role: 'assistant', content: '', sourcesOpen: false },
      ]);
      setLoading(true);
      setStreamStatus(deepMode ? 'Running deep hybrid search...' : 'Searching verified Knowledge Vault...');

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let accessToken: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              accessToken = session.access_token;
              headers['Authorization'] = `Bearer ${session.access_token}`;
            }
          } catch {
            // proceed unauthenticated
          }
        }

        const cat = categoryOverride !== undefined ? categoryOverride : activeCategory;
        const res = await fetch('/api/search?stream=1', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: queryText.trim(),
            session_id: sessionId,
            history: priorHistory,
            deep_mode: deepMode,
            stream: true,
            ...(cat ? { category: cat } : {}),
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        let finalPayload: SearchResponse | undefined;
        let finalText = '';

        if (contentType.includes('text/event-stream') && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split('\n\n');
            buffer = blocks.pop() || '';

            for (const block of blocks) {
              const lines = block.split('\n');
              let evName = 'message';
              let evData = '';
              for (const line of lines) {
                if (line.startsWith('event:')) evName = line.slice(6).trim();
                else if (line.startsWith('data:')) evData += line.slice(5).trim();
              }
              if (!evData) continue;
              const parsed = JSON.parse(evData);

              if (evName === 'status' && parsed.label) {
                setStreamStatus(parsed.label);
              } else if (evName === 'sources') {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === asstId
                      ? {
                          ...m,
                          response: {
                            answer: finalText,
                            citations: parsed.citations || [],
                            articles_used: parsed.articles_used || [],
                            latency_ms: 0,
                            was_cached: false,
                            query_id: '',
                          },
                        }
                      : m
                  )
                );
              } else if (evName === 'delta' && parsed.text) {
                finalText += parsed.text;
                setMessages(prev =>
                  prev.map(m => (m.id === asstId ? { ...m, content: finalText } : m))
                );
              } else if (evName === 'done') {
                finalText = parsed.answer || finalText;
                finalPayload = parsed as SearchResponse;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === asstId ? { ...m, content: finalText, response: finalPayload } : m
                  )
                );
              } else if (evName === 'error') {
                throw new Error(parsed.error || 'Failed to generate response');
              }
            }
          }
        } else {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to generate response');
          finalText = data.answer;
          finalPayload = data;
          setMessages(prev =>
            prev.map(m =>
              m.id === asstId ? { ...m, content: data.answer, response: data } : m
            )
          );
        }

        // Sync completed conversation to PostgreSQL when signed in
        if (accessToken && finalText && currentId) {
          const nextMsgs = [
            ...priorHistory.map((h, i) => ({ id: `h-${i}`, role: h.role, content: h.content })),
            { id: userId, role: 'user', content: queryText },
            { id: asstId, role: 'assistant', content: finalText, response: finalPayload },
          ];
          fetch('/api/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              id: currentId,
              title: (messagesRef.current[0]?.content || queryText).slice(0, 60),
              categorySlug: cat || null,
              messages: nextMsgs,
            }),
          }).catch(() => null);
        }
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
        setStreamStatus('');
      }
    },
    [loading, sessionId, activeCategory, deepMode, currentId]
  );

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (typeof SpeechRec !== 'function') {
      textareaRef.current?.focus();
      return;
    }
    const recognition = new (SpeechRec as new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    })();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript || '';
      if (text) {
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

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

  const sendFeedback = async (queryId: string | undefined, msgId: string, rating: 1 | -1) => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, feedback: rating } : m)));
    if (!queryId) return;
    try {
      await fetch('/api/search/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_id: queryId, session_id: sessionId, rating }),
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

  const shareAnswer = async (msg: Message, msgIndex: number) => {
    const prevUser = messages
      .slice(0, msgIndex)
      .reverse()
      .find((m) => m.role === 'user');
    const qText = prevUser?.content || 'VeraLM Verified Answer';
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: qText,
          answer: msg.content,
          citations: msg.response?.citations || [],
          articles_used: msg.response?.articles_used || [],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) return;
      const fullUrl = `${window.location.origin}${data.url}`;
      await navigator.clipboard.writeText(fullUrl).catch(() => null);
      setSharedMap((prev) => ({ ...prev, [msg.id]: data.url }));
      setTimeout(() => {
        setSharedMap((prev) => {
          const copy = { ...prev };
          delete copy[msg.id];
          return copy;
        });
      }, 3500);
    } catch {
      // ignore share failures
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground relative">
      {/* Mobile & Tablet Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ════════════ SIDEBAR ════════════ */}
      <aside
        className={cn(
          'flex flex-col shrink-0 transition-all duration-200 border-r border-border',
          'bg-card dark:bg-[#171717]',
          sidebarOpen
            ? 'fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] shadow-2xl overflow-visible lg:static lg:z-auto lg:w-64 lg:shadow-none'
            : 'w-0 overflow-hidden border-r-0'
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

        {/* Navigation list */}
        <nav className="px-2 space-y-0.5 shrink-0">
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
        </nav>

        <div className="mx-3 my-2 border-t border-border shrink-0" />

        {/* Recent Chats Section */}
        <div className="px-3 pb-1 shrink-0 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recents
          </span>
          {convs.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                setConvs([]);
                localStorage.removeItem(chatStorageKey(user.id));
                if (user.id) {
                  try {
                    const { supabase } = await import('@/lib/supabase');
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                      await fetch('/api/conversations?all=1', {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${session.access_token}` },
                      });
                    }
                  } catch {}
                }
              }}
              className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground"
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
            <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-1.5 z-50 space-y-0.5">
              <Link
                href={user.isLoggedIn ? '/creators/dashboard' : '/creators'}
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors"
              >
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span>Earn as a Creator</span>
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

              {/* Help submenu — hovers right on desktop, taps inline on mobile */}
              <div
                className="relative group/help"
                onMouseEnter={() => {
                  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                    setHelpMenuOpen(true);
                  }
                }}
                onMouseLeave={() => {
                  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                    setHelpMenuOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => setHelpMenuOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors"
                  aria-expanded={helpMenuOpen}
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Help</span>
                  </span>
                  <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform md:rotate-0', helpMenuOpen && 'rotate-90 md:rotate-0')} />
                </button>
                {helpMenuOpen && (
                  <div className="ml-4 pl-2 border-l border-border space-y-0.5 my-0.5 md:ml-0 md:border-l-0 md:my-0 md:absolute md:left-full md:bottom-0 md:pl-2 md:w-52 md:z-50">
                    <div className="md:rounded-xl md:border md:border-border md:bg-popover md:text-popover-foreground md:shadow-lg md:p-1.5 space-y-0.5">
                      {[
                        { href: '/about', label: 'Who We Are' },
                        { href: '/contact', label: 'Help Center' },
                        { href: '/privacy', label: 'Privacy Policy' },
                        { href: '/terms', label: 'Terms of Service' },
                        { href: '/licensing', label: 'Licensing' },
                        { href: '/blog', label: 'Release Notes & Blog' },
                        { href: '/careers', label: 'Careers' },
                      ].map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => {
                            setAccountMenuOpen(false);
                            setHelpMenuOpen(false);
                          }}
                          className="block px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="my-1 border-t border-border" />
              {user.isLoggedIn ? (
                <>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
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
                  <span>{user.isLoggedIn ? user.email : 'Guest Account'}</span>
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
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 sm:px-4 py-3 pointer-events-none gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
            <button
              type="button"
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
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card/80 backdrop-blur text-xs font-medium whitespace-nowrap">
              <VeraLMLogo className="h-3.5 w-3.5" size={14} />
              <span>VeraLM</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
            {!user.isPro && (
              <Link
                href="/pro"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
              >
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="hidden lg:inline">Upgrade to Pro</span>
                <span className="lg:hidden">Pro</span>
              </Link>
            )}
            {/* Earn as a Creator */}
            <Link
              href={user.isLoggedIn ? '/creators/dashboard' : '/creators'}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition-all bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 whitespace-nowrap"
            >
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden lg:inline">Earn as a Creator</span>
              <span className="lg:hidden">Earn</span>
            </Link>

            <ThemeToggle />

            {!user.isLoggedIn ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                <UserCheck className="h-3.5 w-3.5 hidden sm:inline" />
                <span>Sign In</span>
              </Link>
            ) : (
              <Link
                href="/creators/profile"
                className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-primary transition-all shrink-0"
                title={`Profile: ${user.name || user.email}`}
                aria-label="Account profile"
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
                    aria-label="Prompt VeraLM AI Model"
                    placeholder="Ask VeraLM anything…"
                    disabled={loading}
                    className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed max-h-[200px] overflow-y-auto disabled:opacity-50 py-1"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={cn(
                        'p-2 rounded-xl transition-colors',
                        listening
                          ? 'text-red-500 bg-red-500/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                      aria-label="Voice input"
                      title="Voice input"
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

              {/* Prompt Focus & Deep Synthesis Controls */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {FOCUS_PILLS.map((pill) => {
                  const active = activeCategory === pill.slug;
                  return (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => setActiveCategory(pill.slug)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {pill.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDeepMode((v) => !v)}
                  aria-pressed={deepMode}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                    deepMode
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Layers className="h-3 w-3" />
                  Deep Synthesis
                </button>
              </div>

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

              <div className="pt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Free AI Chatbot</span>
                <span aria-hidden="true">•</span>
                <span>Real Human Knowledge</span>
                <span aria-hidden="true">•</span>
                <Link href="/creators" className="text-primary hover:underline whitespace-nowrap">
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
                {messages.map((msg, msgIndex) => (
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
                            <div className="space-y-2">
                              {streamStatus && (
                                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>{streamStatus}</span>
                                </div>
                              )}
                              <ChatLoadingStatus />
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
                              <div className="text-sm leading-7 text-foreground">
                                <MarkdownRenderer
                                  content={msg.content}
                                  citations={msg.response?.citations}
                                />
                              </div>

                              {/* Action Bar */}
                              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => copyText(msg.content, msg.id)}
                                  aria-label="Copy response"
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

                                <button
                                  type="button"
                                  onClick={() => shareAnswer(msg, msgIndex)}
                                  aria-label="Share verified answer"
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors',
                                    sharedMap[msg.id]
                                      ? 'text-primary font-medium'
                                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                  )}
                                >
                                  {sharedMap[msg.id] ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <Share2 className="h-3.5 w-3.5" />
                                  )}
                                  <span>{sharedMap[msg.id] ? 'Link copied!' : 'Share'}</span>
                                </button>

                                {msg.response && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => sendFeedback(msg.response!.query_id, msg.id, 1)}
                                      className={cn(
                                        'p-1.5 rounded-lg text-xs transition-colors',
                                        msg.feedback === 1
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                      )}
                                      aria-label="Mark answer helpful"
                                      title="Helpful"
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => sendFeedback(msg.response!.query_id, msg.id, -1)}
                                      className={cn(
                                        'p-1.5 rounded-lg text-xs transition-colors',
                                        msg.feedback === -1
                                          ? 'text-red-500'
                                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                      )}
                                      aria-label="Mark answer not helpful"
                                      title="Not helpful"
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Sources Collapsible */}
                              {msg.response && msg.response.articles_used.length > 0 && (
                                <div className="mt-4 rounded-xl border border-border bg-card/60 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleSources(msg.id)}
                                    aria-expanded={Boolean(msg.sourcesOpen)}
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
                      aria-label="Ask VeraLM anything"
                      placeholder="Ask VeraLM anything…"
                      disabled={loading}
                      className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed max-h-[200px] overflow-y-auto disabled:opacity-50 py-1"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        className={cn(
                          'p-2 rounded-xl transition-colors',
                          listening
                            ? 'text-red-500 bg-red-500/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                        aria-label="Voice input"
                        title="Voice input"
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

                <div className="flex items-center justify-between gap-2 px-2 text-[11px] text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={newChat}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      New chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeepMode((v) => !v)}
                      aria-pressed={deepMode}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors',
                        deepMode ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'hover:text-foreground'
                      )}
                    >
                      <Layers className="h-3 w-3" />
                      Deep Synthesis {deepMode ? 'On' : 'Off'}
                    </button>
                  </div>
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
