'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { prepareMarkdownWithMath } from '@/lib/rag-utils';
import { cn, sanitizeHttpUrl } from '@/lib/utils';
import type { SearchCitation } from '@/types';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  citations?: SearchCitation[];
}

function CitationPill({ citation, num }: { citation: SearchCitation; num: number }) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hoverOpen || pinned;
  return (
    <span
      className="relative inline-block align-baseline mx-0.5"
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
    >
      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        aria-label={`Citation ${num}: ${citation.article_title}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.15rem] px-1 rounded-full bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold transition-colors align-super leading-none"
      >
        {num}
      </button>
      {open && (
        <span
          role="dialog"
          aria-label={`Source ${num}`}
          className="absolute z-50 left-0 bottom-full mb-1.5 w-72 sm:w-80 p-3 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl text-left block whitespace-normal"
        >
          <span className="flex items-center justify-between gap-2 text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Verified Source [{num}]
            </span>
            {citation.quality_score != null && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {citation.quality_score}/100
              </span>
            )}
          </span>
          <span className="block text-xs font-bold text-foreground line-clamp-2 mb-1">
            {citation.article_title}
          </span>
          <span className="block text-[11px] text-muted-foreground mb-2">
            By {citation.author_name}
            {citation.verified_domain ? ` · ${citation.verified_domain}` : ''}
          </span>
          {citation.excerpt && (
            <span className="block text-[11px] text-foreground/85 bg-muted/50 border border-border/60 rounded-lg p-2 line-clamp-3 mb-2 leading-relaxed">
              &ldquo;{citation.excerpt}&rdquo;
            </span>
          )}
          <Link
            href={citation.url}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            <span>Read passage in full article</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </span>
      )}
    </span>
  );
}

function renderInlineCitations(
  children: React.ReactNode,
  citations?: SearchCitation[]
): React.ReactNode {
  if (!citations || citations.length === 0) return children;
  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child;
    const parts = child.split(/(\[\d{1,2}\])/g);
    if (parts.length === 1) return child;
    return parts.map((part, idx) => {
      const m = part.match(/^\[(\d{1,2})\]$/);
      if (m) {
        const num = Number(m[1]);
        const cit = citations[num - 1];
        if (cit) {
          return <CitationPill key={`cit-${idx}-${num}`} citation={cit} num={num} />;
        }
      }
      return part;
    });
  });
}

export function MarkdownRenderer({ content, className, citations }: MarkdownRendererProps) {
  if (!content) return null;
  const normalizedContent = prepareMarkdownWithMath(content);

  return (
    <div className={cn('markdown-body text-foreground leading-relaxed break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground tracking-tight border-b border-border/40 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-2.5 text-foreground tracking-tight border-b border-border/30 pb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-3 mb-1.5 text-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3.5 leading-7 text-foreground/90 last:mb-0">
              {renderInlineCitations(children, citations)}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1.5 text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7 pl-1">{renderInlineCitations(children, citations)}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-foreground/95">{children}</em>,
          del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-3 italic text-muted-foreground bg-muted/20 rounded-r-lg">
              {renderInlineCitations(children, citations)}
            </blockquote>
          ),
          pre: ({ children }) => (
            <div className="relative my-3 rounded-xl overflow-hidden border border-border bg-muted/60">
              <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed">
                {children}
              </pre>
            </div>
          ),
          code: ({ className: codeClassName, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
            const rawText = String(children ?? '');
            const isBlock = Boolean(codeClassName) || rawText.includes('\n');
            if (isBlock) {
              return (
                <code className={cn('font-mono text-xs', codeClassName)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary font-medium border border-border/40"
                {...props}
              >
                {children}
              </code>
            );
          },
          hr: () => <hr className="my-6 border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border border-border rounded-xl">
              <table className="w-full text-left text-sm divide-y divide-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50 font-semibold">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-foreground/90">
              {renderInlineCitations(children, citations)}
            </td>
          ),
          img: ({ src, alt }) => {
            const safeSrc = sanitizeHttpUrl(typeof src === 'string' ? src : '');
            if (!safeSrc) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={safeSrc}
                alt={alt || 'Article visual'}
                loading="lazy"
                className="my-4 max-w-full h-auto rounded-xl border border-border"
              />
            );
          },
          a: ({ href, children }) => {
            const isRelative = href?.startsWith('/') || href?.startsWith('#');
            const safeHref = isRelative ? href : sanitizeHttpUrl(href);
            if (!safeHref) {
              return <span className="text-foreground underline decoration-dotted">{children}</span>;
            }
            const external = safeHref.startsWith('http');
            return (
              <a
                href={safeHref}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="text-primary underline decoration-primary/40 hover:decoration-primary font-medium transition-colors"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
