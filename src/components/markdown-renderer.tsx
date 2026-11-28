'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { prepareMarkdownWithMath } from '@/lib/rag-utils';
import { cn, sanitizeHttpUrl } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
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
              {children}
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
          li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-foreground/95">{children}</em>,
          del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-3 italic text-muted-foreground bg-muted/20 rounded-r-lg">
              {children}
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
          td: ({ children }) => <td className="px-3 py-2 text-sm text-foreground/90">{children}</td>,
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
