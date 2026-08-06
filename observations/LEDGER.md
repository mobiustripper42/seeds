# Pattern ledger (DEC-S039)

One row per **pattern**, not per observation. A pattern seen twice before and once more today is one
row with three occurrences, not three findings. Maintained by `@workout`; read by `@workout`.

This is the one hand-maintained artifact in the loop, and therefore the one that can rot — a
hand-updated index is exactly what DEC-S036 replaced with a generator. It cannot be generated here,
because it carries judgment rather than derived facts. That cost is accepted because the alternative
— deriving state from the archive — means reading everything every time, which is the failure the
inbox/ledger split exists to prevent.

**Watch for:** a row whose `seen` count stops moving while observations for that pattern keep
arriving. That is the rot becoming real. If it does, add a check asserting every archived
observation is cited by exactly one ledger row, in the shape of `check-docs`' exemption-existence
assertion. Not built until then.

## States

| State | Meaning |
|---|---|
| `promoted → <target>` | A template change shipped. The target names the file and section that now carries the rule. |
| `held` | Real, but the right fix isn't obvious, or it's recoverable and has been seen once. The `note` carries the reasoning the next cycle argues *from* rather than re-inventing. |
| `dismissed` | Noise, or a project-specific artifact misfiled as general. The `note` says why. |
| `retired` | A promoted rule removed after its pattern stopped appearing across many clean runs. |

A row that stays `held` for months while gaining occurrences is visible here as a row that keeps
growing without earning a promotion — which is itself a signal worth reading.

## Ledger

| pattern | state | seen | repos | first | last | note |
|---|---|---|---|---|---|---|
| W1 task shipped by hand-typed `git`/`gh` instead of `/kill-this` | promoted → `its-dead/SKILL.md` §4.5 + `CLAUDE.md` §Micro Workflow step 8 | 1 session (8 PRs, 1 via the skill) | muster | 2026-08-06 | 2026-08-06 | Single-sighting promotion. Cost is irreversible — PR #665 merged with no `@code-review` and the operator found four defects by hand after it shipped. Silent: nothing flagged the skip; the operator caught the *log* gap by watching, and the *review* gap surfaced only because he asked for a retrospective review by name. The pattern recurred after his explicit correction, which is the evidence that prose alone doesn't hold it — hence the detection step in `/its-dead`, not just a stronger instruction. Next cycle: watch whether the §4.5 warning ever fires and whether it changes behaviour, or is dismissed like the correction was. |
| W2 scripted multi-file edit used in place of `Edit`, without asserting the anchor matched | promoted → `CLAUDE.md` §Workflow Notes | 1 session (84 heredocs, 49 with no assert) | muster | 2026-08-06 | 2026-08-06 | Single-sighting promotion, justified by detectability, not by cost or count. A `.replace()` matching zero times writes the file back unchanged and exits 0, so the failure mode is a file that looks edited and reviewed and is neither — a pattern that is invisible when it recurs has a sample size of one. No such silent no-op was observed failing here; the session's own retro-review prompt named it as the leading risk for that PR. The rule requires the assert, it does not ban scripted edits — the observation's "why it might be noise" argument (one scripted pass beats ten hand-copied anchors) is correct and survives the rule. |
| W3 (P7) full/unscoped test-suite run mid-task | held | 1 | muster | 2026-08-06 | 2026-08-06 | Recoverable (costs iteration time) and fully self-announcing (an unscoped `playwright test` is visible on its face) — the hold cell for a single sighting. Argue from this next cycle: the rule already exists in `CLAUDE.md` §Micro Workflow step 6 and §"Full suite is never run automatically", so a promotion here would be re-stating an existing rule louder, which is the accretion failure. If it recurs, the question to ask is *why the written rule didn't bind* — the answer is more likely a scoping ambiguity (this run was `--project=mobile`, one project, arguably targeted) than a missing sentence. Consider tightening what "targeted" means (a spec file, not a project filter) rather than adding prose. |
