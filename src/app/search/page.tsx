'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, Sparkles, ExternalLink, Copy, ThumbsUp, ThumbsDown, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatRelativeTime } from '@/lib/utils';

interface Citation {
  article_id: string;
  article_title: string;
  author_name: string;
  approved_at: string;
  freshness_status: string;
  excerpt: string;
}

interface SearchResponse {
  answer: string;
  citations: Citation[];
  articles_used: Array<{
    article_id: string;
    title: string;
    author_slug: string;
    author_name: string;
    approved_at: string;
    freshness_status: string;
  }>;
  latency_ms: number;
  was_cached: boolean;
  query_id: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), session_id: sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (queryId: string, rating: 1 | -1) => {
    try {
      const result = await fetch('/api/search/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_id: queryId, rating }),
      });
      if (!result.ok) throw new Error('Unable to record feedback');
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  const copyAnswer = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.answer);
  };

  const suggestedQueries = [
    'Best budget camera for video 2026?',
    'Roth IRA vs 401k for young professionals',
    'How to optimize React re-renders',
    'Best hiking trails in Colorado',
    'Python async/await patterns explained',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>VeraLM</span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/search" className="text-sm font-medium text-primary">Search</a>
            <a href="/creators" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">For Creators</a>
            <a href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</a>
            <a href="/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Search Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Search Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>The AI Model with Real Human Truth</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">Ask the Grounded AI Model</h1>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">
                Direct AI chat replies synthesized from actual, latest, human-verified knowledge. 
                Free to ask via non-intrusive ads that pay royalties directly to expert data providers.
              </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question... e.g., How do I optimize PostgreSQL for vector search?"
                  className="w-full min-h-[60px] pl-12 pr-12 py-4 text-lg border border-input bg-background rounded-xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={1}
                  disabled={isLoading}
                />
                {isLoading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                <Button type="submit" size="xl" disabled={isLoading || !query.trim()} className="w-full sm:w-auto">
                  {isLoading ? 'Synthesizing...' : 'Ask AI'}
                </Button>
              </div>
            </form>

            {/* Suggested Queries */}
            <div className="mb-10">
              <p className="text-sm text-muted-foreground mb-3 text-center">Try one of these:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      textareaRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background hover:bg-accent transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-8 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                {error}
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="space-y-6">
                {/* Answer */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="prose prose-lg max-w-none mb-6">
                    {response.answer.split('\n').map((paragraph, i) => (
                      <p key={i} className="whitespace-pre-wrap">{paragraph}</p>
                    ))}
                  </div>

                  {/* Sponsored Ad & Creator Royalty Notice */}
                  <div className="mb-4 p-3.5 rounded-lg bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                        Sponsored
                      </span>
                      <span className="text-muted-foreground">
                        Ad-supported free access • Viewers fund royalties for cited human creators
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-500 font-medium shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Creator Royalty Credited</span>
                    </div>
                  </div>

                  {/* Meta & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {response.was_cached ? 'Cached' : 'Generated'}
                      </span>
                      <span>{response.latency_ms}ms</span>
                      <span>{response.citations.length} source{response.citations.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={copyAnswer}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleFeedback(response.query_id, 1)}>
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Helpful
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleFeedback(response.query_id, -1)}>
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Not Helpful
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleFeedback(response.query_id, -1)}>
                        <Flag className="h-4 w-4 mr-1" />
                        Report
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sources */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Sources Used
                  </h3>
                  <div className="space-y-4">
                    {response.articles_used.map((article, index) => (
                      <article key={article.article_id} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-primary">{index + 1}.</span>
                              <h4 className="font-medium truncate">{article.title}</h4>
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded font-medium',
                                article.freshness_status === 'current' && 'bg-green-100 text-green-800',
                                article.freshness_status === 'aging' && 'bg-yellow-100 text-yellow-800',
                                article.freshness_status === 'outdated' && 'bg-red-100 text-red-800',
                                article.freshness_status === 'flagged' && 'bg-orange-100 text-orange-800',
                              )}>
                                {article.freshness_status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              By {article.author_name} • {formatRelativeTime(article.approved_at)}
                            </p>
                          </div>
                          <a
                            href={`/articles/${article.author_slug}/${article.article_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline flex-shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Article
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {/* Citations Detail */}
                {response.citations.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer p-4 rounded-lg border border-border bg-muted/50 flex items-center justify-between">
                      <span className="font-medium">View Detailed Citations ({response.citations.length})</span>
                      <span className="text-sm text-muted-foreground">Click to expand</span>
                    </summary>
                    <div className="mt-4 space-y-4 p-4 border-t border-border">
                      {response.citations.map((citation, index) => (
                        <div key={citation.article_id} className="p-4 rounded-lg bg-background border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-primary">{index + 1}.</span>
                            <span className="font-medium">{citation.article_title}</span>
                            <span className="text-sm text-muted-foreground">— {citation.author_name}, {formatRelativeTime(citation.approved_at)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-4">
                            "{citation.excerpt}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Empty State */}
            {!response && !isLoading && !error && (
              <div className="text-center py-16 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Enter a question above to get started</p>
                <p className="text-sm mt-2">Answers are generated from our verified knowledge base</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 VeraLM. Answers from verified expert articles. <a href="/creators/apply" className="text-primary hover:underline">Become a creator</a></p>
        </div>
      </footer>
    </div>
  );
}