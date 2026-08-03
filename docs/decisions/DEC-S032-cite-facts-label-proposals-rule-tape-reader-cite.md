---
id: DEC-S032
title: "Cite-facts-label-proposals rule + tape-reader cite-guard; the muster hook trial ends with hooks dropped"
topic: "Agents & review"
---

## DEC-S032: Cite-facts-label-proposals rule + tape-reader cite-guard; the muster hook trial ends with hooks dropped

**Decision:** Two anti-fabrication changes, plus the conclusion of the muster hook trial.
- **Shell § Communication gains "Cite facts; label proposals":** any statement about code/config/project rules must cite where it was verified (file:line or tool result), or be phrased as a question — but this targets *factual claims only*. Novel proposals are encouraged, labeled "proposed / not in the codebase." Inventing a fact is fabrication; a labeled proposal is not.
- **`@tape-reader` gains "Ground every finding — never invent a rule":** before flagging a rule violation it must grep the repo and cite the rule's source line; no citation → no finding, and no hedged "flagging only because I saw it." Fixes the observed failure below.
- **Hooks dropped.** The muster trial's `/read-the-tape` (session 60) measured both hooks and found neither load-bearing: the verbosity Stop-hook fired 1/56 and that fire was a false positive on a dense enumerated build spec (verbosity was otherwise clean), and the spec-gate's confirm-before-coding held on all 4 branch cuts by *model discipline* — the hook itself fired on every Bash (a broken `if` filter) and was crying wolf. Both are removed from muster (`.claude/settings.json`, `.claude/hooks/`).

**Why:** the trial's own data killed the hooks. "Tripwire beats prose" holds only where there's a real trigger AND a real problem; verbosity had no live problem (the shell audit + thinking-on carried it), and fabrication — the failure the operator most wants gone — has *no mechanical trigger*, so no settings hook can catch it. The lever that bites on fabrication is a structural evidence requirement (cite-or-ask in the shell; cite-the-source in the reviewer), not a hook.

**Observed failure that motivated the cite-guard:** in the muster trial, `@tape-reader` flagged the session for violating a "no emoji rule" that does not exist anywhere in the repo — a fabricated convention presented as an observation. The operator caught it. The cite-guard makes that class of finding impossible: no source line, no finding.

**Honest limit (recorded, not hidden):** the shell rule is prose and will decay over a session like the false-premise rule before it. The durable bite is the per-surface guard (the reviewer citation requirement), not the shell prose. Universal fabrication has no clean switch; the shell rule is the best available universal lever, the per-surface guards are what actually hold.

**Scope:** canonical `dev/claude/CLAUDE.md` + `dev/claude/agents/tape-reader.md`; hand-applied to muster (trial repo) so its next session carries them. Other repos pick both up at the post-trial rollout.

**Schema:** template/labeling only — no skill contract or frontmatter-field change. No version bump (consistent with DEC-S023–S031).
