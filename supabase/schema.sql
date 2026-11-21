-- Tabel voor de online back-up van de receptenapp.
-- Plak dit in Supabase: SQL Editor -> New query -> Run.

create table if not exists public.recipes (
  user_id    uuid    not null default auth.uid() references auth.users on delete cascade,
  id         text    not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at bigint  not null,
  primary key (user_id, id)
);

-- Iedereen ziet en wijzigt alleen zijn eigen recepten.
alter table public.recipes enable row level security;

drop policy if exists "Eigen recepten" on public.recipes;
create policy "Eigen recepten" on public.recipes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
