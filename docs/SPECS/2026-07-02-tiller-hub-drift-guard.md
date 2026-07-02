# Tiller: Point the sync engine at its own author — a logic-class drift guard for the hub

**Tiller overnight run — 2026-07-02. Draft proposal, not for merge. Eric is the gate.**

---

## The idea

Seeds keeps **two copies of every logic file**: the `dev/claude/**` template (what ships to the fleet) and the `.claude/**` dogfood (what seeds actually runs on itself). For `logic`-class files (DEC-S018) these are supposed to be byte-identical. The nightly sync Routine already enforces exactly that byte-identity for **every other repo** — hash-compare the seeds template against the project's live copy, open a PR on drift.

Seeds is the one repo it can't do that for. Seeds is in the Routine's `exclude:` list *by construction* — it can't sync into itself, and it has to grant itself access just to read `routine-config.yaml`. So the hub — the source of truth for the whole fleet — is the only repo whose two copies drift with **nothing watching**.

Add the missing guard: a small, dependency-free check that hash-compares each `logic`-class file's `dev/claude/**` template against its `.claude/**` dogfood copy, driven by the **same DEC-S018 file-class registry** the Routine already reads, and fails loud at session start via a `SessionStart` hook. It's the identical hash-compare `@sync-config` already does for the fleet — pointed inward at the one repo the sync architecture is blind to.

## Why it's worth it — and why *now*

**This is not hypothetical hardening. The hub is out of sync with its own templates today.** Measured tonight, after applying `@sync-config` Step 2 normalization (strip trailing whitespace, LF), these `logic`-class pairs diverge:

| logic file | divergent lines (normalized) |
|---|---|
| `agents/sync-config.md` | **132** |
| `skills/its-alive/SKILL.md` | 56 |
| `agents/tape-reader.md` | 20 |
| `skills/its-dead/SKILL.md` | 16 |
| `skills/kill-this/SKILL.md` | 17 |

The 132-line one is the alarming one. The live dogfood `.claude/agents/sync-config.md` contains the string `Step 1.4` **zero** times; the template contains it **seven** times. Step 1.4 *is* the DEC-S018 file-class lookup. **Seeds authored DEC-S018 and is the one repo not running it** — the fleet got file-class-aware sync months ago; the hub's own dogfooded classifier is stuck pre-DEC-S018. Every time you edit a skill in `.claude/`, watch it work, and assume `dev/claude/` ships that behavior, the dogfood is validating something you don't ship.

The leverage is that **you don't build a drift engine** — the engine (file-class hash-compare against the registry) already exists and is trusted fleet-wide. You point it at the hub. Small surface, and it closes the last structural blind spot in the sync design.

