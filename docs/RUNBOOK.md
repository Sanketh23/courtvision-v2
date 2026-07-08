# CourtVision — Operations Runbook

**Status:** v2 launch
**Audience:** whoever operates the app (currently: Sanketh)

How to deploy, run migrations, restore from backup, and verify the app is
healthy. Keep this current as the operational surface changes.

---

## 1. Environments

| Environment | Frontend | Database |
|---|---|---|
| Local dev | `pnpm dev` (localhost:3000) | local Supabase (`supabase start`) |
| Production | Vercel (auto-deploy from `main`) | Supabase Cloud project |

### Required environment variables

Set in Vercel (production) and `.env.local` (dev). Validated at startup by
`lib/env.ts` — a missing required var fails the build loudly.

| Var | Where | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | no* | Needed only by RLS integration tests |
| `SENTRY_DSN` | server | no | Unset → error tracking disabled |

\* Never expose the service-role key to the client or commit it.

---

## 2. Deploying

`main` is always deployable. Vercel auto-deploys on push to `main`.

1. Open a PR; CI must be green (lint, typecheck, build, unit tests).
2. Merge to `main` → Vercel builds and deploys automatically.
3. **If the PR included a new migration, apply it to Supabase Cloud first**
   (see §3) — code expecting a column/table that production lacks will 500.

Rollback: in the Vercel dashboard, promote the previous successful deploy.

---

## 3. Running migrations

Migrations live in `supabase/migrations/` (timestamp/sequence-prefixed SQL).
They are append-only — never edit a migration that has been applied to
production; add a new one.

### Local

```bash
supabase db reset        # drops, recreates, replays every migration
pnpm db:types            # regenerate lib/supabase/types.generated.ts
```

### Production (Supabase Cloud)

```bash
supabase link --project-ref <project-ref>   # one time
supabase db push                            # applies un-applied migrations
```

After pushing, regenerate and commit types if the schema changed:

```bash
supabase gen types typescript --project-id <project-ref> > lib/supabase/types.generated.ts
```

> ⚠️ As of v2 launch the cloud database has **not** been provisioned with the
> migrations. Before the first production deploy, run `supabase db push`
> against the cloud project, then verify with the RLS audit (§5).

---

## 4. Restoring from backup

Supabase Cloud takes automatic daily backups (Pro plan) / PITR if enabled.

1. Supabase dashboard → Database → Backups.
2. Choose a backup (or point-in-time) and restore. This overwrites current
   data — confirm you want it.
3. After restore, smoke-test: sign in, open a play, check the playbook.

For a single bad play, prefer the in-app **version history** (editor → ⋯ →
Version history → Restore) over a database restore — it's append-only and
non-destructive.

---

## 5. Health checks & verification

### RLS audit (must pass before launch and after any migration)

```bash
# local
docker exec -i supabase_db_courtvision psql -U postgres -f - < supabase/audit_rls.sql
# production
psql "$PROD_DATABASE_URL" -f supabase/audit_rls.sql
```

Zero rows = every public table has RLS enabled. Any row is a leak — fix
before shipping.

### Test suites

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test:run   # static + unit
pnpm test:e2e                                                # needs supabase start

# RLS + trigger integration tests (need a running local stack):
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=<local anon> SUPABASE_SERVICE_ROLE_KEY=<local service> \
pnpm vitest run tests/rls
```

### Error tracking

Set `SENTRY_DSN` in production. Sentry captures server-side errors (Server
Components, Server Actions, route handlers, SSR). Client-side capture is
intentionally omitted to protect the mobile-viewer JS budget — see
`instrumentation.ts`. Verify events arrive by triggering a server error and
checking the Sentry dashboard.

---

## 6. Performance budgets (ARCHITECTURE §16)

| Surface | Budget | Last measured |
|---|---|---|
| Mobile viewer first-load JS | < 150 KB | 141 KB (`/play/[id]`) |
| Editor first-load JS | (desktop-only, no mobile budget) | 212 KB (`/play/[id]/edit`) |

Re-check viewer size after any change touching `features/play/viewer` or
shared chunks: `pnpm build` and read the `/play/[id]` First Load JS column.

---

## 7. Common issues

- **Build fails with a Zod env error** → a required env var is missing in the
  environment. Check the Vercel project settings.
- **App 500s on auth/data calls in production** → migrations not applied to
  the cloud database (§3), or RLS policies missing.
- **Editor won't open on a phone** → by design; it's desktop-only (≥1024px).
