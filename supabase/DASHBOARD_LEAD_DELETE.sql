-- Allow only the main Azora admin to delete dashboard lead entries.
-- Run this once in Supabase SQL Editor. Existing lead rows are preserved.

alter table public.azora_leads enable row level security;

drop policy if exists "admin_can_delete_leads" on public.azora_leads;
create policy "admin_can_delete_leads"
on public.azora_leads
for delete
to authenticated
using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'admin@gmail.com');

grant delete on public.azora_leads to authenticated;
