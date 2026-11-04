-- AZORA HARDWARE CATALOG MANAGEMENT
-- Run this ONCE in Supabase SQL Editor.

create table if not exists public.azora_hardware_cards (
  id text primary key,
  brand text not null default 'other',
  name text not null,
  category text not null default 'POS Hardware',
  lease text not null default '$0',
  retail text not null default '$0',
  tagline text not null default '',
  image text not null default '',
  stock text not null default 'in_stock',
  specs jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.azora_hardware_cards enable row level security;

drop policy if exists "hardware_public_read_active" on public.azora_hardware_cards;
create policy "hardware_public_read_active"
on public.azora_hardware_cards
for select
to anon, authenticated
using (
  active = true
  or (select auth.jwt() ->> 'email') = 'admin@gmail.com'
);

drop policy if exists "hardware_admin_insert" on public.azora_hardware_cards;
create policy "hardware_admin_insert"
on public.azora_hardware_cards
for insert
to authenticated
with check ((select auth.jwt() ->> 'email') = 'admin@gmail.com');

drop policy if exists "hardware_admin_update" on public.azora_hardware_cards;
create policy "hardware_admin_update"
on public.azora_hardware_cards
for update
to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@gmail.com')
with check ((select auth.jwt() ->> 'email') = 'admin@gmail.com');

drop policy if exists "hardware_admin_delete" on public.azora_hardware_cards;
create policy "hardware_admin_delete"
on public.azora_hardware_cards
for delete
to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@gmail.com');

grant select on public.azora_hardware_cards to anon, authenticated;
grant insert, update, delete on public.azora_hardware_cards to authenticated;

insert into storage.buckets (id, name, public)
values ('hardware-images', 'hardware-images', true)
on conflict (id) do update set public = true;

drop policy if exists "hardware_images_public_read" on storage.objects;
create policy "hardware_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'hardware-images');

drop policy if exists "hardware_images_admin_insert" on storage.objects;
create policy "hardware_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'hardware-images'
  and (select auth.jwt() ->> 'email') = 'admin@gmail.com'
);

drop policy if exists "hardware_images_admin_update" on storage.objects;
create policy "hardware_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'hardware-images'
  and (select auth.jwt() ->> 'email') = 'admin@gmail.com'
)
with check (
  bucket_id = 'hardware-images'
  and (select auth.jwt() ->> 'email') = 'admin@gmail.com'
);

drop policy if exists "hardware_images_admin_delete" on storage.objects;
create policy "hardware_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'hardware-images'
  and (select auth.jwt() ->> 'email') = 'admin@gmail.com'
);
