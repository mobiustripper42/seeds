---
id: DEC-S010
title: "Bi-directional nightly sync via Anthropic Routine"
topic: "Sync — directions, classification & file classes"
---

## DEC-S010: Bi-directional nightly sync via Anthropic Routine

**Decision:** Sync runs unattended nightly via a single Anthropic Routine (`dev/claude/routines/nightly-sync.md`) that handles BOTH directions per repo. The Routine reads `.claude/routine-config.yaml` for filter rules + direction config, enumerates the repos its MCP github session has access to (the **Routine form's repo chip area on claude.ai is the active-set source of truth**), filters by `exclude:` + `require:` + `.claude/seeds-version` presence and version match, and per (repo × direction) invokes `@sync-config` in `mode: auto`. Each invocation that produces non-empty changes opens its own PR — upstream PRs into `mobiustripper42/seeds:main`, downstream PRs into the project's default branch (the active trunk; never a `production` deploy branch — DEC-S022). Nothing merges automatically; the PR is the human-review checkpoint.

**Active-set source of truth = Routine form, not config.** The original design (PR #11, 2026-05-07) had `routine-config.yaml` carry an `orgs:` list and the Routine enumerated `<org>/*` via `repos.list`, then filtered. The first live run (2026-05-08) revealed the failure mode: GitHub OAuth scope is per-repo, not org-wide. Listing returned 18 repos; per-repo content reads denied 17 of them; the Routine aborted cleanly via the safety guardrail. Fix: the Routine form's chip area (the same surface that gates MCP access) is now the canonical active-set declaration. Adding a project to the active set = add it to the form. Removing = remove the chip. No config edit needed for either. The `orgs:` block was dropped from `routine-config.yaml`; `exclude:` stays as a second filter for the always-skip-anyway case (seeds-itself).

**Supersedes the upstream-only stance in DEC-S004.** That decision treated downstream as manual-only because mid-task conflicts were the worst-case. The Routine's "open a PR, never apply directly" pattern bounds that risk: a bad downstream sync lands as a PR sitting in a project's queue, not as a destructive merge. Manual `/pull-seeds` still exists for the "I want it now" case.

**Auto mode on `@sync-config`:** the agent now accepts `mode: interactive` (default, used by `/push-seeds` and `/pull-seeds`) and `mode: auto` (used by the Routine). Auto mode applies every backport/forward-port without prompting, defaults to skip on ambiguity (the PR is the safety net), and never acts on pattern flags — those go in the report only.

**Provenance labeling on every hunk.** The first live run blanket-skipped `docs/*.md` files as "100% project-specific" without per-hunk classification — a degradation of the agent's contract that hid template-side structural improvements from propagation. Fix: `@sync-config` Step 2 now labels every hunk's provenance: `Project-only` (content in project, missing from template — typically a `[placeholder]` filled in or project-specific structure), `Template-only` (content in template, missing from project — typically a structural improvement to forward-port), or `Both-modified` (non-matching content on both sides — highest ambiguity, defaults to skip with a flag in the PR body). The Provenance label is a required column in the agent's classification table and in every Routine PR body. Rationale: BRAND.md, PROJECT_PLAN.md, RETROSPECTIVES.md, and CLAUDE.md all carry both project substitutions AND template structure; the per-hunk + per-provenance treatment is the only way to propagate structural changes without overwriting customizations. Files that have a corresponding template (every file under `<seeds>/dev/claude/`) MUST be hunk-classified — never blanket-skipped.

**`CLAUDE.md` added to `@sync-config` diff scope.** The agent's Step 1 originally listed `.claude/skills/`, `.claude/agents/`, and `docs/<name>.md` pairs but omitted the project root `CLAUDE.md` vs `<seeds>/dev/claude/CLAUDE.md` pair. Result: structural sections added to the template (e.g. `§Versioning`, `§Tone`, `§Verbosity`, `§Cost and Waste`, `§Migration Protocol § Production write protection`) had no propagation path. Now in scope; the per-hunk Provenance treatment handles the heavy customization (stack, role descriptions, project-specific commands) without blocking structural propagation.

**PR shape: one per (repo × direction).** The earlier local prototype (`scripts/nightly-sync.sh`) used a stacked single-PR-to-seeds for all upstream changes. Per-repo PRs are easier to merge selectively, easier to revert per-repo, and parallelize across the two directions. Cost: more PR noise per run. Acceptable — the rolling `routine: last run <DATE>` issue lists them all in one place.

**Schema-version mismatches** are skipped per-repo with no PR opened, rolled into a single rolling `routine: migration backlog` issue on `mobiustripper42/seeds`. The repo rejoins the active set automatically the run after it migrates.

**Per-run summary** is a rolling `routine: last run <DATE>` issue on `mobiustripper42/seeds` — body replaced each run, edit history preserved by GitHub. One issue, not one per day, so the issue list stays clean.

**Why YAML for `routine-config.yaml`:** the config carries lists (exclude, directions) and nested keys (per-direction prefixes). Plain newline-separated would force a parallel-file convention; JSON forbids comments which the file genuinely needs. YAML supports comments, is human-editable, and CC parses it natively.

**Why a single Routine, not one per direction:** running both directions in the same session means upstream backports landing in seeds first are already visible to the downstream pass — no day-of-lag for a backport to ride out to other projects. The Pro plan's 5-runs/day limit also matters; one Routine consuming one slot/day leaves headroom for ad-hoc Routines.

**Tradeoff:** the prompt in `dev/claude/routines/nightly-sync.md` is the canonical body, but the Routine actually executes from a copy stored in claude.ai. Drift between the two is a real failure mode — the deployment guide (`dev/claude/routines/README.md`) calls out the manual re-paste step, but there's no automated check. Same drift risk now applies to the form's chip area as the active-set surface — adding a project there has no source-control trace.

**Scaling boundary:** discovery is O(repos-the-form-grants). The user controls the size of the active set directly; no API enumeration cost. Worth re-examining if the form ever exposes an "all repos in org X" toggle that would short-circuit the per-repo selection — at that point we'd be back to the per-repo OAuth question and might want a `routine-config.yaml`-side allowlist as a second filter.

**Resolves the prior `DEC-TBD: Anthropic Routines GitHub access model`** — answered by Task 4 research and refined by the 2026-05-08 first run: multi-repo OAuth via the `/web-setup` skill flow on claude.ai, PRs opened via the MCP github connector, scope is per-repo (per chip in the form), Pro plan = 5 runs/day. No PAT or GitHub App install needed.

**Resolves the prior `DEC-TBD: Repo list format for the Routine`** — chosen format is YAML at `.claude/routine-config.yaml`. Rationale above.

**Resolved:** the local-WSL `scripts/nightly-sync.sh` was retired 2026-05-14 (DEC-TBD resolution above, Task 8). The Routine is the only sync path.

---
