-- ─────────────────────────────────────────────────────────────────────────────
-- Supplemental SQL to run AFTER `drizzle-kit push`/`migrate` creates the tables.
-- Adds the auth.users foreign keys + Row Level Security so users can only read
-- their own rows. Run this in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Tie profiles + analyses to Supabase auth users (cascade on delete).
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

alter table public.scenario_analyses
  add constraint scenario_analyses_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.scenario_analyses enable row level security;

-- A user may read/update only their own profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- A user may read/insert only their own analyses.
create policy "analyses_select_own" on public.scenario_analyses
  for select using (auth.uid() = user_id);
create policy "analyses_insert_own" on public.scenario_analyses
  for insert with check (auth.uid() = user_id);

-- NOTE: the server uses the service-role key (Stripe webhook) and the Postgres
-- connection string (Drizzle) for writes, both of which bypass RLS. These
-- policies protect any direct client access via the anon key.
