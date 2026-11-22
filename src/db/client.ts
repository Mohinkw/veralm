import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgresql://postgres:') + '/postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;

// For server-side operations with service role
export function createServerDB() {
  const serviceUrl = process.env.SUPABASE_SERVICE_ROLE_KEY 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', `postgresql://postgres:${process.env.SUPABASE_SERVICE_ROLE_KEY}@`) + '/postgres'
    : process.env.DATABASE_URL;
    
  if (!serviceUrl) {
    throw new Error('Service role database URL not configured');
  }
  
  const servicePool = new Pool({
    connectionString: serviceUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
  });
  
  return drizzle(servicePool, { schema });
}

// Helper to execute raw SQL
export async function executeRawSQL(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}