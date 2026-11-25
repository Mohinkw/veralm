# VeraLM Workspace Rules

## Supabase Database & Security Guardrails
- **Row-Level Security (RLS) is mandatory:** Whenever creating or modifying any table in Supabase's `public` schema, always run `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;` and define explicit access policies (or intentional default-deny with no public policies) in the exact same migration/SQL script.
- **Protect sensitive columns:** Never expose PII, financial identifiers, payout details, or auth/audit data to `anon` or `public` roles via PostgREST; revoke column-level `SELECT` or restrict via RLS policies.
