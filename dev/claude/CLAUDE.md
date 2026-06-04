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
|------|-------|
| `docs/SPEC.md` | What we're building — scope, V1 vs V2 vs V3 |
| `docs/DECISIONS.md` | Why we made each architectural choice |
| `docs/USER_STORIES.md` | What each role does |
| `docs/PROJECT_PLAN.md` | Phases, scope, velocity. **Phase-boundary doc** — read at planning, written at retro. Current-phase tasks live in GitHub Issues. |
| `docs/RETROSPECTIVES.md` | Phase-end retrospectives — written by `/retro` |
| `docs/AGENTS.md` | Agent and skill specs (canonical). |
| `docs/BRAND.md` | Voice, visual direction, philosophy |
| `docs/VELOCITY_AND_POKER_GUIDE.md` | Estimation methodology |
| `docs/CHEATSHEET.md` | One-page printable skill reference |
| `sessions/*.md` (on orphan `sessions` branch via `.sessions-worktree/`) | Per-session files — `YYYY-MM-DD-HHMM-<dev>-<slug>.md`. Atomic after `/its-dead` closes (DEC-013); orphan branch decouples session log from any code branch (DEC-014). |
| `.claude/seeds-version` | Schema version this project was last installed at. Used by `/pull-seeds` to gate template syncs. |
| `.claude/project-type` | Project type — `webapp` or `tool`. Used by `@sync-config` to gate template files that don't apply to this project's type (DEC-011). Optional. |

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

1. **Spec it** — poker estimate, acceptance criteria. Issue exists from `/start-phase`.
2. **Plan it** — summarize what you're going to do. Wait for explicit approval before writing code or running commands.
3. **Cut the branch** — once approved: `git checkout -b task/X.Y-short-description`.
4. **Build it**
5. **Write the test** — Playwright integration test + pgTAP if RLS-touching. Test-first when behavior is changing.
6. **Run targeted tests** — `npx playwright test tests/foo.spec.ts --project=desktop`. `supabase test db` if RLS-touching. Do NOT run full suite — that's the user's call.
7. **Mobile screenshot** — confirm 375px viewport passes
8. **Ship the task** — `/kill-this` commits, pushes, opens PR with `closes #<issue>`, appends a `## Task <N>` block to the session file (on the orphan `sessions` branch). Run per task; multiple per session.
9. **Pick up another task or close out** — start step 1 with a new branch, or run `/its-dead` once at the end of the Claude window. Merge PRs whenever — order doesn't matter.

**No test, no push.**

**Full suite (`npx playwright test`) is never run automatically.** Ask first.

## Migration Protocol

**All schema changes go through `supabase/migrations/`.** No exceptions.

- Create migration: `supabase migration new descriptive_name`
- Test locally: `supabase db reset` (replays all migrations + seed)
- Apply to remote: `supabase db push`
- Never edit schema through the Supabase dashboard on any environment
- `supabase/seed.sql` runs automatically on `db reset` — use for test data
- After schema changes: regenerate types with `npx supabase gen types typescript --local > src/lib/supabase/types.ts`
- **Before creating a migration:** run `gh pr list` to check for open PRs touching the same tables. If overlap exists, merge the in-flight PR first (or rename the new migration to a later timestamp to keep ledger order clean).

### Production write protection (DEC-009)

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

## Session Skills

