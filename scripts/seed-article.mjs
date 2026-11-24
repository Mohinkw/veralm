import { Client } from 'pg';

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // 1. User
  const userRes = await client.query(`
    INSERT INTO users (email, role) 
    VALUES ('alex@veralm.ai', 'creator')
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id;
  `);
  const userId = userRes.rows[0].id;

  // 2. Creator Profile
  const profileRes = await client.query(`
    INSERT INTO creator_profiles (user_id, slug, display_name, bio, primary_categories, qualifications, years_of_experience)
    VALUES ($1, 'alex-rivers', 'Alex Rivers', 'Principal Database Architect specializing in PostgreSQL and distributed systems.', ARRAY['technology'], '15+ years building large-scale vector search systems', 15)
    ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id;
  `, [userId]);
  const creatorId = profileRes.rows[0].id;

  // 3. Category
  const catRes = await client.query(`SELECT id FROM categories WHERE slug = 'technology' LIMIT 1;`);
  const categoryId = catRes.rows[0].id;

  // 4. Article
  const chunkText = "To optimize PostgreSQL for vector search at scale, deploy pgvector with HNSW indexes rather than IVFFlat. Configure ef_construction to 128 and m to 16 for sub-millisecond approximate nearest neighbor searches with >98% recall. Always tune maintenance_work_mem to at least 2GB during index builds. For tables exceeding 10M embeddings, partition by category or timestamp to keep per-query index scans cached in shared_buffers.";

  const articleRes = await client.query(`
    INSERT INTO articles (
      creator_id, category_id, title, slug, excerpt, content, 
      status, approved_at, word_count
    ) VALUES (
      $1, $2, 'Optimizing PostgreSQL for Vector Search at Scale', 'optimizing-postgresql-vector-search-scale', 
      'Practitioner guide to deploying pgvector HNSW indexes, parameter tuning, and partitioning strategies.', 
      $3, 'approved', NOW(), 450
    )
    ON CONFLICT (slug) DO UPDATE SET status = 'approved'
    RETURNING id;
  `, [creatorId, categoryId, chunkText]);
  const articleId = articleRes.rows[0].id;
  console.log("Article created:", articleId);

  // 5. OpenAI embedding
  const openaiRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: chunkText
    })
  });
  const embeddingData = await openaiRes.json();
  const vector = embeddingData.data[0].embedding;
  const vectorStr = `[${vector.join(",")}]`;

  // 6. Insert embedding
  await client.query(`DELETE FROM article_embeddings WHERE article_id = $1;`, [articleId]);
  await client.query(`
    INSERT INTO article_embeddings (article_id, chunk_index, chunk_text, embedding, token_count)
    VALUES ($1, 0, $2, $3::vector, 80);
  `, [articleId, chunkText, vectorStr]);

  console.log("✓ Stored article and pgvector embedding in Supabase!");
  await client.end();
}

seed().catch(console.error);
