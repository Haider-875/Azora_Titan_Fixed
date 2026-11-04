-- ============================================================================
-- AZORA SOLUTIONS — PROFESSIONAL LEAD NOTIFICATION & REALTIME SYSTEM
-- Run this complete script in the Supabase SQL Editor.
-- ============================================================================

-- 1. Extend the azora_leads table with notification & status tracking columns
alter table public.azora_leads 
  add column if not exists email_status text default 'pending',
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text,
  add column if not exists read boolean not null default false,
  add column if not exists read_at timestamptz;

-- 2. Create performance indexes for real-time dashboard and lead querying
create index if not exists azora_leads_created_at_idx 
  on public.azora_leads (created_at desc);

create index if not exists azora_leads_event_type_idx 
  on public.azora_leads (event_type);

create index if not exists azora_leads_read_idx 
  on public.azora_leads (read);

create index if not exists azora_leads_email_status_idx 
  on public.azora_leads (email_status);

-- 3. Enable Row Level Security
alter table public.azora_leads enable row level security;

-- 4. RLS Policy: Public visitors can insert leads (with check true)
drop policy if exists "public_can_insert_leads" on public.azora_leads;
create policy "public_can_insert_leads"
on public.azora_leads
for insert
to anon, authenticated
with check (true);

-- 5. RLS Policy: Authenticated users can read leads
drop policy if exists "admin_can_read_leads" on public.azora_leads;
create policy "admin_can_read_leads"
on public.azora_leads
for select
to authenticated
using (true);

-- 6. RLS Policy: Authenticated users can update leads (e.g., mark as read, update notes)
drop policy if exists "admin_can_update_leads" on public.azora_leads;
create policy "admin_can_update_leads"
on public.azora_leads
for update
to authenticated
using (true)
with check (true);

-- 7. RLS Policy: Authenticated users can delete leads
drop policy if exists "admin_can_delete_leads" on public.azora_leads;
create policy "admin_can_delete_leads"
on public.azora_leads
for delete
to authenticated
using (true);

-- Grant appropriate permissions
grant insert on public.azora_leads to anon, authenticated;
grant select, update, delete on public.azora_leads to authenticated;
grant all on public.azora_leads to service_role;

-- 8. Enable Realtime on azora_leads table
-- This allows the dashboard to receive instant notifications when a new lead is submitted.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'azora_leads'
  ) then
    alter publication supabase_realtime add table public.azora_leads;
  end if;
end $$;

-- 9. Verification Query
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'azora_leads'
order by ordinal_position;