| Skill | When | What |
|-------|------|------|
| `/its-alive` | Session start | Ensure `.sessions-worktree/` exists, open per-session file on orphan `sessions` branch, capture transcript, read context, recommend task |
| `/pause-this` | Mid-session break | Build check, commit WIP on task branch, note pause in session file (sessions branch) |
| `/restart-this` | Resume from pause | Reload context, continue same session |
| `/kill-this` | **Per task** (DEC-013) | Build check, commit code on task branch, open PR, append `## Task <N>` block to session file. Run N times per session — one per task. No time math. |
| `/its-dead` | Session end (once per window) | Stamp `ended:`, tally points, display wall_clock to screen, close session file. No time math, no version bump (those moved to `/retro`). Merge PRs whenever — order doesn't matter. |
| `/start-phase` | Phase boundary (start) | Materialize phase as Issues with `phase:N`, `points:X` labels |
| `/retro` | Phase boundary (end) | Compute per-session active time (wall − breaks) from `started`/`ended` + transcript break inference. Aggregate one phase velocity (active h/pt). Mark `[x]`, write retro, patch-bump per merged PR + minor-bump at close. |
| `/bump-major` | Breaking change | Manually bump major version. CHANGELOG.md entry + tag on the trunk (`main`). Dev projects only |
| `/promote-production` | Ship trunk to prod | ff-merge `main` → `production` (deploy-only; tag already on the commit), push. Projects with a `production` branch only |
| `/push-seeds` | After workflow improvements | Backport project-side improvements to the seeds templates via @sync-config |
| `/pull-seeds` | After seeds gets new improvements | Pull template changes into this project — schema-version-gated, applied via @sync-config |
| `/read-the-tape` | After a session worth learning from | Audit JSONL transcript, find anti-patterns, propose skill improvements |
| `/doc-consistency-check` | Ad-hoc, when docs feel drifted (no scheduled trigger) | Cross-reference factual claims across `docs/*.md` + root `CLAUDE.md`; flag mismatches + unfilled placeholders. Report-only via @doc-consistency |

**Dev identity:** `~/.claude/devname` (one-line file with handle, e.g. `eric`). Set once per machine.

**Task model:** PROJECT_PLAN.md is read at planning, written at retro. Untouched mid-phase. Current-phase tasks live as GitHub Issues. The phase ends when its issues close.

## Agents

| Agent | Model | When | Purpose |
|-------|-------|------|-------|
| @architect | Opus | Before design decisions, new dependencies, scope creep | Coherence vs SPEC + DECISIONS |
| @code-review | Sonnet | After every commit (wired into `/kill-this`) | Catch issues early |
| @pm | Sonnet | Start/end of sessions via skills | Track progress, flag risks |
| @ui-reviewer | Sonnet | After UI work, phase boundaries | Design quality |
| @sync-config | Sonnet | `/push-seeds` and `/pull-seeds` | Classifies template-vs-project diffs, gates structural backports |
| @tape-reader | Sonnet | `/read-the-tape` | Audits session JSONL for workflow anti-patterns |
| @doc-consistency | Sonnet | Via `/doc-consistency-check` skill, or ad-hoc | Cross-reference factual claims across project docs; flag mismatches + unfilled placeholders. Report-only |

## Model Selection

- Main session: Sonnet by default. Switch to Opus when stuck.
- Agents: model in agent frontmatter. Don't override unless task warrants.
- **New agents:** default to Sonnet. Add `model: opus` frontmatter only for architecture-level agents.

## PR Workflow

- Each task gets a branch: `git checkout -b task/X.Y-short-description`.
- Issues assigned to phase via `phase:N` label (created by `/start-phase`).
- PR title references issue: `closes #N`.
- `/kill-this` opens PR. Self-merge after review unless stakeholder review needed.
- Keep ≤3 open PRs. Prefer 1.
- Never two open PRs with migrations on the same table — merge one first.
- **Stacking PRs is preferred** when tasks depend on each other. Branch the next task off the previous task branch (`git checkout -b task/X.Y-next task/X.Y-prev`), not off main. Only wait for the previous PR to merge when there's a migration conflict on the same table.

### Production branch (DEC-022)

`main` is the always-active trunk. Every task PRs into `main`; `/retro` patch-bumps per merged PR + minor-bumps at phase close, tagging on `main` immediately. This is the same workflow whether or not the project deploys.

Deployable projects add a `production` branch — a downstream deploy pointer the host (Vercel, etc.) watches. It is **never** a PR base and is never touched by the sync. Ship with `/promote-production`, which ff-merges `main` → `production` and pushes (the version tag is already on the commit from the bump — promotion does not tag).

