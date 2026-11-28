import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  vector,
  primaryKey,
  inet,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================
// ENUMS
// ============================================================
export const userRoleEnum = pgEnum('user_role', ['creator', 'admin', 'superadmin']);
export const articleStatusEnum = pgEnum('article_status', [
  'draft',
  'pending_review',
  'under_ai_review',
  'requires_revision',
  'approved',
  'rejected',
  'suspended',
  'archived',
  'withdrawn',
]);
export const licenseStatusEnum = pgEnum('license_status', ['pending', 'active', 'expired', 'withdrawn']);
export const freshnessStatusEnum = pgEnum('freshness_status', ['current', 'aging', 'outdated', 'flagged', 'superseded']);
export const reputationTierEnum = pgEnum('reputation_tier', ['new', 'contributor', 'established', 'expert', 'suspended']);
export const platformRevenueStatusEnum = pgEnum('platform_revenue_status', ['open', 'calculating', 'closed', 'audited']);
export const creatorEarningsStatusEnum = pgEnum('creator_earnings_status', [
  'calculating',
  'confirmed',
  'pending_payout',
  'paid',
  'disputed',
  'on_hold',
  'below_threshold',
]);
export const contentFormatEnum = pgEnum('content_format', ['markdown', 'html', 'richtext']);

// ============================================================
// TABLES
// ============================================================

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  role: userRoleEnum('role').default('creator').notNull(),
  subscriptionTier: text('subscription_tier').default('free').notNull(), // 'free' | 'pro'
  proExpiresAt: timestamp('pro_expires_at', { withTimezone: true }),
  stripeCustomerId: text('stripe_customer_id'),
  isActive: boolean('is_active').default(true).notNull(),
  lastSignIn: timestamp('last_sign_in', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Categories
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Creator Profiles
export const creatorProfiles = pgTable('creator_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  slug: text('slug').unique().notNull(),
  bio: text('bio'),
  country: text('country'),
  websiteUrl: text('website_url'),
  profileImageUrl: text('profile_image_url'),
  socialLinks: jsonb('social_links').default({}).notNull(),
  primaryCategories: text('primary_categories').array().default([]).notNull(),
  qualifications: text('qualifications'),
  yearsOfExperience: integer('years_of_experience'),
  identityVerified: boolean('identity_verified').default(false).notNull(),
  verificationMethod: text('verification_method'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  reputationScore: decimal('reputation_score', { precision: 5, scale: 2 }).default('0.00').notNull(),
  reputationTier: reputationTierEnum('reputation_tier').default('new').notNull(),
  totalArticlesApproved: integer('total_articles_approved').default(0).notNull(),
  totalQueryContributions: integer('total_query_contributions').default(0).notNull(),
  totalLifetimeEarnings: decimal('total_lifetime_earnings', { precision: 10, scale: 4 }).default('0').notNull(),
  stripeAccountId: text('stripe_account_id'),
  paymentEmail: text('payment_email'),
  minimumPayout: decimal('minimum_payout', { precision: 10, scale: 2 }).default('50.00').notNull(),
  taxCountry: text('tax_country'),
  taxId: text('tax_id'),
  isActive: boolean('is_active').default(true).notNull(),
  suspensionReason: text('suspension_reason'),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  agreedToTermsAt: timestamp('agreed_to_terms_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('idx_creator_slug').on(table.slug),
  reputationIdx: index('idx_creator_reputation').on(table.reputationScore),
}));

// Creator Payout Methods
export const payoutMethodTypeEnum = pgEnum('payout_method_type', [
  'stripe_connect',
  'payoneer',
  'wise',
  'paypal',
  'bank_wire',
  'crypto',
]);

export const creatorPayoutMethods = pgTable('creator_payout_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.id, { onDelete: 'cascade' }),
  methodType: payoutMethodTypeEnum('method_type').notNull(),
  label: text('label').notNull(),
  accountIdentifier: text('account_identifier').notNull(),
  currency: text('currency').default('USD').notNull(),
  detailsJson: jsonb('details_json').default({}).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('idx_payout_methods_creator').on(table.creatorId),
}));

// Licensing Agreements
export const licensingAgreements = pgTable('licensing_agreements', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.id),
  agreementVersion: text('agreement_version').notNull(),
  agreedAt: timestamp('agreed_at', { withTimezone: true }).defaultNow().notNull(),
  agreementTextHash: text('agreement_text_hash').notNull(),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  isCurrent: boolean('is_current').default(true).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// Articles
