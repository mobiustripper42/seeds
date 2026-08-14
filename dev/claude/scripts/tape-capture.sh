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
# It cannot block a session: SessionEnd ignores exit codes. Every failure here is
# therefore silent by design, and the only signal that capture is working is the
# queue filling up. Check it occasionally.
#
# Install per machine (DEC-S023 hand-distribution):
#   cp dev/claude/scripts/tape-capture.sh ~/.claude/tape-capture.sh
#   chmod +x ~/.claude/tape-capture.sh
# then add the SessionEnd stanza to ~/.claude/settings.json — see README § Learning loop.
# NOT in a repo's committed .claude/settings.json: that file reaches the cloud
# container, which has no durable filesystem and no seeds checkout.

set -u

QUEUE="${TAPE_QUEUE:-$HOME/.claude/tape-queue}"
INDEX="$QUEUE/index.jsonl"

command -v jq >/dev/null 2>&1 || exit 0   # no jq, no capture. Silent — see above.

PAYLOAD=$(cat)
[ -n "$PAYLOAD" ] || exit 0

SESSION_ID=$(printf '%s' "$PAYLOAD" | jq -r '.session_id // empty')
TRANSCRIPT=$(printf '%s' "$PAYLOAD" | jq -r '.transcript_path // empty')
CWD=$(printf '%s' "$PAYLOAD" | jq -r '.cwd // empty')
REASON=$(printf '%s' "$PAYLOAD" | jq -r '.reason // "unknown"')

[ -n "$SESSION_ID" ] || exit 0
[ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ] || exit 0

REPO=$(basename "${CWD:-unknown}")
DATE=$(date -u +%Y-%m-%d)
BRANCH=$(git -C "${CWD:-.}" branch --show-current 2>/dev/null || true)
SHA=$(git -C "${CWD:-.}" rev-parse --short HEAD 2>/dev/null || true)

mkdir -p "$QUEUE" || exit 0
COPY="$QUEUE/${DATE}-${REPO}-${SESSION_ID}.jsonl"

# Overwrite rather than skip: if this fires more than once for a session, the later
# transcript is the more complete one. Idempotent on the pair (copy, index line).
cp -f "$TRANSCRIPT" "$COPY" 2>/dev/null || exit 0

# One index line per session_id, ever. grep -F on the raw id is enough — these are
# uuids, so a substring collision is not a thing worth engineering against.
if ! [ -f "$INDEX" ] || ! grep -qF "\"session_id\":\"$SESSION_ID\"" "$INDEX" 2>/dev/null; then
  jq -cn \
    --arg observed "$DATE" \
    --arg repo "$REPO" \
    --arg branch "$BRANCH" \
    --arg session_id "$SESSION_ID" \
    --arg transcript "$COPY" \
    --arg origin "$TRANSCRIPT" \
    --arg sha "$SHA" \
    --arg reason "$REASON" \
    '{observed:$observed, repo:$repo, branch:$branch, session_id:$session_id, transcript:$transcript, origin:$origin, sha:$sha, reason:$reason}' \
    >> "$INDEX" 2>/dev/null || exit 0
fi

exit 0
