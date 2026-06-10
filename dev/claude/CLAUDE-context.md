# [Project Name] — Project Context

Everything specific to **this** project. The seeds-managed `CLAUDE.md` shell reads this file at session start and treats it as authoritative for project-specific facts. Fill in every `[placeholder]`; delete sections that don't apply (e.g. a tool project with no database drops the Supabase parts of Migration Protocol). Nothing here syncs from seeds — it's yours to edit freely (DEC-S019).

## What We're Building
[One paragraph describing the project — what it replaces, who uses it, what it does.]

Roles:
- **Admin** — [what they manage]
- **[Role 2]** — [what they do]
- **[Role 3]** — [what they do]

## Stack
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui, Geist Sans
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security) — no separate API server
- **Payments:** Stripe (Checkout Sessions, webhooks) — remove if not applicable
- **Notifications:** Twilio (SMS), Resend (email) — remove if not applicable
- **Hosting:** Vercel (frontend), Supabase Cloud (database)
- **Testing:** pgTAP (RLS), Playwright (integration), axe-core (accessibility)

## Core Data Model
```
[Describe your entity relationships here — e.g.:]

things → sub_things → line_items
                 ↓
           memberships (user × thing)
                 ↓
       attendance (user × sub_thing)
```

## Commands
```bash
# Development
npm run dev
npm run build
npm run lint

# Database (local Supabase)
supabase start
supabase stop
supabase db reset
supabase migration new <name>
supabase db push

# Testing
supabase test db                                # pgTAP RLS
npx playwright test                             # full suite (workers=1 by config — do not override)
npx playwright test tests/foo.spec.ts --project=desktop  # targeted, dev mode
npx playwright test --ui                        # browser UI

# Types
npx supabase gen types typescript --local > src/lib/supabase/types.ts
```

## Additional Docs
Project-specific docs beyond the baseline table in the `CLAUDE.md` shell's `## Key Docs`. Add rows here as the project grows its own docs. (None yet — delete this note when you add the first.)

## Workflow Overrides
Project-specific overrides to the shell's `## Micro Workflow` steps. The shell's default workflow is webapp-shaped (Playwright + pgTAP + 375px screenshot). A tool project with no database/UI overrides those steps here — e.g.:

> Step 5 — no pgTAP; unit-test the changed module. Step 6 — `npm test path/to/file.test.js`, not `supabase test db`. Step 7 — no mobile screenshot.

