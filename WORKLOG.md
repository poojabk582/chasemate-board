# WORKLOG

App: chasemate-board (Next.js 16 + Supabase)

- Scaffolded Next.js 16 app + installed @supabase/supabase-js -> `npm run build` -> compiled successfully, TypeScript passed
- Wrote .env.local with the two real Supabase values (browser key only) -> verified .gitignore covers `.env*`
- Wrote supabase-sql.sql (table + RLS + 4 policies + demo data) -> file written, not yet run in Supabase
- Wrote src/lib/supabase.ts + src/app/page.tsx (3 distinct states: missing/error/empty) + layout/globals -> `npm run build` -> compiled successfully
- Started `npm run dev` -> GET http://localhost:3000 -> 200, shell + loading skeleton present
- Tested Supabase read with browser key via supabase-js -> returned error PGRST205 "Could not find the table 'public.cases'" -> confirms SQL not yet run; app error state will surface this message
