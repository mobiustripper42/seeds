---
session: 21
dev: eric
slug: review-nightly-sync-prs-Ph9Xa
branch: claude/review-nightly-sync-prs-Ph9Xa
started: 2026-05-09T13:11:22Z
ended: 2026-05-10T14:04:29Z
duration: 24.92
points: 3
status: closed
transcript: /root/.claude/projects/-home-user/a5cbfb00-543f-4f7e-a962-5a6cafd8b6ae.jsonl
---

# Session 21 — review-nightly-sync-prs-Ph9Xa

**Task:** Review the first full automated nightly-sync run (3 PRs across seeds, bushel, helm) and ship Task 28 — project-type gating for template files (DEC-011) — to fix the cross-repo classifier inconsistency the run surfaced.

**Completed:**
- **Reviewed nightly-sync run #4 (2026-05-09).** All 3 PRs ([seeds#17](https://github.com/mobiustripper42/seeds/pull/17), [bushel#30](https://github.com/mobiustripper42/bushel/pull/30), [helm#5](https://github.com/mobiustripper42/helm/pull/5)) verified end-to-end against actual diffs — auto-mode classifier behaved correctly, generification (kill-this supabase example → "generator command") worked, semantic edit (tape-reader Step 7 P11→P12 placeholder bump) worked, name preservation (helm's pm.md "helm" reference) worked. All three merged by user.
- **Surfaced architectural gap from helm#5 pattern flag:** helm has no `agents/ui-reviewer.md` (CLI/agent tool, not Next.js), captains-log silently kept its irrelevant copy because it was created from seeds the day before. Same project shape, inconsistent classifier output. Forcing function for Task 28.
- **Task 28 (3 pts) — project-type gating, DEC-011 — [PR #18](https://github.com/mobiustripper42/seeds/pull/18), merged.** New `<seeds>/.claude/type-manifest.yaml` (deny-list manifest gating template files to project types). New single-line `<project>/.claude/project-type` declares the type (`webapp` | `tool`). `@sync-config` Step 1 reads both, drops gated file pairs from scope before classification. Step 3 surfaces a `Type-gated` Provenance row per gated file. Projects without `.claude/project-type` stay ungated (legacy behavior preserved). Backfilled bushel (webapp), helm (tool); user backfilled captains-log (tool); sailbook deferred until V3 migration.
- **Code-review fold-in — [PR #19](https://github.com/mobiustripper42/seeds/pull/19), merged.** 2 OBSERVATIONs + 2 NITs from `@code-review` against PR #18 addressed in commit `f669902`: `dev/claude/routines/README.md` Provenance list updated to include `Type-gated`; `CLAUDE.md` Setup steps renumbered (`9a.` → real `10.`, shifted 10/11/12 to 11/12/13) so GitHub's `<ol>` renders the section as a contiguous list; `routine-config.yaml` repo-layout comment clarified; PROJECT_PLAN.md Task 28 row notes that project-type backfills live in respective project repos, not seeds; `sync-config.md` Step 1 ungated reminder split into two literal forms (missing-file vs unknown-token) for deterministic auto-mode output. Mirror parity verified post-edit.
- **Files (PRs #18 + #19 combined):** `.claude/type-manifest.yaml` (new), `.claude/agents/sync-config.md` + `dev/claude/agents/sync-config.md` (byte-identical mirror, Step 1 type-gate + Context You Need + Step 3 table + ungated literal forms), `CLAUDE.md` (root) repo layout + needed-files + Setup steps 1–13 + Routine section, `dev/claude/CLAUDE.md` template Key Docs row, `dev/claude/routines/README.md` Provenance bullet, `dev/claude/routines/nightly-sync.md` PR body template, `docs/DECISIONS.md` DEC-011, `docs/PROJECT_PLAN.md` Task 28 row + next-session priority.
- **Three branches pushed and merged:** seeds (PR #18 + #19), bushel `claude/review-nightly-sync-prs-Ph9Xa` (project-type=webapp), helm `claude/review-nightly-sync-prs-Ph9Xa` (project-type=tool). User merged all from CC web UI.

**In Progress:** Nothing.

**Blocked:**
- Sailbook backfill (`.claude/project-type=webapp`) waits on Task 18 (V2→V3 migration) since sailbook isn't in the Routine's chip area yet.
- Re-paste of `dev/claude/routines/nightly-sync.md` into the Routine config on claude.ai still pending (manual deploy step per DEC-010). Without it, tonight's PRs will have the old PR-body template (no `Type-gated` mention in the body's listed Provenance values) — but the agent's classification table still emits `Type-gated` rows correctly because the agent file is read fresh from `seeds:main` each Routine run.

**Next Steps:**
1. **Tomorrow morning's `routine: last run 2026-05-10` issue:** verify (a) helm + captains-log PR bodies show one `Type-gated` row each for `agents/ui-reviewer.md` (or no PR opened if that was their only diff), (b) bushel's PR body has no `Type-gated` rows. First live verification of DEC-011.
2. **Re-paste `nightly-sync.md`** into the Routine config on claude.ai (cosmetic but lands the `Type-gated` mention in the PR body's listed Provenance values).
3. **Close stale issue [seeds#12](https://github.com/mobiustripper42/seeds/issues/12)** ("config read failed 2026-05-08") — flagged for manual close in PRs #14 and #16.
4. **Housekeeping sweep on stale `[ ]` rows** in PROJECT_PLAN.md — likely `[x]` candidates: 17 (schema versioning), 20 (semver), 21 (staging-flow), 23 (supabase guard), 24 (bushel V3). Quick verification + mark closed.
5. **Task 19** (PR-state robustness, 2 pts) and **Task 18** (sailbook V2→V3 migration, 5 pts) — real remaining work after housekeeping.
6. **/its-dead Step 5 stale-local-main fix (~1 pt)** — see Context. Pull main BEFORE checkout (or use `git fetch origin main:main` while on the working branch). Surfaced by this session's recovery.
7. After 3-4 clean Routine runs in a row, daily checks become weekly. User's stated goal: "we only do checks on the process occasionally."

**Context:**
- **Captains-log fooled the classifier on first run.** The Routine's enumeration logged "all agent and skill SHAs match the template" — captains-log was created from seeds verbatim the day before. So `ui-reviewer.md` was present-but-irrelevant, and SHA-matching meant no flag fired. Different shape from helm (where the *absence* triggered the pattern flag), same architectural fact (both are tool-type). This was the forcing function for whole-file gating instead of relying on Sonnet judgment per-file.
- **DEC-011 keeps `project-type` and `seeds-version` as separate one-liner files**, not combined in a single YAML. Reasoning in DEC: (1) read precision — every consumer parses `seeds-version` as int, mixing string fields means every reader grows a parser; (2) scope clarity — `seeds-version` is schema-compatibility (DEC-006), `project-type` is file-applicability (DEC-011). Different concerns, different lifetimes.
- **Whole-file gate, not hunk-level.** A `tool` project doesn't half-want `ui-reviewer.md`. Scoping out the file before classification is cleaner than emitting Provenance rows per hunk inside a file that shouldn't have been diffed in the first place.
- **Backwards compatibility is the safety net.** Projects without `.claude/project-type` are treated as ungated — every template file diffs as before, classifier judgment applies. So merging Task 28 to seeds without immediately backfilling all projects = no regression. Backfill happens opportunistically.
- **Manifest at `<seeds>/.claude/type-manifest.yaml`**, not `dev/claude/`. It's seeds-side tooling config (alongside `routine-config.yaml`), not a template that gets copied to projects.
- **One-line project-type files committed directly to project branches (bushel, helm) without separate PRs** — user merged from the branches via CC web UI flow. Cleaner than opening 2 trivial PRs.
- **PR #18 was opened from CC web UI**, not via `gh pr create`. The /kill-this Step 4 PR-creation path was effectively skipped — branch was already submitted before /kill-this ran. /kill-this Step 4.0 (EXISTING_PR_STATE = MERGED) is the gating sub-step that catches this; it surfaced cleanly as designed.
- **No code-review agent available in CC web sandbox** — used `general-purpose` Agent with a code-review-style prompt instead. Worked fine for a small, well-scoped change. Worth flagging that CC web sessions effectively never have the project's `.claude/agents/code-review.md` available; the workaround is general-purpose with a tight prompt + concrete check items.
- **Code review found 2 OBSERVATIONs after PR #18 merged** — both real bugs (stale Provenance list in README, broken `<ol>` numbering in CLAUDE.md). Splitting the fix into PR #19 (instead of amending #18) preserves the merged-history audit trail: #18 is what got reviewed, #19 is what was folded in. Worth keeping as a pattern for future post-merge review fold-ins.
- **/its-dead Step 5 stale-local-main bug surfaced.** Local main was 7 commits behind origin/main when /its-dead's `git checkout main` ran. The skill assumed an earlier `git pull --ff-only origin main` (issued while still on the working branch) updates local main — it doesn't reliably (pull updates `FETCH_HEAD` and the current HEAD, but doesn't always advance the local `main` ref). Result: checkout-to-main reverted every PR-touched file to pre-merge state, `git stash pop` conflicted on the new session file (which didn't exist on old main), and recovery required `git rm` the conflict, `git stash drop`, `git pull --ff-only origin main` on main, then re-write the session file fresh and commit. Worth a /its-dead Step 5.2 fix: pull main forward BEFORE the checkout, or use `git fetch origin main:main` while still on the working branch to advance the local ref directly.
- **Duration recorded raw (24.92h)** per S20 "keep raw" precedent. Wall clock from session start (2026-05-09 13:11Z) to last commit (2026-05-10 14:04Z). Includes overnight idle (~12+ hours) plus gaps between merge cycles. Actual focused effort was a fraction. The session spanned: review of 3 nightly-sync PRs → Task 28 design conversation → implementation → /kill-this → PR #18 merge → code review → PR #19 fold-in → /its-dead.
- **The 2026-05-09 nightly run is the verification record** for Tasks 26 + 27 from S20: real newlines in PR bodies (Task 27, ✓), 3-repo enumeration from form chip area (Task 26 form-as-source, ✓), Provenance labels on every hunk (Task 26 Provenance, ✓), CLAUDE.md in `@sync-config` diff scope (Task 26 CLAUDE.md scope, ✓ — surfaced in seeds#17's classification table). All three verified live before this session shipped Task 28 on top.

**Code Review:** No BLOCKERs across the session. 2 OBSERVATIONs (`README.md` stale Provenance list at lines 50-54; `CLAUDE.md` `9a.` breaking ordered-list rendering at line 134) + 4 NITs surfaced by `@code-review` (via general-purpose Agent fallback) against PR #18. All addressed in commit `f669902` and merged via PR #19 — splits cleanly so the merged history shows what was reviewed (#18) vs what was folded in (#19). Mirror byte-parity verified post-edit.
