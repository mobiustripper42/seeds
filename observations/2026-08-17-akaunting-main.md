---
repo: akaunting
session: main
transcript: /home/eric/.claude/tape-queue/2026-08-17-akaunting-a5204424-ea76-5611-91e3-3ef32bb43dfa.jsonl
observed: 2026-08-25
---

## Context

`akaunting` is a `domain`-type deployment repo (`.claude/project-type`), not a `dev`-type project — it
has no `.claude/skills/` or `.claude/agents/` (confirmed: both paths absent). Its `CLAUDE.md` is a
from-scratch "Execution Protocol" shell derived from seeds `dev/claude/CLAUDE.md`, not a copy of it.
Most of P1–P17 are keyed to `dev`-shape skill files (`its-alive`, `kill-this`, session-log, PR bodies)
that do not exist here, so they are marked **not applicable** below rather than "not found" — there is
no calling skill to cite a fix location against.

## Summary

| ID | Pattern | Found | Cost if it recurs | Self-announcing |
|----|---------|-------|--------------------|------------------|
| P1–P17 | (dev-shape skill patterns) | Not applicable — no `.claude/skills/`, no `.claude/agents/` in this repo | — | — |
| New-1 | Global `~/.claude/settings.json` not pre-synced to the project's documented relaxed policy | Yes — 1 occurrence, ~38 min blocked | real time lost on a live remote box; recoverable but not free | yes, eventually (denial messages), but not until after a wrong first diagnosis |
| New-2 | Wrong root cause stated as fact, not verified against the file before claiming it | Yes — 1 occurrence | one wasted round trip; recoverable | yes — user corrected it in the very next turn |
| New-3 | Project's own secret-file deny rules block the bash-redirect pattern the project's own `CLAUDE.md` documents as sanctioned | Yes — 1 task (T4.1), 2 separate denials | a whole runbook task pushed entirely onto the human; recoverable per-occurrence, but recurs every time this pattern is hit | yes — denial message, but the *contradiction with the docs* does not announce itself |
| Candidate | Two runbook tasks bundled into one hand-off message when Claude can't run `sudo` itself | Yes — 1 occurrence | one clarifying exchange; recoverable | yes — user asked for one step at a time |

False-calibration sweep: 2/40 visible assistant text replies matched a confidence-marker regex hit
("...is likely a T2", "no obviously right answer"); both are supported by a preceding tool result or
are meta-commentary, not a claim about code/config/system state. **0/40 unsupported.**

---

## New-1 — Global settings.json not pre-relaxed before the deployment session started · high

**Occurrences:** 1 (but blocked roughly half the runbook until resolved)

