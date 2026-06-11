-- 0001_init.sql — M1: teams + team_memberships with RLS
--
-- Scope (ROADMAP M1): only the team tables. plays/play_versions arrive in M4.
--
-- Doc notes:
--   * `teams.season` (required) and `teams.level` (optional) come from
--     UI_WORKFLOWS.md §4.2. DATA_MODEL.md §4.1 omits them; the more-specific
--     UI doc wins (CLAUDE.md doc-precedence rule).
--   * RLS on team_memberships uses SECURITY DEFINER helpers to avoid infinite
--     recursion (a membership policy that itself selects from team_memberships).
--   * find_team_by_code() is SECURITY DEFINER so the (possibly anonymous) join
--     screen can validate a code without a broad SELECT grant on teams.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text not null,
  level text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code varchar(8) unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role varchar(20) not null check (role in ('coach', 'player')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index idx_team_memberships_user_id on team_memberships (user_id);
create index idx_team_memberships_team_id on team_memberships (team_id);

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers (bypass RLS to break recursion)
-- ---------------------------------------------------------------------------

create or replace function is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from team_memberships
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function get_user_role(p_team_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from team_memberships
  where team_id = p_team_id and user_id = auth.uid()
  limit 1;
$$;

-- Validate an invite code without exposing the teams table broadly.
create or replace function find_team_by_code(p_code text)
returns table (id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.name
  from teams t
  where t.invite_code = upper(p_code)
  limit 1;
$$;

grant execute on function find_team_by_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table teams enable row level security;
alter table team_memberships enable row level security;

-- teams: a user can read a team they belong to, or one they own. The owner
-- clause is required so the INSERT ... RETURNING in createTeam() succeeds
-- before the coach's membership row exists.
create policy "members or owner can read team"
  on teams for select
  to authenticated
  using (owner_id = auth.uid() or is_team_member(id));

-- teams: any authenticated user can create a team they own.
create policy "authenticated can create team"
  on teams for insert
  to authenticated
  with check (owner_id = auth.uid());

-- teams: only the owner can update/delete.
create policy "owner can update team"
  on teams for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner can delete team"
  on teams for delete
  to authenticated
  using (owner_id = auth.uid());

-- team_memberships: a user can read memberships for any team they belong to
-- (lets a coach see their roster; lets a player see their own row).
create policy "members can read team memberships"
  on team_memberships for select
  to authenticated
  using (is_team_member(team_id));

-- team_memberships: a user can insert their OWN membership row. This covers
-- both creating a team (insert coach row) and joining one (insert player row).
create policy "user can insert own membership"
  on team_memberships for insert
  to authenticated
  with check (user_id = auth.uid());

-- team_memberships: a user can remove their own membership (leave a team).
create policy "user can delete own membership"
  on team_memberships for delete
  to authenticated
  using (user_id = auth.uid());
