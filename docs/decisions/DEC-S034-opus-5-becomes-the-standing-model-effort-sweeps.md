---
id: DEC-S034
title: "Opus 5 becomes the standing model; effort sweeps down; the Fable trigger is retired as routine"
topic: "Model selection"
---

## DEC-S034: Opus 5 becomes the standing model; effort sweeps down; the Fable trigger is retired as routine

**Decision:** Four changes to the shell's `## Model Selection`, plus one to Micro Workflow step 1 and one to Scope Discipline.
- **Default tier → `claude-opus-5`** ($5 / $25 per MTok — the same price as Opus 4.8, which it replaces). The tier table now carries per-MTok prices so the cost of a tier jump is visible at the point of decision: Sonnet 5 $3/$15, Opus 5 $5/$25, Fable 5 $10/$50.
- **The Fable bundle trigger is retired as a routine escalation.** It becomes "reach for it only after Opus 5 at `max` has actually failed the task." Fable is still 2× Opus (verified: $10/$50 vs $5/$25), but the gap it was buying has closed — Opus 5 at `max` effort lands within 0.5% of Fable's peak on agentic coding at half the cost per task.
- **`effort` guidance inverts.** The old text called `xhigh` "the floor for coding/agentic work." It is now the *starting point*: begin at `xhigh` for coding/agentic and `high` elsewhere, then try lower, because `low`/`medium` are unusually strong on Opus 5. On a Pro plan effort spends the usage allowance, so a floor that never sweeps down is a standing cost with no stated benefit.
- **Fast mode documented** — ~2.5× speed at 2× price ($10/$50), a deliberate choice rather than a default.
- **Micro Workflow step 1 gains "get the whole spec down before step 4."** Opus 5's edge is largest on long, coherent, multi-file work handed a complete brief in one turn; assembling the spec across many exchanges costs both quality and tokens. This makes step 1 load-bearing instead of ceremonial.
- **Scope Discipline: the points scale does not grow.** The "still break genuine 13s" rule keeps both reasons but names them as human-side (reviewability, and my own understanding) rather than model-capacity. Explicitly: a bigger unit of work is a bigger *run*, not a bigger number. Adding a 20/21 bucket was considered and rejected — it would break velocity comparability with every prior phase for a label, and the shell already says points don't cap what ships in one run.

**Why now:** Opus 5 shipped 2026-07-24 at Opus 4.8's price, so every shell named a superseded default. The substantive changes aren't the model string — they're the effort inversion (a live usage cost) and the Fable retirement (an escalation path that no longer buys what it cost).

**Not changed, deliberately:** `§ Communication` already fights Opus 5's longer-default-output tendency, and effort does not reliably shorten *visible* output — only prompting does, which is what that section already is. No self-verification scaffolding existed to delete (the only "verify" language in the shell, `§ Approval Before Action`, tells Claude to *stop* re-verifying settled statements — the opposite of the pattern that needs removing on this model). Agent frontmatter is untouched: `model: opus` is an alias that resolves forward on its own.

**Scope / rollout:** seeds canonical (`dev/claude/CLAUDE.md`, `dev/claude/docs/AGENTS.md`) plus seeds' own `CLAUDE.md` + `docs/AGENTS.md` agent tables, then hand-rolled to all 8 shell repos. Hand-rolled rather than left to the nightly sync because the sync is currently disabled, and this session already produced one silent miss (tinkle's rollout PR #164 closed unmerged, leaving `main` behind until #165 caught it up).

**Schema:** template/labeling only — no skill contract or frontmatter-field change. No version bump (consistent with DEC-S023–S033).