Adopting a production branch:
```
git checkout -b production main && git push -u origin production
```
Then repoint the host's production branch from `main` to `production` (e.g. Vercel → Settings → Git → Production Branch) — **before** `main` takes active work, or WIP auto-deploys to prod. Removing it: delete the branch and point the host back at `main`. No skill changes to opt in or out — only `/promote-production` cares (it gates on `origin/production`).

## Versioning

Every dev project carries a SemVer version in `package.json`, mirrored to a git tag (`vX.Y.Z`) on `main`. `/retro` is the sole place version bumps happen (DEC-013 moved patch bumps out of `/its-dead`).

**Three triggers (all run at `/retro` per DEC-013):**
- **Patch:** `/retro` Step 8.2 — one bump + CHANGELOG entry per PR merged in the phase window. Title pulled from GitHub.
- **Minor:** `/retro` Step 8.3 — at phase close after all patches. CHANGELOG entry summarizes the phase.
- **Major:** `/bump-major` manual. User supplies the breaking-change rationale.

**Tag rule:** tags are applied on the active trunk (`main`) at bump time (DEC-022). A `production` deploy branch, if present, receives the already-tagged commit via `/promote-production` ff-merge — promotion does not tag.

**Detection:** these skills check `package.json` exists at the repo root before bumping. If it doesn't (template/markdown-only project), they no-op silently.

### `<VersionTag />` component

Build-time version display, reads `process.env.NEXT_PUBLIC_APP_VERSION` + `process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`. Renders e.g. `v1.2.3 (a1b2c3)`.

Wiring:
- `next.config.ts` (or `next.config.js`) forwards `npm_package_version` → `NEXT_PUBLIC_APP_VERSION`. Critical — without `NEXT_PUBLIC_`, client trees silently render `v0.0.0`.
- Wire into login screen and footer.
- Vercel sets `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` automatically. Local `npm run dev` outside Vercel omits the commit hash — that's intentional.

```tsx
import { VersionTag } from "@/components/VersionTag";
<VersionTag className="text-xs text-muted-foreground" />
```

### CHANGELOG.md

Auto-maintained by `/retro` and `/bump-major` (DEC-013 — `/its-dead` no longer touches it). Don't edit by hand mid-flow — the skills always prepend after the `# Changelog` header. The first bump creates the file if absent.

