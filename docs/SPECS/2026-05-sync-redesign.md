# Sync redesign — phased implementation

**Status:** Active
**Owner:** @architect
**Implements:** DEC-018, DEC-019
**Date:** 2026-05-19

## Goal

Cut nightly-Routine PR noise by making `@sync-config` aware of file classes (DEC-018) and splitting hybrid files into shell + context pairs (DEC-019). Target: every Routine PR has ≥80% real-change rows and 0 LLM flip-flop across consecutive nights.

## Non-goals

- **No `settings.json` JSON-merge design.** That file is hybrid but needs a different strategy. Deferred to DEC-020, drafted after Phase 4 ships.
- **No retro "prefer-apply for structural Both-modified diffs" heuristic.** Deferred to DEC-021. Independent of this work.
- **No automated context extraction.** Per-project extraction is manual. LLM-assisted (paste template, ask Claude to identify shell vs context lines) is fine. Full automation is not in scope.
- **No touching sync-config's Step 3 PR template/formatting** beyond what DEC-018 requires for logic-drift rows.

## Success metrics

- Per-PR noise rows drop ≥70% on next-month sample vs the seeds#36 / sailbook#58 baseline.
- Zero classifier flip-flop on logic-class files (impossible by construction once Phase 1 ships — hash-compare is deterministic).
- Bushel's CLAUDE.md byte count drops measurably (estimate: ~60%) after Phase 2.

---

## Phase 1 — file-class registry + sync-config Step 2 update

**Scope:** Seeds repo only. No project repos touched.

**Files touched:**
- `seeds/.claude/routine-config.yaml` — add `file-classes` map
- `seeds/dev/claude/agents/sync-config.md` — new Step 1.4, amended Step 2, amended Step 3
- `seeds/docs/DECISIONS.md` — append DEC-018

**Pre-conditions:**
- DEC-018 merged in DECISIONS.md
- No open Routine PRs on seeds (so the registry change ships to projects on a clean night)

**Steps:**
1. Append DEC-018 to `docs/DECISIONS.md`.
2. Add `file-classes` block to `.claude/routine-config.yaml` with the seed glob list from DEC-018.
3. Amend `dev/claude/agents/sync-config.md`:
   - Insert Step 1.4 (file-class lookup, behavior fork)
   - Amend Step 2 to branch on class (hash-compare for logic, hunk classification for hybrid/unclassified, skip for context)
   - Amend Step 3 to render logic-drift rows as one row per file with provenance `Class: logic`
4. Self-review: run the routine against one project (e.g., bushel) in dry-run mode if available, otherwise wait for nightly.
5. Observe first post-deploy nightly PRs. Verify logic files either produce no row or produce a single drift row, never a multi-hunk classification.

**Acceptance criteria:**
- First post-deploy Routine PR on any project shows zero hunk-level rows for any file matched by a `logic` glob.
- Any pre-existing drift on a logic file shows as a single row, not a hunk breakdown.
- No regression in PR generation for `hybrid` and unclassified files (they behave as before this phase).

**Rollback:**
- Revert the three seeds files. Next nightly returns to legacy behavior.
- No project repos changed, so no cleanup elsewhere.

**Time estimate:** 5 points.

**Risk flags:**
- Globs in `routine-config.yaml` may be parsed differently than expected by the agent's YAML loader. Test with at least one wildcard and one exact path.
- Step 1.4 ordering: must run after Step 1's type-gate but before Step 1.5's open-PR dedup. Wrong order = either redundant work or missed dedup.

---

## Phase 2 — CLAUDE.md split

**Scope:** Seeds + bushel + sailbook. Webapp projects only. Tool projects (crewbook, captains-log, helm, crewculator) deferred to a later mini-phase if they use `CLAUDE.md` at all — verify before extending.

**Files touched:**
- `seeds/dev/claude/CLAUDE.md` — replace with shell content per DEC-019 section table
- `seeds/.claude/routine-config.yaml` — ensure `dev/claude/CLAUDE.md: hybrid` is in the registry (added in Phase 1)
- `seeds/docs/DECISIONS.md` — append DEC-019 (if not already from Phase 1 prep)
- `bushel/CLAUDE.md` — replace with seeds shell + load instruction
- `bushel/.claude/CLAUDE-context.md` — new file, holds bushel's current project-specific content
- `sailbook/CLAUDE.md` — same as bushel
- `sailbook/.claude/CLAUDE-context.md` — new file

