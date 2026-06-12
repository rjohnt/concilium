-- Projects: first-class entity that build settings hang off.
-- Tickets gain a nullable project_id (standalone tickets keep working) and a
-- nullable branch_override (when set, builds target it instead of the
-- project's default_branch).
--
-- NOTE: this file documents the schema change; apply it to the live Supabase
-- project via the usual migration tooling (it has NOT been auto-applied).

create table if not exists public.projects (
  id               text primary key,
  name             text not null,
  repo_url         text,
  default_branch   text not null default 'main',
  sandbox_provider text not null default 'local',
  create_pr        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Server-only table (accessed via the service-role key); enable RLS with no
-- policies so anon/authenticated clients cannot touch it directly.
alter table public.projects enable row level security;

alter table public.tickets
  add column if not exists project_id text references public.projects(id) on delete set null;

alter table public.tickets
  add column if not exists branch_override text;
