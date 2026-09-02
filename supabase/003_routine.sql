-- ===========================================================================
-- FinTrack — migration 003
-- Daily routine / habit tracker. Two templates (workday / offday) of
-- checklist items; which template applies to a given calendar date is
-- recorded explicitly (off days here don't follow a fixed weekday — they
-- shift week to week), and each date+item gets its own done/not-done row.
--
-- Same RLS pattern as 001/002: anon + authenticated roles, ownership
-- enforced by uid = current_uid() (the verified Firebase token's sub).
--
-- Safe to re-run. Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- ===========================================================================

create table if not exists public.routine_item (
  id          bigint generated always as identity primary key,
  uid         text not null default public.current_uid(),
  day_type    text not null check (day_type in ('workday','offday')),
  title       text not null,
  time_label  text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Dev-mode React re-renders the first-run seed effect twice, which could
-- otherwise insert the default checklist items twice. Clean up any
-- duplicates from that (keeps the lowest id of each) before the unique
-- index below makes it impossible going forward.
delete from public.routine_item a
using public.routine_item b
where a.id > b.id
  and a.uid = b.uid
  and a.day_type = b.day_type
  and a.title = b.title;

create unique index if not exists routine_item_uid_daytype_title_key
  on public.routine_item (uid, day_type, title);

create table if not exists public.routine_day (
  uid       text not null default public.current_uid(),
  date      date not null,
  day_type  text not null check (day_type in ('workday','offday')),
  primary key (uid, date)
);

create table if not exists public.routine_check (
  uid       text not null default public.current_uid(),
  date      date not null,
  item_id   bigint not null references public.routine_item(id) on delete cascade,
  done      boolean not null default false,
  done_at   timestamptz,
  primary key (uid, date, item_id)
);

create index if not exists idx_routine_item_uid_type on public.routine_item (uid, day_type, sort_order);
create index if not exists idx_routine_check_uid_date on public.routine_check (uid, date);

alter table public.routine_item  enable row level security;
alter table public.routine_day   enable row level security;
alter table public.routine_check enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.routine_item, public.routine_day, public.routine_check
  to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['routine_item','routine_day','routine_check'] loop
    execute format('drop policy if exists own_select on public.%I', t);
    execute format('drop policy if exists own_insert on public.%I', t);
    execute format('drop policy if exists own_update on public.%I', t);
    execute format('drop policy if exists own_delete on public.%I', t);

    execute format($p$create policy own_select on public.%I
      for select to anon, authenticated using (uid = public.current_uid())$p$, t);
    execute format($p$create policy own_insert on public.%I
      for insert to anon, authenticated with check (uid = public.current_uid())$p$, t);
    execute format($p$create policy own_update on public.%I
      for update to anon, authenticated using (uid = public.current_uid())
      with check (uid = public.current_uid())$p$, t);
    execute format($p$create policy own_delete on public.%I
      for delete to anon, authenticated using (uid = public.current_uid())$p$, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['routine_item','routine_day','routine_check'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
