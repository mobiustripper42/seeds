# [Project Name] — Claude Code Project Context

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

## Key Docs
| File | Purpose |
|------|---------|
| `docs/SPEC.md` | What we're building — scope, V1 vs V2 vs V3 |
| `docs/DECISIONS.md` | Why we made each architectural choice |
| `docs/USER_STORIES.md` | What each role does |
| `docs/PROJECT_PLAN.md` | Phases, scope, velocity table — written at phase boundaries only. Current-phase tasks live in GitHub Issues. |
| `docs/RETROSPECTIVES.md` | Phase-end retrospectives written by `/retro` |
| `docs/AGENTS.md` | Agent and skill specs |
| `docs/BRAND.md` | Philosophy, visual direction, voice |
| `sessions/*.md` | Per-session files — `YYYY-MM-DD-HHMM-<dev>-<slug>.md` |
| `.claude/seeds-version` | Schema version this project was last installed at. Used by `/pull-seeds` to gate template syncs. |

## Core Data Model
```
[Describe your entity relationships here — e.g.:]

things → sub_things → line_items
                 ↓
           memberships (user × thing)
                 ↓
       attendance (user × sub_thing)
```

## Micro Workflow (every task, no exceptions)

1. **Spec it** — poker estimate, acceptance criteria
2. **Plan it** — summarize what you're going to do (files to create/edit, approach). Wait for explicit approval before writing any code or running any commands.
3. **Cut the branch** — once the plan is approved: `git checkout -b task/X.Y-short-description`. Branch name includes the task ID.
4. **Build it** — implement the feature
5. **Write the test** — Playwright integration test + pgTAP if RLS-touching
6. **Run targeted tests** — `npx playwright test tests/foo.spec.ts --project=desktop` (and mobile if relevant). `supabase test db` if RLS-touching. Do NOT run the full suite — that's the user's call.
7. **Mobile screenshot** — confirm 375px viewport passes
8. **Open PR** — `/kill-this` commits, pushes branch, opens PR. Preview URL lands in the PR description.
9. **Review & ship** — tap the preview URL, address any `@code-review` findings, run full suite if RLS-touching, then `/ship-it` to merge.

**No test, no push.**

**Full suite (`npx playwright test`) is never run automatically.** At the end of the session summary, ask: "Did you run the full Playwright suite yet?" and let the user decide.

## Migration Protocol

**All schema changes go through `supabase/migrations/`.** No exceptions.

- Create migration: `supabase migration new descriptive_name`
- Test locally: `supabase db reset` (replays all migrations + seed)
- Apply to remote: `supabase db push`
- Never edit schema through the Supabase dashboard on any environment
- `supabase/seed.sql` runs automatically on `db reset` — use for test data
- After schema changes: regenerate types with `npx supabase gen types typescript --local > src/lib/supabase/types.ts`
- **Before creating a migration:** run `gh pr list` to check for open PRs touching the same tables. If overlap exists, merge the in-flight PR first (or rename the new migration to a later timestamp to keep ledger order clean).

