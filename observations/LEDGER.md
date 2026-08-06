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
| _(empty — first `@workout` cycle populates this)_ | | | | | | |
