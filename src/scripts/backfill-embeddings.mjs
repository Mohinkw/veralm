#!/usr/bin/env node
/**
 * Historical Vector Backfill Script ($0 Gemini Free Tier `gemini-embedding-001`, 1536 dims)
 * Indexes all approved & active articles lacking `gemini-embedding-001` embeddings.
 *
 * Usage: node src/scripts/backfill-embeddings.mjs [--force]
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const { chunkTextWithMeta } = require('../../.test-dist/src/lib/rag-utils.js');

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

function loadEnvLocal() {
  const envPath = path.join(REPO_ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_KEYS = [
  ...(process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',') : []),
  process.env.GEMINI_API_KEY || '',
]
  .map((k) => k.trim())
  .filter((k, i, arr) => k && !k.includes('your-') && arr.indexOf(k) === i);

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL.');
  process.exit(1);
}
if (GEMINI_KEYS.length === 0) {
  console.error('Missing GEMINI_API_KEYS / GEMINI_API_KEY.');
  process.exit(1);
}

const FORCE = process.argv.includes('--force');
const MODEL = 'gemini-embedding-001';
const DIMS = 1536;
let keyCursor = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embedWithPool(text) {
  const input = text.trim().slice(0, 8000);
  if (!input) return null;

  for (let round = 0; round < 3; round++) {
    for (let offset = 0; offset < GEMINI_KEYS.length; offset++) {
      const idx = (keyCursor + offset) % GEMINI_KEYS.length;
      const apiKey = GEMINI_KEYS[idx];
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: `models/${MODEL}`,
              content: { parts: [{ text: input }] },
              outputDimensionality: DIMS,
            }),
            signal: AbortSignal.timeout(15_000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const values = data?.embedding?.values;
          if (Array.isArray(values) && values.length === DIMS) {
            keyCursor = (idx + 1) % GEMINI_KEYS.length;
            return values;
          }
        } else if (res.status === 429 || res.status >= 500) {
          // Try next key or backoff on round boundary
          continue;
        } else {
          const body = await res.text();
          console.warn(`Key #${idx + 1} unexpected HTTP ${res.status}: ${body.slice(0, 140)}`);
        }
      } catch (err) {
        console.warn(`Key #${idx + 1} error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await sleep(1500 * (round + 1));
  }
  return null;
}

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  });

  try {
    const querySql = FORCE
      ? `SELECT a.id, a.title, a.content
         FROM articles a
         WHERE a.status = 'approved'
           AND (a.licensing_status IS NULL OR a.licensing_status = 'active')
         ORDER BY a.approved_at DESC NULLS LAST, a.created_at DESC`
      : `SELECT a.id, a.title, a.content
         FROM articles a
         WHERE a.status = 'approved'
           AND (a.licensing_status IS NULL OR a.licensing_status = 'active')
           AND EXISTS (
             SELECT 1 WHERE NOT EXISTS (
               SELECT 1 FROM article_embeddings ae
               WHERE ae.article_id = a.id
                 AND ae.embedding_model = $1
                 AND ae.embedding IS NOT NULL
             )
           )
         ORDER BY a.approved_at DESC NULLS LAST, a.created_at DESC`;

    const { rows: articles } = await pool.query(querySql, FORCE ? [] : [MODEL]);
    console.log(`[Backfill] Found ${articles.length} article(s) to index with ${MODEL} (${DIMS}d) across ${GEMINI_KEYS.length} key(s).`);

    let indexedArticles = 0;
    let indexedChunks = 0;
    let failedArticles = 0;

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      const chunks = chunkTextWithMeta(art.content || '');
      if (chunks.length === 0) {
        await pool.query('DELETE FROM article_embeddings WHERE article_id = $1', [art.id]);
        continue;
      }

      let artStored = 0;
      for (const chunk of chunks) {
        const vec = await embedWithPool(chunk.heading ? `${chunk.heading}\n\n${chunk.text}` : chunk.text);
        if (!vec) {
          console.error(`[Backfill] Embedding failed for article ${art.id} chunk ${chunk.index}`);
          break;
        }

        const vecLiteral = `[${vec.join(',')}]`;
        const tokens = Math.max(1, chunk.text.split(/\s+/).length);
        await pool.query(
          `INSERT INTO article_embeddings (
             article_id, chunk_index, chunk_text, chunk_heading, is_intro_chunk,
             embedding, embedding_model, embedding_version, token_count
           )
           VALUES ($1, $2, $3, $4, $5, $6::vector, $7, 2, $8)
           ON CONFLICT (article_id, chunk_index) DO UPDATE SET
             chunk_text = EXCLUDED.chunk_text,
             chunk_heading = EXCLUDED.chunk_heading,
             is_intro_chunk = EXCLUDED.is_intro_chunk,
             embedding = EXCLUDED.embedding,
             embedding_model = EXCLUDED.embedding_model,
             embedding_version = EXCLUDED.embedding_version,
             token_count = EXCLUDED.token_count`,
          [art.id, chunk.index, chunk.text, chunk.heading, chunk.isIntroChunk, vecLiteral, MODEL, tokens]
        );
        artStored++;
        indexedChunks++;
        await sleep(60);
      }

      if (artStored === chunks.length) {
        await pool.query(
          'DELETE FROM article_embeddings WHERE article_id = $1 AND chunk_index >= $2',
          [art.id, chunks.length]
        );
        indexedArticles++;
      } else {
        failedArticles++;
      }

      if ((i + 1) % 10 === 0 || i + 1 === articles.length) {
        console.log(
          `[Backfill] Progress: ${i + 1}/${articles.length} articles | chunks stored=${indexedChunks} | failures=${failedArticles}`
        );
      }
    }

    const summary = await pool.query(
      'SELECT embedding_model, count(*)::int AS chunks, count(DISTINCT article_id)::int AS articles FROM article_embeddings GROUP BY embedding_model'
    );
    console.log('[Backfill] Complete:', { indexedArticles, indexedChunks, failedArticles, tableSummary: summary.rows });
    if (failedArticles > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[Backfill] Fatal:', err);
  process.exit(1);
});