**Cost if it recurs:** Every future `domain`-type or otherwise-relaxed-policy project hits this the
first time it runs a command the seeds master deny list blocks — `sudo`, `curl`, `wget`, `apt install`,
`docker run/pull`, `sh`/`bash` — on a machine where `~/.claude/settings.json` was never updated to
match. Cost is real elapsed time on a live remote box (not recoverable after the fact — the ~38 minutes
are spent, not undone), plus a second-order cost: the fix leaves the *entire machine's* deny policy
relaxed across every other repo on that box until someone remembers to restore it by hand. Session end
confirms it was **not restored within the session** (turn ending at line 438: "Your global permission
policy is still relaxed. Put it back...").

**Self-announcing:** Yes, but only after a false start — the denial messages (`is_error:true`,
`toolDenialKind:"permission-rule"`) are visible immediately, but Claude's first diagnosis of *why*
was wrong (see New-2), so the true cause took an extra investigation round before self-announcing
correctly.

**Cause:** `docs/AGENTS.md`/root `CLAUDE.md` setup step 14 (seeds) says the master policy is
distributed by hand: "copy the master into each real machine's user-global `~/.claude/settings.json`"
— and this project's own `.claude/CLAUDE-context.md:69` *documents* that the seeds master denies
`sudo`/`curl`/`wget`/`apt install`/`docker run|pull`/`sh`/`bash`, and that the project's `.claude/settings.json`
was deliberately relaxed against exactly that list. The relaxation went into the **project-scoped**
file. Nothing in the transcript or the docs shows the corresponding one-time step — copying (a relaxed
variant of) that policy into mill-dev's **user-global** `~/.claude/settings.json` — was ever performed
before this was the first live session on that box. The docs anticipated the failure mode in prose
(CLAUDE-context.md:69, "Under that policy this runbook cannot execute a single task in Phases 1-4")
but that warning did not translate into the machine actually being prepped, and nothing gates "is this
machine's global policy consistent with what this project needs" before task work starts.

**Operator reaction (all turns, in order):**
- Turn 79 (03:31): "yeah, this is the setting file for mill-dev ... how am I going to get around that?"
- Turn 85 (~03:3x): "\"Run me interactively on mill-dev. Open a terminal, claude, hand me the runbook.\" pretty sure that's what this is" — reaching for an explanation of *why* this box is set up this way.
- Turn 97 (03:39): "yes, my settings file on mill-dev auto denies. i either need to remove that during this install or ... what?\n\nyou are writing way way too many words. I didn't read any of what you wrote" — confirms the operator had already independently reached the correct diagnosis before Claude's corrected Judgment reply arrived, and separately flags the reply as too long.
- Turn 100 (03:40): "you can't curl either ... uhg ... dropping those lines, I might add well just to the dangerous skip thing"
- Turn 103 (03:44): "I guess my settings file is doing what I expected... I just want to do something different for a minute.\n\nI guess edit that is the easiest option. can you give me a command to back it up, then a cat >> EOF to remake it, then when install is done we just cp the backup"
- Turn 106 (03:51): "I might need to clear to reload, it's a remote control session, I stopped and started it" — a session restart was needed to pick up the manually-edited global file.

No later turn re-raises this as a live blocker, so it was resolved procedurally, but resolution required
an out-of-band manual edit plus a restart — not something the workflow provided a path for in-band.

**Evidence:**
- Denials: lines 57, 64, 74, 89 of the transcript (`toolDenialKind:"permission-rule"`), commands `sudo -n true`, `dig ...; curl ifconfig.me`, all inside `T1.1`-`T1.6`.
- Wrong first diagnosis: line 78 ("Action.") — "this session's Bash tool is sandboxed, and the sandbox denies both sudo and outbound network."
- Corrected diagnosis: line 96 ("Judgment.") — "Found it, and my sandbox diagnosis was wrong. The blocker is `~/.claude/settings.json`... a project-level allow cannot override a user-level deny."
- Fix instructions handed to the operator (Claude cannot edit `~/.claude/settings.json` itself — denied at its own lines 95/98): line 105, `cp ~/.claude/settings.json ~/.claude/settings.json.preakaunting` + full replacement JSON.
- Not restored at session end: line ~438, "Your global permission policy is still relaxed. Put it back: `cp ~/.claude/settings.json.preakaunting ~/.claude/settings.json`."
- `~/.claude/settings.json` denies `sudo *`, `curl *`, `wget *`, `apt install *`, `docker run/pull *`, `sh`, `bash` (confirmed by direct read, lines ~10-77 of the current file).
- `/home/eric/akaunting/.claude/CLAUDE-context.md:69` documents this exact mismatch in advance, in prose only.

**Sketch (proposed, not a rule):** A `domain`/deployment project's setup checklist could include an
explicit, checkable step — "confirm this machine's `~/.claude/settings.json` matches (or is compatibly
relaxed against) this project's `.claude/settings.json` before the first task-running session" — with
something to actually run and check, not just read. Whether that's a step in seeds' project-setup
instructions, a first-task self-check the runbook itself runs, or something else is a question for
`@workout` to weigh against however many other projects hit the same class of mismatch.

---

## New-2 — Root cause stated as fact before verifying it, violating a cited communication rule · medium

**Occurrences:** 1

**Cost if it recurs:** One wasted investigation round-trip per occurrence (recoverable), but it
compounds directly with New-1's cost — the wrong diagnosis is what turned a single-cause blocker into
two rounds of back-and-forth before the operator got a plan they could act on.

