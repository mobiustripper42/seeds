---
repo: akaunting
session: runbook
transcript: ~/.claude/tape-queue/2026-08-16-akaunting-a5204424-ea76-5611-91e3-3ef32bb43dfa.jsonl
observed: 2026-08-16
---

Working directory is an ops/deployment shell (no `.claude/skills/` or `.claude/agents/`, per
`/home/eric/akaunting/CLAUDE.md:7-13`). Audited against that file and `docs/RUNBOOK.md`, not the
standard dev-project P1-P17 workflow. Known-pattern sweep: P4, P7 not applicable (no git, no test
suite). P1 not flagged — `docs/RUNBOOK.md` full read (transcript line 6) is explicitly instructed by
`CLAUDE.md:5` ("Read `docs/RUNBOOK.md` second"), so it is not a defect. P13 not flagged — heavy `cat >
file <<'EOF'` usage throughout is explicitly endorsed by `CLAUDE.md:56` ("Heredocs over editors").

## Candidate A — Project-level permission relaxation is silently nullified by the user-level settings.json on the actual deploy machine  ·  high

**Occurrences:** 1 (but structural — will recur on every session run this way)
**Cost if it recurs:** Blocked roughly half of a 40+ task runbook mid-execution (assistant's own
count at transcript line 96: "Roughly half the runbook, and it includes the restore test"). Diagnosed
and worked around by editing `~/.claude/settings.json` directly on the shared dev box (mill-dev), which
is the box's *global* Claude Code policy, not scoped to this deployment. As of the current
`DEPLOY_LOG.md:43-44`, that relaxed copy is **still in place**: "LOOSE END: `~/.claude/settings.json`
is still the RELAXED copy. Backup at `~/.claude/settings.json.preakaunting`. Restore it when done
working." The box is used for other work (`CLAUDE.md:72`: "mill-dev is my dev server and has other
work on it"), so a weakened permission policy is sitting open on a multi-purpose machine with no
forcing function to restore it. Recoverable (a `cp` restores it) but not automatic.
**Self-announcing:** No. Nothing detects or reminds that the global settings file is still relaxed —
it is a hand-written note in a log a human has to reread. A session opened on mill-dev tomorrow for
unrelated work runs under the loosened policy without any signal that it differs from baseline.
**Cause:** `akaunting/CLAUDE.md:29-39` ("Destructive Command Policy") documents the *project-level*
`.claude/settings.json` relaxation in detail but never mentions the user-level `~/.claude/settings.json`
at all — the section is written as if project scope is the only scope in play. But seeds' own setup
instructions put the strict seeds master policy at exactly that user-level file on every real machine
("copy the master into each real machine's user-global `~/.claude/settings.json`" —
`/home/eric/seeds/CLAUDE.md` § step 14). Deny-wins-across-scope (confirmed in-session, transcript line
67 showing the project file *does* allow `Bash(*)`, and transcript line 96 tracing the actual denies to
the user file) means the project-level relaxation this runbook was built around was never going to take
effect the moment it ran interactively on mill-dev rather than in an ephemeral cloud container. The
runbook's permission design assumed the wrong scope owns enforcement for its actual execution
environment. The assistant's first diagnosis (transcript line 84) was also wrong — it attributed the
block to "the session sandbox" and non-interactive auto-deny, and even wrote that wrong cause into
`DEPLOY_LOG.md` (transcript lines 76-77, `T1.2 | HALT | blocked: session sandbox denies sudo...`) before
self-correcting at transcript line 96 ("my sandbox diagnosis was wrong"). The DEPLOY_LOG entry was later
corrected in-session (transcript line 145, `DEPLOY_LOG.md:7`: "blocked by user-level deny list
(superseded below)"), so the log itself is not left wrong, but the first-pass misdiagnosis cost a full
turn cycle before the real cause was found.
**Operator reaction (escalating, quoted in full, transcript line numbers):**
- line 79: "yeah, this is the setting file for mill-dev ... how am I going to get around that?"
- line 85: "'Run me interactively on mill-dev. Open a terminal, claude, hand me the runbook.' pretty
  sure that's what this is" — operator working out the cause themselves in parallel with the assistant.
- line 97: "yes, my settings file on mill-dev auto denies. i either need to remove that during this
  install or ... what? you are writing way way too many words. I didn't read any of what you wrote"
- line 100: "you can't curl either ... uhg ... dropping those lines, I might add well just to the
  dangerous skip thing"
- line 103: "I guess my settings file is doing what I expected... I just want to do something different
  for a minute. I guess edit that is the easiest option. can you give me a command to back it up, then
  a cat >> EOF to remake it, then when install is done we just cp the backup"

The operator's frustration (line 97) landed on message *length*, not the diagnosis itself — the
assistant's Judgment-tagged reply at transcript line 96 was long but the underlying finding was
correct; this is noted for calibration, not as a separate finding, since `CLAUDE.md:86` explicitly
permits long Judgment replies and the operator's complaint is about volume under time pressure
(remote/interactive session), not correctness.

**Evidence:**
- `akaunting/CLAUDE.md:29-39` — the relaxation is described as if project scope is the only one that
  matters.
- Transcript line 64, 74 — `sudo -n true` and `dig ...; curl ifconfig.me` both denied outright, no
  prompt shown.
- Transcript line 67 — Read of the project `.claude/settings.json` shows `Bash(*)` in `allow`, proving
  the project file was not the blocker.
- Transcript line 96 — correct diagnosis: "a project-level allow cannot override a user-level deny...
  deny wins across scopes, which is also why no permission dialog ever appeared."
- `DEPLOY_LOG.md:43-44` (current file state) — the still-open loose end.

**Sketch (proposed, not a rule):** A domain/ops-style `CLAUDE.md` that documents a permission
relaxation should name *both* scopes explicitly and say which one the runbook actually depends on for
each execution mode (interactive-on-real-machine vs. cloud-container), since seeds' own distribution
model puts the strict policy at user-level on every real machine by design. Separately: a runbook step
that closes the loop — verifying the backup-and-restore of `~/.claude/settings.json` actually happened
— would turn the current silent loose end into a checked gate rather than a note a human has to
remember.

## Candidate B — Multiple manual-execution steps bundled into one message during a human-run phase  ·  low

**Occurrences:** 1, corrected immediately, did not recur afterward in this transcript.
**Cost if it recurs:** Wasted round trip — operator has to ask which step to run first; recoverable,
no wrong action taken.
**Self-announcing:** Yes — the operator caught it in the very next message.
**Cause:** With `sudo` commands routed to the human (chosen at transcript line 118, "option 2", after
Candidate A's workaround discussion), the assistant reverted to giving one message with three distinct
things at once at transcript line 128: a `[T1.7]` HALT report, then "Meanwhile, your two commands" —
full command blocks for both `[T1.2]` and `[T1.4]`. `CLAUDE.md:19` ("Announce before acting. One line:
`[T1.2] Setting hostname and timezone`. Then the command.") reads as one task per turn; bundling three
tasks' worth of instruction (one HALT report plus two separate command blocks) into a single message
for a human executing by hand is the same shape as batching against that rule.
**Operator reaction:** transcript line 131 — "um ... still one step at a time for the human, what do
you want" — one correction, and the very next assistant turn (line 133) returned to a single command
("Run this: `sudo apt update && sudo apt upgrade -y`. Paste..."). Behavior did not recur later in the
transcript (checked through the Caddy/DNS troubleshooting phase, transcript lines 210-238, where each
turn asks for one command at a time).
**Evidence:** transcript line 128 (bundled message), line 131 (correction), line 133 (corrected shape).
**Sketch (proposed, not a rule):** No standing gap identified beyond the existing `CLAUDE.md:19` rule —
this looks like a one-off lapse under a mixed regime (assistant runs some commands directly, human runs
others by hand) rather than a rule the doc is missing. Worth another sighting before treating as a
pattern to reinforce.

## Candidate C — DEPLOY_LOG.md append-only ordering broken between sessions (advisory, low confidence)  ·  medium

**Occurrences:** 1, observed in the file's current on-disk state, **not caused by any turn in this
transcript.**
**Cost if it recurs:** `DEPLOY_LOG.md` exists specifically so "the next session knows where it is"
(`akaunting/CLAUDE.md:25`). The current file has Phase 3-5 and a `STOP | HOLD` entry timestamped
`2026-08-16T11:15` at `DEPLOY_LOG.md:36-45`, immediately followed at `DEPLOY_LOG.md:46-53` by Phase
1-2 entries timestamped `2026-08-15T23:17`-`23:32` — nearly 12 hours earlier. A human or a future
session skimming top-to-bottom for "where did we leave off" reads the STOP note first, correctly, but
would misread the trailing block as happening *after* the hold rather than 12 hours before it.
Recoverable by reading timestamps carefully; genuinely confusing if skimmed.
**Self-announcing:** No — the file has no ordering check, and nothing in `CLAUDE.md` asserts one.
**Cause:** Not established. This transcript's own appends (verified: transcript lines 76, 126, 145,
154, 176) land in correct chronological order at the tail, ending with the Phase 1/2 content that now
sits at `DEPLOY_LOG.md:46-53`. The inversion happens between this session's end and the later session
that added the Phase 3-5 content at `DEPLOY_LOG.md:6-45` — a session this run did not capture. The
mechanism this transcript uses to append (Edit, anchored on what it believes is the current last line)
is fragile to exactly this failure mode if a later session doesn't re-read the true tail before its
first Edit, but that is a hypothesis about the missing session, not a citation from it.
**Operator reaction:** none observed — not raised in any turn of this transcript (the causing session,
if it exists, is unaudited).
**Evidence:** `DEPLOY_LOG.md:36-53` (current file state, file:line only — no transcript citation for
the causing edit).
**Sketch (proposed, not a rule):** If this recurs, the fix likely belongs in the runbook's own append
idiom: read the file's actual last line before constructing the Edit anchor, rather than assuming
position from what the current session last wrote. Flagged advisory-only pending a second sighting with
a transcript that actually shows the causing edit.

## False-calibration sweep

1 hit out of 48 assistant text turns.

- Transcript line 84: "`id` shows `988(docker)`. Docker is already installed on mill-dev and you're
  already in its group, so Phase 2 is likely a T2.1-check-then-skip-to-T2.3..." — group membership
  (confirmed by the `id` output at transcript line 82) supports "you're already in its group" but not
  "Docker is already installed" — no `docker --version` or equivalent had been run yet at this point in
  the transcript (that check doesn't happen until transcript line 165). Weakly supported: a reasonable
  inference from group membership, stated as settled fact rather than inference. Not blocking — noted
  for the rate, not as a standalone finding.

This same turn (transcript line 84) also contains the incorrect "session sandbox" diagnosis discussed
under Candidate A, stated as fact and corrected twelve turns later (line 96) — not caught by the
keyword sweep (no listed hedge word), but the same shape of confident-and-wrong, so noted here rather
than left silent.
