import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      // 1. General search engines & AI Search/Citation bots
      // Allowed to index public pages and the 50% public article previews on /articles/
      // so VeraLM articles can appear in Google, ChatGPT Search, and Perplexity citations.
      {
        userAgent: ['*', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot'],
        allow: [
          '/',
          '/about',
          '/articles/',
          '/categories',
          '/creators',
          '/pro',
          '/licensing',
          '/blog',
          '/contact',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/creators/dashboard',
          '/creators/earnings',
          '/creators/analytics',
          '/creators/articles/',
          '/creators/profile',
        ],
      },
      // 2. LLM Model-Training Crawlers
      // Strictly BLOCKED from scraping Knowledge Vault articles for base model training.
      {
        userAgent: [
          'GPTBot',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'cohere-ai',
          'Applebot-Extended',
          'Bytespider',
          'CCBot',
          'Diffbot',
          'FacebookBot',
          'omgili',
        ],
        disallow: ['/articles/', '/api/', '/admin/', '/creators/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
