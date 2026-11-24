import { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, creatorProfiles } from '@/db/schema';
import { getSiteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/creators`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/pro`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/creators/apply`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/licensing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Dynamically emit public Category Hubs and Creator Authority Profiles
  // Proprietary /articles/* remain excluded to preserve knowledge exclusivity.
  try {
    const [activeCategories, activeCreators] = await Promise.all([
      db
        .select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.isActive, true)),
      db
        .select({ slug: creatorProfiles.slug, updatedAt: creatorProfiles.updatedAt })
        .from(creatorProfiles)
        .where(eq(creatorProfiles.isActive, true)),
    ]);

    const categoryEntries: MetadataRoute.Sitemap = activeCategories.map((c) => ({
      url: `${baseUrl}/categories/${c.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    }));

    const creatorEntries: MetadataRoute.Sitemap = activeCreators.map((c) => ({
      url: `${baseUrl}/creators/${c.slug}`,
      lastModified: c.updatedAt || now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...categoryEntries, ...creatorEntries];
  } catch {
    return staticRoutes;
  }
}
