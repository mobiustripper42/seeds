# seeds — Architectural Decisions

Decisions are numbered DEC-NNN. "DEC-TBD" means the decision is flagged but unresolved — consult @architect before building.

---

## Index

### Template families & repo structure
- DEC-S001 — Two template families (`dev/` and `domain/`)
- DEC-S002 — Skills live project-level, not user-global

### Sync — directions, classification & file classes
- DEC-S003 — One sync concept, two directions, same classifier
- DEC-S004 — Upstream = nightly remote Routine, downstream = manual skill _(amended by DEC-S038 — the upstream leg — both directions are now manual; downstream-is-manual was already right)_
- DEC-S010 — Bi-directional nightly sync via Anthropic Routine _(retired by DEC-S038 — the nightly automation only — the config, the classifier and the file-class registry it defined are still read by manual sync)_
- DEC-S011 — Project-type gating for template files _(revised by DEC-S040 — type gating loses its consumer with @sync-config; the manifest survives as documentation)_
- DEC-S016 — ui-reviewer agent split — generic shell + project context file _(extended by DEC-S019 — the pattern generalized from one agent to any shell/context pair)_
- DEC-S018 — File-class registry for sync-config _(extended by DEC-S039 — the registry now also decides what /read-the-tape may edit, not only what sync may overwrite; revised by DEC-S040 — the registry loses every automated consumer and survives as guidance for the manual copy)_
- DEC-S019 — Hybrid-file split pattern (generalization of DEC-S016) _(refined by DEC-S042 — how the shell/context boundary is drawn inside Micro Workflow — the split itself, and every other section's use of it, stands)_
- DEC-S028 — The Routine emits a fleet-status digest — the read side of the SPEC hub; rolling issues are pinned by config number _(retired by DEC-S038 — the digest is dormant while the Routine that emitted it is off)_
- DEC-S038 — The nightly sync Routine is off — seeds ↔ project sync is on-demand from CC Desktop _(revised by DEC-S040 — the holding that manual /push-seeds and /pull-seeds carry the steady state — both are now retired; the Routine stays off)_
- DEC-S039 — The learning loop splits observation from rule — evidence accrues in seeds, promotion is a separate, periodic act _(revised by DEC-S040 — @tape-reader's project-owned fix path and PR, and Phase 4's outward mechanism — the observation half stands unchanged; refined by DEC-S041 — adds a third severity input and a cause field at capture time; the cost/detectability axes and the no-count rule stand unchanged; refined by DEC-S045 — the trigger for evidence capture only; the observation/promotion split, @tape-reader's job, and @workout's manual cadence are unchanged)_
- DEC-S040 — Automated seeds ↔ project sync is retired entirely — the loop is observe, promote, copy by hand

### Session lifecycle & skills
- DEC-S012 — Session-end flow — `/its-dead` first, merge last; PR-flow default on protected `$WORKING_BRANCH`
- DEC-S013 — Per-task `/kill-this`, single `/its-dead`, all time math at `/retro` _(amended by DEC-S024 — the retro time math only — the per-task/per-session split stands)_
- DEC-S014 — Session files on orphan `sessions` branch via dedicated worktree

### Velocity, retro math & throughput
- ~~DEC-S015 — Per-PR dev/review windows in retro time math~~ → superseded by DEC-S024
- ~~DEC-S024 — Retire the dev/review time split — active time is the single velocity (supersedes DEC-S015, amends DEC-S013)~~ → superseded by DEC-S026
- DEC-S026 — Throughput (points per calendar week) replaces transcript-based active-time velocity (supersedes DEC-S024)

### Branches, versioning & release
- DEC-S005 — Branch model — task/* branches + PR flow
- DEC-S006 — Schema versioning — single global integer at `seeds-version` _(refined by DEC-S040 — what the version integer is for, now that no skill gates on it)_
- DEC-S007 — Project semver — `package.json` + git tag, three triggers, dev projects only
- ~~DEC-S008 — Staging promotion via ff-merge, not PR~~ → superseded by DEC-S022
- DEC-S022 — `main` is the active trunk; `production` is the deploy branch (replaces DEC-S008)

### Agents & review
- DEC-S017 — Fact-check and structural-audit are separate reviewer concerns
- DEC-S032 — Cite-facts-label-proposals rule + tape-reader cite-guard; the muster hook trial ends with hooks dropped
- DEC-S033 — `@architect` + `@code-review` go stack-neutral (defer to `CLAUDE-context.md § Conventions`) _(amended by DEC-S035 — the rollout paragraph only — the stack-neutral template stands)_
- DEC-S035 — `@architect`, `@code-review`, `@ui-reviewer` become project-owned — seeds keeps templates, sync stops touching them
- DEC-S041 — The observer captures cause and operator reaction — both perish with the session, and severity cannot be judged without them
- DEC-S045 — Capture is a hook, distillation stays a ritual — the loop's front end stops depending on memory

### Model selection
- DEC-S027 — Opus is the default model; Fable is on-demand via a bundling trigger (supersedes the PR #107 tiering)
- DEC-S029 — Fable disabled in active guidance — taken, then withdrawn when Fable came back
- DEC-S034 — Opus 5 becomes the standing model; effort sweeps down; the Fable trigger is retired as routine

### Docs, decisions & context discipline
- DEC-S025 — Seeds-workflow DECs carry the `DEC-S` prefix; project DECs stay plain
- DEC-S030 — Memory doctrine removed — CLAUDE-context.md is the memory system
- DEC-S031 — CLAUDE.md shell audit — cut bloat, merge duplicates, add the memory keepers
- DEC-S036 — One decision, one file, behind a generated index — with amendments declared once and generated both ways
- DEC-S037 — Doc consistency is a ratchet in the verify chain, not an audit
- DEC-S042 — The shell states invariants and the context file fills named slots — overrides are a patch where the structure was wrong

### Tooling & safety
- DEC-S009 — Supabase prod-write guard — discipline + wrapper script
- DEC-S020 — settings.json merge strategy — deferred at DEC-S018, resolved by DEC-S023 _(resolved by DEC-S023 — settings.json ships as a manual-merge template, not an auto-synced JSON merge)_
- DEC-S023 — Permission policy — default-allow with a deny guardrail; master in seeds, distributed by hand (resolves DEC-S020) _(revised by DEC-S043 — the enumerated `.env` Read denies become one blanket per tool; the default-allow posture and the distribution model are unchanged; extended by DEC-S045 — adds a user-global-only hooks stanza to the hand-distribution list; the permission policy itself is untouched)_
- DEC-S043 — `.env.example` loses its leading dot, so the secret deny can be a blanket

### Open questions
- DEC-S021 — Retro prefer-apply heuristic for structural Both-modified diffs — deferred, still open
- DEC-TBD — Fate of `scripts/nightly-sync.sh` — RESOLVED 2026-05-14

_**This file is GENERATED** by `npm run gen:decisions` —
edit `docs/decisions/DEC-*.md`, not this file. `npm run check:decisions` fails on a stale index, a
duplicate id, an unknown topic, an unknown relation, a forward-pointing amendment, or a
reference to a decision that does not exist._
