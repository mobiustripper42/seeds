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

# The repo name comes from the git COMMON dir, not the cwd basename.
#
# A session run inside a linked worktree has a cwd whose last component is the worktree
# directory, not the repository: `/home/eric/muster/.sessions-worktree` yielded a `repo`
# of `.sessions-worktree`, and the drain would have filed that session's observation
# under a repo that does not exist. Observed in the queue on 2026-08-14, one entry of six.
# Every project has a `.sessions-worktree/` by design (DEC-S014), and `/its-alive` runs
# `git -C` against it constantly, so this is a normal place to be standing, not an edge.
#
# `--show-toplevel` does NOT fix it — inside a worktree it returns the worktree path.
# `--git-common-dir` is the one that resolves to the MAIN repo's `.git` from either place;
# `--path-format=absolute` is required because it returns a bare relative `.git` otherwise.
# That flag needs git >= 2.31; on anything older the command fails, `COMMON` is empty, and
# this falls back to the old basename behaviour rather than writing a wrong name loudly.
# Same benign fallback if the cwd is gone or git refuses it for dubious ownership.
#
# NOT defended against, stated so it isn't mistaken for handled: `GIT_DIR` or
# `GIT_COMMON_DIR` exported into the hook's environment override `-C` entirely, and would
# attribute the session to whatever repo they name. Nothing here can detect that, and a
# session's shell would not normally carry them — but the failure would be a wrong,
# plausible repo name rather than a fallback, which is the outcome the rest of this
# comment is at pains to avoid.
COMMON=$($T git -C "${CWD:-.}" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
#
# `REPO_ROOT` is recorded for the same reason and is NOT the same field as `cwd`. The drain
# reads the session's `.claude/skills/` and `.claude/agents/` for context, and a worktree
# holds none of those — only `sessions/`. Worse, the worktree path *exists*, so the drain's
# "if cwd no longer exists, audit without project context" escape hatch never fires: the
# agent would silently get an empty context directory. `cwd` stays as written because it is
# the factual record of where the session ran; `repo_root` is where its files are.
#
# The `.git/modules/` arm is the same bug in a second costume, and it is here because the
# first fix did not cover it. A submodule's common dir is `<super>/.git/modules/<name>` —
# git's own bookkeeping, which EXISTS and holds `HEAD`, `config`, `hooks` and no `.claude`.
# It matches neither `*/.git` nor a trailing `.git` to strip, so it fell through to the
# `?*` arm unchanged and pointed `repo_root` at an internal directory. Existing-but-empty
# is precisely the failure this whole change is about: the drain's "directory is gone, skip
# project context" escape hatch never fires, so the agent gets nothing and cannot tell.
# For a submodule the working tree is what we want, and `--show-toplevel` returns it — the
# one case where that is the right call rather than the trap it is inside a worktree.
case "$COMMON" in
  */.git/modules/*)
           REPO_ROOT=$($T git -C "${CWD:-.}" rev-parse --show-toplevel 2>/dev/null || true)
           [ -n "$REPO_ROOT" ] || REPO_ROOT="${CWD:-}" ;;
  */.git)  REPO_ROOT=$(dirname "$COMMON") ;;            # normal checkout or linked worktree
  ?*)      REPO_ROOT="${COMMON%.git}" ;;                # bare repo, or GIT_DIR pointing elsewhere
  *)       REPO_ROOT="${CWD:-}" ;;                      # not a repo, or git too old
esac
REPO=$(basename "${REPO_ROOT:-${CWD:-unknown}}")
DATE=$(date -u +%Y-%m-%d)
BRANCH=$($T git -C "${CWD:-.}" branch --show-current 2>/dev/null || true)
SHA=$($T git -C "${CWD:-.}" rev-parse --short HEAD 2>/dev/null || true)

mkdir -p "$QUEUE" 2>/dev/null || exit 0

# If this session is ALREADY indexed, write to the path that index line names — never
# recompute one. `$DATE` is today, and a session that spans midnight UTC fires once on
# each side of it: recomputing gave the second fire a different filename, so it wrote a
# NEW copy while the index line (written once, keyed on session_id) still pointed at the
# first. The result is an orphan the drain can never see and nothing ever cleans, and the
# drain reads the STALE, shorter transcript. Observed on 2026-08-16 in a session opened on
# the 14th: 650088 bytes indexed, 967248 bytes orphaned. Long sessions are the ones most
# worth auditing, so this preferentially corrupted the best evidence.
#
# Reusing the indexed path also survives a copy being renamed by hand, which is how the
# worktree-misnaming above had to be repaired for entries captured before that fix.
EXISTING=""
if [ -f "$INDEX" ]; then
  EXISTING=$(grep -F "\"session_id\":\"$SESSION_ID\"" "$INDEX" 2>/dev/null | tail -1 \
             | jq -r '.transcript // empty' 2>/dev/null || true)
fi
COPY="${EXISTING:-$QUEUE/${DATE}-${REPO}-${SESSION_ID}.jsonl}"

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
# `cwd` and `repo_root` are both recorded and are not interchangeable. Without either, a
# drain run from seeds would hand @tape-reader seeds' own files as context for someone
# else's session, silently. `cwd` is where the session actually ran — a fact, kept as
# written. `repo_root` is where that session's `.claude/` lives, and is the one the drain
# must read context from: in a linked worktree the two differ, and only `repo_root` has
# any skills or agents under it.
if ! [ -f "$INDEX" ] || ! grep -qF "\"session_id\":\"$SESSION_ID\"" "$INDEX" 2>/dev/null; then
  jq -cn \
    --arg observed "$DATE" \
    --arg repo "$REPO" \
    --arg cwd "$CWD" \
    --arg repo_root "$REPO_ROOT" \
    --arg branch "$BRANCH" \
    --arg session_id "$SESSION_ID" \
    --arg transcript "$COPY" \
    --arg origin "$TRANSCRIPT" \
    --arg sha "$SHA" \
    --arg reason "$REASON" \
    '{observed:$observed, repo:$repo, cwd:$cwd, repo_root:$repo_root, branch:$branch, session_id:$session_id, transcript:$transcript, origin:$origin, sha:$sha, reason:$reason}' \
    >> "$INDEX" 2>/dev/null || exit 0
fi

exit 0
