import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(date);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const generateSlug = slugify;

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export const CONTRIBUTION_FORMULA = {
  RANK_WEIGHT: 0.30,
  SEMANTIC_WEIGHT: 0.35,
  CITATION_BONUS: 0.25,
  USAGE_RATIO_WEIGHT: 0.10,
  QUALITY_MULTIPLIER_MIN: 0.7,
  QUALITY_MULTIPLIER_MAX: 1.3,
  FRESHNESS: {
    current: 1.00,
    aging: 0.85,
    outdated: 0.50,
    flagged: 0.30,
  },
} as const;

export function calculateContributionWeight(params: {
  retrievalRank: number;
  cosineSimilarity: number;
  wasCited: boolean;
  chunksUsed: number;
  totalChunksRetrieved: number;
  articleQualityScore: number;
  freshnessStatus: string;
}): number {
  const rankScore = 1.0 / params.retrievalRank;
  const semanticScore = params.cosineSimilarity;
  const citationBonus = params.wasCited ? CONTRIBUTION_FORMULA.CITATION_BONUS : 0;
  const usageRatio = params.chunksUsed / Math.max(params.totalChunksRetrieved, 1);

  const base =
    rankScore * CONTRIBUTION_FORMULA.RANK_WEIGHT +
    semanticScore * CONTRIBUTION_FORMULA.SEMANTIC_WEIGHT +
    citationBonus +
    usageRatio * CONTRIBUTION_FORMULA.USAGE_RATIO_WEIGHT;

  const qualityMult =
    CONTRIBUTION_FORMULA.QUALITY_MULTIPLIER_MIN +
    (params.articleQualityScore / 100) * (CONTRIBUTION_FORMULA.QUALITY_MULTIPLIER_MAX - CONTRIBUTION_FORMULA.QUALITY_MULTIPLIER_MIN);

  const freshnessMult = CONTRIBUTION_FORMULA.FRESHNESS[params.freshnessStatus as keyof typeof CONTRIBUTION_FORMULA.FRESHNESS] || 1.0;

  return base * qualityMult * freshnessMult;
}

export function normalizeContributions(scores: Record<string, number>): Record<string, number> {
  const total = Object.values(scores).reduce((sum, v) => sum + v, 0);
  if (total === 0) return scores;
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    normalized[key] = value / total;
  }
  return normalized;
}

export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return envUrl || 'https://veralm.com';
}
