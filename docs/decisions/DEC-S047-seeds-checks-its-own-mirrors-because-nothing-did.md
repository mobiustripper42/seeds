---
id: DEC-S047
title: "Seeds checks its own mirrors — a promotion that never reached `.claude/` is silent by construction"
topic: "Sync — directions, classification & file classes"
---

## DEC-S047: Seeds checks its own mirrors — a promotion that never reached `.claude/` is silent by construction

**See also:** DEC-S040 (no sync in either direction; a differ enumerates and never picks a side),
DEC-S044 and DEC-S046 (`drift.mjs`, the seeds↔project differ this one deliberately does not touch),
DEC-S039 (the learning loop whose output this failure swallowed).

**Decision:** `dev/claude/scripts/check-mirrors.mjs` compares every file under `dev/claude/` that has
a same-named counterpart under seeds' own `.claude/`, and exits non-zero when one differs. It is
seeds-only, read-only, and joins the doc gates in `CLAUDE.md` § How Work Happens Here step 6.

**The failure it exists for, in full, because it is the whole argument.** On 2026-08-06 a `@workout`
promotion (PR #158) added `## Step 4.5 — PRs opened outside /kill-this` to
`dev/claude/skills/its-dead/SKILL.md`. Step 4.5 lists a session's PRs, compares them against
`pr_numbers:`, and warns for each one that never passed `@code-review`. The PR's distribution list —
required by DEC-S040 — named the external projects to copy it to, and did not name seeds' own
`.claude/skills/its-dead/SKILL.md`, because an internal `cp` is not "distribution" in DEC-S040's
sense. The mirror was never updated.

Eleven days later, seeds ran a session that shipped six PRs, exactly one of which went through
`/kill-this`. That is precisely the condition Step 4.5 detects. `/its-dead` ran seeds' live copy,
which has no Step 4.5, and closed with `All six PRs merged. Closing.` — no warning, because the check
was not there. Nothing in the session referenced the gap, and the operator did not raise it in eleven
days.

Evidence: `.observations-worktree/observations/archive/2026-08/2026-08-14-seeds-main-3d4ad232.md`,
which pins each step of this against transcript line numbers and `git log` on both copies.

**Why this is not a special case of DEC-S046's problem.** `drift.mjs` covers seeds↔project and
**refuses to run against seeds itself**, on purpose: seeds' root `CLAUDE.md` and
`dev/claude/CLAUDE.md` are different documents that share a filename, and comparing them would report
the whole shell as drift. That refusal is right and stays. It also leaves seeds↔seeds with no
comparer at all, which is how a five-file backlog accumulated unseen. `check-mirrors.mjs` compares
only paths that exist on both sides, so the `CLAUDE.md` pair never arises and the refusal never has to
be relaxed.

**Why prose was not enough, given that the prose already existed.** `CLAUDE.md` § How Work Happens
Here step 5 has said *"template under `dev/claude/`, then mirror to `.claude/` if the file is one
seeds dogfoods"* the whole time, and § Mirrors said to `diff` them before committing. Both were
skipped, by an agent whose own PR was about making a skipped step visible. This is the standing
detectability argument: a mirror that was never copied produces no error, no diff in the PR, and no
symptom until the exact condition the missing rule covers occurs — at which point the absence is
still silent, because a check that is not installed cannot report that it is not installed. Prose
cannot fix a class of failure whose signature is *nothing happening*.

**What the first run found, which is the load-bearing number.** Seven files differed. Two were
legitimate (`doc-check.json` and `settings.json` are project-owned by DEC-S037 and DEC-S023). Five
were straight staleness: `skills/its-dead` (missing Step 4.5 plus two older fixes), `skills/retro`
(missing the whole DEC-S022 production-branch conditional), `agents/architect` (missing the mandatory
DEC-S036 "Read the Record" step), `agents/code-review` (missing the stack-neutral rewrite — seeds' copy
still reviewed for RLS policies and shadcn components), and `agents/ui-reviewer`. Seeds has been
running different rules than it ships, in five files, for an unknown span. **One observation started
this; the check found four more nobody had reported.**

**Two carve-outs, both narrow, both because the alternative is furniture.**

An agent's `description:` frontmatter line is project-owned by design — the install procedure says to
put the project's name in it — so comparing it would leave every agent permanently red. That one line
is normalized before the compare; everything else in the file is byte-exact.

`agents/ui-reviewer.md` is exempt. Seeds is not a webapp, `type-manifest.yaml` marks the file
webapp-only, and mirroring the current template would install an agent that immediately refuses to
run for want of a `ui-context.md` that seeds has no reason to write. The correct fix is deleting
seeds' copy; that is a decision, not a mirror, and it is not this one.

Each exemption carries its reason in the source, and the script reports an exemption that is no longer
needed — the failure mode of an exemption list is that it silently becomes the answer to everything.

**What it must never become.** It enumerates and stops there. It does not copy, does not resolve, and
has no opinion about which side is right — the same constraint `drift.mjs` operates under and for the
same reason (DEC-S040). The template is usually right and sometimes is not: `ui-reviewer.md` is a live
case where the template is correct and copying it would still be wrong. The moment this script picks a
side it has re-acquired the judgment DEC-S040 removed.

**Cost.** One more command in a gate list that is already three commands long, and it fails in
milliseconds. The real cost was paid up front: five stale files that now have to be reconciled
deliberately, which is work that was always owed and had simply never been visible.

## Amendment, 2026-08-17 (eric) — a missing mirror is a failure too, for a defined set

**What this changes, and what still stands.** The comparison rule, the two carve-outs, the
read-only constraint and the whole failure argument above are unchanged. What changes is the
sentence *"compares every file under `dev/claude/` that has a same-named counterpart"*: the
qualifier was doing more work than intended. A file with **no** counterpart was skipped in
silence, so the script could not report the one thing it was built to make visible — a template
seeds ships and does not run.

**The failure, and it was live the day the script shipped.** `dev/claude/agents/ideas.md` had no
copy under `.claude/`, so `@ideas` did not resolve in a seeds session and ideas raised while
working on the workflow system itself had nowhere to go (issue #149). It had been missing since
the agent was written. The first run of `check-mirrors.mjs` — the run reported in the section
above as finding five stale files — printed `all mirrored files match` with `ideas.md` absent.
Both statements were true at once: **a file that is absent cannot differ from anything.**

That is the third instance of one mechanism, after DEC-S044 (`settings.json` invisible because
unclassified) and DEC-S046 (nine more). A checker's skip path is where the defects live, and this
time the checker was the one written to catch invisible drift.

**Why not simply require a mirror for everything.** Because it is wrong 31 times out of 32. Seeds
runs its scripts straight out of `dev/claude/scripts/`, the `docs/` templates belong in a project's
`docs/` rather than in `.claude/`, and `dev/claude/CLAUDE.md` is a different document from the root
`CLAUDE.md` — the same fact the § "not a special case of DEC-S046" argument rests on. An exemption
list of 31 entries is furniture on the day it is written.

**So presence is decided by three states, not by an exemption flag.** The vocabulary is DEC-S044's,
reused deliberately rather than reinvented:

| state | must exist? | compared? | membership |
|---|---|---|---|
| dogfooded | yes | yes | `agents/**` and `skills/**` |
| `presence` | yes | no | `doc-check.json`, `settings.json` |
| optional | no | no | `agents/ui-reviewer.md` |

The dogfooded set is **two prefixes rather than a roster**, and that is the point: a new agent or
skill is covered the day it is written, which is exactly the day a hand-maintained list would still
say nothing. It is the same mapping `drift.mjs`'s `toProject()` already encodes. Against the tree at
the time of writing: 18 templates under those prefixes, 17 mirrored, 1 reported, 0 false positives.

**The `presence` row exists because the first version of this amendment got it wrong.** That draft
had a single exemption list that suppressed absence as well as difference, which reopened the
identical blind spot for the two files the list already named — including `settings.json`, whose
deny rules protect themselves under DEC-S023. Deleting seeds' copy produced a clean run. Caught in
review, before merge. Only `agents/ui-reviewer.md` genuinely belongs in the optional row, because
its own exemption reason argues that deleting seeds' copy is the correct end state, and a check that
flagged that deletion would be punishing the fix.

**Consequently the clean-run message says "present or exempt", not "all mirrored".** The day
someone acts on `ui-reviewer`'s stated end state, "every template is mirrored" would be a false
sentence printed by a green run — which is the failure mode this whole decision is about, in
miniature.