Format (Keep-a-Changelog inspired but simpler):
```
# Changelog

## [1.2.3] - 2026-05-05
- PR #42: Add login form

## [1.2.2] - 2026-05-04
- PR #41: Fix dashboard query
```

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
- **Never rebase a task branch that already has commits on origin.** If main has advanced while a PR branch is open, leave the branch as-is — GitHub's "Update branch" button handles this at merge time. Rebasing rewrites remote history and requires a force-push. Use `git merge --ff-only` only if explicitly asked.
- **Before starting `npm run dev`:** run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` first. If it returns 200, skip the start — a server is already up. Only start a new one if the check fails.
- **Debugging CI failures:** Before any multi-step local debug (spawning servers, reading cookies, modifying middleware), confirm the environment is functional: "Can you run `npx playwright test` locally right now? What env vars are set?" One environmental check before any code change.
- **Stale `next start` on port 3001:** Playwright's webServer config reuses an existing server on port 3001 when one is running. A `next start` left over from an earlier debug run will serve the previous build's bundle to every test in the new run, producing phantom failures. Before the first targeted `npx playwright test` invocation in a session — especially after build changes — kill any orphan: `lsof -ti:3001 | xargs -r kill -9` (or `pkill -f "next start"`). Re-check with `lsof -ti:3001` — empty output means the port is clean. Do this once per session, not per test run.
- **No `source .envrc` for `npx playwright test`:** Playwright reads `.env.local` via `dotenv` in `playwright.config.ts` — it does not need `.envrc`. The `source .envrc &&` prefix is for CLI tools that need project-specific tokens (e.g. `supabase db push` when the global CLI is authed to a different account). Prefixing test commands with `source .envrc &&` triggers a permission prompt per invocation (the leading `source` falls outside `Bash(npx *)`), and each variation — different spec, project, or pipe target — is a new prompt. Run tests bare: `npx playwright test tests/foo.spec.ts --project=desktop`.
- **Supabase OAuth redirect URLs — use `/**` not `/*`:** When adding allowed redirect URLs in the Supabase Dashboard (Authentication → URL Configuration → Redirect URLs), use a double-star glob (`https://[your-domain]/**`), not single-star. `/*` matches only one path segment — so `/auth/callback` fails to match — and Supabase silently falls back to Site URL on a non-match, landing the user on `/?code=...` with the callback route never running. The symptom is "auth almost works" but OAuth codes don't get exchanged.
- **JSON parsing in Bash:** Prefer `gh ... --jq '...'` (built-in jq via `gh`) or `jq` over `python3 -c "import json,sys; ..."` one-liners. The python invocations trigger per-pattern permission prompts (each unique argument list is a new allowlist entry), while `gh --jq` runs under the existing `Bash(gh ...)` allowance. For non-`gh` JSON, install/use `jq` directly. Reserve python for cases where the data shape genuinely needs control flow.
- **Bug reports:** create a GitHub issue, label `bug`, add to current or next phase.

## Approval Before Action (all tasks)

For every task — not just bugs — explain the plan and wait for approval before doing anything:
1. State what files you'll create or modify and why
2. List commands you'll run, especially commits, pushes, package installs,
   anything touching production
3. Wait for "go", "do it", or equivalent
4. Do not edit files or run commands until approved

## Bug Reports & Questions
When a bug is reported or a question is asked:
1. Explain the cause and your proposed fix
2. Wait for approval before making any changes
3. Do not edit files, run commands, or implement fixes until given the go-ahead

## Scope Discipline
Check `docs/SPEC.md` "Not V1" before adding anything.

If a task feels bigger than its estimate:
1. Stop, re-estimate
2. Update PROJECT_PLAN.md (at next phase boundary, or via Issue if mid-phase)
3. If now a 13, break it down
4. If scope creep, flag and move on

## Tone
Occasional dry humor and sarcasm welcome. One good line beats three forced ones.

## Response Length

Default to the shortest response that fully answers — usually 2–5 sentences. No preamble, no restating the question, no closing offers to help further. No reflexive "let me know if you need more" or "happy to expand." Do offer concrete follow-ups when they'd save a future round-trip. Length is requested explicitly ("expand," "give me the long version"), never the default.

Be meticulous and skip disclaimers.

## Verbosity

End-of-turn summaries: one or two sentences. What changed, what's next. Stop there.

Do not recap work I just watched you do. Do not restate the task. Do not explain why an obvious step was obvious. The summary exists so I can re-enter context next session — not so you can demonstrate effort.

If a turn ends with a tidy bullet list followed by three paragraphs of prose, the prose is wrong. Delete it.

Mid-session updates: one sentence per state change. "Found X." "Switching to Y." "Build green." Not a paragraph.

This rule applies double at session end. The session-summary block is the first thing I read next session — make it dense, not voluminous. Five bullets of work and a wall of text means I cannot actually use the summary. Cut the wall.

## Cost and Waste

Never minimize cost. Banned phrasings include but are not limited to:
- "essentially zero"
- "negligible"
- "only a few cents"
- "just X dollars"
- "a rounding error"
- "not a big deal"
- "don't worry about it"

If you find yourself reaching for one, stop. Any synonym counts. If the function of the phrase is to minimize, it's banned.

It's my money. Willing-to-spend is not the same as willing-to-spend-flippantly. Treat every cost as real, including small ones. Same rule for compute, API calls, third-party services, and dependencies — anything that consumes resources I'm paying for.

Waste of any kind — food thrown out, hours lost, a bad batch, a bricked migration, an over-provisioned instance, a wrong dependency pulled — is a fact, not a problem to console me about. When I tell you something had to be discarded, do not reassure me it's fine. Acknowledge it and move on.

If you catch yourself about to write a reassurance, just don't. The fact is the fact.
