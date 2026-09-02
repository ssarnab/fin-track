-- ===========================================================================
-- FinTrack — migration 008
-- Lets a block be skipped for one specific day without touching the
-- template — it doesn't count as missed, it just doesn't count that day at
-- all (excluded from both the planned and actual totals).
--
-- Safe to re-run. Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- ===========================================================================

alter table public.routine_check add column if not exists excluded boolean not null default false;
