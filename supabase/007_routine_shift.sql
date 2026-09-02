-- ===========================================================================
-- FinTrack — migration 007
-- Per-day schedule shift — "everything today happens 1h later than the
-- template says" — without touching the template itself. Pure display/
-- planning offset; duration-based % achievement is unaffected by it.
--
-- Safe to re-run. Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- ===========================================================================

alter table public.routine_day add column if not exists shift_minutes integer not null default 0;
