-- Run in Supabase SQL Editor once before deploying the Titan integration.
alter table public.azora_leads
  add column if not exists email_status text default 'pending',
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text,
  add column if not exists read boolean not null default false,
  add column if not exists read_at timestamptz;
-- Optional: ensure ref is unique after checking and cleaning any old duplicate refs.
-- create unique index if not exists azora_leads_unique_ref on public.azora_leads(ref) where ref is not null;
