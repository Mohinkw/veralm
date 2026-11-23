'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenSquare,
  Search as SearchIcon,
  Sparkles,
  BookOpen,
  Users,
  Library,
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
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

/* ─── Types ─────────────────────────────────────────────── */
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
interface StoredConv {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

/* ─── Persistence ─────────────────────────────────────────── */
function loadConvs(): StoredConv[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('veralm_chats') || '[]'); }
  catch { return []; }
}
function saveConvs(convs: StoredConv[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('veralm_chats', JSON.stringify(convs.slice(0, 60)));
}

/* ─── Sidebar nav items ───────────────────────────────────── */
const NAV_ITEMS = [
  { icon: BookOpen,  label: 'Articles',  href: '/articles' },
  { icon: Users,     label: 'Creators',  href: '/creators' },
  { icon: Library,   label: 'Library',   href: '/about' },
  { icon: Compass,   label: 'Explore',   href: '/categories' },
];

/* ─── Suggestion chips ────────────────────────────────────── */
const SUGGESTIONS = [
  { icon: BookOpen,     label: 'Find expert knowledge',  query: 'What are the latest insights on AI technology?' },
  { icon: PenSquare,    label: 'Write or summarize',      query: 'Summarize the key benefits of renewable energy' },
  { icon: SearchIcon,   label: 'Research a topic',        query: 'What is the current state of quantum computing?' },
];

/* ─── Freshness badge ─────────────────────────────────────── */
function freshnessColor(s: string) {
  return s === 'current'  ? 'bg-green-900/40 text-green-300 dark:bg-green-900/40 dark:text-green-300 bg-green-100 text-green-700'
       : s === 'aging'    ? 'bg-yellow-900/40 text-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 bg-yellow-100 text-yellow-700'
       : s === 'outdated' ? 'bg-red-900/40 text-red-300 dark:bg-red-900/40 dark:text-red-300 bg-red-100 text-red-700'
       : 'bg-orange-900/40 text-orange-300';
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [convs,        setConvs]        = useState<StoredConv[]>([]);
  const [currentId,    setCurrentId]    = useState('');
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [sessionId]                     = useState(() => crypto.randomUUID());

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* load stored convs on mount */
  useEffect(() => {
    setConvs(loadConvs());
    setCurrentId(crypto.randomUUID());
  }, []);

  /* scroll */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* textarea auto-resize */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  /* persist conversation */
  useEffect(() => {
    if (!messages.length || !currentId) return;
    const title = messages[0].content.slice(0, 55) + (messages[0].content.length > 55 ? '…' : '');
    const conv: StoredConv = { id: currentId, title, messages: messages.map(m => ({ ...m, copied: false })), updatedAt: new Date().toISOString() };
    setConvs(prev => {
      const updated = [conv, ...prev.filter(c => c.id !== currentId)];
      saveConvs(updated);
      return updated;
    });
  }, [messages, currentId]);

  /* ── send message ── */
  const ask = useCallback(async (query: string) => {
    if (!query.trim() || loading) return;
    setInput('');

    const userId = crypto.randomUUID();
    const asstId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user',      content: query },
      { id: asstId, role: 'assistant', content: '', sourcesOpen: false },
    ]);
    setLoading(true);

    try {
      const res  = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: data.answer, response: data } : m));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === asstId ? { ...m, error: err instanceof Error ? err.message : 'An error occurred' } : m));
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); ask(input); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); }
  };

  const newChat = () => { setMessages([]); setInput(''); setCurrentId(crypto.randomUUID()); };
  const loadConv = (c: StoredConv) => { setMessages(c.messages); setCurrentId(c.id); };

  const sendFeedback = async (queryId: string, msgId: string, rating: 1 | -1) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: rating } : m));
    try { await fetch('/api/search/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query_id: queryId, rating }) }); } catch {}
  };

  const copyText = async (text: string, msgId: string) => {
    await navigator.clipboard.writeText(text);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, copied: true } : m));
    setTimeout(() => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, copied: false } : m)), 2000);
  };

  const toggleSources = (msgId: string) =>
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, sourcesOpen: !m.sourcesOpen } : m));

  const isEmpty = messages.length === 0;

  /* ── Input form (reused in both states) ── */
  const InputForm = ({ wide }: { wide?: boolean }) => (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col rounded-2xl border transition-colors',
        'bg-[#2f2f2f] border-[#3f3f3f] focus-within:border-[#5a5a5a]',
        'dark:bg-[#2f2f2f] dark:border-[#3f3f3f] dark:focus-within:border-[#5a5a5a]',
        'light-input',
        wide ? 'w-full' : ''
      )}
    >
      <div className="flex items-end gap-2 px-3 py-3">
        <button
          type="button"
          className="shrink-0 p-1.5 rounded-full hover:bg-white/10 dark:hover:bg-white/10 hover:bg-black/10 transition-colors text-[#8e8e8e]"
          aria-label="Attach"
        >
          <Plus className="h-5 w-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask VeraLM…"
          disabled={loading}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed',
            'max-h-[200px] overflow-y-auto disabled:opacity-50',
            'text-[#ececec] placeholder:text-[#8e8e8e]',
            'dark:text-[#ececec] dark:placeholder:text-[#8e8e8e]',
            'light-textarea',
          )}
        />

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-white/10 dark:hover:bg-white/10 hover:bg-black/10 transition-colors text-[#8e8e8e]"
            aria-label="Voice"
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send"
            className="h-9 w-9 rounded-full bg-white dark:bg-white flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {loading
              ? <Loader2 className="h-4 w-4 text-black animate-spin" />
              : <ArrowUp className="h-4 w-4 text-black" />
            }
          </button>
        </div>
      </div>
    </form>
  );

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-screen overflow-hidden bg-[#212121] dark:bg-[#212121] text-[#ececec] dark:text-[#ececec]">

      {/* ══════ SIDEBAR ══════ */}
      <aside
        className={cn(
          'flex flex-col shrink-0 overflow-hidden transition-all duration-200',
          'bg-[#171717] dark:bg-[#171717]',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-sm text-white">VeraLM</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#8e8e8e] hover:text-white" aria-label="Search chats">
              <SearchIcon className="h-4 w-4" />
            </button>
            <button onClick={newChat} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#8e8e8e] hover:text-white" title="New chat">
              <PenSquare className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* New chat button */}
        <div className="px-2 pb-1 shrink-0">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#2d2d2d] hover:bg-[#3a3a3a] text-sm font-medium transition-colors text-white"
          >
            <Plus className="h-4 w-4 text-[#8e8e8e]" />
            New chat
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-2 py-1 space-y-0.5 shrink-0">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#c5c5c5] hover:bg-[#2d2d2d] hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4 text-[#8e8e8e]" />
              {label}
            </a>
          ))}
        </nav>

        <div className="mx-3 my-2 border-t border-[#2d2d2d] shrink-0" />

        {/* Categories */}
        <div className="px-4 pb-1 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e8e]">Categories</span>
        </div>
        <div className="px-4 pb-2 shrink-0">
          <span className="text-sm text-[#5a5a5a]">No categories</span>
        </div>

        {/* Recents */}
        <div className="px-4 pb-1 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e8e]">Recents</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2 min-h-0">
          {convs.length === 0
            ? <p className="px-3 py-2 text-sm text-[#5a5a5a]">No recent chats</p>
            : convs.map(c => (
              <button
                key={c.id}
                onClick={() => loadConv(c)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm truncate transition-colors',
                  c.id === currentId
                    ? 'bg-[#2d2d2d] text-white'
                    : 'text-[#c5c5c5] hover:bg-[#2d2d2d] hover:text-white'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 inline mr-2 text-[#8e8e8e]" />
                {c.title}
              </button>
            ))
          }
        </div>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-[#2d2d2d] shrink-0">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              V
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">VeraLM User</div>
              <div className="text-xs text-[#8e8e8e] truncate">Free</div>
            </div>
            <a
              href="/creators/apply"
              className="shrink-0 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Earn →
            </a>
          </div>
        </div>
      </aside>

      {/* ══════ MAIN ══════ */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        {/* Top bar (floating) */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pointer-events-none">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-colors text-[#8e8e8e] hover:text-white pointer-events-auto"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
            <ThemeToggle />
            <a
              href="/creators/apply"
              className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#4a4a4a] text-sm font-medium text-[#c5c5c5] hover:bg-white/10 hover:text-white transition-colors"
            >
              <DollarSign className="h-3.5 w-3.5 text-green-400" />
              Earn as Creator
            </a>
          </div>
        </div>

        {/* ── EMPTY STATE ── */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 pt-16">
            <h1 className="text-[#ececec] dark:text-[#ececec] text-3xl font-semibold mb-10 text-center">
              What's on your mind today?
            </h1>

            <div className="w-full max-w-2xl space-y-3">
              <InputForm wide />

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-start">
                {SUGGESTIONS.map(({ icon: Icon, label, query }) => (
                  <button
                    key={label}
                    onClick={() => ask(query)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2f2f2f] border border-[#3f3f3f] hover:bg-[#3a3a3a] hover:border-[#5a5a5a] text-sm text-[#c5c5c5] hover:text-white transition-colors"
                  >
                    <Icon className="h-4 w-4 text-[#8e8e8e]" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#5a5a5a] mt-6">
              Answers powered by verified human expertise &mdash;{' '}
              <a href="/creators/apply" className="text-blue-400 hover:underline">earn as a creator →</a>
            </p>
          </div>
        )}

        {/* ── CHAT STATE ── */}
        {!isEmpty && (
          <>
            {/* Scrollable messages */}
            <div className="flex-1 overflow-y-auto pt-16 pb-4">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map(msg => (
                  <div key={msg.id}>

                    {/* User bubble */}
                    {msg.role === 'user' && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#2f2f2f] px-5 py-3 text-sm leading-relaxed text-[#ececec]">
                          {msg.content}
                        </div>
                      </div>
                    )}

                    {/* Assistant bubble */}
                    {msg.role === 'assistant' && (
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="shrink-0 mt-1 h-8 w-8 rounded-full bg-[#2f2f2f] border border-[#3f3f3f] flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-blue-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Loading shimmer */}
                          {!msg.content && !msg.error && (
                            <div className="space-y-2 mt-1">
                              {[3, 4, 3.5].map((w, i) => (
                                <div key={i} className="h-4 rounded bg-[#2f2f2f] animate-pulse" style={{ width: `${w * 25}%` }} />
                              ))}
                            </div>
                          )}

                          {/* Error */}
                          {msg.error && (
                            <div className="text-sm text-red-400 bg-red-900/20 rounded-xl px-4 py-3 border border-red-900/40">
                              {msg.error}
                            </div>
                          )}

                          {/* Answer */}
                          {msg.content && (
                            <>
                              <div className="text-sm leading-7 text-[#ececec] whitespace-pre-wrap">
                                {msg.content}
                              </div>

                              {/* Action bar */}
                              <div className="flex items-center gap-1 mt-3 flex-wrap">
                                <button
                                  onClick={() => copyText(msg.content, msg.id)}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                                    msg.copied ? 'text-green-400' : 'text-[#8e8e8e] hover:bg-[#2f2f2f] hover:text-white'
                                  )}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  {msg.copied ? 'Copied!' : 'Copy'}
                                </button>

                                {msg.response && (
                                  <>
                                    <button
                                      onClick={() => sendFeedback(msg.response!.query_id, msg.id, 1)}
                                      className={cn('p-1.5 rounded-lg text-xs transition-colors', msg.feedback === 1 ? 'text-green-400' : 'text-[#8e8e8e] hover:bg-[#2f2f2f] hover:text-white')}
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => sendFeedback(msg.response!.query_id, msg.id, -1)}
                                      className={cn('p-1.5 rounded-lg text-xs transition-colors', msg.feedback === -1 ? 'text-red-400' : 'text-[#8e8e8e] hover:bg-[#2f2f2f] hover:text-white')}
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="ml-auto text-xs text-[#5a5a5a]">
                                      {msg.response.was_cached ? '⚡ cached' : `${msg.response.latency_ms}ms`}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Sources */}
                              {msg.response && msg.response.articles_used.length > 0 && (
                                <div className="mt-4 rounded-xl border border-[#3f3f3f] overflow-hidden">
                                  <button
                                    onClick={() => toggleSources(msg.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-[#2a2a2a] hover:bg-[#333] transition-colors text-sm"
                                  >
                                    <span className="flex items-center gap-2 text-[#c5c5c5]">
                                      <Sparkles className="h-4 w-4 text-blue-400" />
                                      {msg.response.articles_used.length} Source{msg.response.articles_used.length !== 1 ? 's' : ''}
                                    </span>
                                    {msg.sourcesOpen
                                      ? <ChevronUp className="h-4 w-4 text-[#8e8e8e]" />
                                      : <ChevronDown className="h-4 w-4 text-[#8e8e8e]" />
                                    }
                                  </button>

                                  {msg.sourcesOpen && (
                                    <div className="divide-y divide-[#3f3f3f]">
                                      {msg.response.articles_used.map((art, i) => (
                                        <div key={art.article_id} className="flex items-start justify-between gap-4 px-4 py-3 bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs font-semibold text-blue-400">{i + 1}.</span>
                                              <span className="text-sm font-medium truncate text-[#ececec]">{art.title}</span>
                                              <span className={cn('px-1.5 py-0.5 text-xs rounded font-medium', freshnessColor(art.freshness_status))}>
                                                {art.freshness_status}
                                              </span>
                                            </div>
                                            <p className="text-xs text-[#8e8e8e] mt-0.5">
                                              By {art.author_name} &bull; {formatRelativeTime(art.approved_at)}
                                            </p>
                                          </div>
                                          <a
                                            href={`/articles/${art.author_slug}/${art.article_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
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
            </div>

            {/* Fixed bottom input */}
            <div className="px-4 pb-6">
              <div className="max-w-3xl mx-auto space-y-2">
                <InputForm wide />
                <div className="flex justify-center">
                  <button
                    onClick={newChat}
                    className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-white transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    New conversation
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
