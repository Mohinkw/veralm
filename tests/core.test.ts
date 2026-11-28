import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { validateContentHeuristics } from '../src/lib/content-validator';
import {
  isRateLimited,
  resetInMemoryRateLimitForTests,
} from '../src/lib/rate-limit';
import { calculateRevenueDistribution } from '../src/lib/revenue/calculator';
import {
  createCitationToken,
  isExternalSearchEngineReferer,
  signSessionCookie,
  verifyCitationToken,
  verifySignedSessionCookie,
} from '../src/lib/citation-token';
import { safeJsonLd, sanitizeHttpUrl, slugify } from '../src/lib/utils';
import { chunkTextWithMeta, extractCitedIndices, filterAndRenumberCitedSources, fuseHybridResultsRRF, isConversationalOrMetaQuery, prepareMarkdownWithMath } from '../src/lib/rag-utils';
import { verifyStripeSignature } from '../src/lib/stripe-webhook';
import { verifyPolarWebhookSignature } from '../src/lib/polar-webhook';
import { extractArticleSlugFromPath } from '../src/lib/revenue/ga4';
import { parseSentryDsn } from '../src/lib/observability';

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

test('verifyStripeSignature validates HMAC-SHA256 signatures and rejects tampered or stale payloads', () => {
  const secret = 'whsec_test_secret_123';
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
  const now = 1700000000;
  const sig = crypto.createHmac('sha256', secret).update(`${now}.${payload}`).digest('hex');

  assert.equal(verifyStripeSignature(payload, `t=${now},v1=${sig}`, secret, 300, now + 10), true);
  assert.equal(verifyStripeSignature(payload, `t=${now},v1=deadbeef`, secret, 300, now + 10), false);
  assert.equal(verifyStripeSignature(payload, `t=${now},v1=${sig}`, secret, 300, now + 400), false);
  assert.equal(verifyStripeSignature(payload, null, secret, 300, now), false);
});

test('verifyPolarWebhookSignature validates Standard Webhooks HMAC-SHA256 signatures', () => {
  const rawSecret = Buffer.from('polar_test_key_32_bytes_minimum!!').toString('base64');
  const secret = `whsec_${rawSecret}`;
  const payload = JSON.stringify({ type: 'subscription.active', data: { status: 'active' } });
  const id = 'msg_123';
  const now = 1700000000;
  const sig = crypto
    .createHmac('sha256', Buffer.from(rawSecret, 'base64'))
    .update(`${id}.${now}.${payload}`)
    .digest('base64');

  assert.equal(
    verifyPolarWebhookSignature(payload, { id, timestamp: String(now), signature: `v1,${sig}` }, secret, 300, now + 5),
    true
  );
  assert.equal(
    verifyPolarWebhookSignature(payload, { id, timestamp: String(now), signature: 'v1,invalid==' }, secret, 300, now + 5),
    false
  );
});

test('extractArticleSlugFromPath parses /articles/<slug> paths', () => {
  assert.equal(extractArticleSlugFromPath('/articles/postgres-hnsw?ref=chat'), 'postgres-hnsw');
  assert.equal(extractArticleSlugFromPath('/articles/postgres-hnsw/123'), 'postgres-hnsw');
  assert.equal(extractArticleSlugFromPath('/about'), null);
});

test('parseSentryDsn builds envelope URL from valid DSN', () => {
  const parsed = parseSentryDsn('https://abc123@o456.ingest.sentry.io/789');
  assert.deepEqual(parsed, {
    envelopeUrl: 'https://o456.ingest.sentry.io/api/789/envelope/',
    publicKey: 'abc123',
  });
  assert.equal(parseSentryDsn('not-a-dsn'), null);
});

test('signSessionCookie and verifySignedSessionCookie reject tampered or expired cookies', () => {
  const uid = '11111111-2222-3333-4444-555555555555';
  const signed = signSessionCookie(uid, 3600);
  assert.equal(verifySignedSessionCookie(signed), uid);

  const tampered = `${signed.slice(0, -1)}${signed.endsWith('0') ? '1' : '0'}`;
  assert.equal(verifySignedSessionCookie(tampered), null);

  const expired = signSessionCookie(uid, -10);
  assert.equal(verifySignedSessionCookie(expired), null);

  assert.equal(verifySignedSessionCookie('not-a-cookie'), null);
  assert.equal(verifySignedSessionCookie(uid), null);
});

test('slugify handles Latin, Bengali/non-Latin Unicode, and empty strings safely', () => {
  assert.equal(slugify('Hello World! 2026'), 'hello-world-2026');
  const bnSlug = slugify('বাংলা ভাষায় কৃত্রিম বুদ্ধিমত্তা');
  assert.match(bnSlug, /^post-[0-9a-f]{10}$/);
  assert.equal(slugify('   '), '');
});

test('validateContentHeuristics supports Unicode/Bengali lexical diversity and Dari sentences', () => {
  const uniqueBn = Array.from({ length: 165 }, (_, i) => `শব্দ${i + 1}`).join(' ') + '। ';
  const article = `## বাংলা শিরোনাম\n\n${uniqueBn}\n\nতথ্যসূত্র: https://example.com\n\n- পয়েন্ট এক\n- পয়েন্ট দুই`;
  const report = validateContentHeuristics(article, 'বাংলা শিরোনাম');
  assert.equal(report.passed, true);
  assert.ok(report.lexicalDiversity > 0.5);
  assert.equal(report.hasHeadings, true);
  assert.equal(report.hasLists, true);
});

