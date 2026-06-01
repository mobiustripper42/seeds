# Workflow — webapp dev project, start to end

The full lifecycle of a Claude-assisted webapp project, as encoded by the seeds template family. Reflects DEC-013 + DEC-014.

---

## 0. Project init (one-time per project)

```
# Global, once per machine
echo "<your-handle>" > ~/.claude/devname

# Create the repo, scaffold Next.js / Supabase / Tailwind / shadcn, etc.
# (Your normal app scaffold.)

# Copy template content from seeds
cp -r <seeds>/dev/claude/docs/*       docs/
cp    <seeds>/dev/claude/CLAUDE.md    CLAUDE.md
cp -r <seeds>/dev/claude/agents       .claude/agents
cp -r <seeds>/dev/claude/skills       .claude/skills

# Fill in CLAUDE.md, docs/SPEC.md, docs/PROJECT_PLAN.md (Phase 0)

# Set schema + project type
cp <seeds>/seeds-version .claude/seeds-version
echo "webapp" > .claude/project-type

# VersionTag (DEC-007)
cp <seeds>/dev/claude/templates/VersionTag.tsx src/components/VersionTag.tsx
# Wire into next.config.js: env: { NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version }
# Drop <VersionTag /> into the login screen + footer

# Production deploy branch (optional, deployable projects — DEC-022)
git checkout -b production main && git push -u origin production
# Then repoint the host's production branch (e.g. Vercel → Settings → Git) from main to production

# Supabase prod-write guard (DEC-009)
cp <seeds>/dev/claude/scripts/safe-supabase.sh scripts/safe-supabase.sh && chmod +x scripts/safe-supabase.sh
mkdir -p .claude && echo "<prod-project-ref>" > .claude/prod-supabase-refs
echo ".claude/prod-supabase-refs" >> .gitignore
```

The orphan **`sessions` branch** + `.sessions-worktree/` (DEC-014) are created automatically by `/its-alive` on first run — no manual step needed.

---

## 1. Phase planning (every phase boundary)

Plan the next phase in `docs/PROJECT_PLAN.md`:
- Phase number + name + scope (V1 / V2 / V3)
- Tasks with effort points (Fibonacci 2/3/5/8/13)
- Acceptance criteria per task

Then materialize the phase as GitHub Issues:

```
/start-phase <N>
```

`/start-phase` creates one Issue per task, labels with `phase:<N>` and `points:<X>`, writes Issue numbers back into PROJECT_PLAN.md.

After this, `PROJECT_PLAN.md` is read-only until `/retro` at phase end.

---

## 2. Daily flow — one Claude window, multiple tasks (DEC-013)

### 2a. Start a session

```
/its-alive
```

- Scans for orphan branches + unmerged PRs from prior sessions (Step 0.5).
- Ensures `.sessions-worktree/` exists; bootstraps on first run, regenerates on fresh clones (Step 0.6).
- Stamps `started:`, opens a session file on the orphan `sessions` branch.
- Reads last session's `Next Steps` + `Context`.
- Recommends the next task.

Confirm or redirect. **No work begins until you say go.**

### 2b. Ship task A

```
git checkout -b task/X.Y-thing      # cut a task branch from main
# ... build the feature, write the test, run targeted tests ...

/kill-this
```

`/kill-this` runs **once per task**. It:
- Runs `npm run build` (or whatever `CLAUDE.md §Commands` defines).
- Commits code on the task branch.
- Pushes the task branch.
- Runs `@code-review`.
- Opens a PR.
- Appends a `## Task <N>` block to the session file on the `sessions` branch.

The task block records the PR number, points, and Completed bullets. The session-file commit goes to the orphan branch via `.sessions-worktree/` — never to the task branch.

### 2c. Wait, switch, or continue

Common scenarios:
- **Wait for CI** → walk away. Come back later. The session is still open.
- **Want to do task B first** → cut a new task branch (`git checkout -b task/Y.Z-other`) and start over from 2b. The session continues. `/kill-this` opens a second PR and appends a second `## Task <N>` block.
- **Address `@code-review` findings on task A** → fix on the task A branch, push, the PR auto-updates.
- **Merge task A's PR** → whenever you want. Doesn't have to be before `/its-dead`. Order is free.

You may run `/kill-this` as many times per session as you have tasks.

### 2d. Close the session

When done for the day (or the work block):

```
/its-dead
```

- Stamps `ended:`.
- Tallies total points across all `## Task <N>` blocks.
- **Displays `wall_clock` (ended − started) to screen for a gut-check** — does NOT write it to the file.
- Commits + pushes the session file (sessions branch).
- Sets `status: closed`.

The session file is now **atomic** — no skill modifies it again.

`/its-dead` does NOT compute `dev_time` / `review_time` / `breaks`. It does NOT bump version. Those happen at `/retro`.

### 2e. Merge PRs whenever

```
gh pr merge <N> --merge --delete-branch
```

Before `/its-dead`, after, days later — doesn't matter. The merge timestamp lives in GitHub; `/retro` reads it.

---

## 3. Phase boundary — `/retro` (DEC-013 + DEC-014)

