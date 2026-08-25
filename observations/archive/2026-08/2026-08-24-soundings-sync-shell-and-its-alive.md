---
repo: soundings
session: sync-shell-and-its-alive
transcript: /home/estoffer/.claude/tape-queue/2026-08-24-soundings-85e2f5db-e395-5d29-9c6b-e6b31539a9be.jsonl
observed: 2026-08-25
---

## Candidate — `/its-dead` Step 2 points-tally grep window is too small for this project's own task-block size, and silently undercounts

**Occurrences:** 1 (caught and self-corrected in this run; the undercount itself reproduced fully)
**Cost if it recurs:** a wrong `points:` value written into a session file that is **atomic the moment it's written** — `/its-dead`'s own doc says "no subsequent skill modifies this file" (its-dead/SKILL.md, Notes section) and this session's own closing summary repeated it: "The session file is now atomic — no further writes will modify it." A silent zero here is not a recoverable typo; it is a permanently wrong number feeding `/retro`'s phase velocity computation (active h/pt), for a phase this session's own frontmatter now states is "24 points across six issues" against real history. Not recoverable without a hand-edit outside the documented workflow.
**Self-announcing:** No, for the failure mode that actually threatens accuracy. It *happened* to announce itself this run because the assistant noticed the tally output was empty and thought that was suspicious — but the skill's own Step 2 text explicitly authorizes silence on an empty result: "If no `## Task <N>` blocks exist ... `points: 0`. No warning — sometimes the work is exploration that didn't ship" (its-dead/SKILL.md, Step 2 paragraph following the grep command). An empty tally and a genuinely-task-free session produce the *same* output, so the one signal that saved this run (an empty result looking wrong) is explicitly not a signal the skill treats as wrong.
**Cause:** its-dead/SKILL.md:40 tallies points with
`grep -A 5 "^## Task " "$SESSION_FILE" | grep "Points:" | grep -oE "[0-9]+"`
— a 5-line lookahead from the `## Task` heading to the `**Points:**` line. But kill-this's own task-block template (kill-this/SKILL.md:198-212) puts `**Points:**` as the *fourth* field, after `**Completed:** — <bullet list of what got done, with file paths>` (kill-this/SKILL.md:203-204), which is open-ended by design. In this session's actual file (`.sessions-worktree/sessions/2026-08-22-0312-eric-main.md`), the four real task-block gaps from `## Task N` heading to `**Points:**` were 61, 55, 52 and 53 lines — twelve times the `-A 5` window in the skill spec, and still past the `-A 40` the assistant substituted on its own initiative when actually running the command (transcript line 1804). The rich, evidence-heavy `Completed` write-ups this project's `/kill-this` produces (matching the equally rich PR bodies seen in this session — see the confirmed-clean P5/P6 note below) are exactly what blows the window out; a project with terser task blocks would never trigger this.
**Operator reaction:** none — this was caught and fixed entirely inside the assistant's own tool-call sequence (transcript lines 1804→1809→1813), never surfaced to the user as an anomaly, and the user's next message ("i ran that ...we are done?" / "/its-dead") shows no awareness a tally had failed. The closing summary correctly reports `Points: 17 (3 + 3 + 3 + 8)`, so the user has no reason to know Step 2 as specified would have produced `0`.

**Evidence:**
- its-dead/SKILL.md:40 — `grep -A 5 "^## Task " "$SESSION_FILE" | grep "Points:" | grep -oE "[0-9]+"`
- kill-this/SKILL.md:198-212 — task-block template; `**Completed:**` (open-ended bullets) precedes `**Points:**` by design
- Transcript line 1804 (tool_use, Bash): `grep -A 40 "^## Task " ... | grep "^\*\*Points:\*\*" | grep -oE "[0-9]+"` — the assistant already widened the window past the skill's literal `-A 5` on its own judgment
- Transcript line 1805 (tool_result): `--- points ---` section is empty — the widened `-A 40` still missed all four `**Points:**` lines
- Transcript line 1808-1809: assistant re-ran an unwindowed `grep -n "^\*\*Points:\*\*"` and got all four lines (`98:**Points:** 3`, `190:**Points:** 3`, `246:**Points:** 3 (...)`, `327:**Points:** 8`)
- `.sessions-worktree/sessions/2026-08-22-0312-eric-main.md`: `## Task` headings at lines 37, 135, 194, 274; matching `**Points:**` lines at 98, 190, 246, 327 — gaps of 61, 55, 52, 53 lines
- Transcript line 1813 (Edit): frontmatter written as `points: 17` — the correct sum, reached only via the manual re-grep
- Transcript line 1835 (assistant, closing summary): `Points: 17 (3 + 3 + 3 + 8)` — correct, but arrived at off-script

**Sketch (proposed, not a rule):** its-dead/SKILL.md Step 2 could drop the `-A N` lookahead entirely and grep the whole file for `^\*\*Points:\*\*` unconditionally — the pattern is already anchored and specific enough (`**Points:**` is a fixed field name from the kill-this template) that no windowing is needed to avoid false matches; the `-A N` appears to be defending against matching a `**Points:**` line that belongs to a different, unrelated section, which the `^` anchor plus the field's uniqueness already prevent. If a bound is wanted for performance, it should be sized to the actual template shape (open-ended `Completed` list first) rather than a fixed constant.

## Candidate — Bash `cat` used to pull a whole known-path file instead of `Read`, where the project's own rule names `cat` explicitly