export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.id),
  categoryId: uuid('category_id').references(() => categories.id),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  content: text('content').notNull(),
  contentFormat: contentFormatEnum('content_format').default('markdown').notNull(),
  excerpt: text('excerpt'),
  wordCount: integer('word_count'),
  tags: text('tags').array().default([]).notNull(),
  authorNotes: text('author_notes'),
  targetAudience: text('target_audience'),
  referencesJson: jsonb('references_json').default([]).notNull(),
  imagesJson: jsonb('images_json').default([]).notNull(),
  sourceLinks: jsonb('source_links').default([]).notNull(),
  originalCreatedAt: timestamp('original_created_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  withdrawalEffectiveAt: timestamp('withdrawal_effective_at', { withTimezone: true }),
  status: articleStatusEnum('status').default('pending_review').notNull(),
  rejectionReason: text('rejection_reason'),
  revisionInstructions: text('revision_instructions'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  compositeQualityScore: decimal('composite_quality_score', { precision: 5, scale: 2 }),
  originalityScore: decimal('originality_score', { precision: 5, scale: 2 }),
  aiProbabilityScore: decimal('ai_probability_score', { precision: 5, scale: 2 }),
  licensingStatus: licenseStatusEnum('licensing_status').default('pending').notNull(),
  licenseType: text('license_type').default('exclusive_ai_search').notNull(),
  licensingAgreementId: uuid('licensing_agreement_id').references(() => licensingAgreements.id),
  versionNumber: integer('version_number').default(1).notNull(),
  freshnessStatus: freshnessStatusEnum('freshness_status').default('current').notNull(),
  freshnessCheckedAt: timestamp('freshness_checked_at', { withTimezone: true }),
  freshnessNotes: text('freshness_notes'),
  totalQueryContributions: integer('total_query_contributions').default(0).notNull(),
  totalEarningsAttributed: decimal('total_earnings_attributed', { precision: 10, scale: 4 }).default('0').notNull(),
  searchVector: text('search_vector'), // tsvector stored as text for Drizzle
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('idx_articles_status').on(table.status),
  creatorIdx: index('idx_articles_creator').on(table.creatorId),
  categoryIdx: index('idx_articles_category').on(table.categoryId),
  approvedIdx: index('idx_articles_approved').on(table.approvedAt).where(sql`${table.status} = 'approved'`),
  tagsIdx: index('idx_articles_tags').using('gin', table.tags),
}));

// Article Versions
export const articleVersions = pgTable('article_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  changeSummary: text('change_summary'),
  changedBy: uuid('changed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  articleVersionUnique: uniqueIndex('article_version_unique').on(table.articleId, table.versionNumber),
}));

// Article Embeddings
export const articleEmbeddings = pgTable('article_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  chunkHeading: text('chunk_heading'),
  isIntroChunk: boolean('is_intro_chunk').default(false).notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingModel: text('embedding_model').default('text-embedding-3-small').notNull(),
  embeddingVersion: integer('embedding_version').default(1).notNull(),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  articleChunkUnique: uniqueIndex('article_embedding_unique').on(table.articleId, table.chunkIndex),
}));

