# Deploy — NO · Productivity Plan

End-to-end deploy recipe for this monorepo on **Vercel + Neon Postgres + Clerk**.

---

## 1. Architecture at a glance

```
Browser ──► Vercel Static (Vite/React)  ──►  /api/* (Vercel Function: Express)
                                                     │
                                                     ├─► Clerk (auth)
                                                     └─► Neon Postgres (Drizzle)
```

- **Frontend**: `artifacts/remover-tracker` (Vite 6 + React 19 + Tailwind v4)
  builds to `artifacts/remover-tracker/dist/public`.
- **Backend**: `artifacts/api-server` (Express + Clerk Express SDK + Drizzle)
  is wrapped as a single Vercel Function at `api/index.ts` and handles every
  `/api/*` request via the rewrite in `vercel.json`.
- **DB**: Postgres (Neon) via `pg` driver — `lib/db/src/index.ts` opens a pool
  from `DATABASE_URL`.
- **Auth**: Clerk — the React SDK on the client, the Express SDK on the
  server (`clerkMiddleware()` + `requireAuth()`).

---

## 2. Required environment variables

Set each one on **Vercel → Project → Settings → Environment Variables**
(for all of Production, Preview, Development unless noted).

| Variable | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | Server + Build | Neon Postgres connection string. Include `?sslmode=require`. |
| `CLERK_SECRET_KEY` | Server | `sk_live_…` or `sk_test_…`. Never expose to client. |
| `VITE_CLERK_PUBLISHABLE_KEY` | **Build** | `pk_live_…` or `pk_test_…`. Inlined into the client bundle by Vite at build time. |
| `VITE_CLERK_PROXY_URL` | Build (optional) | Set only if you run the `/api/__clerk` proxy on a custom domain. Leave empty for vanilla Vercel deploys. |
| `NODE_ENV` | auto | Vercel sets this to `production`. |

> **Heads-up:** the two `VITE_*` variables are read at **build time** by
> `vite.config.ts`. After changing them you must trigger a redeploy — env
> changes alone won't touch the already-built assets.

### Provisioning Neon through Vercel

1. Vercel Dashboard → **Storage** → **Create Database** → **Neon** (Postgres).
2. Link it to the project. `DATABASE_URL` (and a handful of other Neon
   variables) is injected automatically.
3. Run migrations once against the new DB:

   ```bash
   DATABASE_URL="…neon url…" pnpm -C lib/db run migrate   # if such a script exists
   # or fall back to drizzle-kit directly:
   DATABASE_URL="…" pnpm dlx drizzle-kit push --config lib/db/drizzle.config.ts
   ```

---

## 3. Vercel build config (already wired)

`vercel.json` in the repo root:

- **Install**: `corepack enable && corepack prepare pnpm@9 --activate && pnpm install --frozen-lockfile=false`
- **Build**: `pnpm -C artifacts/remover-tracker build`
- **Output**: `artifacts/remover-tracker/dist/public`
- **Functions**: `api/**/*.ts` on `@vercel/node@5.1.0`, `maxDuration: 30s`
- **Rewrites**:
  - `/api/:path*` → `/api/index` (Express handles routing)
  - `/((?!api/).*)` → `/index.html` (SPA fallback)

No action needed unless you want to change build behaviour.

---

## 4. First-time deploy

```bash
# 1. Clone or push to GitHub
git init && git add -A && git commit -m "chore: initial NO-Plan upgrade"
git branch -M main
git remote add origin https://github.com/Alsumaitti/NO-Plan.git
git push -u origin main

# 2. Import the repo on Vercel
#    New Project → Import Git Repository → Alsumaitti/NO-Plan
#    Framework preset: Other (vercel.json overrides everything)

# 3. Add env vars (Section 2)

# 4. Attach Neon (Section 2 → Provisioning)

# 5. Deploy
```

---

## 5. Clerk setup (bare minimum)

1. Create a Clerk application → copy the **Publishable key** (client) and
   **Secret key** (server).
2. **Authorized domains** → add your Vercel domain (e.g. `no-plan.vercel.app`
   and, eventually, your custom domain).
3. **User sign-up** must be enabled; leave social providers on/off as you
   prefer.
4. **Redirect URLs** — if you override them in Clerk, make sure they match
   the routes the client uses: `/sign-in`, `/sign-up`, and `/` after auth.

No Clerk proxy config is required for a fresh Vercel deploy — the client
talks to `clerk.com` directly.

---

## 6. Post-deploy smoke test

1. Visit `/` → redirected to `/sign-in`.
2. Sign up with an email → verify → you should land on the dashboard.
3. `/daily-plan` → add an item (pick a risk 1–5, fill "what" and
   "replacement") → it persists across reload.
4. Toggle the "done" checkbox → row state updates optimistically.
5. `/api/health` (or any API route) should respond `200` while signed in,
   `401` while signed out.

If any of the above fails, the likely culprits are:

- `DATABASE_URL` missing → `GET /api/daily-items` returns `500`.
- `CLERK_SECRET_KEY` missing → every `/api/*` returns `401`.
- `VITE_CLERK_PUBLISHABLE_KEY` missing at build time → Clerk never mounts
  on the client and you get a blank screen with a console error.

---

## 7. Local dev (for reference)

```bash
pnpm install
# .env at repo root with DATABASE_URL, CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY
pnpm -C artifacts/api-server dev       # Express on :3000
pnpm -C artifacts/remover-tracker dev  # Vite on :5173
```

The Vite dev server proxies `/api` to the Express dev server — see
`artifacts/remover-tracker/vite.config.ts` if you need to change the target.
