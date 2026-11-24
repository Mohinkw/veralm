export interface PostRevenueInput {
  articleId: string;
  creatorId: string;
  views: number;
  grossAdRevenue: number;
  queryContributions?: number;
  minimumPayout?: number;
}

export interface PostRevenueAllocation {
  articleId: string;
  creatorId: string;
  views: number;
  grossAdRevenue: number;
  allocatedServerCost: number;
  platformFee: number;
  creatorNetEarnings: number;
}

export interface CreatorRevenueSummary {
  creatorId: string;
  articleCount: number;
  totalViews: number;
  totalQueryContributions: number;
  grossEarnings: number;
  allocatedServerCost: number;
  platformFee: number;
  netEarnings: number;
  sharePct: number;
  status: 'confirmed' | 'below_threshold';
}

export interface PeriodRevenueDistribution {
  totalGrossAdRevenue: number;
  totalServerCost: number;
  totalPlatformFee: number;
  totalCreatorPool: number;
  creatorPoolPct: number;
  posts: PostRevenueAllocation[];
  creators: CreatorRevenueSummary[];
}

export const DEFAULT_PLATFORM_FEE_RATE = 0.1; // 10% platform fee -> 90% creator pool

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Distribute post-level ad revenue to creators after deducting:
 * 1) proportional monthly server/infrastructure costs (based on post views), and
 * 2) the 10% VeraLM platform fee.
 */
export function calculateRevenueDistribution(
  posts: PostRevenueInput[],
  totalServerCost: number,
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE
): PeriodRevenueDistribution {
  const safeServerCost = Math.max(0, totalServerCost);
  const clampedFeeRate = Math.min(1, Math.max(0, platformFeeRate));
  const creatorRate = 1 - clampedFeeRate;

  const totalViews = posts.reduce((sum, p) => sum + Math.max(0, p.views), 0);
  const totalGrossAdRevenue = round4(
    posts.reduce((sum, p) => sum + Math.max(0, p.grossAdRevenue), 0)
  );

  const postAllocations: PostRevenueAllocation[] = posts.map((post) => {
    const views = Math.max(0, post.views);
    const gross = Math.max(0, post.grossAdRevenue);

    // Allocate server cost proportionally by traffic; if zero total views, split evenly
    const viewShare =
      totalViews > 0 ? views / totalViews : posts.length > 0 ? 1 / posts.length : 0;
    const allocatedServerCost = safeServerCost * viewShare;

    const netAfterServer = Math.max(0, gross - allocatedServerCost);
    const platformFee = netAfterServer * clampedFeeRate;
    const creatorNetEarnings = netAfterServer * creatorRate;

    return {
      articleId: post.articleId,
      creatorId: post.creatorId,
      views,
      grossAdRevenue: round4(gross),
      allocatedServerCost: round4(allocatedServerCost),
      platformFee: round4(platformFee),
      creatorNetEarnings: round4(creatorNetEarnings),
    };
  });

  const totalCreatorPool = round4(
    postAllocations.reduce((sum, p) => sum + p.creatorNetEarnings, 0)
  );
  const totalPlatformFee = round4(
    postAllocations.reduce((sum, p) => sum + p.platformFee, 0)
  );

  const creatorMap = new Map<
    string,
    {
      articleCount: number;
      totalViews: number;
      totalQueryContributions: number;
      grossEarnings: number;
      allocatedServerCost: number;
      platformFee: number;
      netEarnings: number;
      minimumPayout: number;
    }
  >();

  posts.forEach((post, idx) => {
    const alloc = postAllocations[idx];
    const current = creatorMap.get(post.creatorId) || {
      articleCount: 0,
      totalViews: 0,
      totalQueryContributions: 0,
      grossEarnings: 0,
      allocatedServerCost: 0,
      platformFee: 0,
      netEarnings: 0,
      minimumPayout: post.minimumPayout ?? 50,
    };

    current.articleCount += 1;
    current.totalViews += alloc.views;
    current.totalQueryContributions += Math.max(0, post.queryContributions ?? 0);
    current.grossEarnings += alloc.grossAdRevenue;
    current.allocatedServerCost += alloc.allocatedServerCost;
    current.platformFee += alloc.platformFee;
    current.netEarnings += alloc.creatorNetEarnings;
    creatorMap.set(post.creatorId, current);
  });

  const creators: CreatorRevenueSummary[] = Array.from(creatorMap.entries()).map(
    ([creatorId, c]) => {
      const netEarnings = round4(c.netEarnings);
      const sharePct =
        totalCreatorPool > 0 ? round4((netEarnings / totalCreatorPool) * 100) : 0;

      return {
        creatorId,
        articleCount: c.articleCount,
        totalViews: c.totalViews,
        totalQueryContributions: c.totalQueryContributions,
        grossEarnings: round4(c.grossEarnings),
        allocatedServerCost: round4(c.allocatedServerCost),
        platformFee: round4(c.platformFee),
        netEarnings,
        sharePct,
        status: netEarnings >= c.minimumPayout ? 'confirmed' : 'below_threshold',
      };
    }
  );

  return {
    totalGrossAdRevenue,
    totalServerCost: round4(safeServerCost),
    totalPlatformFee,
    totalCreatorPool,
    creatorPoolPct: round4(creatorRate * 100),
    posts: postAllocations,
    creators,
  };
}
