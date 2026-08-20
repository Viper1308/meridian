-- MERIDIAN — optional sync table.
-- Only needed if you fill in js/config.js -> supabase.
-- Paste into Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.kv (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  k          text        not null,
  v          jsonb        not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);

alter table public.kv enable row level security;

drop policy if exists "own kv rows" on public.kv;
create policy "own kv rows" on public.kv
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- IMPORTANT for signup email links to work:
-- Supabase dashboard -> Authentication -> URL Configuration -> Site URL
-- Set this to your deployed URL, e.g. https://meridian.yourdomain.com
-- Without this, confirmation emails link to localhost and fail.
