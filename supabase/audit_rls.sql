-- RLS coverage audit (ROADMAP M10: "every database table has RLS enabled and
-- verified"). Lists any public base table WITHOUT row-level security.
--
-- Pass condition: zero rows returned.
--
-- Run locally:
--   docker exec supabase_db_courtvision psql -U postgres -f - < supabase/audit_rls.sql
-- Or against any database:
--   psql "$DATABASE_URL" -f supabase/audit_rls.sql

select n.nspname as schema, c.relname as table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;
