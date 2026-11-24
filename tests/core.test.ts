import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContentHeuristics } from '../src/lib/content-validator';
import {
  isRateLimited,
  resetInMemoryRateLimitForTests,
} from '../src/lib/rate-limit';
import { calculateRevenueDistribution } from '../src/lib/revenue/calculator';
import {
  createCitationToken,
  isExternalSearchEngineReferer,
  verifyCitationToken,
} from '../src/lib/citation-token';

test('validateContentHeuristics rejects short content under 150 words', () => {
  const report = validateContentHeuristics('Too short article.', 'Short');
  assert.equal(report.passed, false);
  assert.ok(report.wordCount < 150);
  assert.ok(report.issues.some((i) => i.includes('at least 150 words')));
});

test('validateContentHeuristics passes well-structured Markdown article', () => {
  const words = Array.from({ length: 180 }, (_, i) => `term${i}`).join(' ');
  const markdown = `# Sample Title\n\n## Overview\n\n- Key finding one\n- Key finding two\n\n${words}\n\n[Reference](https://example.com)`;
  const report = validateContentHeuristics(markdown, 'Sample Title');

  assert.equal(report.passed, true);
  assert.equal(report.hasHeadings, true);
  assert.equal(report.hasLists, true);
  assert.equal(report.hasReferences, true);
  assert.ok(report.heuristicQualityScore >= 70);
});

test('isRateLimited enforces 30 requests per window per key', async () => {
  resetInMemoryRateLimitForTests();
  const key = '203.0.113.10:sess-1';

  for (let i = 0; i < 30; i++) {
    const blocked = await isRateLimited(key);
    assert.equal(blocked, false, `request ${i + 1} should be allowed`);
  }

  const blocked31st = await isRateLimited(key);
  assert.equal(blocked31st, true, '31st request in window should be blocked');

  const otherBlocked = await isRateLimited('203.0.113.11:sess-2');
  assert.equal(otherBlocked, false);
});

test('calculateRevenueDistribution deducts proportional server cost and 10% platform fee', () => {
  const result = calculateRevenueDistribution(
    [
      {
        articleId: 'a1',
        creatorId: 'c1',
        views: 750,
        grossAdRevenue: 120,
        minimumPayout: 50,
      },
      {
        articleId: 'a2',
        creatorId: 'c2',
        views: 250,
        grossAdRevenue: 20,
        minimumPayout: 50,
      },
    ],
    40 // $40 total server cost: $30 to a1 (75%), $10 to a2 (25%)
  );

  assert.equal(result.creatorPoolPct, 90);
  assert.equal(result.totalGrossAdRevenue, 140);
  assert.equal(result.totalServerCost, 40);

  // a1: (120 - 30) * 0.90 = 81.00, fee = 9.00
  assert.equal(result.posts[0].allocatedServerCost, 30);
  assert.equal(result.posts[0].platformFee, 9);
  assert.equal(result.posts[0].creatorNetEarnings, 81);

  // a2: (20 - 10) * 0.90 = 9.00, fee = 1.00
  assert.equal(result.posts[1].allocatedServerCost, 10);
  assert.equal(result.posts[1].platformFee, 1);
  assert.equal(result.posts[1].creatorNetEarnings, 9);

  assert.equal(result.totalCreatorPool, 90);
  assert.equal(result.totalPlatformFee, 10);
  assert.equal(result.creators[0].status, 'confirmed');       // $81 >= $50
  assert.equal(result.creators[1].status, 'below_threshold'); // $9 < $50
});

test('citation-token blocks static bypasses and detects external search engine referers', () => {
  assert.equal(verifyCitationToken('pro', 'my-article'), false);
  assert.equal(verifyCitationToken('preview', 'my-article'), false);

  const valid = createCitationToken('my-article', 'sess-123');
  assert.equal(verifyCitationToken(valid, 'my-article'), true);
  assert.equal(verifyCitationToken(valid, 'other-article'), false);

  assert.equal(isExternalSearchEngineReferer('https://www.google.com/search?q=veralm'), true);
  assert.equal(isExternalSearchEngineReferer('https://www.bing.com/search?q=veralm'), true);
  assert.equal(isExternalSearchEngineReferer('https://www.perplexity.ai/search'), true);
  assert.equal(isExternalSearchEngineReferer('https://veralm.com/'), false);
  assert.equal(isExternalSearchEngineReferer(null), false);
});
