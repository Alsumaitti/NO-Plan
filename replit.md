# متتبع الإزالة — Remover Tracker

## Overview

Full-stack bilingual (Arabic/English) productivity app for tracking commitments to say "No". Users record, log, and track things they commit NOT to do — protecting their time, focus, and energy. **V2** adds Clerk authentication with per-user data isolation, bilingual UI (AR/EN), dark mode, multi-step onboarding, custom categories, enhanced dashboard with streaks and customizable widgets, date-range log filtering, bilingual CSV export, and a full settings page.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/remover-tracker/`) at path `/`
- **API framework**: Express 5 (`artifacts/api-server/`)
- **Auth**: Clerk v6 (frontend ClerkProvider + backend clerkMiddleware + requireAuth)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Typography**: Arabic fonts (Amiri, Tajawal, Reem Kufi)
- **i18n**: Custom AppContext with AR/EN T() function

## Auth Architecture

- Clerk is initialized with `VITE_CLERK_PUBLISHABLE_KEY` (frontend) and `CLERK_SECRET_KEY` (backend)
- `vite.config.ts` has a `define` block to expose `process.env.VITE_CLERK_PUBLISHABLE_KEY` at build time
- Backend middleware: `clerkMiddleware()` on all routes + `requireAuth` on protected routes
- `requireAuth` sets `req.userId` from `getAuth(req).userId`; returns 401 if not signed in
- All DB queries are scoped by `req.userId` for data isolation
- Guest landing page → Clerk sign-in/sign-up → 4-step onboarding → Dashboard

## Pages (all in `artifacts/remover-tracker/src/pages/`)

| File | Purpose |
|------|---------|
| `landing.tsx` | Public landing page with hero, feature cards, auth CTAs |
| `onboarding.tsx` | 4-step wizard (welcome → categories → commitment → done) |
| `dashboard.tsx` | KPI stats, streak, best streak, last login, customizable widgets, charts |
| `tracker.tsx` | Log entries with date-range filter, bulk delete, bilingual CSV export |
| `daily-plan.tsx` | Daily "No" planning with category, source, hoursRecovered fields |
| `master-rules.tsx` | Permanent ban rules with reason and category |
| `review.tsx` | Weekly review journal prompts |
| `strategy.tsx` | Removal strategy principles |
| `settings.tsx` | Language, theme, widget visibility, custom categories, account deletion |

## Database Schema

- `log_entries` — recorded "No" entries (refusals with outcome tracking), scoped by `userId`
- `daily_items` — daily plan items (today's "No" list), scoped by `userId`
- `master_rules` — permanent ban rules, scoped by `userId`
- `priorities` — today's top 3 priorities, scoped by `userId`
- `if_then_plans` — conditional plans, scoped by `userId`
- `user_settings` — per-user preferences (language, theme, widgets, customCategories)

## API Routes

All routes prefixed with `/api` and protected by `requireAuth` (except health check).

- `GET/POST/PATCH/DELETE /api/log-entries` — CRUD for log entries
- `GET /api/daily-items?date=yyyy-MM-dd` — get items for a specific date
- `POST /api/daily-items` — create daily item
- `PATCH/DELETE /api/daily-items/:id` — update/delete daily item
- `POST /api/daily-items/archive` — move items into log_entries
- `GET /api/daily-items/past-dates` — dates with un-archived items
- `GET/POST/DELETE /api/master-rules` — permanent rules
- `GET/PUT /api/priorities` — today's priorities
- `GET/POST/DELETE /api/if-then` — conditional plans
- `GET /api/dashboard/stats` — KPI summary (streak, bestStreak, todayNos, monthNos, totalNos, hoursRecovered, commitmentRate, recentActivity, categoryBreakdown, lastLogin)
- `GET/PUT /api/settings` — user settings (language, theme, dashboardWidgets, customCategories, lastLogin)
- `DELETE /api/account-data` — delete all data for current user
- `GET /api/export?lang=ar|en&from&to&category&outcome` — bilingual CSV export

## Key Files

- `artifacts/remover-tracker/src/App.tsx` — ClerkProvider + routing (landing, onboarding, protected pages)
- `artifacts/remover-tracker/src/components/layout.tsx` — user menu, streak banner, AR/EN toggle, dark mode toggle
- `artifacts/remover-tracker/src/lib/i18n.ts` — full AR/EN translation strings
- `artifacts/remover-tracker/src/lib/AppContext.tsx` — language/theme context + T() helper
- `artifacts/remover-tracker/src/index.css` — dark mode CSS vars, sidebar tokens, RTL utilities
- `artifacts/remover-tracker/public/logo.svg` — branded gold shield logo
- `artifacts/remover-tracker/vite.config.ts` — `define` block exposing Clerk env vars

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Important Notes

- Date fields from DB are serialized via `serializeRow()` helper in `src/lib/serialize.ts`
- All DB queries must include `.where(eq(table.userId, req.userId))` for data isolation
- Dashboard stats endpoint returns: `{ streak, bestStreak, todayNos, monthNos, totalNos, hoursRecovered, commitmentRate, recentActivity[], categoryBreakdown[], lastLogin }`
- User settings: `{ language: "ar"|"en", theme: "light"|"dark", dashboardWidgets: string[], customCategories: string[], lastLogin: string }`
- Copyright footer: "أسامه السميطي" / "Osama Al-Sumaiti"
