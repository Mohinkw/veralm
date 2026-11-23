import { MetadataRoute } from 'next';
import { db } from '@/db/client';
import { articles } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEMO_SLUGS = [
  'optimising-postgresql-for-vector-search-at-scale',
  'rag-pipeline-best-practices',
  'choosing-the-right-llm-for-enterprise-applications',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veralm.com';

  // Core static marketing and product pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/creators`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/creators/apply`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/licensing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Dynamically index approved articles from DB (with fallback to demo articles)
  const articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const dbArticles = await db
      .select({
        slug: articles.slug,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.status, 'approved'))
      .limit(1000);

    if (dbArticles && dbArticles.length > 0) {
      for (const a of dbArticles) {
        articleRoutes.push({
          url: `${baseUrl}/articles/${a.slug}`,
          lastModified: a.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.85,
        });
      }
    }
  } catch (err) {
    console.warn('[sitemap] Failed to query articles from database, falling back to demo slugs', err);
  }

  // Fallback to demo articles if database query was empty or offline during static generation
  if (articleRoutes.length === 0) {
    for (const slug of DEMO_SLUGS) {
      articleRoutes.push({
        url: `${baseUrl}/articles/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  }

  return [...staticRoutes, ...articleRoutes];
}
