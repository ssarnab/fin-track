-- ===========================================================================
-- FinTrack — initial schema (Postgres / Supabase)
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Multi-user model: every row is owned by a Firebase uid stored in `uid`
-- (text). RLS matches it against `auth.jwt() ->> 'sub'`, which equals the
-- Firebase uid once Supabase "Third-Party Auth (Firebase)" is enabled.
--
-- Migrations are additive. This file is safe to re-run (IF NOT EXISTS guards).
-- ===========================================================================

-- Helper: current Firebase uid from the verified JWT.
create or replace function public.current_uid()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::text;
$$;

-- ---------------------------------------------------------------------------
-- COMPONENT  (top-level category: Asset, Liability, Equity, Income, Expense)
-- `kind` drives balance direction and reporting.
-- ---------------------------------------------------------------------------
create table if not exists public.component (
  id          bigint generated always as identity primary key,
  uid         text not null default public.current_uid(),
  name        text not null,
  kind        text not null default 'asset'
              check (kind in ('asset','liability','equity','income','expense')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (uid, name)
);

-- ---------------------------------------------------------------------------
-- LEDGER  (group under a component: Card, Cash, Lend, Capital …)
-- ---------------------------------------------------------------------------
create table if not exists public.ledger (
  id            bigint generated always as identity primary key,
  uid           text not null default public.current_uid(),
  component_id  bigint not null references public.component(id) on delete cascade,
  name          text not null,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  unique (uid, component_id, name)
);

-- ---------------------------------------------------------------------------
-- JOURNAL  (actual account / leaf: individual names)
-- ---------------------------------------------------------------------------
create table if not exists public.journal (
  id          bigint generated always as identity primary key,
  uid         text not null default public.current_uid(),
  ledger_id   bigint not null references public.ledger(id) on delete cascade,
  name        text not null,
  is_active   boolean not null default true,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (uid, ledger_id, name)
);

-- ---------------------------------------------------------------------------
-- TRANSACTIONS  (double entry: money moves OUT of credit → IN to debit)
--   In  (form) = debit_journal_id   (destination)
--   Out (form) = credit_journal_id  (source)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id                 bigint generated always as identity primary key,
  uid                text not null default public.current_uid(),
  txn_date           date not null default current_date,
  debit_journal_id   bigint not null references public.journal(id) on delete restrict,
  credit_journal_id  bigint not null references public.journal(id) on delete restrict,
  amount             numeric(18,2) not null check (amount > 0),
  remarks            text,
  created_at         timestamptz not null default now(),
  check (debit_journal_id <> credit_journal_id)
);

create index if not exists idx_txn_uid_date on public.transactions (uid, txn_date desc);
create index if not exists idx_txn_debit  on public.transactions (debit_journal_id);
create index if not exists idx_txn_credit on public.transactions (credit_journal_id);
create index if not exists idx_ledger_component on public.ledger (component_id);
create index if not exists idx_journal_ledger on public.journal (ledger_id);

-- ---------------------------------------------------------------------------
-- Balance view (per journal). security_invoker => the caller's RLS applies.
-- `balance` is signed by the component's normal side so normal balances are +.
-- ---------------------------------------------------------------------------
create or replace view public.journal_balances
with (security_invoker = true) as
select
  j.id                         as journal_id,
  j.uid                        as uid,
  j.name                       as journal_name,
  l.id                         as ledger_id,
  l.name                       as ledger_name,
  c.id                         as component_id,
  c.name                       as component_name,
  c.kind                       as component_kind,
  coalesce(d.total, 0)         as debit_total,
  coalesce(cr.total, 0)        as credit_total,
  case when c.kind in ('asset','expense')
       then coalesce(d.total, 0) - coalesce(cr.total, 0)
       else coalesce(cr.total, 0) - coalesce(d.total, 0)
  end                          as balance
from public.journal j
join public.ledger l    on l.id = j.ledger_id
join public.component c on c.id = l.component_id
left join (
  select debit_journal_id as jid, sum(amount) as total
  from public.transactions group by debit_journal_id
) d  on d.jid = j.id
left join (
  select credit_journal_id as jid, sum(amount) as total
  from public.transactions group by credit_journal_id
) cr on cr.jid = j.id;

-- ---------------------------------------------------------------------------
-- Row Level Security — each user sees/writes only their own rows.
-- ---------------------------------------------------------------------------
alter table public.component    enable row level security;
alter table public.ledger       enable row level security;
alter table public.journal      enable row level security;
alter table public.transactions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['component','ledger','journal','transactions'] loop
    execute format('drop policy if exists own_select on public.%I', t);
    execute format('drop policy if exists own_insert on public.%I', t);
    execute format('drop policy if exists own_update on public.%I', t);
    execute format('drop policy if exists own_delete on public.%I', t);

    execute format($p$create policy own_select on public.%I
      for select to authenticated using (uid = public.current_uid())$p$, t);
    execute format($p$create policy own_insert on public.%I
      for insert to authenticated with check (uid = public.current_uid())$p$, t);
    execute format($p$create policy own_update on public.%I
      for update to authenticated using (uid = public.current_uid())
      with check (uid = public.current_uid())$p$, t);
    execute format($p$create policy own_delete on public.%I
      for delete to authenticated using (uid = public.current_uid())$p$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime — stream changes to the client.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['component','ledger','journal','transactions'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