**Occurrences:** 2 confirmed (`cat`), plus 3 more of the same shape using `head`/`tail` instead of `cat` (not literally named by the rule, but same "pull a section out of a known-path file via Bash" shape)
**Cost if it recurs:** none observed this run — every one of the 5 calls succeeded silently under the session's Bash allowlist, with no permission prompt. The rule's own stated cost (a missed allow-pattern stopping a skill mid-run) did not materialize here; this is a live but currently-dormant version of the same risk the rule itself says already fired twice in `/kill-this` and `/promote-production`.
**Self-announcing:** No — nothing distinguishes a `cat`/`head`/`tail` read that happened to be allowlisted from one that will one day miss the allowlist and prompt. The failure mode is intermittent by the rule's own description ("the harm only lands on the intermittent allow-pattern miss").
**Cause:** in each case the assistant reached for a quick single-purpose shell read (`cat file | head -N`, `cat known-glob.md`, `tail -N file`, `head -N file`) rather than the `Read` tool, apparently because the target was a short, known-shape file (`package.json` for its script list, a single decision file, a test file's tail) where a one-line shell command felt equivalent to a `Read` call. No turn shows the assistant considering or rejecting `Read` for these — it simply defaulted to Bash.
**Operator reaction:** none — none of these were visible to or commented on by the user; they are plumbing calls the assistant made while gathering context.

**Evidence:**
- CLAUDE.md:207 (soundings): *"Read files with the Read tool — never `sed`, `grep`, `awk`, or `cat` to pull a section out... The banned shape is sed-ing a section range out of one file whose path you already know — the thing Read does without a prompt."*
- Transcript line 323: `cat package.json | head -25` ("See available npm scripts")
- Transcript line 481: `cat docs/decisions/DEC-009-*.md` ("Read DEC-009")
- Transcript line 195: `tail -30 firmware/test/test_adapters/test_adapters.cpp` ("See test runner main shape")
- Transcript line 686: `head -45 gateway/soundings_gateway/packet.py; echo ...; grep -n ...` ("Read the Python packet decoder")
- Transcript line 688: `head -30 gateway/tests/test_spine.py; echo ...; cat gateway/pyproject.toml` ("Test idiom and dependency manifest")
- All five ran clean (no permission denial) — confirmed by absence of any `is_error` tool_result at the corresponding `tool_use_id`s.

**Sketch (proposed, not a rule):** none needed beyond what CLAUDE.md:207 already states for `cat`; `@workout` may judge whether `head`/`tail` on a known single-file path should be folded into the same rule text, since the rationale (Read is allowlisted and never prompts; a shell one-liner might not be) applies identically to all four verbs.

## Confirmed-working: no findings

**`Bash(sed -n *)` fleet-wide deny (CLAUDE.md:207).** Transcript line 692-693: `sed -n '1,40p' firmware/src/core/packet.h` denied ("Permission to use Bash with command sed -n ... has been denied"). Transcript line 696: the very next tool call switched cleanly to `Read` with `limit: 40` on the same file, no retry-in-a-new-shape, no repeat elsewhere in the session. The rule and the model's recovery from it both worked as designed.

**`/its-dead` Step 4.5 — PR opened outside `/kill-this`.** Transcript line 1817-1818: `gh pr list` correctly surfaced PR #78 (`task/sync-shell-and-its-alive`, opened by hand, merged before this `/its-dead` run) as not present in the frontmatter's `pr_numbers:` list. Transcript line 1835: the closing summary correctly warned "PR #78 ... was opened outside `/kill-this` and is already merged — `@code-review` never ran on it," matching its-dead/SKILL.md Step 4.5 exactly. This session's own transcript does not contain the work that produced PR #78 (it appears to originate from a separate concurrent session/worktree), so its content is out of scope for this observation — noted here only because the *detection* mechanism is confirmed working, not because the PR itself was reviewed.

**Scripted `sed -i` on a scratch file, verified rather than trusted.** Transcript line 672: `sed -i 's|the radio half is issue #NN|the radio half is issue #73|' /tmp/issue-48.md && grep -c "issue #73" /tmp/issue-48.md && gh issue edit 48 --body-file /tmp/issue-48.md` — the `&&`-chained `grep -c` verifies the substitution landed before the file is used, in the spirit of CLAUDE.md's "a scripted edit must fail loudly when its anchor doesn't match" rule, even though the target here is a throwaway `/tmp` file rather than a tracked one. Not a finding.

## P5/P6 — PR test plans

**Checked directly** (`gh pr view <N> --json body`) for all four PRs this session produced through `/kill-this` (#72, #74, #75, #77; PR #78 excluded — not produced within this transcript). All four test plans are walkthrough-shaped: numbered/scripted setup commands, explicit hardware-bench steps with real captured output (frame hex dumps, `seq` values) where applicable, and an explicit "reset" state. No "verify it works"/"ensure X" phrasing found (P5 clean). Each test plan's content is distinct from its own PR's code-review section — the mutation-testing results, bench captures, and "verify by hand" commands do not restate the code-review findings verbatim (P6 clean).

## False-calibration sweep

5 raw regex hits (`almost certainly|certainly|definitely|clearly|obviously|must have been|is likely|probably|no doubt|undoubtedly`). Of these, one bears on code/config/system state: "The real mechanism is almost certainly **back-powering through the OLED's I²C pull-ups**..." — but this text is quoted verbatim from a pre-existing file (`docs/HARDWARE_BUILD_PLAN.md`, read via tool call at transcript line 132, not authored fresh in this session) and is itself immediately followed in the same document by cited supporting evidence (a measured ~1.44 V residual matching "about two diode drops," and a linked external bug report conditioning the same symptom on OLED presence). The other four hits are either self-qualified in the same sentence ("probably the answer, but it's unspecified") or non-factual (opinion/preference language, or verbatim user text). **false-calibration: 0/5 raw hits attributable to an unsupported claim newly authored by this session's assistant.**
