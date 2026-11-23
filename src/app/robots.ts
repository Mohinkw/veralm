import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veralm.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/categories', '/creators', '/articles/', '/blog', '/contact', '/privacy', '/terms'],
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/creators/dashboard',
          '/creators/earnings',
          '/creators/analytics',
          '/creators/articles/new',
        ],
      },
      // Explicit allowance for AI Search Crawlers & LLM aggregators
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
          'cohere-ai',
          'Applebot-Extended',
          'Bingbot',
        ],
        allow: ['/', '/articles/', '/about', '/categories', '/creators'],
        disallow: ['/admin/', '/api/', '/creators/dashboard', '/creators/earnings'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