// Article Quality Scores
export const articleQualityScores = pgTable('article_quality_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').unique().notNull().references(() => articles.id, { onDelete: 'cascade' }),
  originalityScore: decimal('originality_score', { precision: 5, scale: 2 }),
  plagiarismScore: decimal('plagiarism_score', { precision: 5, scale: 2 }),
  plagiarismReport: jsonb('plagiarism_report'),
  aiProbabilityScore: decimal('ai_probability_score', { precision: 5, scale: 2 }),
  aiDetectionReport: jsonb('ai_detection_report'),
  factualAccuracyScore: decimal('factual_accuracy_score', { precision: 5, scale: 2 }),
  usefulnessScore: decimal('usefulness_score', { precision: 5, scale: 2 }),
  depthScore: decimal('depth_score', { precision: 5, scale: 2 }),
  clarityScore: decimal('clarity_score', { precision: 5, scale: 2 }),
  referenceQualityScore: decimal('reference_quality_score', { precision: 5, scale: 2 }),
  authorCredibilityScore: decimal('author_credibility_score', { precision: 5, scale: 2 }),
  freshnessScore: decimal('freshness_score', { precision: 5, scale: 2 }),
  compositeScore: decimal('composite_score', { precision: 5, scale: 2 }),
  llmEvaluation: jsonb('llm_evaluation'),
  llmModelUsed: text('llm_model_used'),
  humanReviewed: boolean('human_reviewed').default(false).notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  reviewerNotes: text('reviewer_notes'),
  humanScoreOverride: decimal('human_score_override', { precision: 5, scale: 2 }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Search Queries
export const searchQueries = pgTable('search_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  queryText: text('query_text').notNull(),
  queryEmbedding: vector('query_embedding', { dimensions: 1536 }),
  categoryFilter: uuid('category_filter').references(() => categories.id),
  dateFilterFrom: timestamp('date_filter_from', { withTimezone: true }),
  responseText: text('response_text'),
  responseTokens: integer('response_tokens'),
  promptTokens: integer('prompt_tokens'),
  latencyMs: integer('latency_ms'),
  modelUsed: text('model_used'),
  wasCached: boolean('was_cached').default(false).notNull(),
  articlesCited: uuid('articles_cited').array().default([]).notNull(),
  revenuePeriod: text('revenue_period'),
  adImpressionCount: integer('ad_impression_count').default(0).notNull(),
  subscriptionQuery: boolean('subscription_query').default(false).notNull(),
  userRating: integer('user_rating'), // 1 or -1
  hasFollowUp: boolean('has_follow_up').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('idx_queries_session').on(table.sessionId),
  periodIdx: index('idx_queries_period').on(table.revenuePeriod),
  createdIdx: index('idx_queries_created').on(table.createdAt),
}));

// Article Usage Events
export const articleUsageEvents = pgTable('article_usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryId: uuid('query_id').notNull().references(() => searchQueries.id),
  articleId: uuid('article_id').notNull().references(() => articles.id),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.id),
  retrievalRank: integer('retrieval_rank').notNull(),
  cosineSimilarity: decimal('cosine_similarity', { precision: 6, scale: 4 }),
  bm25Score: decimal('bm25_score', { precision: 10, scale: 4 }),
  hybridScore: decimal('hybrid_score', { precision: 6, scale: 4 }),
  contributionScore: decimal('contribution_score', { precision: 6, scale: 4 }).default('0').notNull(),
  contributionWeight: decimal('contribution_weight', { precision: 6, scale: 4 }).default('0').notNull(),
  wasPrimarySource: boolean('was_primary_source').default(false).notNull(),
  wasCited: boolean('was_cited').default(false).notNull(),
  chunksUsed: integer('chunks_used').default(0).notNull(),
  revenuePeriod: text('revenue_period'),
  attributedRevenue: decimal('attributed_revenue', { precision: 10, scale: 6 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  articleIdx: index('idx_usage_article').on(table.articleId),
  creatorIdx: index('idx_usage_creator').on(table.creatorId),
  periodIdx: index('idx_usage_period').on(table.revenuePeriod),
  queryIdx: index('idx_usage_query').on(table.queryId),
}));