When all phase Issues are closed (or you've called the phase done):

```
/retro
```

`/retro` is the heaviest skill in the lineup because it owns:

1. **Phase issue accounting** — open issues get moved to next phase, left, or closed-as-descoped.
2. **Per-session time math.** For each session in the phase window, it:
   - Reads `started`, `ended`, `pr_numbers`, `transcript` from the session frontmatter.
   - Reads the transcript JSONL for break gaps > 15 min.
   - Queries GitHub for each PR's `opened_at` + `merged_at`.
   - Computes `wall_clock`, `dev_time`, `review_time`, `breaks` per session.
3. **Phase aggregation** — sums to phase totals; computes three velocities (wall/pt, dev/pt, review/pt).
4. **PROJECT_PLAN.md update** — marks tasks `[x]`, appends velocity row.
5. **Retro notes prompt** — user answers what-worked / what-didn't / changes-for-next-phase.
6. **PM commentary** — `@pm` returns 3–5 paragraphs reacting to the user's answers, with cross-phase context.
7. **RETROSPECTIVES.md append** — full retro entry + per-session table + PM read.
8. **Version bumps** (dev projects with `package.json`) — patch per merged PR + minor at phase close, with CHANGELOG entries.
9. **Hand-off to `/start-phase`** — optionally chains into the next phase.

The headline number is **dev_time velocity** (h/pt). Use that for forecasting future phases.

---

## 4. Release — main → production (DEC-022)

`main` is the always-active trunk. PRs target `main`; patch + minor bumps land on `main` and are tagged there at bump time. Deployable projects add an optional `production` branch — a downstream deploy pointer. To ship:

```
/promote-production
```

- ff-merges `main` → `production`.
- Pushes `production` (deploy-only — no tagging; the `vX.Y.Z` tag is already on the commit from the bump).
- The host (Vercel) watches the `production` branch and deploys the advanced commit.

Without a `production` branch, the project deploys straight off `main` and there's nothing to promote.

---

## 5. Cross-cutting workflows

### Mid-session pause / resume

```
/pause-this       # walking away mid-task
# (later)
/restart-this     # come back
```

`/pause-this` commits WIP on the task branch, writes a `[PAUSED HH:MM UTC]` note to the session file. `/restart-this` reloads context. Same session number, no new file.

### Routine improvements back to seeds

When the workflow gets better mid-flight:

```
/push-seeds       # propose backports to seeds via @sync-config
/pull-seeds       # pull seeds template updates into this project
```

The nightly Anthropic Routine (DEC-010) runs both directions automatically across registered repos. Manual skills are for "I want it now."

### Audit a session for anti-patterns

```
/read-the-tape    # @tape-reader reads the session's JSONL
```

Surfaces anti-patterns (verbose responses, missed context, retries instead of root-causing, etc.) and proposes targeted improvements to skill/agent files.

### Configure permissions / hooks

```
/update-config       # edit .claude/settings.json
/fewer-permission-prompts   # scan transcripts for safe-to-allowlist Bash/MCP calls
```

---

## 6. Branch topology

```
main          ← active trunk. Protected on dev projects. Tags live here. ff-merge target for /kill-this PRs.
  ├─ task/X.Y-thing      ← one per task. Lifetime: one /kill-this through merge.
  ├─ task/X.Z-other      ← another per task.
  └─ claude/<slug>       ← CC platform's auto-cut session anchor. Lives across the Claude window.
       ⇒ production      ← optional downstream deploy branch. main ff-merges INTO it via /promote-production. Never a PR base.

sessions      ← orphan. Zero shared history with main. Contains only sessions/.
              ← Checked out at .sessions-worktree/ (DEC-014).
              ← Skills commit session files here. Never merges to main.
```

---

## 7. Mental model

- **One Claude window = one workflow session** (one row in `RETROSPECTIVES.md`'s per-session table).
- **One workflow session = N tasks** (each with its own PR and `## Task <N>` block).
- **Task branches are ephemeral** — born at `git checkout -b`, die at PR merge.
- **The `sessions` branch is permanent** — accumulates every session file forever.
- **Time math is a phase-level concern**, not a session-level concern. Sessions just record `started` + `ended` + PR numbers; `/retro` does the math.

This decoupling is what makes the session file atomic, the workflow stack-friendly, and review-time accounting honest regardless of merge timing.

---

## 8. When things go wrong

- **`.sessions-worktree/` is gone** (deleted, fresh clone) → `/its-alive` Step 0.6 regenerates from `origin/sessions`.
- **Orphan branch from a previous session** → `/its-alive` Step 0.5 surfaces it; choose `open PR / cherry-pick / delete`.
- **A PR is still OPEN after `/its-dead`** → fine. Merge later. `/retro` queries GitHub at retro time and gets the merge timestamp.
- **Concurrent session** (two Claude windows) → `/its-alive` Step 0 prompts you; pick worktree-mode for the new task, leave the old one alone.
- **CI failure post-`/kill-this`** → fix on the task branch, push, PR auto-updates.
- **`gh` and MCP both unavailable at `/retro` time** → `/retro` skips PR-derived numbers, marks them `inference: github-unavailable`. Rerun retro later when access is back; it'll fill in.

---

## 9. References

- **DEC-013** — per-task `/kill-this`, single `/its-dead`, time math at `/retro`.
- **DEC-014** — sessions on orphan branch via `.sessions-worktree/`.
- **DEC-012** — STATE-conditional close, `NO_PR`-on-protected-main fallback (still in force).
- **DEC-007** — semver triggers (now all at `/retro`).
- **DEC-022** — main is the active trunk; production is the deploy branch (replaces DEC-008).
- **DEC-010** — nightly bi-directional Routine.
- **DEC-011** — project-type gating.
