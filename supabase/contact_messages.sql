-- BSS SOLUTION (1978) — contact form storage
--
-- Run this once in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/vqakoevvzrhlzqlegnpd/sql/new
--
-- Security model: the website uses the PUBLISHABLE (anon) key, which is meant
-- to be public. All protection therefore comes from RLS below — visitors may
-- INSERT a message and nothing else. Reading requires the dashboard or a
-- service-role key, so submissions can never be listed from the browser.

create table if not exists public.contact_messages (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    name        text not null check (char_length(trim(name)) between 1 and 120),
    email       text not null check (char_length(email) between 3 and 200),
    phone       text          check (phone is null or char_length(phone) <= 40),
    message     text not null check (char_length(trim(message)) between 1 and 5000),
    page        text          check (page is null or char_length(page) <= 200),
    user_agent  text          check (user_agent is null or char_length(user_agent) <= 500),
    handled     boolean not null default false
);

comment on table public.contact_messages is
    'Messages submitted from the contact form on bsssolution1978.com';

create index if not exists contact_messages_created_at_idx
    on public.contact_messages (created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────
alter table public.contact_messages enable row level security;

-- Anonymous visitors may only add a row. No select/update/delete policy
-- exists, so with RLS on, every other operation is denied by default.
drop policy if exists "anon can submit contact form" on public.contact_messages;
create policy "anon can submit contact form"
    on public.contact_messages
    for insert
    to anon
    with check (true);

-- Explicitly make sure the anon role cannot read the table even if a
-- permissive policy is added later by mistake.
revoke select, update, delete on public.contact_messages from anon;
grant insert on public.contact_messages to anon;
