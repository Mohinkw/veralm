'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={cn('markdown-body text-foreground leading-relaxed', className)}>
      <ReactMarkdown
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
          li: ({ children }) => (
            <li className="leading-7 pl-1">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/95">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-3 italic text-muted-foreground bg-muted/20 rounded-r-lg">
              {children}
            </blockquote>
          ),
          code: ({ inline, className: codeClassName, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className={cn(
                    'bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary font-medium border border-border/40',
                    codeClassName
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="relative my-3 rounded-xl overflow-hidden border border-border bg-muted/60">
                <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed">
                  <code {...props}>{children}</code>
                </pre>
              </div>
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
          th: ({ children }) => <th className="px-3 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-sm text-foreground/90">{children}</td>,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-primary underline decoration-primary/40 hover:decoration-primary font-medium transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
