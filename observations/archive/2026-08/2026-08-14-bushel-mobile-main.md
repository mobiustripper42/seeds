---
repo: bushel-mobile
session: main
transcript: /home/eric/.claude/tape-queue/2026-08-14-bushel-mobile-fc1c302b-9e09-499a-ac43-e8ca4f957563.jsonl
observed: 2026-08-14
---

## Known-pattern sweep (P1–P17)

| ID | Pattern | Found |
|----|---------|-------|
| P1 | Full read of large file | No |
| P2 | Repeated permission prompt | No — 4 `is_error` denials are `permission-rule` auto-denies (`Bash(curl *)`, `Bash(sudo *)`), not repeated user prompts; `defaultMode: auto` means most commands never prompt |
| P3 | Edit failure: not read first | No |
| P4 | Missing branch capture at session start | No — `/its-alive` Step 0 ran branch check before any staging |
| P5 | Vague test plan | No — final PR #13 test plan is concrete (specific labels, exact strings, numbered steps) |
| P6 | Test plan copied from code review | No — `## Code review` and `## Test plan` sections are independently written |
| P7 | Full test suite run during dev | No — `npx jest <specific file>` used throughout; `npm test`/`npm run verify` only at gate checkpoints |
| P8 | Full session-log read | No — this project uses per-session files on the `sessions` branch, not `session-log.md`; the prior session file read (`2026-07-06-...-main.md`) is the intended `/its-alive` behavior, not excess |
| P9 | `cd` then `git` in separate Bash calls | No |
| P10 | Consecutive Edit failures requiring re-read | No |
| P11 | Multi-hypothesis debugging without step-gating | No — see the new candidate below for a related but distinct communication failure |
| P12 | `/its-dead` invoked twice | No — one `/its-alive` + one `/its-dead`, exactly one session |
| P13 | Bash `cat` instead of Read tool | No — the two `python3` heredocs read files via `open().read()` inside the script, which is the mechanical part of an assert-and-replace edit (see below), not a substitute for the Read tool |
| P14 | Repeated error-context reads | No — not an e2e/Playwright project |
| P15 | Test retries masking races | No |
| P16 | Stale dev-server-on-fixed-port | No — port conflict was a one-off (Metro already running from a prior Bash call; user hit the interactive `Y/n` re-port prompt once in their own terminal), not the "server serves stale bundle, test fails, gets re-run" cycle this pattern describes |
| P17 | Edit on file never Read first | No |

