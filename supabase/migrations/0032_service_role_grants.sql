-- Make the service-role grants explicit, so a fresh database matches production.
--
-- The hosted project already has these: Supabase issues them when it provisions a project, via
-- default privileges owned by `supabase_admin`. They were therefore never written down here, and
-- every server path (scoring, round close, seeding) has always relied on grants the repo does not
-- contain.
--
-- A database built only from these migrations does not get them. `supabase db reset` or a rebuilt
-- project yields a schema that looks correct and fails at runtime:
--
--   permission denied for table rooms   -- 42501, from the service-role client
--
-- The trap is that `service_role` has `rolbypassrls`, which reads like "can do anything". In
-- Postgres, bypassing row-level security and holding table privileges are separate things: RLS
-- policies are never consulted for this role, but a missing GRANT still rejects the statement.
-- RLS being correct is what makes the failure look impossible.
--
-- Verified against production before writing this: all 14 public tables already report SELECT,
-- INSERT, UPDATE and DELETE for `service_role`, so applying this upstream is a no-op. It only
-- changes environments built from scratch.
--
-- Scope: `service_role` is server-only — it is never exposed to a browser (see CLAUDE.md, and the
-- ESLint rule barring `admin.ts` from Client Components). `anon` and `authenticated` are
-- deliberately untouched; their access stays governed by RLS and the column grants in 0025.

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

grant usage, select
  on all sequences in schema public
  to service_role;

-- The statements above only cover tables that exist right now. Without matching default
-- privileges, the next migration to add a table would reintroduce the same gap for that table.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;
