-- Field Survey Tracker v3 - Actual Schema Safe Migration
-- Based on current DB inspection:
-- tables: admins, audit_logs, customers, partners, profiles
-- current data: admins=1, partners=2, customers=0, profiles=0
-- Purpose: non-destructive schema repair + safer RLS + soft-delete support.
-- IMPORTANT: This script does not DROP/TRUNCATE data.

begin;

-- 0) Ensure useful extensions are available.
create extension if not exists pgcrypto;

-- 1) Repair/extend admins table safely.
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

alter table public.admins
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists email text,
  add column if not exists created_at timestamptz default now();

-- Bootstrap your admin email without relying on a unique constraint.
insert into public.admins (email)
select 'duan.test001@gmail.com'
where not exists (
  select 1 from public.admins
  where lower(coalesce(email, '')) = lower('duan.test001@gmail.com')
);

-- 2) Extend partners/customers without destroying existing rows.
alter table if exists public.partners
  add column if not exists updated_at timestamptz default now(),
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists village text,
  add column if not exists follow_up_date date,
  add column if not exists priority text,
  add column if not exists next_action text,
  add column if not exists source text;

alter table if exists public.customers
  add column if not exists updated_at timestamptz default now(),
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists village text,
  add column if not exists follow_up_date date,
  add column if not exists priority text,
  add column if not exists next_action text,
  add column if not exists source text;

-- 3) Admin helper function. Checks either user_id or email in JWT.
create or replace function public.is_survey_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
       or lower(coalesce(a.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_survey_admin() to authenticated;

-- Optional compatibility wrapper for older policies/functions that already call is_admin().
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_survey_admin();
$$;

grant execute on function public.is_admin() to authenticated;

-- 4) Enable RLS.
alter table public.admins enable row level security;
alter table public.partners enable row level security;
alter table public.customers enable row level security;
alter table public.profiles enable row level security;

-- 5) Remove old broad/open policies discovered in your CSV plus previous v2 policies.
-- Admins
drop policy if exists "Authenticated can read admins" on public.admins;
drop policy if exists admins_select_policy on public.admins;
drop policy if exists admins_insert_policy on public.admins;
drop policy if exists admins_update_policy on public.admins;
drop policy if exists admins_delete_policy on public.admins;

-- Partners: your current policies are permissive true, so they must be removed.
drop policy if exists partners_select on public.partners;
drop policy if exists partners_insert on public.partners;
drop policy if exists partners_update on public.partners;
drop policy if exists partners_delete on public.partners;
drop policy if exists partners_select_policy on public.partners;
drop policy if exists partners_insert_policy on public.partners;
drop policy if exists partners_update_policy on public.partners;
drop policy if exists partners_delete_policy on public.partners;

-- Customers: your current policies are permissive true, so they must be removed.
drop policy if exists customers_select on public.customers;
drop policy if exists customers_insert on public.customers;
drop policy if exists customers_update on public.customers;
drop policy if exists customers_delete on public.customers;
drop policy if exists customers_select_policy on public.customers;
drop policy if exists customers_insert_policy on public.customers;
drop policy if exists customers_update_policy on public.customers;
drop policy if exists customers_delete_policy on public.customers;

-- Profiles: replace with own-profile write/read all authenticated.
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can read all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

-- 6) Create safer policies.
create policy admins_select_policy on public.admins
for select to authenticated
using (public.is_survey_admin());

create policy admins_insert_policy on public.admins
for insert to authenticated
with check (public.is_survey_admin());

create policy admins_update_policy on public.admins
for update to authenticated
using (public.is_survey_admin())
with check (public.is_survey_admin());

create policy admins_delete_policy on public.admins
for delete to authenticated
using (public.is_survey_admin());

-- Partners: admin sees all active rows; users see their own/assigned rows.
-- Legacy rows with created_by NULL are visible temporarily to authenticated users so your old 2 partner records do not disappear.
-- After assigning owners, remove the `created_by is null` line for stricter privacy.
create policy partners_select_policy on public.partners
for select to authenticated
using (
  deleted_at is null
  and (
    public.is_survey_admin()
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or created_by is null
  )
);

create policy partners_insert_policy on public.partners
for insert to authenticated
with check (
  public.is_survey_admin()
  or created_by = auth.uid()
  or created_by is null
);

create policy partners_update_policy on public.partners
for update to authenticated
using (
  public.is_survey_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or created_by is null
)
with check (
  public.is_survey_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or created_by is null
);

-- Hard delete only by admin. App should use soft delete via deleted_at.
create policy partners_delete_policy on public.partners
for delete to authenticated
using (public.is_survey_admin());

-- Customers: same structure.
create policy customers_select_policy on public.customers
for select to authenticated
using (
  deleted_at is null
  and (
    public.is_survey_admin()
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or created_by is null
  )
);

create policy customers_insert_policy on public.customers
for insert to authenticated
with check (
  public.is_survey_admin()
  or created_by = auth.uid()
  or created_by is null
);

create policy customers_update_policy on public.customers
for update to authenticated
using (
  public.is_survey_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or created_by is null
)
with check (
  public.is_survey_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or created_by is null
);

create policy customers_delete_policy on public.customers
for delete to authenticated
using (public.is_survey_admin());

-- Profiles
create policy profiles_select_authenticated on public.profiles
for select to authenticated
using (true);

create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_survey_admin())
with check (id = auth.uid() or public.is_survey_admin());

-- 7) Storage bucket/policies. Safe to rerun.
insert into storage.buckets (id, name, public)
values ('survey-photos', 'survey-photos', true)
on conflict (id) do update set public = true;

drop policy if exists survey_photos_select_policy on storage.objects;
drop policy if exists survey_photos_insert_policy on storage.objects;
drop policy if exists survey_photos_update_policy on storage.objects;
drop policy if exists survey_photos_delete_policy on storage.objects;

create policy survey_photos_select_policy on storage.objects
for select to public
using (bucket_id = 'survey-photos');

create policy survey_photos_insert_policy on storage.objects
for insert to authenticated
with check (
  bucket_id = 'survey-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_survey_admin()
  )
);

create policy survey_photos_update_policy on storage.objects
for update to authenticated
using (
  bucket_id = 'survey-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_survey_admin()
  )
)
with check (
  bucket_id = 'survey-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_survey_admin()
  )
);

create policy survey_photos_delete_policy on storage.objects
for delete to authenticated
using (
  bucket_id = 'survey-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_survey_admin()
  )
);

commit;

-- Run these after migration to verify:
-- select 'admins' as table_name, count(*) as total from public.admins
-- union all select 'partners', count(*) from public.partners
-- union all select 'customers', count(*) from public.customers
-- union all select 'profiles', count(*) from public.profiles;
--
-- select table_name, column_name, data_type from information_schema.columns
-- where table_schema='public' and table_name in ('admins','partners','customers','profiles')
-- order by table_name, ordinal_position;
--
-- select tablename, policyname, cmd, qual, with_check from pg_policies
-- where schemaname='public' and tablename in ('admins','partners','customers','profiles')
-- order by tablename, policyname;
