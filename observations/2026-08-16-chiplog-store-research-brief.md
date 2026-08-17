---
repo: chiplog
session: store-research-brief
transcript: /home/eric/.claude/tape-queue/2026-08-16-chiplog-7933e635-f51f-5c7b-a20f-4fd37e98faa9.jsonl
observed: 2026-08-16
---

## Session shape

One window, two tasks. Task 1 (`task/native-rewrite-direction`) wrote DEC-011 (chiplog's
PWA → native-app pivot), ran `@code-review`, addressed 7 findings, opened PR #6. Task 2
(`task/store-research-brief`) wrote a handoff research brief (`docs/STORE_RESEARCH_BRIEF.md`)
plus a pipeline skeleton (`docs/STORE_PIPELINE.md`) for a downstream session to run down App
Store / Google Play unknowns. Task 2 was pushed to `origin` but no PR was opened before the
captured transcript ends (not flagged as a defect — `/kill-this` simply hadn't run yet for
that task).

## False-calibration sweep

Swept all assistant `text` blocks for confidence markers (`almost certainly`, `certainly`,
`definitely`, `clearly`, `obviously`, `must have been`, `is likely`, `probably`, `no doubt`,
`undoubtedly`). 3 raw hits; 1 was the user's own message (excluded), 1 was non-factual
document-structure language ("items that are pure waiting **clearly** separated" — not a
claim about code/config/data/system state, excluded). The remaining hit is a `@code-review`
subagent finding (transcript line 134): "the DEC-006 scope … **probably** understates what
dies," immediately followed in the same sentence by "(proposed, not verified from this
checkout — no network)." Explicitly hedged, cause-cited, and labelled as unverified.

**false-calibration: 0/1 assertions unsupported.** The one hit found is a model of how to
hedge correctly, not a violation — included for completeness per the sweep's zero-reporting
rule.

## Finding 1 — Task branch cut from `main` instead of stacked, violating an explicit rule

