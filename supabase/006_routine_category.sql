-- ===========================================================================
-- FinTrack — migration 006
-- Groups routine blocks into categories (Work, Exercise, Sleep, …) so the
-- Progress tab can total actual hours and time-allocation % per category
-- across the whole window, not just per individual block.
--
-- Safe to re-run. Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- ===========================================================================

alter table public.routine_item add column if not exists category text;
