import { inngest } from './client';
import { db } from '@/db/client';
import { articles, creatorEarnings, creatorProfiles, platformRevenue } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  calculateRevenueDistribution,
  type PostRevenueInput,
} from '@/lib/revenue/calculator';
import { fetchGa4ArticleRevenue } from '@/lib/revenue/ga4';

/**
 * Monthly revenue distribution cron (1st of each month at 05:00 UTC).
 * Safe no-op until GA4_PROPERTY_ID and revenue metrics are configured.
 *
 * Once GA4 + AdSense are linked, wire fetchGa4ArticleRevenue(period)
 * to pull { slug, views, adRevenue } from the Google Analytics Data API.
 */
export const syncMonthlyCreatorRevenue = inngest.createFunction(
  { id: 'sync-monthly-creator-revenue', triggers: [{ cron: '0 5 1 * *' }] },
  async ({ step }) => {
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
      return { status: 'skipped', reason: 'GA4_PROPERTY_ID not configured' };
    }

    const now = new Date();
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    const revenuePeriod = `${prevMonthStart.getUTCFullYear()}-${String(prevMonthStart.getUTCMonth() + 1).padStart(2, '0')}`;
    const startDate = prevMonthStart.toISOString().slice(0, 10);
    const endDate = prevMonthEnd.toISOString().slice(0, 10);

    const monthlyServerCost = Number(process.env.MONTHLY_SERVER_COST_USD || '45');

    const ga4Rows = await step.run('fetch-ga4-ad-revenue', async () => {
      return await fetchGa4ArticleRevenue({ propertyId, startDate, endDate });
    });

    if (ga4Rows.length === 0) {
      return { status: 'skipped', revenuePeriod, reason: 'No GA4 ad revenue rows returned' };
    }

    const distribution = await step.run('compute-and-persist-revenue', async () => {
      const dbArticles = await db
        .select({
          id: articles.id,
          slug: articles.slug,
          creatorId: articles.creatorId,
          totalQueryContributions: articles.totalQueryContributions,
          minimumPayout: creatorProfiles.minimumPayout,
        })
        .from(articles)
        .innerJoin(creatorProfiles, eq(articles.creatorId, creatorProfiles.id))
        .where(eq(articles.status, 'approved'));

      const bySlug = new Map(dbArticles.map((a) => [a.slug, a]));
      const inputs: PostRevenueInput[] = [];

      for (const row of ga4Rows) {
        const match = bySlug.get(row.slug);
        if (!match) continue;
        inputs.push({
          articleId: match.id,
          creatorId: match.creatorId,
          views: row.views,
          grossAdRevenue: row.adRevenue,
          queryContributions: match.totalQueryContributions,
          minimumPayout: Number(match.minimumPayout || '50'),
        });
      }

      const [existingPeriod] = await db
        .select({ subscriptionRevenue: platformRevenue.subscriptionRevenue })
        .from(platformRevenue)
        .where(eq(platformRevenue.revenuePeriod, revenuePeriod))
        .limit(1);
      const subscriptionRevenueUsd = Math.max(
        0,
        Number(existingPeriod?.subscriptionRevenue ?? 0) || 0
      );

      const result = calculateRevenueDistribution(inputs, monthlyServerCost, undefined, {
        subscriptionRevenueUsd,
      });
      const combinedGrossRevenue = result.totalGrossAdRevenue + result.totalSubscriptionApiRevenue;

      const [revRow] = await db
        .insert(platformRevenue)
        .values({
          revenuePeriod,
          subscriptionRevenue: result.totalSubscriptionApiRevenue.toFixed(4),
          adRevenue: result.totalGrossAdRevenue.toFixed(4),
          grossRevenue: combinedGrossRevenue.toFixed(4),
          infrastructureCost: result.totalServerCost.toFixed(4),
          creatorPool: result.totalCreatorPool.toFixed(4),
          creatorPoolPct: result.creatorPoolPct.toFixed(2),
          status: 'closed',
          closedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: platformRevenue.revenuePeriod,
          set: {
            subscriptionRevenue: result.totalSubscriptionApiRevenue.toFixed(4),
            adRevenue: result.totalGrossAdRevenue.toFixed(4),
            grossRevenue: combinedGrossRevenue.toFixed(4),
            infrastructureCost: result.totalServerCost.toFixed(4),
            creatorPool: result.totalCreatorPool.toFixed(4),
            creatorPoolPct: result.creatorPoolPct.toFixed(2),
            status: 'closed',
            closedAt: new Date(),
          },
        })
        .returning({ id: platformRevenue.id });

      for (const c of result.creators) {
        await db
          .insert(creatorEarnings)
          .values({
            creatorId: c.creatorId,
            revenuePeriod,
            platformRevenueId: revRow.id,
            totalQueryContributions: c.totalQueryContributions,
            contributionSharePct: c.sharePct.toFixed(4),
            creatorGrossEarnings: c.grossEarnings.toFixed(4),
            creatorNetEarnings: c.netEarnings.toFixed(4),
            articleCount: c.articleCount,
            status: c.status,
            confirmedAt: c.status === 'confirmed' ? new Date() : null,
          })
          .onConflictDoUpdate({
            target: [creatorEarnings.creatorId, creatorEarnings.revenuePeriod],
            set: {
              totalQueryContributions: c.totalQueryContributions,
              contributionSharePct: c.sharePct.toFixed(4),
              creatorGrossEarnings: c.grossEarnings.toFixed(4),
              creatorNetEarnings: c.netEarnings.toFixed(4),
              articleCount: c.articleCount,
              status: c.status,
            },
          });
      }

      for (const p of result.posts) {
        if (p.creatorNetEarnings <= 0) continue;
        await db
          .update(articles)
          .set({
            totalEarningsAttributed: sql`${articles.totalEarningsAttributed} + ${p.creatorNetEarnings.toFixed(4)}::numeric`,
          })
          .where(eq(articles.id, p.articleId));
      }

      return {
        revenuePeriod,
        creatorPool: result.totalCreatorPool,
        creatorsUpdated: result.creators.length,
      };
    });

    return { status: 'completed', ...distribution };
  }
);
