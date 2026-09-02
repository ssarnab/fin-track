-- ===========================================================================
-- FinTrack — migration 005
-- Routine items become real time-blocks (planned start/end), and each day's
-- check gets the actual start/end the user logged — so "% achieved" is a
-- time-weighted ratio across the full 24 hours, not a flat item count.
--
-- Safe to re-run. Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- Existing items keep working (old columns untouched) — use the "Reset to
-- suggested 24h plan" button on the Templates tab in the app to fill in
-- start/end times for the default checklist in one click.
-- ===========================================================================

alter table public.routine_item  add column if not exists start_time time;
alter table public.routine_item  add column if not exists end_time   time;
alter table public.routine_check add column if not exists actual_start time;
alter table public.routine_check add column if not exists actual_end   time;
