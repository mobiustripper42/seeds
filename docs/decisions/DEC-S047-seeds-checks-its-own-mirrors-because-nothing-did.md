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
