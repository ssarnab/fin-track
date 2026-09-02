-- ===========================================================================
-- FinTrack — migration 004
-- Lets a missed routine item carry a note of what actually happened instead
-- (e.g. target sleep 1–8am, actually slept at 3am and worked the other 2h).
--
-- Safe to re-run. Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- ===========================================================================

alter table public.routine_check add column if not exists note text;
