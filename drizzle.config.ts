import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgresql://postgres:') + '/postgres' || '',
  },
  verbose: true,
  strict: true,
} satisfies Config;