test('sanitizeHttpUrl and safeJsonLd mitigate javascript/script-breakout XSS vectors', () => {
  assert.equal(sanitizeHttpUrl('https://veralm.com/test?a=1'), 'https://veralm.com/test?a=1');
  assert.equal(sanitizeHttpUrl('http://example.org/img.png'), 'http://example.org/img.png');
  assert.equal(sanitizeHttpUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeHttpUrl('data:text/html,<script>alert(1)</script>'), null);

  const serialized = safeJsonLd({ name: 'Test </script><script>alert(1)</script>' });
  assert.equal(serialized.includes('</script>'), false);
  assert.ok(serialized.includes('\\u003c/script>'));
});

test('chunkTextWithMeta preserves headings and never splits UTF-16 surrogate pairs', () => {
  const prefix = '# Top Heading\n\n## Sub Section\n\n';
  const fill = 'A'.repeat(300 - prefix.length - 1);
  const emojiPara = fill + '🚀' + 'B'.repeat(240);
  const doc = `${prefix}${emojiPara}\n\n## Next Section\n\n${'word '.repeat(120)}`;
  const chunks = chunkTextWithMeta(doc, 300, 40);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].isIntroChunk, true);
  assert.ok(chunks[0].heading);
  for (const chunk of chunks) {
    assert.equal(chunk.text.isWellFormed(), true);
    assert.doesNotThrow(() => encodeURIComponent(chunk.text));
  }
});

test('extractCitedIndices extracts only in-range 1-based bracketed citations', () => {
  const cited = extractCitedIndices('Claim [1] is backed by [2], while [0] and [9] are ignored.', 3);
  assert.deepEqual([...cited].sort((a, b) => a - b), [1, 2]);
});

test('prepareMarkdownWithMath normalizes LaTeX delimiters while protecting currency prices', () => {
  const currency = prepareMarkdownWithMath('Minimum payout is $50.00 USD and Pro costs $89/year.');
  assert.equal(currency.includes('\\$50.00'), true);
  assert.equal(currency.includes('\\$89/year'), true);

  const math = prepareMarkdownWithMath('Formula \\(\\epsilon = 0.0319\\), $1 + 2 = 3$, and block:\n\\[x^2 + y^2 = z^2\\]');
  assert.equal(math.includes('$\\epsilon = 0.0319$'), true);
  assert.equal(math.includes('$1 + 2 = 3$'), true);
  assert.equal(math.includes('$$\nx^2 + y^2 = z^2\n$$'), true);

  const code = prepareMarkdownWithMath('`$50 USD and \\(x\\)` stays literal');
  assert.equal(code, '`$50 USD and \\(x\\)` stays literal');
});

test('fuseHybridResultsRRF boosts chunks appearing in both dense and sparse rankings', () => {
  const dense = [
    { chunk_id: 'c1', article_id: 'a1', similarity: 0.91 },
    { chunk_id: 'c2', article_id: 'a2', similarity: 0.85 },
  ];
  const sparse = [
    { chunk_id: 'c2', article_id: 'a2', similarity: 0.88 },
    { chunk_id: 'c3', article_id: 'a3', similarity: 0.72 },
  ];
  const fused = fuseHybridResultsRRF(dense, sparse, 60, 5);
  assert.equal(fused[0].chunk_id, 'c2');
  assert.equal(fused.length, 3);
});

test('calculateRevenueDistribution distributes subscription & API pool by citation share', () => {
  const result = calculateRevenueDistribution(
    [
      { articleId: 'a1', creatorId: 'c1', views: 0, grossAdRevenue: 0, queryContributions: 75, minimumPayout: 10 },
      { articleId: 'a2', creatorId: 'c2', views: 0, grossAdRevenue: 0, queryContributions: 25, minimumPayout: 10 },
    ],
    20,
    0.1,
    { subscriptionRevenueUsd: 80, apiRevenueUsd: 40 }
  );
  assert.equal(result.totalSubscriptionApiRevenue, 120);
  assert.equal(result.totalCreatorPool, 90);
  assert.equal(result.posts[0].creatorNetEarnings, 67.5);
  assert.equal(result.posts[1].creatorNetEarnings, 22.5);
});

test('isConversationalOrMetaQuery detects greetings and identity queries without matching real topics', () => {
  assert.equal(isConversationalOrMetaQuery('hi which model are you?'), true);
  assert.equal(isConversationalOrMetaQuery('Hello!'), true);
  assert.equal(isConversationalOrMetaQuery('who are you?'), true);
  assert.equal(isConversationalOrMetaQuery('which model is better GPT-4 or Claude?'), false);
  assert.equal(isConversationalOrMetaQuery('How does pgvector HNSW tuning work?'), false);
});

test('filterAndRenumberCitedSources drops uncited sources and renumbers sequentially', () => {
  const rows = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
  const kept = filterAndRenumberCitedSources('Fact one [1] and fact two [3].', rows);
  assert.equal(kept.answer, 'Fact one [1] and fact two [2].');
  assert.deepEqual(kept.rows.map((r) => r.id), ['a1', 'a3']);

  const none = filterAndRenumberCitedSources('The sources do not mention this.', rows);
  assert.equal(none.rows.length, 0);
});
