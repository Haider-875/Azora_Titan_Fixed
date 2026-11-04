-- AZORA DASHBOARD USERS & ROLES
-- Run once in Supabase SQL Editor.

create table if not exists public.azora_dashboard_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'viewer' check (role in ('admin','manager','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.azora_dashboard_users enable row level security;

create or replace function public.azora_user_has_role(allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email','')) = 'admin@gmail.com'
    or exists (
      select 1 from public.azora_dashboard_users u
      where lower(u.email)=lower(coalesce(auth.jwt() ->> 'email',''))
        and u.active = true
        and u.role = any(allowed_roles)
    );
$$;

revoke all on function public.azora_user_has_role(text[]) from public;
grant execute on function public.azora_user_has_role(text[]) to authenticated;

drop policy if exists "dashboard_users_admin_all" on public.azora_dashboard_users;
create policy "dashboard_users_admin_all"
on public.azora_dashboard_users
for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) = 'admin@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email','')) = 'admin@gmail.com');

drop policy if exists "dashboard_users_self_read" on public.azora_dashboard_users;
create policy "dashboard_users_self_read"
on public.azora_dashboard_users
for select to authenticated
using (lower(email)=lower(coalesce(auth.jwt() ->> 'email','')));

grant select on public.azora_dashboard_users to authenticated;
grant insert, update, delete on public.azora_dashboard_users to authenticated;

-- Leads: all active dashboard users can read; only Supabase/service-side forms should insert.
drop policy if exists "admin_can_read_leads" on public.azora_leads;
drop policy if exists "dashboard_users_read_leads" on public.azora_leads;
create policy "dashboard_users_read_leads"
on public.azora_leads
for select to authenticated
using (public.azora_user_has_role(array['admin','manager','viewer']));
grant select on public.azora_leads to authenticated;

-- Hardware: active cards are public; admin/manager can manage the catalog.
drop policy if exists "hardware_public_read_active" on public.azora_hardware_cards;
create policy "hardware_public_read_active"
on public.azora_hardware_cards
for select to anon, authenticated
using (active = true or public.azora_user_has_role(array['admin','manager']));

drop policy if exists "hardware_admin_insert" on public.azora_hardware_cards;
create policy "hardware_dashboard_insert"
on public.azora_hardware_cards
for insert to authenticated
with check (public.azora_user_has_role(array['admin','manager']));

drop policy if exists "hardware_admin_update" on public.azora_hardware_cards;
create policy "hardware_dashboard_update"
on public.azora_hardware_cards
for update to authenticated
using (public.azora_user_has_role(array['admin','manager']))
with check (public.azora_user_has_role(array['admin','manager']));

drop policy if exists "hardware_admin_delete" on public.azora_hardware_cards;
create policy "hardware_dashboard_delete"
on public.azora_hardware_cards
for delete to authenticated
using (public.azora_user_has_role(array['admin','manager']));

grant select on public.azora_hardware_cards to anon, authenticated;
grant insert, update, delete on public.azora_hardware_cards to authenticated;

-- Storage: public image viewing; admin/manager uploads and edits.
drop policy if exists "hardware_images_admin_insert" on storage.objects;
create policy "hardware_images_dashboard_insert"
on storage.objects for insert to authenticated
with check (bucket_id='hardware-images' and public.azora_user_has_role(array['admin','manager']));

drop policy if exists "hardware_images_admin_update" on storage.objects;
create policy "hardware_images_dashboard_update"
on storage.objects for update to authenticated
using (bucket_id='hardware-images' and public.azora_user_has_role(array['admin','manager']))
with check (bucket_id='hardware-images' and public.azora_user_has_role(array['admin','manager']));

drop policy if exists "hardware_images_admin_delete" on storage.objects;
create policy "hardware_images_dashboard_delete"
on storage.objects for delete to authenticated
using (bucket_id='hardware-images' and public.azora_user_has_role(array['admin','manager']));
