---
id: DEC-S051
title: "The machine checks its own permission policy at session start"
topic: "Tooling & safety"
---

## DEC-S051: The machine checks its own permission policy at session start

**See also** — decisions this one changed part of:
- Refines DEC-S023 — distribution stays manual, and the master is unchanged. What changes is that
  being out of date now announces itself, and repair is one command instead of a hand-merge
- Refines DEC-S044 — S044 said the user settings file "is not in any checkout, so nothing enumerates
  it and nothing ever will." That holds for machines you are not on. It does not hold for the one you
  are sitting at, which is the only one you can fix
- Extends DEC-S040 — same shape as `drift.mjs` at session start: read-only, reports, never acts

**Decision:** A new seeds script, `dev/claude/scripts/settings-policy.mjs`, reports what a machine is
missing, checked against the master at `dev/claude/settings.json`. `/its-alive` runs it at Step 8.6
beside the drift check and reports only when something is not current. `--write` repairs one target
by **merging**, preserving every other key.

| checked | where | repairable by `--write` |
|---|---|---|
| `permissions` | user settings + shared project | yes |
| `outputStyle` | user settings only | yes |
| `SessionEnd` capture hook + its script (DEC-S045) | user settings only | **no** |
| `~/.claude/devname` | the machine | **no** |

**Why those four and not the rest of the file.** `theme`, `effortLevel`, `tui` and `enabledPlugins`
are taste — there is no fleet-wide right answer, so comparing them would manufacture drift. The four
above each have exactly one correct state per machine. `outputStyle` is a **machine** preference
rather than a repo one (one edit covers every checkout on the box, and a new clone inherits it), so
it is read at the user level only — which also means a deliberate per-repo override in
`.claude/settings.local.json` is correctly invisible to the check rather than reported as drift.

**The hook is the one that cannot be a copied value.** Its `command` is an absolute path and the home
directory differs per machine (`/home/eric/…` on mill-dev, `/home/estoffer/…` on bee-grace), so the
expected value is *derived* — `<home>/.claude/tape-capture.sh` — and the script it points at is
compared byte-for-byte against the template. It is reported and never repaired: installing it copies
a script, marks it executable, and only then wires the entry, which is a session on that machine.
`--write` is deliberately not offered under a hook-only failure, because a repair command printed
beneath a problem it does not repair gets run, reports success, and leaves the problem there.

**The state this was built against, measured 2026-08-22.** Seventeen checkouts, four live generations
of the policy: three repos current at 78 deny, one at 87 carrying rules the harness ignores, three at
33, four at a pre-file-path generation with **no secret denies at all**, one with an empty
`permissions` block that reads as configured, and four with no file. Nothing reported any of it. The
list was produced by hand, in a session, because someone thought to ask.

**`--write` is a merge and that is the entire point.** The master has exactly one top-level key. A
real user settings file has more — on mill-dev: `hooks`, `enabledPlugins`, `effortLevel`, `tui`,
`theme`, `agentPushNotifEnabled`. `cp master ~/.claude/settings.json` destroys six of seven, and did:
it killed the `SessionEnd` capture hook (DEC-S045) on mill-dev for four days along with the theme and
the effort level, recovered only from a stray `settings.json.preakaunting` backup. Session 36's
close-out recorded that failure as **"unfixed and will happen again."** This is the fix. The script
writes `permissions`, keeps every other key byte-for-byte, backs the file up first, and re-reads
afterwards rather than trusting that the write took.

**The comparison is strict, deliberately.** `permissions` must deep-equal the master's, modulo array
order. A tolerant check cannot distinguish a deliberate local addition from a stale entry nobody
cleaned up — which is the whole problem — so exceptions go to `.claude/settings.local.json`
(**project local**, level 3, gitignored). Confirmed against the documentation while writing this:
there is **no user-level local file**. The documented levels are managed > command line > project
local > shared project > user, and per-box permission tweaks therefore have nowhere to live except
the file the policy occupies. The operator's position is that no box-level tweaks exist, which is
what makes strict affordable.

