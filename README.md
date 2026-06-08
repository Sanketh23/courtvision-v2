# CourtVision v2

A web-based basketball playbook app for coaches to create animated plays and players to study them.

**Status:** M0 Foundation (v2 Alpha)

---

## Quick Start

### Prerequisites
- Node.js 20.x
- pnpm 10.x
- Supabase CLI

### Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd courtvision
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local` (if provided)
   - Or configure your Supabase credentials in `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```

4. **Start the local database**
   ```bash
   supabase start
   ```

5. **Run the dev server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development

### Available Scripts

- `pnpm dev` — Start the Next.js dev server
- `pnpm build` — Build for production
- `pnpm start` — Start the production server
- `biome check .` — Lint and format check
- `pnpm tsc --noEmit` — TypeScript type checking
- `pnpm test:run` — Run tests (Vitest)

### Project Structure

```
courtvision/
├── app/                    # Next.js routes (thin glue layer)
├── features/               # Feature modules
│   ├── auth/              # Authentication (M1)
│   ├── team/              # Team management (M1)
│   ├── playbook/          # Playbook browsing (M7)
│   └── play/              # Core play module
│       ├── engine/        # Pure animation logic (M2)
│       ├── editor/        # Play editor (M5-M6)
│       ├── viewer/        # Play viewer (M3)
│       ├── court/         # Court rendering (M3)
│       ├── schemas.ts     # Zod play schema
│       └── queries.ts     # Database queries
├── components/ui/         # shadcn/ui components
├── lib/                   # Utilities, env validation, Supabase clients
├── styles/                # Global styles, design tokens
├── docs/                  # Documentation
├── supabase/              # Database migrations
└── public/                # Static assets
```

See `docs/ARCHITECTURE.md` for detailed architecture and design rationale.

---

## Documentation

Start here: **[docs/CLAUDE.md](docs/CLAUDE.md)** — Project overview and guardrails.

Then read in order:
1. [docs/PRD.md](docs/PRD.md) — Product requirements and scope
2. [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — Play JSON schema and database design
3. [docs/ANIMATION_DESIGN.md](docs/ANIMATION_DESIGN.md) — Animation engine architecture
4. [docs/UI_WORKFLOWS.md](docs/UI_WORKFLOWS.md) — UI screens and behaviors
5. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Tech stack and folder structure
6. [docs/CONVENTIONS.md](docs/CONVENTIONS.md) — Code style and naming conventions
7. [docs/ROADMAP.md](docs/ROADMAP.md) — M0-M10 milestone sequence

---

## Testing

### Unit / Integration Tests

```bash
pnpm test:run
```

Tests live alongside source code: `features/play/engine.test.ts`, etc.

The animation engine (`features/play/engine/`) is extensively tested with snapshot tests.

### E2E Tests

Playwright tests (coming in later milestones):
```bash
pnpm test:e2e
```

---

## Deployment

Deployed to **Vercel** (via GitHub integration) and **Supabase Cloud**.

### Environment Variables (Vercel)

Set these in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for server functions)

### Database Migrations

Run migrations in Supabase:
```bash
supabase db push
```

Migrations live in `supabase/migrations/`.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + design tokens
- **UI Components:** shadcn/ui
- **Backend:** Supabase (Postgres + Auth + RLS)
- **State:** Zustand (editor), React (UI), TanStack Query (server)
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest + Testing Library + Playwright
- **Linting:** Biome
- **Package Manager:** pnpm
- **Hosting:** Vercel + Supabase Cloud

---

## Key Principles

1. **Animation is the product.** The play visualization and smooth motion are the differentiator.
2. **Scope is the playbook only.** No games, stats, scouting, AI in v2.
3. **Play schema is the single source of truth.** All code reads/writes `features/play/schemas.ts`.
4. **RLS is the permission boundary.** Database enforces access control, not app code.
5. **Animation engine is pure.** No React in `features/play/engine/`.
6. **Vertical slices, not horizontal layers.** Each milestone works end-to-end.

See `docs/CLAUDE.md` §36-50 for full guardrails.

---

## Contributing

- Follow [docs/CONVENTIONS.md](docs/CONVENTIONS.md) for code style
- Pre-commit hook runs Biome formatting (Husky)
- Ensure `pnpm build` and `biome check .` pass before committing
- Work on the current milestone in `docs/ROADMAP.md`

---

## License

TBD

---

## Contact

Sanketh — [@Sanketh23](https://github.com/Sanketh23)