// Platform Revenue
export const platformRevenue = pgTable('platform_revenue', {
  id: uuid('id').primaryKey().defaultRandom(),
  revenuePeriod: text('revenue_period').unique().notNull(),
  adRevenue: decimal('ad_revenue', { precision: 12, scale: 4 }).default('0').notNull(),
  subscriptionRevenue: decimal('subscription_revenue', { precision: 12, scale: 4 }).default('0').notNull(),
  enterpriseRevenue: decimal('enterprise_revenue', { precision: 12, scale: 4 }).default('0').notNull(),
  otherRevenue: decimal('other_revenue', { precision: 12, scale: 4 }).default('0').notNull(),
  grossRevenue: decimal('gross_revenue', { precision: 12, scale: 4 }).default('0').notNull(),
  infrastructureCost: decimal('infrastructure_cost', { precision: 12, scale: 4 }).default('0').notNull(),
  aiInferenceCost: decimal('ai_inference_cost', { precision: 12, scale: 4 }).default('0').notNull(),
  paymentProcessingCost: decimal('payment_processing_cost', { precision: 12, scale: 4 }).default('0').notNull(),
  plagiarismApiCost: decimal('plagiarism_api_cost', { precision: 12, scale: 4 }).default('0').notNull(),
  otherCosts: decimal('other_costs', { precision: 12, scale: 4 }).default('0').notNull(),
  creatorPool: decimal('creator_pool', { precision: 12, scale: 4 }).default('0').notNull(),
  creatorPoolPct: decimal('creator_pool_pct', { precision: 5, scale: 2 }).default('60.00').notNull(),
  status: platformRevenueStatusEnum('status').default('open').notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Creator Earnings
export const creatorEarnings = pgTable('creator_earnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.id),
  revenuePeriod: text('revenue_period').notNull(),
  platformRevenueId: uuid('platform_revenue_id').references(() => platformRevenue.id),
  totalQueryContributions: integer('total_query_contributions').default(0).notNull(),
  totalContributionWeight: decimal('total_contribution_weight', { precision: 10, scale: 6 }).default('0').notNull(),
  contributionSharePct: decimal('contribution_share_pct', { precision: 8, scale: 4 }),
  creatorGrossEarnings: decimal('creator_gross_earnings', { precision: 12, scale: 4 }).default('0').notNull(),
  paymentProcessingFee: decimal('payment_processing_fee', { precision: 12, scale: 4 }).default('0').notNull(),
  taxWithholding: decimal('tax_withholding', { precision: 12, scale: 4 }).default('0').notNull(),
  creatorNetEarnings: decimal('creator_net_earnings', { precision: 12, scale: 4 }).default('0').notNull(),
  status: creatorEarningsStatusEnum('status').default('calculating').notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  stripePayoutId: text('stripe_payout_id'),
  stripeTransferId: text('stripe_transfer_id'),
  articleCount: integer('article_count'),
  calculationVersion: integer('calculation_version').default(1).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  creatorPeriodUnique: uniqueIndex('creator_earnings_unique').on(table.creatorId, table.revenuePeriod),
}));

// Audit Log
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorId: uuid('actor_id').references(() => users.id),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  metadata: jsonb('metadata'),
  ipAddress: inet('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actorIdx: index('idx_audit_actor').on(table.actorId),
  entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
  actionIdx: index('idx_audit_action').on(table.action),
  createdIdx: index('idx_audit_created').on(table.createdAt),
}));

// Query Cache
export const queryCache = pgTable('query_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryHash: text('query_hash').unique().notNull(),
  queryEmbedding: vector('query_embedding', { dimensions: 1536 }),
  cachedResponse: text('cached_response').notNull(),
  articlesCited: uuid('articles_cited').array().default([]).notNull(),
  modelUsed: text('model_used'),
  hitCount: integer('hit_count').default(1).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  hashIdx: uniqueIndex('idx_cache_hash').on(table.queryHash),
  expiresIdx: index('idx_cache_expires').on(table.expiresAt),
}));

// ============================================================
// TYPE EXPORTS
// ============================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type NewCreatorProfile = typeof creatorProfiles.$inferInsert;

export type LicensingAgreement = typeof licensingAgreements.$inferSelect;
export type NewLicensingAgreement = typeof licensingAgreements.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type ArticleVersion = typeof articleVersions.$inferSelect;
export type NewArticleVersion = typeof articleVersions.$inferInsert;

export type ArticleEmbedding = typeof articleEmbeddings.$inferSelect;
export type NewArticleEmbedding = typeof articleEmbeddings.$inferInsert;

export type ArticleQualityScores = typeof articleQualityScores.$inferSelect;
export type NewArticleQualityScores = typeof articleQualityScores.$inferInsert;

export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;

export type ArticleUsageEvent = typeof articleUsageEvents.$inferSelect;
export type NewArticleUsageEvent = typeof articleUsageEvents.$inferInsert;

export type PlatformRevenue = typeof platformRevenue.$inferSelect;
export type NewPlatformRevenue = typeof platformRevenue.$inferInsert;

export type CreatorEarnings = typeof creatorEarnings.$inferSelect;
export type NewCreatorEarnings = typeof creatorEarnings.$inferInsert;

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export type QueryCache = typeof queryCache.$inferSelect;
export type NewQueryCache = typeof queryCache.$inferInsert;

// Import serial for audit_log
import { serial } from 'drizzle-orm/pg-core';

// User Article Ratings (1 - 10 scale)
export const articleRatings = pgTable('article_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  raterKey: text('rater_key').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  rating: integer('rating').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  articleIdx: index('idx_article_ratings_article').on(table.articleId),
  raterUnique: uniqueIndex('article_ratings_unique').on(table.articleId, table.raterKey),
}));