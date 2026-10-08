-- ============================================================
-- BLOCK 1 — run first in the Supabase SQL editor.
-- Safe to re-run: drops the policies first so it never
-- errors on "policy already exists".
-- ============================================================

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  track text not null,
  chase_date date not null,
  fee numeric not null default 0,
  outcome text not null default 'open'
);

alter table public.cases enable row level security;

drop policy if exists "cases_select" on public.cases;
drop policy if exists "cases_insert" on public.cases;
drop policy if exists "cases_update" on public.cases;
drop policy if exists "cases_delete" on public.cases;

create policy "cases_select" on public.cases
  for select to anon, authenticated using (true);

create policy "cases_insert" on public.cases
  for insert to anon, authenticated with check (true);

create policy "cases_update" on public.cases
  for update to anon, authenticated using (true) with check (true);

create policy "cases_delete" on public.cases
  for delete to anon, authenticated using (true);

-- ============================================================
-- BLOCK 2 — run after Block 1. Safe to re-run too: deletes
-- existing demo rows first so you never double the list.
-- ============================================================

delete from public.cases;

insert into public.cases (name, track, chase_date, fee, outcome) values
  ('Priya Sharma',  'flat search',      current_date - 2, 1200, 'open'),
  ('Arjun Mehta',   'job application',  current_date - 6, 400,  'open'),
  ('Kavya Iyer',    'form to send',     current_date - 1, 250,  'open'),
  ('Rohan Gupta',   'letter to answer', current_date,      300,  'open'),
  ('Sneha Patel',   'flat search',      current_date + 3,  900,  'open'),
  ('Vikram Singh',  'job application',  current_date - 4,  500,  'called'),
  ('Ananya Rao',    'form to send',     current_date + 1,  180,  'open'),
  ('Aditya Nair',   'letter to answer', current_date - 9,  350,  'open'),
  ('Meera Reddy',   'flat search',      current_date + 7,  1500, 'open'),
  ('Dev Joshi',     'job application',  current_date + 2,  450,  'sent'),
  ('Nisha Kapoor',  'form to send',     current_date + 5,  220,  'open'),
  ('Kabir Khan',    'letter to answer', current_date - 12, 400,  'called');
