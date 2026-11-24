import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      // 1. General search engines (Google, Bing, Yahoo, DuckDuckGo)
      // Allowed to index public marketing, about, creator, and legal pages.
      // Strictly BLOCKED from accessing private knowledge vault articles.
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/categories',
          '/creators',
          '/creators/apply',
          '/leaderboard',
          '/pro',
          '/licensing',
          '/blog',
          '/contact',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/articles/',
          '/admin/',
          '/api/',
          '/auth/',
          '/creators/dashboard',
          '/creators/earnings',
          '/creators/analytics',
          '/creators/articles/',
        ],
      },
      // 2. Outside AI Scrapers & LLM Training Crawlers
      // Completely BLOCKED from scraping proprietary knowledge articles.
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
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