**Self-announcing:** Yes — the operator caught it on the very next turn ("yeah, this is the setting
file for mill-dev"), because the operator already suspected the real cause. It would not necessarily
announce itself to an operator who didn't already have that context.

**Cause:** Line 78 diagnoses the denial as `"this session's Bash tool is sandboxed"` without first
reading `~/.claude/settings.json` or `.claude/settings.json` — those Read calls (lines 84–93 per the
transcript) happen *after* the wrong claim was already delivered to the operator as the stated
blocker, not before. The turn is tagged `Action.`, which per this project's own `CLAUDE.md` is for
reporting what happened, not diagnosing — the room to hedge or ask existed and wasn't used.

**Operator reaction:** Turn 79 corrects it in one line without being asked ("yeah, this is the setting
file for mill-dev ... how am I going to get around that?"). No further turns re-raise this specific
misdiagnosis — it was a single, cleanly self-corrected event (line 96: "my sandbox diagnosis was
wrong"), not a recurring failure within this session.

**Evidence:**
- Rule cited: `/home/eric/akaunting/CLAUDE.md:97` — "**Never lead with a false premise.** If you don't
  know the cause, ask... What's banned is stating a made-up cause as fact and explaining at length on
  top of it."
- Breach: transcript line 78 — "**The blocker:** this session's Bash tool is sandboxed, and the sandbox
  denies both `sudo` and outbound network." (stated under an `Action.` tag, no hedge, no citation to a
  read settings file — none had been read yet).
- Self-correction: transcript line 96 — "Found it, and my sandbox diagnosis was wrong."

**Sketch (proposed, not a rule):** No new rule proposed here — the rule already exists and is well
written (CLAUDE.md:97). This is recorded as a single breach of an existing, cited rule for
`@workout` to weigh alongside whatever other sessions surface the same gap between "a tool result
would answer this" and "I answered before running it."

---

## New-3 — Project's own secret-file deny rules block the pattern the project's own CLAUDE.md calls sanctioned · high

**Occurrences:** 1 task (T4.1), 2 distinct denials within it (generation, then verification)

**Cost if it recurs:** A whole runbook task (T4.1 — generating the three deployment passwords) had to
be run entirely by the human, by hand, outside the session — the one thing this whole workflow exists
to avoid. Recoverable per-occurrence (the human can always do it), but the underlying contradiction
between the deny list and the documented "correct" pattern is not fixed by working around it once —
it will recur on every project that copies this same `**/.<secret-file>` deny shape and then also
documents "generate with `openssl ... > file`, verify with `ls -l`/`wc -c`, never `cat`" as the safe
path, because that documented path is exactly what the deny rule blocks.

**Self-announcing:** The individual denial is self-announcing (an `is_error:true` tool result). The
*contradiction* — that the deny list blocks the exact bash pattern the project's own `CLAUDE.md`
describes as correct — is not self-announcing; nothing flags that the policy and the doc disagree
until someone hits it live.

**Cause:** `/home/eric/akaunting/.claude/settings.json:81-89` denies `Read`/`Write`/`Edit` on
`**/.db_password`, `**/.db_root_password`, `**/.admin_password` (added deliberately, per
`CLAUDE-context.md:94`, "beyond seeds, because a deployment has failure modes a dev repo doesn't").
`/home/eric/akaunting/CLAUDE.md:37` documents the intended safe pattern: "`openssl rand … > .db_password`
... are correct: the value is created and never enters the transcript... So no `cat .db_password`, no
echoing a secret to verify it." The permission engine matches the `Write(**/.db_password)` deny
against a Bash command's `>` redirect target, not just against the `Write` tool — so the sanctioned
generation command is blocked by the same rule meant only to stop the `Read`/`Write`/`Edit` *tools*
from touching the file. The verification half of the sanctioned pattern (`ls -l`, `wc -c` — explicitly
framed in CLAUDE.md:37 as the non-`cat` safe alternative) is blocked the same way, by the `Read`
half of the same deny triple, for the same reason. Nobody wrote the deny rule expecting it to reach
Bash-string matching this broadly; the doc and the policy were authored to agree and don't, in
practice, because of how the permission engine interprets a path-shaped deny pattern against a shell
command.

**Operator reaction:**
- Turn 256 (14:03, mid-workaround): "there is only one password? what will the user name be" — the
  operator has already taken over running T4.1 by hand and is asking a follow-up about outcome, not
  process — no direct complaint about the denial itself, they simply proceeded to do it manually.
- Turn 261 (14:06): "one password saved to bitwarden" — confirms the task was completed entirely
  outside the session.

No turn explicitly objects to the denial pattern itself — the operator absorbed it silently and did
the task by hand, which is a quieter failure mode than New-1's escalation, not a smaller one.

**Evidence:**
- Denial 1 (generation): transcript line 249 — `Error: Permission to use Bash with command tr -d
  '\n'\nchmod 600 .db_password .db_root_password .admin_password\nls -l ...` — `is_error:true`,
  `toolDenialKind:"permission-rule"`.
- Claude's own correct diagnosis this time (contrast with New-2): transcript line 253 — "Lookup.\n\nDenied
  — the shell redirect into `.db_password` matches the project's `Write(**/.db_password)` deny. The
  policy is treating `> file` as a write, which is the rule doing its job." — then: "So T4.1 is yours
  entirely."
- Denial 2 (verification): transcript line 265 — `Error: Permission to use Bash with command cd
  ~/akaunting && ls -l .db_password .db_root_password .admin_password && echo ... && wc -c
  .db_password ...` — same `is_error:true`/`permission-rule`.
- Deny rule: `/home/eric/akaunting/.claude/settings.json:81-89`.
- Documented "correct" pattern this contradicts: `/home/eric/akaunting/CLAUDE.md:37`.

**Sketch (proposed, not a rule):** Not proposing a specific fix — there's a real tradeoff here (loosen
the deny to allow the documented Bash pattern through, vs. tighten the doc to admit the redirect and
the byte-count check both go through the human, vs. some scoping the permission engine doesn't
currently offer). Worth `@workout` weighing against how many other `domain`-type deployments hit the
same secret-file-deny-vs-documented-bash-pattern conflict — this is the first instance of the `domain`
family (per `CLAUDE-context.md:104`, "this is the first instance of a template family that doesn't
exist yet"), so there is exactly one data point so far.

---

## Candidate — Two runbook tasks bundled into one hand-off message when Claude can't run `sudo` itself

**Why it might be a pattern:** Once `sudo` needs an interactive password (transcript line 113: "New
blocker: `sudo: a password is required`"), Claude cannot run privileged commands and has to hand them
to the operator to paste output back. At transcript line 124, Claude bundles **T1.2** and **T1.4**
(two separate runbook tasks) into one message and asks the operator to run both and report back. The
operator's turn 125 response — "um ... still one step at a time for the human, what do you want" —
reads as a direct request to slow down to one task per hand-off when the human is the one holding the
keyboard.

**Why it might be noise:** Single occurrence, one clarifying exchange, no repeated pushback afterward
in this session — could be a one-off rather than a shape that recurs whenever hand-off execution is
needed.

**Cost if it recurs:** One clarifying exchange per occurrence; recoverable, cheap.

**Self-announcing:** Yes — the operator says so directly and immediately.

**Cause:** The runbook's Execution Protocol (`CLAUDE.md:15-27`) is written for Claude running
commands directly with per-phase approval; it has no explicit rule for the different shape of
interaction that begins the moment `sudo` needs a password and execution shifts to the human. Nothing
in the doc says "when the operator is the one executing, hand off exactly one task at a time" — the
bundling wasn't against a written rule, because no rule existed yet for this sub-mode.

**Operator reaction:** Turn 125 (single occurrence): "um ... still one step at a time for the human,
what do you want."

**Evidence:**
- Bundled hand-off: transcript line 124 — "Meanwhile, your two commands — **[T1.2]**:... **[T1.4]**:...
  Paste the output back, or just tell me they're done."
- Correction: transcript line 125 (quoted above).