**Pre-conditions:**
- Phase 1 deployed and one nightly run observed clean
- DEC-019 merged in DECISIONS.md
- Bushel and sailbook have no open Routine PRs touching `CLAUDE.md`

**Steps:**
1. Append DEC-019 to `seeds/docs/DECISIONS.md`.
2. Build the new `seeds/dev/claude/CLAUDE.md` shell:
   - Use the section table in DEC-019 to determine what stays
   - Add load instruction at top: "Read `.claude/CLAUDE-context.md`. If the file does not exist, stop and tell the user to create it."
   - Strip all placeholders that move to context (`[Project Name]`, stack, data model, commands)
   - Keep universal `## Key Docs` rows; add a `## Additional Docs` placeholder hook pointing at context
3. For bushel:
   - Identify project-specific content in current `bushel/CLAUDE.md` (LLM-assisted extraction is fine: paste current file, ask for shell-vs-context classification using DEC-019's table)
   - Write `bushel/.claude/CLAUDE-context.md` with all context-class content (stack, data model, commands, project-specific workflow notes, two-Supabase-projects discipline, preview URL setup, port-3001 gotcha, etc.)
   - Replace `bushel/CLAUDE.md` with the seeds shell verbatim
   - Open Claude session in bushel, verify the shell's load instruction triggers reading the context file
4. Repeat step 3 for sailbook.
5. Verify nightly Routine: next run on bushel and sailbook should show `CLAUDE.md` either fully clean or with only true shell-vs-shell diffs.

**Acceptance criteria:**
- `bushel/CLAUDE.md` and `sailbook/CLAUDE.md` are byte-identical to `seeds/dev/claude/CLAUDE.md`.
- `bushel/.claude/CLAUDE-context.md` and `sailbook/.claude/CLAUDE-context.md` exist and contain all previously-project-specific content (nothing lost).
- Next nightly Routine PR on bushel and sailbook has zero `CLAUDE.md` rows (or only true structural drift).
- Session smoke test: open Claude in bushel, ask "what's the stack?", verify it answers from context file.

**Rollback:**
- Restore `bushel/CLAUDE.md` and `sailbook/CLAUDE.md` from pre-phase commit.
- Delete `.claude/CLAUDE-context.md` in both projects.
- Revert `seeds/dev/claude/CLAUDE.md` to pre-phase commit.
- Registry entry stays (harmless without the split).

**Time estimate:** 8 points (5 for seeds shell construction + section-by-section judgment calls, 1.5 per project for extraction).

**Risk flags:**
- Extraction error: a shell line accidentally moved to context = silent loss of cross-project content (project loses access to Tone/Verbosity etc. until next sync proposes restoring it). Mitigation: diff bushel's current `CLAUDE.md` against the new shell+context concatenated, expect zero diff (modulo formatting).
- Load instruction reliability: if Claude doesn't follow "read this other file first" reliably, the split breaks. Mitigation: DEC-016's identical instruction has worked for ui-reviewer for months. Reuse exact phrasing.
- Tool projects without `CLAUDE.md` customization: verify before extending. If they're already template-clean, skip.

---

## Phase 3 — agents/architect.md split

**Scope:** Seeds + all 6 projects (sailbook, crewbook, bushel, captains-log, helm, crewculator). The architect agent runs in every project.

**Files touched:**
- `seeds/dev/claude/agents/architect.md` — strip stack-specific examples, add load instruction
- Per project (6 of them): `.claude/agents/architect.md` (replaced with seeds shell) and `.claude/architect-context.md` (new)

**Pre-conditions:**
- Phase 2 deployed and one nightly observed clean
- No open Routine PRs touching `agents/architect.md` in any project

**Steps:**
1. Build new `seeds/dev/claude/agents/architect.md` shell:
   - Keep the persona rules (default to simpler option, high bar for new patterns, reference DEC IDs, "proceed" in one line when fine)
   - Strip stack-specific examples ("Next.js, Supabase, shadcn/ui, Tailwind") — these move to context
   - Add load instruction at top pointing at `.claude/architect-context.md`
2. For each of the 6 projects:
   - Build `.claude/architect-context.md` with: stack one-liner, project-specific patterns-to-prefer, project-specific anti-patterns
   - Replace `.claude/agents/architect.md` with the seeds shell
   - Webapp projects (bushel, sailbook): include shadcn/Tailwind/Supabase patterns in context
   - Tool projects (crewbook, captains-log, helm, crewculator): include whatever stack they use; if minimal, a 3-line context is fine
3. Run a session per project asking the architect a stack-specific question; verify context is loaded.

**Acceptance criteria:**
- All 6 projects' `.claude/agents/architect.md` are byte-identical to `seeds/dev/claude/agents/architect.md`.
- Each project has a non-empty `.claude/architect-context.md`.
- Next nightly Routine PR on every project has zero `architect.md` rows (or only true shell drift).
- Smoke test in 2 projects: architect responses reflect project stack.

**Rollback:**
- Restore each project's `.claude/agents/architect.md` from pre-phase commit.
- Delete `.claude/architect-context.md` from each project.
- Revert `seeds/dev/claude/agents/architect.md` to pre-phase commit.

**Time estimate:** 8 points (3 for seeds shell, ~1 per project × 6 = 5 wall-clock, run in parallel sessions).

**Risk flags:**
- Stack-specific advice in architect responses dries up if context extraction is too aggressive. Mitigation: err toward keeping more stack context than less; the file is project-owned anyway.
- Tool projects may have minimal architect context — that's fine, but verify the agent doesn't break when context is short.

---

## Phase 4 — agents/code-review.md split

**Scope:** Seeds + all 6 projects.

**Files touched:**
- `seeds/dev/claude/agents/code-review.md` — strip stack-specific review checks, add load instruction
- Per project (6 of them): `.claude/agents/code-review.md` (replaced with seeds shell) and `.claude/code-review-context.md` (new)

**Pre-conditions:**
- Phase 3 deployed and one nightly observed clean
- No open Routine PRs touching `agents/code-review.md` in any project

**Steps:**
1. Build new `seeds/dev/claude/agents/code-review.md` shell:
   - Keep universal review rules (scope, DEC references, no out-of-scope changes, etc.)
   - Strip stack-specific checks (Supabase RLS, shadcn usage, Tailwind class conventions)
   - Add load instruction at top
2. For each of the 6 projects:
   - Build `.claude/code-review-context.md` with: stack-specific checks, project lint rules, project-specific RLS/auth checks
   - Replace `.claude/agents/code-review.md` with the seeds shell
3. Run a code-review session per project on a small PR; verify context-specific checks fire.

**Acceptance criteria:**
- All 6 projects' `.claude/agents/code-review.md` are byte-identical to `seeds/dev/claude/agents/code-review.md`.
- Each project has a non-empty `.claude/code-review-context.md`.
- Next nightly Routine PR shows zero `code-review.md` rows on every project.
- Smoke test: code-review on 2 projects flags stack-specific issues.

**Rollback:** Same shape as Phase 3 — restore files, delete context, revert shell.

**Time estimate:** 8 points. Same shape as Phase 3.

**Risk flags:**
- Same as Phase 3, plus: code-review is more sensitive to dropped checks than architect (false-negatives = bugs ship). Mitigation: extract conservatively, leave borderline checks in context.

---

## Post-phase follow-ups

- **DEC-020** (`settings.json` JSON-merge strategy). Draft after Phase 4 ships and the registry pattern is validated. Settings files are still in the noise budget — sailbook#58's three skips included one on settings.json.
- **DEC-021** (retro "prefer-apply for structural Both-modified diffs"). Independent track. Draft when prioritized.
- **Tool-project audit for CLAUDE.md.** Phase 2 only covered webapp projects. Verify tool projects (crewbook, captains-log, helm, crewculator) either have no `CLAUDE.md` customization or get the same split treatment in a mini-phase.

## Open questions for next architect session

- Should the registry support per-project overrides (e.g., a project says "this hybrid file is actually all context for me")? Default answer: no — that's what type-gating (DEC-011) is for. Reopen if a real case appears.
- After Phase 4, is there enough signal to consider a `class: skip-always` for files we know are never going to sync (e.g., `docs/SPEC.md`)? Probably redundant with `class: context`. Defer until evidence shows otherwise.
