-- AB3 Activity Library: clubs, user club assignments, and activity visibility.
-- Run in the Supabase SQL Editor before deploying the updated application.

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_name_not_blank check (length(trim(name)) > 0),
  constraint clubs_name_unique unique (name)
);

alter table public.profiles
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

alter table public.activities
  add column if not exists visibility text;

update public.activities
set visibility = 'private'
where visibility is null;

alter table public.activities
  alter column visibility set default 'private',
  alter column visibility set not null;

alter table public.activities
  drop constraint if exists activities_visibility_check;

alter table public.activities
  add constraint activities_visibility_check
  check (visibility in ('private', 'club', 'everyone'));

alter table public.activities
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

update public.activities
set club_id = null
where visibility in ('private', 'everyone');

alter table public.activities
  drop constraint if exists activities_visibility_club_consistency;

alter table public.activities
  add constraint activities_visibility_club_consistency
  check (
    (visibility = 'club' and club_id is not null)
    or
    (visibility in ('private', 'everyone') and club_id is null)
  );

create index if not exists profiles_club_id_idx on public.profiles(club_id);
create index if not exists activities_visibility_idx on public.activities(visibility);
create index if not exists activities_club_id_idx on public.activities(club_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.clubs enable row level security;

-- Re-running this migration is safe.
drop policy if exists "Authenticated users can read clubs" on public.clubs;
drop policy if exists "Admins can create clubs" on public.clubs;
drop policy if exists "Admins can update clubs" on public.clubs;
drop policy if exists "Admins can delete clubs" on public.clubs;

create policy "Authenticated users can read clubs"
on public.clubs for select to authenticated
using (true);

create policy "Admins can create clubs"
on public.clubs for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update clubs"
on public.clubs for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete clubs"
on public.clubs for delete to authenticated
using ((select public.is_admin()));

alter table public.activities enable row level security;

-- IMPORTANT: Remove or tighten any older broad SELECT policy on activities
-- (for example, a policy using true), because permissive policies combine with OR.
drop policy if exists "Users can read permitted activities" on public.activities;
drop policy if exists "Users can create their own activities" on public.activities;
drop policy if exists "Owners can update activities" on public.activities;
drop policy if exists "Owners can delete activities" on public.activities;

create policy "Users can read permitted activities"
on public.activities for select to authenticated
using (
  lower(created_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  or visibility = 'everyone'
  or (
    visibility = 'club'
    and club_id = (
      select club_id from public.profiles where id = (select auth.uid())
    )
  )
  or (select public.is_admin())
);

create policy "Users can create their own activities"
on public.activities for insert to authenticated
with check (
  lower(created_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and (
    (visibility in ('private', 'everyone') and club_id is null)
    or
    (visibility = 'club' and club_id = (
      select club_id from public.profiles where id = (select auth.uid())
    ))
  )
);

create policy "Owners can update activities"
on public.activities for update to authenticated
using (
  lower(created_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  or (select public.is_admin())
)
with check (
  (
    lower(created_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and (
      (visibility in ('private', 'everyone') and club_id is null)
      or
      (visibility = 'club' and club_id = (
        select club_id from public.profiles where id = (select auth.uid())
      ))
    )
  )
  or (select public.is_admin())
);

create policy "Owners can delete activities"
on public.activities for delete to authenticated
using (
  lower(created_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  or (select public.is_admin())
);

-- Regular authenticated clients cannot directly assign club_id or role.
-- Admin assignment is performed by server routes using the service-role client.
revoke update (club_id, role) on public.profiles from authenticated;
