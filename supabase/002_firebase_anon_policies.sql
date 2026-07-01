-- ===========================================================================
-- FinTrack — migration 002
-- Make RLS work with Firebase third-party auth WITHOUT requiring a
-- `role: authenticated` custom claim (which would need Firebase Cloud
-- Functions / Identity Platform / billing).
--
-- Firebase ID tokens carry no `role` claim, so Supabase runs the query under
-- the `anon` Postgres role. We therefore allow BOTH `anon` and `authenticated`
-- roles, but every policy still requires `uid = current_uid()`, where
-- current_uid() = the VERIFIED Firebase token's `sub`. So:
--   • a real signed-in user sees/writes only their own rows,
--   • a request with no token has current_uid() = NULL → matches nothing.
--
-- Security is preserved: the third-party integration only accepts tokens from
-- YOUR Firebase project (fin-track-2b774).
--
-- Safe to re-run. Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- ===========================================================================

-- Ensure the roles can reach the tables (Supabase grants these by default,
-- but we make it explicit and idempotent).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.component, public.ledger, public.journal, public.transactions
  to anon, authenticated;
grant select on public.journal_balances to anon, authenticated;

-- Recreate every policy for BOTH roles, keeping the ownership check.
do $$
declare t text;
begin
  foreach t in array array['component','ledger','journal','transactions'] loop
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