**Compliance note, not a finding:** two scripted edits in this session used a `python3` heredoc pattern (`toolu_01GCT7LW8vTUf5oKy5AbCVvZ` renaming `<Field>`/`<Button>` in `login.tsx`; `toolu_01WzRF7otXhVe43J3V1y5J4i` rewriting the PR body's `#### Steps` section) and a `sed -i` port-rename loop (`toolu_014PmUcGcFamhFuW7jeSz4VC`). All three assert match counts and exit non-zero on a miss, per `CLAUDE.md:181`'s "scripted edit must fail loudly" rule (bushel-mobile's copy of the seeds shell). Recorded because the rule exists and was checked, not because it was broken.

## False-calibration sweep

1 confidence-marker hit across the session's assistant text: *"the fix is one line and clearly right"* (turn ts 2026-08-10T15:48:37, re: the `/security-review` dev-override-gate finding). Supported — the same turn cites the sub-agent's 0.75 confidence score and the one-line fix is shown verbatim in the following Edit call and explained in the PR body (`readBaseUrlOverride` gated on the value, not just the editor). **false-calibration: 0/1 flagged phrase unsupported.**

## Candidate — Action-reply bolts on non-actionable findings, costing a clarifying round trip

**What happened:** After the first build (pre-review), the assistant's session-close reply (turn ts 2026-08-10T14:23:59, tagged **Action.**) opened "Three things that change what you do next" and listed: (1) the outstanding on-device check, (2) `npx expo export` not closing the typed-routes CI gap, (3) `npm run web` can't complete a login. The operator replied *"I don't really know how to address you point 2 and 3"* (ts 15:38:31). The assistant's own follow-up (tagged **Judgment.**, ts 15:38:48) then said: *"Neither one needs you to do anything. They were reports, not requests — I flagged them because they'd otherwise be silent surprises later."*

**Rule cited:** `/home/eric/bushel-mobile/CLAUDE.md:223` — *"Action — you did the thing; report what happened. Result first, then only what **changes what I do next**: a blocker, a surprise, something I'm about to trip over... Nothing else... **don't bolt on the adjacent concern** you noticed while answering — raise it after, in one line, or not at all."*

**Why it's a pattern and not a one-off:** the assistant's own retrospective admission — "they were reports, not requests" — is a direct concession that the Action-tagged reply violated its own format's stated filter. The content itself (two accepted technical footnotes) was fine; the failure was framing them as things requiring a next-action when they didn't, which is exactly the failure mode the rule's last sentence exists to block.

**Cost if it recurs:** one extra clarifying round trip per occurrence (a Judgment-length reply undoing the confusion) — wasted time, fully recoverable, no data or code at risk.
**Self-announcing:** yes — the operator directly named the confusion in-session, and the assistant's own next reply retracted the framing.
**Cause:** at session-close the assistant enumerates every technical nuance surfaced during the build (typed-routes gap, web-login limitation) and defaults to presenting all of them under the "changes what I do next" umbrella, rather than filtering to genuine blockers/surprises first and demoting the rest to "raise it after, in one line, or not at all" per the rule's own escape hatch. Nothing in the transcript shows a deliberate decision to include points 2–3 as actionable — they read as the natural output of "list what I found," which is a different task than "list what changes your next move."
**Operator reaction:** one turn — *"I don't really know how to address you point 2 and 3"* (ts 15:38:31). Not escalated further; the assistant's next reply resolved it in one pass, and the pattern did not recur later in the session.
**Sketch (proposed, not a rule):** none proposed — this is a single session's evidence of a communication-format rule already stated in `CLAUDE.md:223`. Whether it needs sharper wording or is just an execution slip is a judgment for repeated observation across sessions, not this one.

## Candidate — Hand-test-plan step 1 omitted the app-bootstrap step, entry state was "Cold-launch the app" with no install/connect instructions

**What happened:** PR #13's original `#### Steps` section (as opened, ts ~15:50) began: *"1. **Point the app at your dev server.** Cold-launch the app → the Sign in screen. Scroll to Dev — server URL..."* — written as though the reviewer already had the build running on a device. The operator, walking through it live, sent four consecutive confused turns before the gap was identified:
- *"this is confusing to me, I'm not sure what to type where and why my production URL is even listed"* (ts 18:18:48)
- *"in what box"* (ts 18:19:25)
- *"what sign in screen?"* (ts 18:19:45)
- *"can you please re write the steps with that as the 1st, "* (ts 18:20:36)

Only at the third turn did the assistant's reply name the actual gap: *"The one in this PR — it doesn't exist on your phone yet... If you haven't got Expo Go installed on the device, that's the actual first step and I skipped it"* (ts 18:19:51). The assistant then rewrote the PR body, inserting a new step 1, "Get the app onto the phone" (install Expo Go, enter the Metro URL or scan the QR code), and renumbering the rest (`gh pr edit 13`, ts 18:21:08).

**Rule cited:** `/home/eric/bushel-mobile/.claude/skills/kill-this/SKILL.md:147` — *"**Starting state** — the route, the signed-in role, and any seed or setup command. 'Open the app' is not a starting state."*

**Why it's a pattern and not a one-off:** the rule as written is phrased for a web app ("the route"). For a native/Expo app there is no URL a reviewer can just open — the starting state is "have the correct build running on your device at all," which for this project's dev flow means Expo Go installed and pointed at Metro. The rule's principle applies directly ("Cold-launch the app" is exactly as thin as "Open the app," which the rule already names as insufficient) but the wording's web framing may be why the gap wasn't caught before the operator hit it live — there's nothing in the skill spelling out that a mobile "starting state" includes the install/connect step, only the web-shaped "route."
**Cost if it recurs:** on this occurrence, four operator turns and one assistant round trip before the plan was usable — several minutes of an operator's time, on a project where every future task's hand-verification section will hit the same native-app bootstrap question. Recoverable (the PR body was fixed by editing it in place), but paid again per task until the skill or a project note closes the gap.
**Self-announcing:** yes — the operator's confusion was immediate and explicit, escalating over three short turns before the cause was named.
**Cause:** the assistant drafted the hand section from its own mental model at the point of writing (Metro already running in a background Bash call it had started, LAN URL known, device assumed reachable) rather than from a reviewer's actual zero-state. `SKILL.md:147`'s "Starting state" bullet was followed in form (a numbered step 1 exists) but not in substance — "Cold-launch the app" carries the same information gap as the literal "Open the app" the rule calls out by name, just rephrased.
**Operator reaction:** four turns, escalating from general ("confusing") to specific ("in what box", "what sign in screen?") to a direct fix request ("re write the steps with that as the 1st"). The assistant resolved it in the same turn it correctly diagnosed the cause (third reply) and the rewritten PR body was not challenged again — no evidence the same gap recurred later in this session (there was no second task/PR to check against).
**Sketch (proposed, not a rule):** `kill-this` SKILL.md's Starting-state bullet (`SKILL.md:147`) could name the non-web case explicitly — e.g. "for a native/mobile build, starting state includes how the reviewer gets the build running at all (install, connect, or open a link), not just the in-app route" — but this is one session's evidence on one project type; whether that's worth a rule edit or the existing wording already covers it well enough is `@workout`'s call across more native-app sessions.

## Candidate — Denied command retried near-verbatim before pivoting to an allowed alternative

**What happened:** while checking whether Metro was reachable, the assistant ran `sleep 20; curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status; echo; hostname -I` (ts 14:23:36), which was auto-denied (`Bash(curl *)` is in the global deny list, `~/.claude/settings.json`). Two seconds later it retried with a near-identical command, `curl -s -m 5 -o /dev/null -w "metro:%{http_code}\n" http://localhost:8081/status` (ts 14:23:38), also denied. Only on the third attempt did it pivot to `hostname -I` alone (succeeded) then `ss -ltnp | grep :8081` (succeeded) — the two pieces of information the original curl calls were after, obtained without `curl` at all.
**Cost if it recurs:** two wasted tool round trips (denied, near-instant, no user-visible prompt since `defaultMode: auto` on a deny match) — seconds, fully recoverable.
**Self-announcing:** yes — the denial message is immediate and visible in the transcript on the very next turn.
**Cause:** the deny message ("Permission to use Bash with command ... has been denied") doesn't say *why* — nothing distinguishes a network-fetch deny from a rate-limited retry-later deny, so the assistant's second attempt reads as "maybe a shorter timeout gets through" rather than "curl itself is blocked." The global deny list denies `Bash(curl *)` outright (`~/.claude/settings.json`) but neither `CLAUDE.md` documents the rationale the way it does for the `npx`-class denials (§ "What a deny list cannot do... Denying the runners closes the network-fetch route").
**Operator reaction:** none — not raised in-session; the operator wasn't shown these denials (no prompt fired) and the assistant self-corrected within two turns.
**Sketch (proposed, not a rule):** none — a single two-retry instance is thin evidence for a rule; noted because the pivot did eventually happen cleanly and the alternative (`ss`/`hostname`) worked on the first try once tried.

No findings against P1–P17. Two well-evidenced candidates on communication/test-plan quality, one thin candidate on denied-command retry.
