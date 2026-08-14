#!/usr/bin/env bash
# tape-capture.sh — the unforgettable half of the learning loop (DEC-S045).
#
# Wired to the SessionEnd hook in the machine's USER-GLOBAL ~/.claude/settings.json.
# When a session ends, this copies its transcript into a local queue and notes it in
# an index. That is the whole job. /read-the-tape --queue distils the queue later, on
# a human cadence; nothing here reads the transcript, calls a model, or judges anything.
#
# WHY A HOOK AND NOT A SKILL: a skill is model-invoked, so an eager-to-finish session
# can drift past it — the antipattern DEC-S041 named. The harness runs a hook whatever
# the model does.
#
# WHY IT COPIES RATHER THAN JUST INDEXING: `cleanupPeriodDays` defaults to 30, and
# Claude Code deletes session files older than that AT STARTUP. An index alone would
# hand you back a deadline to remember, which is the failure this removes.
#
# BUDGET: SessionEnd hooks share a 1.5s budget as a group. A copy of a typical
# transcript (~800KB) is milliseconds. Do not add anything that scans, compresses,
# or calls out — this must stay a byte copy and one appended line.
#
# SessionEnd ignores exit *codes*, so no failure here can fail a session — but that is
# not the same as "cannot block". A `cp` or `git` against a stalled network filesystem
# (OneDrive Files-On-Demand, a hard-mounted NFS home) can enter uninterruptible sleep,
# which no timeout and no signal reclaims. `timeout` below bounds the ordinary slow-disk
# case; it cannot bound that one. Stated because the stronger claim would be wrong.
#
# Every failure is otherwise silent by design, and the only signal that capture is
# working is the queue filling up. Check it occasionally.
#
# Install per machine (DEC-S023 hand-distribution):
#   cp dev/claude/scripts/tape-capture.sh ~/.claude/tape-capture.sh
#   chmod +x ~/.claude/tape-capture.sh
# then add the SessionEnd stanza to ~/.claude/settings.json — see README § Learning loop.
# NOT in a repo's committed .claude/settings.json: that file reaches the cloud
# container, which has no durable filesystem and no seeds checkout.

set -u

[ -n "${HOME:-}" ] || exit 0              # nothing to key the default queue off
QUEUE="${TAPE_QUEUE:-$HOME/.claude/tape-queue}"
INDEX="$QUEUE/index.jsonl"

command -v jq >/dev/null 2>&1 || exit 0   # no jq, no capture. Silent — see above.

# `timeout` bounds a slow disk. Absent (busybox, some macOS setups), run bare rather
# than skipping capture entirely — an unbounded copy beats no evidence.
if command -v timeout >/dev/null 2>&1; then T="timeout 10"; else T=""; fi

PAYLOAD=$(cat)
[ -n "$PAYLOAD" ] || exit 0

SESSION_ID=$(printf '%s' "$PAYLOAD" | jq -r '.session_id // empty' 2>/dev/null)
TRANSCRIPT=$(printf '%s' "$PAYLOAD" | jq -r '.transcript_path // empty' 2>/dev/null)
CWD=$(printf '%s' "$PAYLOAD" | jq -r '.cwd // empty' 2>/dev/null)
REASON=$(printf '%s' "$PAYLOAD" | jq -r '.reason // "unknown"' 2>/dev/null)

[ -n "$SESSION_ID" ] || exit 0
[ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ] || exit 0

REPO=$(basename "${CWD:-unknown}")
DATE=$(date -u +%Y-%m-%d)
BRANCH=$($T git -C "${CWD:-.}" branch --show-current 2>/dev/null || true)
SHA=$($T git -C "${CWD:-.}" rev-parse --short HEAD 2>/dev/null || true)

mkdir -p "$QUEUE" 2>/dev/null || exit 0
COPY="$QUEUE/${DATE}-${REPO}-${SESSION_ID}.jsonl"

# Overwrite the copy rather than skip: if this fires more than once for a session, the
# later transcript is the more complete one. The INDEX LINE is written once and never
# updated, so on a repeat fire the copy is current while `branch`/`sha`/`reason` describe
# the first fire. That asymmetry is deliberate — rewriting a line in place would mean a
# read-modify-write on a file the drain is also editing — but it is not "idempotent on
# the pair", and calling it that would be wrong.
cp -f "$TRANSCRIPT" "$COPY" 2>/dev/null || exit 0

# One index line per session_id, ever. grep -F on the raw id is enough — these are uuids,
# and `jq -c` emits no whitespace, so the literal match is exact.
#
# `cwd` is recorded because the drain needs it: an observation has to be filed under the
# repo the session actually ran in, and read its skills and agents from there. Without it
# a drain run from seeds would hand @tape-reader seeds' own files as context for someone
# else's session, silently.
if ! [ -f "$INDEX" ] || ! grep -qF "\"session_id\":\"$SESSION_ID\"" "$INDEX" 2>/dev/null; then
  jq -cn \
    --arg observed "$DATE" \
    --arg repo "$REPO" \
    --arg cwd "$CWD" \
    --arg branch "$BRANCH" \
    --arg session_id "$SESSION_ID" \
    --arg transcript "$COPY" \
    --arg origin "$TRANSCRIPT" \
    --arg sha "$SHA" \
    --arg reason "$REASON" \
    '{observed:$observed, repo:$repo, cwd:$cwd, branch:$branch, session_id:$session_id, transcript:$transcript, origin:$origin, sha:$sha, reason:$reason}' \
    >> "$INDEX" 2>/dev/null || exit 0
fi

exit 0
