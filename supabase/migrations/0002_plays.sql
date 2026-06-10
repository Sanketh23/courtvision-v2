-- 0002_plays.sql — M4: plays table with RLS, indexes, and the
-- duration_seconds denormalization trigger.
--
-- Scope (ROADMAP M4): only the plays table. play_versions arrives in M8.
--
-- Doc notes:
--   * The play body lives in `data jsonb` (DATA_MODEL.md §4.3); the Zod
--     schema in features/play/schemas.ts is the real contract, so columns
--     here are just the queryable/denormalized surface, not a second model.
--   * `duration_seconds` is required by the ROADMAP M4 DoD but isn't in
--     DATA_MODEL.md §4.3. The play's authoritative duration is `data.duration`
--     (milliseconds). We denormalize it to a generated-on-write column via
--     trigger so the playbook (M7) can sort/filter by length without parsing
--     JSON. Flagged as a DATA_MODEL gap to backfill.
--   * RLS reuses the is_team_member()/get_user_role() SECURITY DEFINER
--     helpers from 0001 to stay consistent and recursion-free.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table plays (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  name text not null,
  description text,
  category varchar(50) not null,
  formation varchar(100),
  tags text[] not null default array[]::text[],
  status varchar(20) not null default 'draft'
    check (status in ('draft', 'published', 'archived')),

  -- The play animation contract (validated by the Zod schema in app code).
  data jsonb not null,

  -- Denormalized from data.duration (ms) by the trigger below.
  duration_seconds numeric(6, 1) not null default 0,

  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id),
  published_at timestamptz,
  published_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),

  constraint valid_data check (jsonb_typeof(data) = 'object')
);

-- Playbook lists are always team-scoped; status narrows player views.
create index idx_plays_team_id on plays (team_id);
create index idx_plays_team_status on plays (team_id, status);

-- ---------------------------------------------------------------------------
-- duration_seconds denormalization + updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function sync_play_derived_columns()
returns trigger
language plpgsql
as $$
begin
  -- data.duration is milliseconds (DATA_MODEL.md §3.1); store seconds to 0.1s.
  new.duration_seconds := round(
    coalesce((new.data ->> 'duration')::numeric, 0) / 1000.0, 1
  );
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_plays_sync_derived
  before insert or update on plays
  for each row
  execute function sync_play_derived_columns();

-- ---------------------------------------------------------------------------
-- Row Level Security (DATA_MODEL.md §5)
-- ---------------------------------------------------------------------------

alter table plays enable row level security;

-- Coaches see every play in their teams (draft, published, or archived).
create policy "coaches read team plays"
  on plays for select
  to authenticated
  using (get_user_role(team_id) = 'coach');

-- Players see only published plays in their teams.
create policy "players read published plays"
  on plays for select
  to authenticated
  using (status = 'published' and get_user_role(team_id) = 'player');

-- Only coaches may create plays, and only in their own teams. created_by
-- must be the acting user.
create policy "coaches insert team plays"
  on plays for insert
  to authenticated
  with check (get_user_role(team_id) = 'coach' and created_by = auth.uid());

-- Only coaches may edit plays in their teams.
create policy "coaches update team plays"
  on plays for update
  to authenticated
  using (get_user_role(team_id) = 'coach')
  with check (get_user_role(team_id) = 'coach');

-- Only coaches may delete plays in their teams.
create policy "coaches delete team plays"
  on plays for delete
  to authenticated
  using (get_user_role(team_id) = 'coach');