Why now: the sync write-path has converged (DEC-S028's zero-PR nights). The fleet is byte-identical across projects — which is exactly the moment the *un*-measured internal divergence of the hub stands out. DEC-S028's digest brags "17 logic-class files byte-identical across all 7 sources" while seeds' own two copies of `sync-config.md` sit 132 lines apart. The measurement points outward and misses the hub it runs from.

## Why he hasn't already

The whole sync architecture is built around seeds as the **source**, flowing outward. Seeds excludes itself from the Routine out of necessity, so the mental model is *"seeds is the truth; drift is a downstream property."* The idea that seeds' own two copies could drift **from each other** doesn't fit that frame — until you notice seeds is also a dogfooding *consumer* of its own templates, and consumers are exactly what the guard protects.

There was a near-miss that got read as a one-off: DEC-S026 records that seeds' live `retro/SKILL.md` "had drifted onto the older DEC-S015 model and is now reconverged byte-identical" — caught by accident during unrelated work and hand-fixed, never generalized into "the hub has no drift guard." And there's no CI here (no `.github/workflows`) to hang a check on, so the natural home for one wasn't obvious. The `SessionStart` hook is that home: it's the native trigger for a repo with no CI, and it surfaces the drift in the briefing in front of the exact person about to touch these files.

---

## Build handoff

**Scope decision (from the panel): V1 is logic-class only, detect-only.** The `logic` class is the one with a hard byte-identical contract and unambiguous drift. `hybrid`/`context`/`type-gated` are deliberately out of V1 (see Gotchas — comparing them false-positives). Auto-remediation (a `/reconcile-self` skill) is explicitly **deferred**: within seeds there's no principled canonical side for a given logic file — the 132-line `sync-config.md` gap is precisely the case a fixed policy can't adjudicate ("template ahead" vs "dogfood edited with intent"), and a policy fixer would confidently clobber the good copy. Detect first; reconcile the current drift by hand.

### Approach

- **Engine = one script.** `dev/claude/scripts/drift_guard.py`, template-only, no-deps — same placement and shape as `dec_s_sweep.py` / `throughput.py` (seeds runs those in place from `dev/claude/scripts/`). Do **not** make a `.claude/scripts/` dogfood copy: that recreates the very problem ("the drift guard's own copies can drift").
- **Trigger = a `SessionStart` hook** in seeds' `.claude/settings.json` calling `python3 dev/claude/scripts/drift_guard.py`. Same script is the manual/standalone entry.
- The script reads `.claude/routine-config.yaml`, selects the **logic-class globs only**, enumerates matching seeds-side files, maps each template path → dogfood path, normalized-compares, prints the drift list, and exits non-zero if any drift (loud, not fatal — see Gotchas).

### File-by-file

1. **`dev/claude/scripts/drift_guard.py`** (new, ~60 lines):
   - Anchor to the **main checkout**: `root = git rev-parse --show-toplevel`. If `dev/claude/` is absent (you're inside `.sessions-worktree/`, which only has `sessions/`), print a one-line note and exit 0 — do not report "everything missing."
   - Parse `file-classes:` from `.claude/routine-config.yaml` as an **ordered list of single-key maps, first-match-wins** (DEC-S018). No YAML lib needed (PyYAML availability unproven; seeds is no-deps) — read the lines under `file-classes:` and match `- "<glob>": <class>`. Only three logic globs exist today; keep it dumb.
   - Select entries whose class is `logic`. For each glob:
     - `dev/claude/skills/**` → walk that dir for `*/SKILL.md`.
     - exact paths (`dev/claude/agents/sync-config.md`, `dev/claude/agents/tape-reader.md`) → use directly.
     - Implement `/**` by hand (`os.walk` the prefix). **Do not** rely on `fnmatch` / pre-3.13 `PurePath.match` — they don't do recursive `**`.
   - Map template → dogfood: `dev/claude/skills/<n>/SKILL.md` ↔ `.claude/skills/<n>/SKILL.md`; `dev/claude/agents/<n>.md` ↔ `.claude/agents/<n>.md`.
   - **Normalization must be byte-for-byte what `@sync-config` Step 2 specifies** — strip trailing whitespace per line, normalize line endings to LF — then compare. Cite Step 2 in a comment. If the guard normalizes even slightly differently, it and the Routine disagree about what "in sync" means.
   - Output: per drifted file, one line `DRIFT logic <path> (<n> lines)`; a clean run prints `hub in sync (N logic files checked)`. Exit non-zero iff any drift. Support `--count` (print an integer only) so B can consume it.
   - Missing registry / missing dogfood file → printed note + fall through (never fail-closed — matches Step 1.4 discipline).

2. **`.claude/settings.json`** (edit): add a `SessionStart` hook running `python3 dev/claude/scripts/drift_guard.py`. Ensure a non-zero exit surfaces the output as context but does **not** abort the session (advisory, not blocking — someone firefighting a fleet bug shouldn't be gated behind cosmetic drift). Use the `session-start-hook` skill to wire it correctly.

3. **`docs/DECISIONS.md`** (new **DEC-S030**): "The sync contract covers the hub — an intra-repo drift guard." Record: logic-only V1; detect-only (reconcile deferred, and why a policy fixer is unsafe here); the SessionStart trigger choice over CI; reuse of the DEC-S018 registry + Step 2 normalization; hybrid/context explicitly out of scope. Schema: additive, no `seeds-version` bump (consistent with DEC-S023–S029 — no cross-file contract `/pull-seeds` enforces changes). Eric's call, recorded as no-bump.

4. **(Fast-follow, not V1) `dev/claude/routines/nightly-sync.md`** Step 4.5 digest: add a "hub self-consistency: N logic files drifted" line to the DEC-S028 `status_issue` digest that **calls `drift_guard.py --count`** (or parses its output) — never a second hand-rolled compare in the Routine prompt (that's the drift-of-the-drift-checker trap). A only fires at session start; B covers the "nobody opened a seeds session for days" gap. Sequence A first, B after.

### Gotchas / risks

- **The `sessions` worktree.** `SessionStart` fires around session open; `/its-alive` Step 0.6 manages `.sessions-worktree/`. Anchor to the main toplevel and no-op cleanly when `dev/claude/` is absent.
- **Registry order + `**`.** First-match-wins is load-bearing; recursive `**` is not supported by the stdlib matchers. Both are hand-rolled and trivial for three globs — but they're the two places a naive implementation silently under-checks.
- **Don't fake a "hybrid shell-portion" diff.** There's no machine-detectable shell/context boundary *inside* skill files, and the hybrid pattern isn't even materialized in the hub (seeds has **zero** `.claude/<name>-context.md` files, and `code-review.md` dogfood already differs from its shell by 4 lines). A glob over hybrids would flag seeds' own incomplete dogfooding as drift. Keep hybrids out of V1; if added later, use an explicit agent-shell allowlist (architect, code-review, ui-reviewer), **never** the glob, and **never** map `dev/claude/CLAUDE.md` → seeds root `CLAUDE.md` (seeds' root CLAUDE.md is the repo's own guide, not the shell — a guaranteed permanent false positive).
- **Advisory, not blocking.** Fail loud (non-zero exit → visible in briefing), never fatal.
- **Second engine risk.** Reuse the registry + Step 2 normalization verbatim. A bespoke compare that diverges from the Routine's is the exact bug one level up.

### Done when

- `python3 dev/claude/scripts/drift_guard.py` on the current tree reports the 5 drifted logic files above (sync-config, its-alive, tape-reader, its-dead, kill-this) and exits non-zero.
- After the hub is hand-reconciled, the same command prints `hub in sync` and exits 0.
- Opening a seeds session surfaces the guard's output in the briefing.
- The guard reads the file-class registry (adding a new logic glob is picked up with no code change); it no-ops cleanly from inside `.sessions-worktree/`; `--count` returns an integer.
- DEC-S030 written.

### Separate, do-regardless

**The drift is live today; the guard only reports it.** Independently of shipping this, the hub needs a manual reconcile pass — start with the 132-line `sync-config.md` split (the dogfood is missing DEC-S018 Step 1.4 entirely). Decide per file which side is canonical; this is a deliberate by-hand reconcile, not something to automate before you've seen *why* each file drifted.

### Kickoff

> Read `docs/SPECS/2026-07-02-tiller-hub-drift-guard.md`. Build V1 only: `dev/claude/scripts/drift_guard.py` (logic-class only, detect-only, reads the DEC-S018 `file-classes` registry from `.claude/routine-config.yaml`, reuses @sync-config Step 2 normalization, hand-rolled first-match-wins + recursive `**`, anchored to the git toplevel and worktree-safe, `--count` flag, loud-not-fatal) plus a `SessionStart` hook in `.claude/settings.json`. Then run it, show me the drift, and we'll hand-reconcile the hub — starting with `sync-config.md` — separately. Write DEC-S030. Defer the digest line (B) and any reconcile skill (C).

---

*Innovator note: the outside-tech cross is the Claude Code `SessionStart` hook — load-bearing, not decoration. The compare logic is seeds' own; the hook is what makes a CI-less repo actually run the guard, at the moment it matters (session open, in the briefing). Nothing else on the radar crossed tonight.*
