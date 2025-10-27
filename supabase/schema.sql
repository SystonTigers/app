-- Enable UUID + auth helpers
create extension if not exists "uuid-ossp";

-- USERS (mirror of auth.users kept in profiles table)
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique not null,
  email text unique not null,
  created_at timestamptz default now()
);

-- TEAMS
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slogan text,
  timezone text not null default 'Europe/London',
  colors jsonb not null default '{}'::jsonb,
  badge_url text,
  plan text not null default 'starter',
  team_code text unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- MEMBERSHIPS (user ↔ team, with role)
create type user_role as enum ('manager','coach','parent','player');
create table if not exists public.team_memberships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role user_role not null default 'parent',
  created_at timestamptz default now(),
  primary key (user_id, team_id)
);

-- INVITES (optional: email invites with codes)
create table if not exists public.team_invites (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  code text not null,
  role user_role not null default 'parent',
  used boolean not null default false,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- MATCHES
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  date_utc timestamptz not null,
  venue text,
  lat double precision,
  lon double precision,
  status text not null default 'scheduled',
  created_at timestamptz default now()
);

-- EVENTS (goal/assist/card/sub/note)
create type event_type as enum ('goal','assist','card_yellow','card_red','sin_bin','sub','note');
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  type event_type not null,
  minute int,
  player_id uuid, -- optional ref to your own players table later
  assist_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================
-- Row Level Security
-- ============================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_invites enable row level security;
alter table public.matches enable row level security;
alter table public.events enable row level security;

-- Helper: get profile.id from auth.uid()
create or replace function public.current_profile_id()
returns uuid language sql stable as $$
  select p.id from public.profiles p where p.auth_id = auth.uid()
$$;

-- Helper: is member of team
create or replace function public.is_member(team uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.team_memberships m
    where m.team_id = team and m.user_id = public.current_profile_id()
  )
$$;

-- Helper: is manager/coach (admin)
create or replace function public.is_staff(team uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.team_memberships m
    where m.team_id = team
      and m.user_id = public.current_profile_id()
      and m.role in ('manager','coach')
  )
$$;

-- Helper: is manager for the given team
create or replace function public.is_manager(team uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.team_memberships m
    where m.team_id = team
      and m.user_id = public.current_profile_id()
      and m.role = 'manager'
  )
$$;

-- PROFILES: a user can see only their own profile row
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = auth_id);

create policy "profiles_self_upsert" on public.profiles
  for insert with check (auth.uid() = auth_id);

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = auth_id);

-- TEAMS:
-- read if member; insert allowed (creates a new team; client fills created_by)
create policy "teams_read_if_member" on public.teams
  for select using (public.is_member(id));

create policy "teams_create" on public.teams
  for insert with check (auth.uid() is not null);

-- update if staff
create policy "teams_update_if_staff" on public.teams
  for update using (public.is_staff(id));

-- MEMBERSHIPS: read own team memberships; insert by staff; delete by staff
create policy "memberships_read_if_member" on public.team_memberships
  for select using (public.is_member(team_id));

create policy "memberships_insert_if_staff" on public.team_memberships
  for insert with check (public.is_staff(team_id));

create policy "memberships_delete_if_staff" on public.team_memberships
  for delete using (public.is_staff(team_id));

-- Update membership role (manager-only), with protections
drop policy if exists "memberships_update_if_manager" on public.team_memberships;

create policy "memberships_update_if_manager"
on public.team_memberships
for update
using (
  public.is_manager(team_id)         -- editor is a manager
  and user_id <> public.current_profile_id()  -- not editing self
  and role <> 'manager'               -- target row is not a manager currently
)
with check (
  public.is_manager(team_id)
  and user_id <> public.current_profile_id()
  and role in ('coach','parent','player')     -- new role is allowed (no elevating to manager here)
);

-- Remove a member (manager-only), not allowed to remove self or managers
drop policy if exists "memberships_delete_if_manager" on public.team_memberships;

create policy "memberships_delete_if_manager"
on public.team_memberships
for delete
using (
  public.is_manager(team_id)
  and user_id <> public.current_profile_id()
  and role <> 'manager'
);

-- INVITES: read if staff; insert if staff; update use-status if staff
create policy "invites_read_if_staff" on public.team_invites
  for select using (public.is_staff(team_id));

create policy "invites_insert_if_staff" on public.team_invites
  for insert with check (public.is_staff(team_id));

create policy "invites_update_if_staff" on public.team_invites
  for update using (public.is_staff(team_id));

-- MATCHES: read if member; insert/update if staff
create policy "matches_read_if_member" on public.matches
  for select using (public.is_member(team_id));

create policy "matches_insert_if_staff" on public.matches
  for insert with check (public.is_staff(team_id));

create policy "matches_update_if_staff" on public.matches
  for update using (public.is_staff(team_id));

-- EVENTS: read if member; insert if staff; (optional) allow players to create 'note'
create policy "events_read_if_member" on public.events
  for select using (
    public.is_member((select team_id from public.matches where id = match_id))
  );

create policy "events_insert_if_staff" on public.events
  for insert with check (
    public.is_staff((select team_id from public.matches where id = match_id))
  );

-- ============================
-- Transfer Ownership Function
-- ============================

create or replace function public.transfer_team_manager(team uuid, new_manager uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Only a current manager can run this
  if not public.is_manager(team) then
    return false;
  end if;

  -- Demote all current managers (except the caller) to coach
  update public.team_memberships
     set role = 'coach'
   where team_id = team
     and role = 'manager'
     and user_id <> public.current_profile_id();

  -- Promote target to manager (insert if they aren't a member yet)
  insert into public.team_memberships (user_id, team_id, role)
  values (new_manager, team, 'manager')
  on conflict (user_id, team_id) do update set role = EXCLUDED.role;

  return true;
end $$;

-- ============================
-- Accept Invite Function
-- ============================

create or replace function public.accept_invite(invite_code text)
returns boolean language plpgsql security definer as $$
declare
  inv public.team_invites%rowtype;
  me uuid;
begin
  select * into inv from public.team_invites where code = invite_code and used = false and expires_at > now();
  if not found then return false; end if;

  me := public.current_profile_id();
  insert into public.team_memberships(user_id, team_id, role)
  values (me, inv.team_id, inv.role)
  on conflict do nothing;

  update public.team_invites set used = true where id = inv.id;
  return true;
end $$;