## Commands
```bash
# Development
npm run dev                    # local dev server (localhost:3000)
npm run build                  # production build
npm run lint                   # ESLint

# Database (local Supabase)
supabase start                 # start local Supabase (Docker)
supabase stop                  # stop local Supabase
supabase db reset              # wipe + replay all migrations + seed
supabase migration new name    # create new migration file
supabase db push               # apply migrations to remote project

# Testing
supabase test db               # run pgTAP RLS tests
npx playwright test            # run integration tests
npx playwright test --ui       # run with browser UI

# Types
npx supabase gen types typescript --local > src/lib/supabase/types.ts
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
- pgTAP tests live in `supabase/tests/`
- Playwright tests live in `tests/`
- Playwright viewports: 375px (mobile), 768px (tablet), 1440px (desktop)
- Mock external services in test mode
- `NOTIFICATIONS_ENABLED=false` for test environment
- **During development:** run only the relevant file + desktop project — `npx playwright test tests/foo.spec.ts --project=desktop`
- **Single test:** `npx playwright test -g "test name" --project=desktop`
- **Before every commit:** full suite, all viewports — `npx playwright test` (workers=1 is the config default; do not override)

## Session Skills

| Skill | When | What |
|-------|------|------|
| `/its-alive` | Session start | Stamp time, open per-session file, capture transcript path, read context, recommend task |
| `/pause-this` | Mid-session break | Build check, commit WIP, note pause |
| `/restart-this` | Resume from pause | Reload context, continue same session |
| `/kill-this` | Session end (part 1) | Build check, commit, push branch, open PR, code review, draft session body |
| `/ship-it` | After PR review passes | Merge PR, push migration if any, record ship time + wall clock |
| `/its-dead` | Session end (part 2) | Calc duration + points, finalize session file, branch cleanup |
| `/start-phase` | Phase boundary (start) | Materialize phase tasks from PROJECT_PLAN.md into Issues with phase:N + points:X labels |
| `/retro` | Phase boundary (end) | Mark `[x]`, reconcile drift, compute phase velocity, write retro to RETROSPECTIVES.md |

**Dev identity:** `~/.claude/devname` (one-line file with your handle). Set once per machine.

**Task model:** PROJECT_PLAN.md is read at planning, written at retro. Untouched mid-phase. Current-phase tasks live as GitHub Issues. The phase ends when its issues close.

## Agent Workflow

| Agent | Model | When | Purpose |
|-------|-------|------|---------|
| @architect | Opus | Before design decisions | Keep architecture coherent |
| @code-review | Sonnet | After every commit (wired into `/kill-this`) | Catch issues early |
| @pm | Sonnet | Start/end of sessions (via skills) | Track progress, flag risks |
| @ui-reviewer | Sonnet | After UI work, phase boundaries | Design quality |

## Model Selection

- **Main CC session:** Sonnet by default. Switch to Opus manually when you're stuck on something hard.
- **Agents:** model is set in each agent's frontmatter. Don't override unless the task warrants it.
- **New agents:** default to Sonnet. Add `model: opus` frontmatter only for architecture-level agents.

## PR Workflow

- Each task gets a branch (`git checkout -b task/X.Y-short-description`).
- `/kill-this` opens the PR. `/ship-it` merges it.
- Keep no more than 3 open PRs at once. Prefer 1.
- Never have two open PRs with migrations touching the same table — merge one first.
- Self-approve unless a stakeholder review is explicitly needed.

### PR Review on Mobile (developer notes)

Doing PR reviews from your phone is tolerable if you structure for it:
- **GitHub mobile app, not web.** The native app's diff + approve + merge flow is usable. The mobile web is not.
- **Tap the preview URL first.** Vercel posts it as a comment. 60 seconds of clicking the actual feature catches more than reading the diff would.
- **Enable auto-merge.** Repo Settings → enable auto-merge, then "Enable auto-merge" on each PR. Checks pass → it merges itself. One less thing to remember to do.
- **Branch protection:** require CI green (Vercel build + Playwright). Skip reviewer count requirements for solo dev — they add friction with no benefit.
- **Checklist PR descriptions.** `/kill-this` should populate: does this PR have a migration? RLS change? UI change at 375px? A checkbox list is fast to scan on a small screen.
- **`gh` CLI on your dev server** is faster than any UI when you're at a keyboard: `gh pr list`, `gh pr view 42 --web`, `gh pr merge 42 --auto`.

## Workflow Notes
- **Diagnostic commands** (build, lint, type check, test): run directly — see errors, fix them, don't bother the user.
- **Environment-changing commands** (npm install, supabase migrations, git push, deploys): output these for the user to run.
- **Never rebase a task branch that already has commits on origin.** If main has advanced while a PR branch is open, leave the branch as-is — GitHub's "Update branch" button handles this at merge time. Rebasing rewrites remote history and requires a force-push, which is blocked by policy. Use `git merge --ff-only` only if explicitly asked.
- **Bug reports:** Create a GitHub issue (`gh issue create`), tag `bug`, add to current or next phase.

## Approval Before Action (all tasks)
For every task — not just bugs — explain the plan and wait for approval before doing anything:
1. State what files you'll create or modify and why
2. Wait for "go", "do it", or equivalent
3. Do not write code, create files, run tests, or execute any commands until approved

**This includes the full test suite.** The database may be in use. Never run the full `npx playwright test` without telling the user first. Targeted test runs (`npx playwright test tests/foo.spec.ts --project=desktop`) are fine during active development without prior approval.

## Bug Reports & Questions
When a bug is reported or a question is asked:
1. Explain the cause and your proposed fix
2. Wait for approval before making any changes
3. Do not edit files, run commands, or implement fixes until given the go-ahead

## Scope Discipline
Check `docs/SPEC.md` section "Not V1" before adding anything.

If a task starts feeling bigger than its estimate:
1. Stop and re-estimate
2. Update PROJECT_PLAN.md
3. If it's now a 13, break it down
4. If it's scope creep, flag it and move on

## Tone
Occasional dry humor and sarcasm are welcome. Don't overdo it — one good line beats three forced ones.
