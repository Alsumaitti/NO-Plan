# متتبع الإزالة — Remover Tracker

## Overview

Full-stack Arabic productivity app for tracking commitments to say "No". Users record, log, and track things they commit NOT to do — protecting their time, focus, and energy.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/remover-tracker/`) at path `/`
- **API framework**: Express 5 (`artifacts/api-server/`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Typography**: Arabic fonts (Amiri, Tajawal, Reem Kufi)

## Database Schema

- `log_entries` — recorded "No" entries (refusals with outcome tracking)
- `daily_items` — daily plan items (today's "No" list)
- `master_rules` — permanent ban rules (never-do items)
- `priorities` — today's top 3 priorities (one record per date)
- `if_then_plans` — if/then conditional plans for trigger management

## API Routes

- `GET/POST/PATCH/DELETE /api/log-entries` — CRUD for log entries
- `GET /api/daily-items?date=yyyy-MM-dd` — get items for a specific date (defaults to today)
- `POST /api/daily-items` — create daily item
- `PATCH/DELETE /api/daily-items/:id` — update/delete daily item
- `POST /api/daily-items/archive` — move items from a date into log_entries then delete them
- `GET /api/daily-items/past-dates` — returns dates with un-archived items older than today
- `GET/POST/DELETE /api/master-rules` — permanent rules
- `GET/PUT /api/priorities` — today's priorities (upsert by date)
- `GET/POST/DELETE /api/if-then` — conditional plans
- `GET /api/dashboard/stats` — KPI summary (totalNos, weekNos, hoursRecovered, commitmentRate, streak)
- `GET /api/dashboard/activity` — last 14 days daily counts
- `GET /api/dashboard/by-category` — category breakdown
- `GET /api/export?format=json|csv` — full data export (all 5 tables)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Important Notes

- After codegen, manually fix `lib/api-zod/src/index.ts` to only `export * from "./generated/api";` (not types)
- Date fields from DB are serialized via `serializeRow()` helper in `src/lib/serialize.ts` before Zod validation
- All UI is Arabic RTL — `dir="rtl"` set on HTML root
