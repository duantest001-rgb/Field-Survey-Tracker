-- Field Survey Tracker v5: Users & Teams management
-- Safe to run multiple times after v4.

-- 1) Teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams
  add column if not exists description text,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 2) Add team_id to profiles and survey records
alter table public.profiles
  add column if not exists team_id uuid references public.teams(id);

alter table public.partners
  add column if not exists team_id uuid references public.teams(id);

alter table public.customers
  add column if not exists team_id uuid references public.teams(id);

-- 3) Ensure profile role/status constraints include v5 roles
-- Current MVP uses admin/manager/staff.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('admin','manager','staff'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active','inactive'));
  end if;
end $$;

-- 4) Backfill all existing auth users into profiles as inactive staff, except existing rows.
insert into public.profiles (id, email, display_name, role, status)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'display_name', u.email),
  case when lower(u.email) = lower('duan.test001@gmail.com') then 'admin' else 'staff' end,
  case when lower(u.email) = lower('duan.test001@gmail.com') then 'active' else 'inactive' end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  updated_at = now();

-- 5) Keep bootstrap admin active.
update public.profiles
set role = 'admin', status = 'active', updated_at = now()
where lower(email) = lower('duan.test001@gmail.com');

-- 6) Auto-create profile for future signups.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    case when lower(new.email) = lower('duan.test001@gmail.com') then 'admin' else 'staff' end,
    case when lower(new.email) = lower('duan.test001@gmail.com') then 'active' else 'inactive' end
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- 7) Role helper functions
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p.role
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
    limit 1
  ), 'anonymous');
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select (
    select p.team_id
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
    limit 1
  );
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_user_role() = 'admin'; $$;

create or replace function public.is_app_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_user_role() in ('admin','manager'); $$;

create or replace function public.is_survey_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_app_admin(); $$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_team_id() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_app_manager_or_admin() to authenticated;
grant execute on function public.is_survey_admin() to authenticated;

-- 8) Enable RLS
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.partners enable row level security;
alter table public.customers enable row level security;

-- 9) Profiles policies
-- Admin manages all profiles. Manager can read same-team profiles. Staff can read own profile.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_select_by_role" on public.profiles;
drop policy if exists "profiles_insert_by_admin" on public.profiles;
drop policy if exists "profiles_update_by_admin" on public.profiles;

create policy "profiles_select_by_role"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_app_admin()
  or (
    public.current_user_role() = 'manager'
    and team_id = public.current_user_team_id()
  )
);

create policy "profiles_insert_by_admin"
on public.profiles
for insert
to authenticated
with check (public.is_app_admin());

create policy "profiles_update_by_admin"
on public.profiles
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

-- 10) Teams policies
-- Admin manages all. Manager/staff can read own team.
drop policy if exists "teams_select_by_role" on public.teams;
drop policy if exists "teams_insert_by_admin" on public.teams;
drop policy if exists "teams_update_by_admin" on public.teams;
drop policy if exists "teams_delete_by_admin" on public.teams;

create policy "teams_select_by_role"
on public.teams
for select
to authenticated
using (
  public.is_app_admin()
  or id = public.current_user_team_id()
);

create policy "teams_insert_by_admin"
on public.teams
for insert
to authenticated
with check (public.is_app_admin());

create policy "teams_update_by_admin"
on public.teams
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "teams_delete_by_admin"
on public.teams
for delete
to authenticated
using (public.is_app_admin());

-- 11) Survey record policies with team logic
-- admin   = all non-deleted
-- manager = own team + own/assigned
-- staff   = own/assigned

drop policy if exists "partners_select_by_role" on public.partners;
drop policy if exists "partners_insert_by_role" on public.partners;
drop policy if exists "partners_update_by_role" on public.partners;
drop policy if exists "customers_select_by_role" on public.customers;
drop policy if exists "customers_insert_by_role" on public.customers;
drop policy if exists "customers_update_by_role" on public.customers;

create policy "partners_select_by_role"
on public.partners
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_app_admin()
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
  )
);

create policy "partners_insert_by_role"
on public.partners
for insert
to authenticated
with check (
  public.is_app_admin()
  or created_by = auth.uid()
  or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
);

create policy "partners_update_by_role"
on public.partners
for update
to authenticated
using (
  public.is_app_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
)
with check (
  public.is_app_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
);

create policy "customers_select_by_role"
on public.customers
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_app_admin()
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
  )
);

create policy "customers_insert_by_role"
on public.customers
for insert
to authenticated
with check (
  public.is_app_admin()
  or created_by = auth.uid()
  or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
);

create policy "customers_update_by_role"
on public.customers
for update
to authenticated
using (
  public.is_app_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
)
with check (
  public.is_app_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or (public.current_user_role() = 'manager' and team_id = public.current_user_team_id())
);

-- 12) Optional starter teams. Safe: only inserts when missing.
insert into public.teams (name, description, created_by)
select 'Field Survey', 'ທີມລົງສຳຫຼວດພື້ນທີ່', null
where not exists (select 1 from public.teams where name = 'Field Survey');

insert into public.teams (name, description, created_by)
select 'Follow-up Sales', 'ທີມຕິດຕາມລູກຄ້າ', null
where not exists (select 1 from public.teams where name = 'Follow-up Sales');

-- 13) Check result
select p.email, p.display_name, p.role, p.status, t.name as team_name
from public.profiles p
left join public.teams t on t.id = p.team_id
order by p.created_at desc;
