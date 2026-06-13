-- 0004_progress_and_team_mgmt.sql — M9: studied tracking + team management.
--
-- Doc notes:
--   * play_progress is required by ROADMAP M9 and referenced by
--     UI_WORKFLOWS §8.7 ("Tapping 'Mark studied' updates play_progress"),
--     but DATA_MODEL.md never defines the table. Defined here; flagged as a
--     DATA_MODEL gap to backfill.
--   * get_team_members() is SECURITY DEFINER because member names/emails
--     live in auth.users, which clients cannot read; the function is
--     coach-gated (the /team page is coach-only, UI_WORKFLOWS §11).

-- ---------------------------------------------------------------------------
-- play_progress: who has studied which play
-- ---------------------------------------------------------------------------

create table play_progress (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references plays (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  studied_at timestamptz not null default now(),
  unique (play_id, user_id)
);

create index idx_play_progress_user_id on play_progress (user_id);

alter table play_progress enable row level security;

-- A user manages only their own progress, and only for plays they can see
-- (the plays RLS applies inside the exists()).
create policy "user reads own progress"
  on play_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy "user marks plays studied"
  on play_progress for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from plays where plays.id = play_progress.play_id)
  );

create policy "user unmarks plays studied"
  on play_progress for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Team management (UI_WORKFLOWS §11)
-- ---------------------------------------------------------------------------

-- The owner can remove members from their team — but never themselves
-- (§11.4: the owner can't be removed; dissolving the team is Delete team).
create policy "owner removes team members"
  on team_memberships for delete
  to authenticated
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from teams
      where teams.id = team_memberships.team_id
        and teams.owner_id = auth.uid()
    )
  );

-- Replace the M1 "leave team" policy so the OWNER can't leave their own team
-- (§11.4). A non-owner player may still remove their own membership. Without
-- this the owner clause above is moot — delete policies OR together, and the
-- original policy allowed any user (incl. the owner) to delete their own row.
drop policy if exists "user can delete own membership" on team_memberships;
create policy "non-owner can leave team"
  on team_memberships for delete
  to authenticated
  using (
    user_id = auth.uid()
    and not exists (
      select 1 from teams
      where teams.id = team_memberships.team_id
        and teams.owner_id = auth.uid()
    )
  );

-- Roster with names/emails for the coach-only team page.
create or replace function get_team_members(p_team_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  email text,
  role text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if get_user_role(p_team_id) is distinct from 'coach' then
    raise exception 'Only a coach can view the roster';
  end if;

  return query
  select
    tm.id,
    tm.user_id,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.email, 'Unknown') as full_name,
    u.email::text,
    tm.role::text,
    tm.joined_at
  from team_memberships tm
  join auth.users u on u.id = tm.user_id
  where tm.team_id = p_team_id
  order by (tm.role = 'coach') desc, lower(coalesce(u.raw_user_meta_data ->> 'full_name', u.email));
end;
$$;

grant execute on function get_team_members(uuid) to authenticated;
