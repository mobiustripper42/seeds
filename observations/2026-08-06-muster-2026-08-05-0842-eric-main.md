---
repo: muster
session: 2026-08-05-0842-eric-main
transcript: ~/.claude/projects/-home-eric-muster/eedc8899-8d78-4986-8703-60996168f28a.jsonl
observed: 2026-08-06
---

## Candidate — `/kill-this` bypassed for most tasks; one PR shipped with zero code review, four defects reached the operator  ·  high

**What happened:** `Skill(kill-this)` was invoked exactly once in the whole session (transcript line 166, for `task/660-period-seam-documented`). Every other task's commit/push/PR flow ran as hand-typed `git`/`gh` commands instead:

- `gh pr create --head task/659-webkit-race-parked` — line 388
- `gh pr create --head task/654-typed-err-copy` — line 576
- `gh pr create --head task/644-crew-header` — line 919 (this is PR #665)
- `gh pr create --head task/613-paid-but-unbooked` — line 1494
- plus PR #671 (task/614) around line 1682, and PRs #672/#673/#674 around lines 1914/1967/2116

`Skill(its-dead)` was invoked once at the very end (line 2137) and only there.

**Consequence 1 — missing session log, caught by the user, not by Claude:** at line 1688 the user wrote `"you skipped kill this!"` — the only correction of its kind in the session. Claude's own reply at line 1690: *"You're right — I did the build/commit/PR steps by hand but skipped the part that actually matters, the session log. Three tasks unlogged."* Three `## Task` entries were then backfilled by hand (lines 1691–1709).

**Consequence 2 — a PR shipped with no code review, and it had real bugs:** `docs/AGENTS.md`/`CLAUDE.md:79` states `@code-review` runs "After every commit (wired into `/kill-this`))". Because task/644-crew-header's PR (#665) was created by hand (line 919) rather than through `/kill-this`, it never got that review. The retro-review agent invoked later against the merged PR (line 1876) was told exactly this in its prompt: *"This PR is the reason you were called. It is 23 files and +776/-182, it never got a code review, and the operator found FOUR defects in it by hand within minutes of it shipping."* Those four defects (an operable control behind a modal backdrop, an undersized touch target, a dead-end drawer link, a drawer that couldn't be closed at 375px) were fixed in a follow-up commit — after shipping to `main`, not before.

**Consequence 3 — the pattern recurred after the user's correction:** PRs for tasks after line 1688 (#672 at ~1914, #673 at ~1967, #674 at ~2116) were still created by hand; `Skill(kill-this)` was not invoked again for any of them. The session-log gap for these was absorbed at the end because `/its-dead` (line 2137) aggregates `pr_numbers` directly from GitHub rather than from per-task log entries — a save that happened to exist, not a fix to the behavior that caused the gap.

**Cost if it recurs:** not recoverable by re-reading later — a PR that ships without `@code-review` can ship with real defects on `main`, as it did here (PR #665). The 90-second session-log gap is cheap and was cheaply fixed; the missing review pass is the expensive part and the one that actually bit.
**Self-announcing:** mixed. The session-log gap announced itself only because the user was watching closely enough to say "you skipped kill this" — nothing in the workflow flagged it on its own. The missing code-review pass did not announce itself at all in the moment; it surfaced only because a human manually tested the feature after it shipped, and only got a retrospective review because the user later asked for one by name.

**Sketch (proposed, not a rule):** none offered here — this is a single-session finding on a repeated-invocation pattern, exactly the kind of judgment DEC-S039 reserves for `@workout` across repeats, not for a one-session read.

---

## P7 — Full test suite run during development  ·  low

**Occurrence:** line 872 — `npx playwright test --project=mobile --reporter=line 2>&1 | grep -E "..."`, no spec file given, run mid-task during `task/644-crew-header` work (preceded by the text "Now the mobile (375px) project across every crew-touching spec — that's the primary target.", line ~871). CLAUDE.md's Micro Workflow step 6 says run targeted files (`npx playwright test tests/foo.spec.ts --project=desktop`) and "Full suite (`npx playwright test`) is never run automatically. Ask first."
**Cost if it recurs:** slower iteration, no data risk noted in this run (single project, not the full multi-project suite) — recoverable.
**Self-announcing:** yes — visible directly as an unscoped `playwright test` invocation in the transcript.

---

## Candidate — heavy use of `Bash` + `python3` heredocs as an `Edit`-tool substitute for mechanical multi-file changes

**Occurrence:** 84 separate `python3 - <<'PY' ... PY` invocations across the session (first at line 468, `task/654-typed-err-copy`; recurring through line 2148), versus 34 `Edit` and 17 `Write` tool calls total. Scripts mostly perform `Path.read_text()` / `str.replace()` / `Path.write_text()` against source files — functionally the same operation `Edit` performs, but without `Edit`'s guarantee that the target string is present and unique before writing (35 of the 84 scripts do include their own `assert`, so it wasn't uniformly unchecked).
**Why it might be a pattern:** the same task this produced (#654, "typed err copy," 10 surfaces) was flagged by name in the retro-review agent's own prompt (line 1871): *"much of this diff was applied by SCRIPT across ten surfaces, then spot-checked by hand. Mechanical application across many files is exactly where a subtle per-surface mistake hides."* The session itself identifies the risk of its own tool choice.
**Why it might be noise:** for genuinely mechanical, repeated edits across many similar files, a single scripted pass is plausibly more reliable than 10 manual `Edit` calls with hand-copied anchors — and CLAUDE.md's existing python3 guidance (Workflow Notes) is scoped narrowly to JSON parsing, not file edits, so there's no written rule this breaches.
**Cost if it recurs:** a silent no-op replace (no assert) would produce a file `Edit` would have refused to touch — not directly observed failing here, but the retro-review prompt itself treats it as the leading risk category for that PR.
**Self-announcing:** no — a script that runs to completion and prints "done" gives no signal that a `.replace()` call matched zero occurrences unless the script asserts on it.

---

**False-calibration sweep:** 0 hits. Grepped all assistant `text` blocks for `almost certainly|certainly|definitely|clearly|obviously|must have been|is likely|probably|no doubt|undoubtedly` — no matches in this transcript.

**Patterns checked, not found:** P1 (no unbounded reads of PROJECT_PLAN/session-log/CLAUDE.md — `/its-alive` and `/kill-this` context reads were scoped), P2 (no identical Bash command repeated as a distinct un-allowlisted pattern — two `Permission denied` results, at lines 1087 and 1635, were each a one-off destructive command (`rm -rf`, `git branch -D`) that got adapted on retry rather than repeated verbatim), P3/P10/P17 (zero "has not been read" errors), P4 (branch captured via `/its-alive` Step 0 before any commit), P5/P6 (PR test plans not inspected in this pass — no PR body text sampled), P9 (every `cd` is chained with `&&`/`;` in the same Bash call), P12 (`its-dead` invoked once only), P14/P15/P16 (no error-context re-reads, no test retries-for-races, no stale dev-server hunts observed).