**Occurrences:** 1
**Cost if it recurs:** recoverable, but not free. The gate caught it before any commit, so no
wrong content shipped — but recovery required a 7-line branch-surgery script (`cp` the file to
`/tmp`, `git checkout -- .`, delete and recreate the branch off the correct parent, restore the
file) rather than a one-line fix. On a repo without `check-docs.mjs`'s reference-resolution gate,
this would ship a PR whose base doesn't actually contain the decision it cites, and nothing
would say so until a human noticed the citation didn't resolve.
**Self-announcing:** yes — `npm run check:docs` failed immediately with 7 dangling-reference
errors (transcript line 219) the first time it ran against the new branch.
**Cause:** `/home/eric/chiplog/CLAUDE.md:146` states plainly: "**Stacking PRs is preferred**
when tasks depend on each other. Branch the next task off the previous task branch
(`git checkout -b task/X.Y-next task/X.Y-prev`), not off main." At transcript line 208, the
model ran `git checkout -q main && git checkout -q -b task/store-research-brief` — off `main`
— despite the brief it was about to write citing `docs/decisions/DEC-011-*.md`, a file that
existed only on `task/native-rewrite-direction` (PR #6, still open, unmerged). The dependency
was real and knowable at cut time (the model had just finished task 1 and immediately started
task 2 in the same turn sequence) but wasn't checked against CLAUDE.md:146 before the branch
command ran — the default "each task gets a branch" habit (CLAUDE.md:140) fired without the
stacking exception being consulted.
**Operator reaction:** none — never surfaced to the user. Caught and silently corrected by the
model itself in response to the `check-docs` gate output, before any push or PR.
**Evidence:**
- `CLAUDE.md:146` — the rule.
- transcript line 208 — `git checkout -q main && git checkout -q -b task/store-research-brief`.
- transcript line 219 — `check:docs` reports `docs/STORE_RESEARCH_BRIEF.md:24` and 4 other
  lines citing `DEC-011` and `docs/STORE_PIPELINE.md`, both absent on this branch.
- transcript line 222 — the recovery: `cp` to `/tmp`, `git checkout -- .`, `git checkout
  task/native-rewrite-direction`, `git branch -D task/store-research-brief`, `git checkout -b
  task/store-research-brief` (now correctly parented), restore the file from `/tmp`.

**Sketch (proposed, not a rule):** a `kill-this` (or a shared branch-cut helper) pre-check —
before `git checkout -b`, grep the about-to-be-written content's own `docs/decisions/DEC-`
citations against `git show main:docs/decisions/ 2>/dev/null` (or against the current branch
tree) and warn if a citation doesn't resolve on the intended parent. Cheaper than the doc gate
catching it after the file is already written.

## Finding 2 — Confident, unsourced claims about a sibling repo's domain and architecture, corrected twice in one session by the operator

**Occurrences:** 2, roughly 24 minutes apart, both about the `muster` sibling repo, both
caught only by the operator (who has direct knowledge of `muster`) rather than by any gate.

**Instance A (transcript line 114).** User asked (line 112): "for Google Play, how would I get
testers for muster? nothing is public." The model answered: "**For muster specifically, your
testers are the obvious people: the farm staff who are going to use it.**" No `muster` file had
been read at any point earlier in this session (first `Read`/`Bash` touching `/home/eric/muster`
is transcript line 179, after the correction below) — the claim was generated by analogy to
`bushel-mobile`, a real farm app discussed earlier in the same session (line 51: "a live farm's
order system," about `bushel-mobile`, correctly). `muster` is BrewBoat's crewing app, not
farm software. User correction, line 176: "you referenced muster getting farm users. bushel is
my farm app and we have exactly 2 Android users, muster is a crewing app for Brewboat. they are
both sibling repos so no guessing required."

**Instance B (transcript line 210, persisting through line 232).** After Instance A's
correction, the model *did* read `muster`'s actual decision file (`DEC-MSG-2`, transcript line
196-197) before writing the brief. Despite having the primary source in context, it summarized
it in the brief's ground-truth table as: "**The real target.** Planned form factor is a
**Capacitor wrap of the web app** — `DEC-MSG-2-*.md`, de-prioritized, still unbuilt" — framing
Capacitor as the settled direction. `DEC-MSG-2`'s own text (read at line 197) says the opposite
of "planned": Capacitor is named only as "the assumed APNs vehicle" inside a de-prioritized
*messaging* decision, and its claim to resolve the native-vs-PWA question is itself unverified
against `muster/docs/SPEC.md:77`, which parks that question as "decided at the infrastructure
stage" — a stage that never had the conversation. User correction, line 235: "um, the entire
point of building both chiplog and bushel is to get be able to build muster. I'm not sure why
muster thinks it has to be capacitor because we have done zero work to spec that." The model's
own line 240 response — "Checked the citation rather than just agreeing" — is a direct admission
that the first pass characterized a decision it had *read* without actually verifying what the
decision established versus assumed.

**Cost if it recurs:** the artifact carrying the fabrication was `docs/STORE_RESEARCH_BRIEF.md`
— explicitly written "for a fresh Claude Code session," i.e. designed to be read and acted on
*without* the correcting operator in the loop. Had either claim shipped uncorrected, a
downstream session would have inherited a wrong user-base assumption and a wrong architecture
assumption as ground truth, and the brief's own text (written by this same session, after
correction) states the stakes plainly: "a confident-sounding wrong answer will send real money
and real weeks in the wrong direction." Not silently catastrophic *here* only because the one
operator with cross-repo knowledge happened to read the output twice.
**Self-announcing:** no. Nothing in the toolchain — `check:docs`, `verify`, `@code-review` (run
only on task 1, not on the brief) — checks a claim's *truth* against a sibling repo; both
catches came exclusively from the operator's own knowledge.
**Cause:** Instance A is a clean case of the CLAUDE.md:59 failure named in this repo's own
decision-reading guidance — "a confident citation of a decision you didn't read is how a stale
answer gets laundered into a fact" — except here nothing was even cited; the "farm staff" framing
was assembled by analogy from an adjacent correct fact (`bushel-mobile` = farm) rather than any
grounding action in `muster` itself. Instance B is the harder case for a rule to catch: the
source *was* read (line 197), and the failure was in the characterization layer — treating
"named as the assumed mechanism inside a decision about something else" as equivalent to
"the planned/decided direction." `CLAUDE.md:240` ("Cite facts; label proposals … Inventing a
fact is fabrication; a labelled proposal is not") speaks to citation without reading; it does not
by itself prevent an accurate citation from being summarized past what it actually established.
**Operator reaction:** two separate corrections, each specific and each landing before the
brief was pushed anywhere: line 176 ("no guessing required" — pointed, not escalated) and line
235 ("I'm not sure why muster thinks it has to be capacitor because we have done zero work to
spec that" — a second, distinct fact-check on the same repo in the same task). No third
instance in this transcript, and the model's own after-the-fact framing at line 240
("Checked the citation rather than just agreeing") shows it registered the second correction as
a process failure, not just a content fix. Two corrections on two different claims about the
same sibling repo inside one ~25-minute stretch is the pattern worth carrying forward, even
though neither correction on its own escalated in tone.
**Evidence:**
- `CLAUDE.md:59` — "don't cite a decision you only saw in the index."
- `CLAUDE.md:240` — "Cite facts; label proposals … Inventing a fact is fabrication."
- transcript lines 112, 114 (claim A), 176 (correction A).
- transcript lines 196-197 (DEC-MSG-2 actually read), 210 (claim B written despite the read),
  235 (correction B), 240 (model's own admission).

**Sketch (proposed, not a rule):** for a document explicitly written to be consumed without
the author present — a handoff brief, a research doc, anything with "for a fresh session" in
its own header — the ground-truth section about *other* repos should carry a stated
verification step, e.g. "every claim about a sibling repo in this table was confirmed by
reading the cited file in this session," with a citation the operator can spot-check. Doesn't
prevent misreading a source; does make an unread or over-summarized claim visibly different
from one that was actually checked.