**"Global" is not a Claude Code term, and that ambiguity is part of why this went unmanaged.** Seeds'
own README coined "user-global" for `~/.claude/settings.json`. The documented name is **user
settings**. Three distinct things were being called the same thing in conversation — the user file,
the committed project file, and the gitignored local file — and a distribution problem you cannot
name precisely is one you cannot check. The script's output labels each target with its documented
name and its scope.

**Why session start, and why not a fleet report.** A machine you are not sitting at cannot be read,
and a hand-maintained ledger of last-known state is the artifact this repo has already watched rot —
`LEDGER.md` carries an explicit warning about exactly that. The box you *are* on is readable, and it
is the only one you can repair. Checking at session start means every machine checks itself, every
session, with no list to maintain and nothing to remember. Same argument that put `drift.mjs` in
`/its-alive` rather than in a fleet sweep (DEC-S040).

**A ledger was designed and deliberately not built.** It answers one question this does not: the state
of a box you are not on, which matters only when planning a distribution sweep. Held until it is
missed. Recorded so the next session does not rediscover the idea and assume it was overlooked.

**Not in `verify`.** `check:policy` exists as an npm script but is **not** chained into the gate. A
stale policy on the machine says nothing about whether the change under review is correct, and
gating on it would block work on any box that happens to be behind. It is a briefing item, not a
build gate.

**`/its-alive` reports and does not repair.** The step surfaces the `--write` command and stops.
Running it edits the file carrying the machine's hooks, and whether a policy change lands now or
after the task in hand is the user's call — the same line `drift.mjs` holds.

**What it still does not cover:**

- **Other machines.** Unchanged, and unfixable from here.
- **Cloud and phone containers.** They have no user settings file, so the committed project policy is
  their entire seatbelt. The script checks it; nothing can make a container check itself.
- **Timing.** Permissions are read once at launch, so a repair applies at the *next* session. The
  step says so, because "fixed" implying "fixed now" is the kind of quiet wrongness this repo keeps
  finding.
- **Whether the policy is any good.** It compares against the master. If the master is wrong, this
  distributes wrongness faithfully.

**The review found the destructive flag unsafe, and demonstrated it on a live machine.** Five
findings, all real, all fixed before merge. The one that matters: `--write` took an *optional*
target and fell back to `~/.claude/settings.json`, so three natural orderings — `--write --seeds
/path`, `--all --write`, `<path> --write` — silently wrote to the single file this script exists to
protect. The reviewer, asked explicitly not to touch real settings, hit that path twice while
probing and disclosed it. No damage: this machine already matched the master, so both writes were
content no-ops. **That is the demonstration, not a mitigating circumstance** — the argument shape
that produced it is the one a person types.

`--write` now requires an adjacent target and refuses otherwise; mode flags are mutually exclusive
rather than last-wins (`--write --repo` had been silently running a *check*); writing the master
itself is refused in code rather than only in a comment; backups are timestamped, because a fixed
`.bak` loses the original on the second run — and the mill-dev incident was recovered from exactly
such a stray backup; and duplicate list entries no longer report `STALE` with an empty explanation,
since a repeated deny rule is not a policy difference.

**Proof:** the three cases probed against real checkouts rather than fixtures — `current` (this
machine's user settings and seeds' own committed file), `STALE` (bushel: missing `Bash(sed -n *)`,
carrying 10 dead `Write()` rules; chiplog: 54 denies missing), `ABSENT` (tinkle). `--write` probed on
a scratch file holding `hooks`, `theme`, `effortLevel` and `enabledPlugins`: all four preserved, the
hook command intact, deny count 1 → 78, backup written. Malformed JSON refused rather than
overwritten, exit 2.

**Alternatives considered:** a `settings-status.mjs` that walks a list of repo paths and prints a
fleet table (rejected — it needs the fleet list this repo deliberately does not keep, and it reports
about repos nobody has opened since spring). Adding it to `check-mirrors.mjs` (rejected — that script
compares seeds' own copies against seeds' templates; the user settings file is neither). Comparing
whole files rather than the `permissions` key (rejected — every legitimate difference lives in the
other keys, so it would report drift on every machine forever).