(None — the shell's default workflow applies as-is.)

## Migration Protocol (project)
The migration **discipline** lives in the shell's `## Migration Protocol`. This section holds the project's **toolchain**. Projects without a database: replace everything below with "N/A — no database."

**All schema changes go through `supabase/migrations/`.**

- Create migration: `supabase migration new descriptive_name`
- Test locally: `supabase db reset` (replays all migrations + seed)
- Apply to remote: `supabase db push`
- Never edit schema through the Supabase dashboard on any environment
- `supabase/seed.sql` runs automatically on `db reset` — use for test data
- After schema changes: regenerate types with `npx supabase gen types typescript --local > src/lib/supabase/types.ts`

### Production write protection (DEC-S009)

Two-layer defense against accidentally running destructive Supabase CLI ops on production:

1. **Discipline:** never `supabase link` to a prod project ref from a dev box. Production deploys read `SUPABASE_URL` and the service-role key from Vercel env vars — there is no reason for a local link to prod. Link only to staging or local.
2. **Wrapper script (`scripts/safe-supabase.sh`):** reads the linked ref from `supabase/.temp/project-ref` and refuses to pass through `db reset`, `db push`, `db remote *`, `migration up`, or `migration repair` if the linked ref appears in `.claude/prod-supabase-refs`. Pass-through for everything else. The matcher walks adjacent argument pairs, so leading global flags (`--debug`, `--workdir`, etc.) don't bypass the guard.

Setup (one-time per project):

```
cp <seeds>/dev/claude/scripts/safe-supabase.sh scripts/safe-supabase.sh
chmod +x scripts/safe-supabase.sh
mkdir -p .claude
echo "<your-prod-project-ref>" > .claude/prod-supabase-refs
echo ".claude/prod-supabase-refs" >> .gitignore
```

Optional shell alias for transparent protection:

```
alias supabase='./scripts/safe-supabase.sh'
```

The `.claude/prod-supabase-refs` file accepts one ref per line; blank lines and `#` comments are ignored. Per-project rather than global so multi-project dev boxes don't cross-contaminate.

The wrapper only catches CLI ops. The following are **not** guarded — they rely on the discipline:
- `--db-url postgres://...prod...` flags on `db push` / `db remote commit` skip the linked-project entirely.
- Direct `psql` against the prod URL.
- Any tool that doesn't go through the `supabase` binary.

### Cross-environment env-var sync (Supabase ↔ Vercel)

**Vercel env vars and Supabase project refs do not auto-sync.** Projects running separate dev/preview and production Supabase instances must wire Vercel's environment scopes to match: the three vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) appear **twice** in Vercel — once per environment scope — with intentionally different values.

When you rotate keys, switch project refs, or otherwise touch these vars, both scopes must stay coherent:
- Vercel **Production** → matches prod project's URL + keys.
- Vercel **Preview + Development** → matches dev/preview project's URL + keys, which is what `.env.local` has.

Vercel does not redeploy on env-var change. After updating, trigger a redeploy of `main` (Deployments → ⋯ → Redeploy) or push any commit.

Failure modes:
- **Undefined values:** `createServerClient()` gets `undefined` for URL or key → `HTTP 500` site-wide. Local `npm run dev` keeps working because it reads `.env.local` directly, masking the regression until someone hits the deployed site.
- **Swapped projects:** prod points at the dev DB or vice versa. Symptoms: prod login works but shows test fixtures, or real user data appears on a preview URL. Diff-check before assuming everything is wired correctly.
- **Name typo:** a Vercel-side name like `SUPABASE_ANON_KEY` instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY` produces the same 500 even when the value is correct.

Diff-check ritual after any rotation:

```bash
vercel env pull --environment=production .env.production.tmp
vercel env pull --environment=preview    .env.preview.tmp
# Preview should match .env.local:
diff <(grep -E "SUPABASE" .env.local       | sort) \
     <(grep -E "SUPABASE" .env.preview.tmp | sort)
# Production should NOT match .env.local — confirm it references the prod project ref:
grep "SUPABASE_URL" .env.production.tmp
```

## Conventions

### TypeScript
- Strict mode on. No `any`.
- Use generated Supabase types from `lib/supabase/types.ts`.
- Regenerate after every schema change.

### Components
- Server Components by default. Add `'use client'` only when needed.
- shadcn/ui components in `components/ui/` — don't edit directly.
- Feature components in `components/[feature]/`.
- Keep components under 200 lines. Split if larger.

### Data Fetching
- Server Components fetch directly via Supabase server client.
- Mutations go through Server Actions (not API routes).
- Client-side data (real-time, after interaction) uses Supabase browser client.

### Auth & RLS
- All auth through Supabase Auth. No custom JWT handling.
- Role flags on the users table (e.g., `is_admin`, `is_[role]`) — not mutually exclusive.
- Every table needs RLS policies before shipping. No table is accessible without explicit policy.
- Every RLS change requires a pgTAP test.
- Middleware handles role-based redirects.

### Error Handling
- Form actions: return `string | null`. `null` = success, string = error message.
- Button actions: return `{ error: string | null }`.
- Never `throw` in server actions — return errors for inline feedback.

### Database
- Migrations are source of truth (not the dashboard).
- Configurable values go in a codes/lookup table, not hardcoded enums.

### Naming
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Server Actions: `camelCase` in `actions/` files
- DB columns: `snake_case`
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql`

### UI / Brand
- Colors: white/black base, semantic tokens from shadcn. No color for color's sake.
- Font: Geist Sans (or project font)
- shadcn/ui defaults. Override only when necessary.
- One border radius: `rounded-lg`
- Layout padding in layout.tsx only
- Every page works at 375px (Playwright screenshot confirms)

### Testing
- **Test the user, not the function.** Heavy integration, light unit.
- **Test-first when behavior changes.** Update the test, then the code.
- pgTAP in `supabase/tests/`, Playwright in `tests/`.
- Playwright viewports: 375px (mobile), 768px (tablet), 1440px (desktop).
- Mock external services in test mode.
- `NOTIFICATIONS_ENABLED=false` for test environment.
- **During development:** run only the relevant file + desktop project — `npx playwright test tests/foo.spec.ts --project=desktop`
- **Single test:** `npx playwright test -g "test name" --project=desktop`
- **Full suite:** `npx playwright test` (workers=1 is the config default; do not override)

## Workflow Notes (project)
Project-specific debugging gotchas. The shell's `## Workflow Notes` holds the universal rules.

- **Before starting `npm run dev`:** run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` first. If it returns 200, skip the start — a server is already up. Only start a new one if the check fails.
- **Stale `next start` on port 3001:** Playwright's webServer config reuses an existing server on port 3001 when one is running. A `next start` left over from an earlier debug run will serve the previous build's bundle to every test in the new run, producing phantom failures. Before the first targeted `npx playwright test` invocation in a session — especially after build changes — kill any orphan: `lsof -ti:3001 | xargs -r kill -9` (or `pkill -f "next start"`). Re-check with `lsof -ti:3001` — empty output means the port is clean. Do this once per session, not per test run.
- **No `source .envrc` for `npx playwright test`:** Playwright reads `.env.local` via `dotenv` in `playwright.config.ts` — it does not need `.envrc`. The `source .envrc &&` prefix is for CLI tools that need project-specific tokens (e.g. `supabase db push` when the global CLI is authed to a different account). Prefixing test commands with `source .envrc &&` triggers a permission prompt per invocation (the leading `source` falls outside `Bash(npx *)`), and each variation — different spec, project, or pipe target — is a new prompt. Run tests bare: `npx playwright test tests/foo.spec.ts --project=desktop`.
- **Supabase OAuth redirect URLs — use `/**` not `/*`:** When adding allowed redirect URLs in the Supabase Dashboard (Authentication → URL Configuration → Redirect URLs), use a double-star glob (`https://[your-domain]/**`), not single-star. `/*` matches only one path segment — so `/auth/callback` fails to match — and Supabase silently falls back to Site URL on a non-match, landing the user on `/?code=...` with the callback route never running. The symptom is "auth almost works" but OAuth codes don't get exchanged.
