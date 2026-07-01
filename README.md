# FinTrack

Personal **double-entry accounting** app for tracking day-to-day balance. Multi-user.

- **Next.js 15** (App Router) · React 19 · TypeScript · `src/`, alias `@/*`
- **Tailwind CSS v4** — theme via `@theme inline` in `globals.css` (dark default + light toggle)
- **Supabase** — Postgres + RLS + Realtime (data)
- **Firebase** — Google sign-in only (identity)

## Data model

`component` (Asset/Liability/Equity/Income/Expense) → `ledger` (groups) → `journal`
(accounts) → `transactions` (debit ← credit). Every row is owned by a Firebase uid;
RLS matches it to `auth.jwt() ->> 'sub'`.

## One-time setup

### 1. Supabase

1. Create a project. Copy the **Project URL** and **publishable key**
   (Settings → API) → env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   Copy the **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY` (server-only).
2. **SQL Editor → New query** → paste `supabase/001_init.sql` → **Run**.
3. **Authentication → Sign In / Providers → Third-Party Auth → Add Firebase**, and
   enter your Firebase **Project ID**. (This lets Postgres trust Firebase ID tokens so
   RLS works.)

### 2. Firebase

1. Create a project → add a **Web app**. Copy the 6 config values into the
   `NEXT_PUBLIC_FIREBASE_*` env vars.
2. **Authentication → Sign-in method → enable Google**.
3. **Authentication → Settings → Authorized domains** → add `localhost` and your
   Vercel domain.

### 3. Env

Copy `.env.example` → `.env.local` and fill in real values. Then:

```bash
npm install
npm run dev
```

### 4. Vercel

Import the GitHub repo, add all env vars from `.env.example` in Project Settings, deploy.

## Migrations

SQL files in `supabase/` are additive — run new ones in order in the SQL Editor. Never
drop existing data.
