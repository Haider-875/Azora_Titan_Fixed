-- AZORA DASHBOARD FIX
-- Your dashboard is currently signed in as admin@gmail.com.
-- Run this ONE script in Supabase SQL Editor.
-- Do NOT delete the azora_leads table or its existing rows.

alter table public.azora_leads enable row level security;

drop policy if exists "admin_can_read_leads" on public.azora_leads;

create policy "admin_can_read_leads"
on public.azora_leads
for select
to authenticated
using (
  (select auth.jwt() ->> 'email') = 'admin@gmail.com'
);

grant select on public.azora_leads to authenticated;

-- Verify the policy exists:
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'azora_leads';
