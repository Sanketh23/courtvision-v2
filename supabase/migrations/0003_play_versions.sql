-- 0003_play_versions.sql — M8: automatic play versioning.
--
-- Contract (DATA_MODEL.md §4.4 + ROADMAP M8): every save of a play snapshots
-- a version row via trigger — the application never inserts versions
-- directly. The latest version row always equals the current play, so the
-- history modal can mark it "current" (UI_WORKFLOWS §10.2) and every earlier
-- row is restorable. Restores create a NEW version; history is append-only.
--
-- Doc notes:
--   * change_source / change_summary / restored_from_version are required by
--     ROADMAP M8 and AI_INTEGRATION §14 ("versioning records change_source")
--     but missing from DATA_MODEL §4.4's table definition. Added here;
--     flagged as a DATA_MODEL gap to backfill.
--   * Snapshots store NEW.data (not OLD as §283's prose suggests): the DoD
--     "every save creates a version row" plus "current version is highlighted
--     in the list" both require the current state to be version max(n).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table play_versions (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references plays (id) on delete cascade,
  version_number integer not null,
  data jsonb not null,
  change_source varchar(20) not null default 'manual'
    check (change_source in ('manual', 'restore', 'ai')),
  change_summary text not null default 'Manual save',
  restored_from_version integer,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id),

  unique (play_id, version_number),
  constraint valid_json check (jsonb_typeof(data) = 'object')
);

create index idx_play_versions_play_id on play_versions (play_id);

-- ---------------------------------------------------------------------------
-- Snapshot trigger
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER: the insert into play_versions happens with the function
-- owner's rights, so no client-facing INSERT policy is needed (clients can
-- never write version rows themselves).
create or replace function snapshot_play_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_summary text;
begin
  select coalesce(max(version_number), 0) + 1
    into v_next
    from play_versions
   where play_id = new.id;

  -- Auto-generated change summary (ROADMAP M8). Coarse but honest: derived
  -- from what actually changed in the JSON body.
  if tg_op = 'INSERT' then
    v_summary := 'Created';
  elsif jsonb_array_length(new.data -> 'actions') > jsonb_array_length(old.data -> 'actions') then
    v_summary := 'Added an action';
  elsif jsonb_array_length(new.data -> 'actions') < jsonb_array_length(old.data -> 'actions') then
    v_summary := 'Removed an action';
  elsif (new.data -> 'duration') <> (old.data -> 'duration') then
    v_summary := 'Changed play timing';
  elsif (new.data -> 'players') <> (old.data -> 'players') then
    v_summary := 'Edited player motion';
  else
    v_summary := 'Edited play details';
  end if;

  insert into play_versions (play_id, version_number, data, change_summary, created_by)
  values (new.id, v_next, new.data, v_summary, coalesce(auth.uid(), new.created_by));

  return new;
end;
$$;

create trigger trg_plays_snapshot_insert
  after insert on plays
  for each row
  execute function snapshot_play_version();

create trigger trg_plays_snapshot_update
  after update on plays
  for each row
  when (old.data is distinct from new.data)
  execute function snapshot_play_version();

-- ---------------------------------------------------------------------------
-- Restore (UI_WORKFLOWS §10.2)
-- ---------------------------------------------------------------------------

-- Restoring copies an old version's data back onto the play; the snapshot
-- trigger then records that as a NEW version, which this function annotates
-- as a restore. Earlier versions are never touched. SECURITY DEFINER with an
-- explicit coach check (RLS on plays would otherwise be bypassed).
create or replace function restore_play_version(p_play_id uuid, p_version integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_data jsonb;
  v_new integer;
begin
  select team_id into v_team from plays where id = p_play_id;
  if v_team is null then
    raise exception 'Play not found';
  end if;
  if get_user_role(v_team) is distinct from 'coach' then
    raise exception 'Only a coach can restore a version';
  end if;

  select data into v_data
    from play_versions
   where play_id = p_play_id and version_number = p_version;
  if v_data is null then
    raise exception 'Version % not found', p_version;
  end if;

  update plays set data = v_data where id = p_play_id;

  select max(version_number) into v_new from play_versions where play_id = p_play_id;
  update play_versions
     set change_source = 'restore',
         change_summary = 'Restored from v' || p_version,
         restored_from_version = p_version
   where play_id = p_play_id and version_number = v_new;

  return v_new;
end;
$$;

grant execute on function restore_play_version(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table play_versions enable row level security;

-- Version visibility mirrors play visibility exactly: if you can see the
-- play (coach: all team plays; player: published only), you can see its
-- versions (DATA_MODEL §5.1). No client write policies — the trigger and
-- restore function are the only writers.
create policy "versions visible with their play"
  on play_versions for select
  to authenticated
  using (exists (select 1 from plays where plays.id = play_versions.play_id));
