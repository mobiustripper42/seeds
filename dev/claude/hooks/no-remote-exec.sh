#!/usr/bin/env bash
# PreToolUse/Bash — refuse commands that fetch and execute a package from the network.
#
# Why a hook and not a deny rule: permission patterns are exact / prefix / tool-only. There is no
# mid-string form, so `Bash(npx *)` catches `npx prettier` and misses `npm run typecheck && npx
# prettier` — which is the shape that actually happened. This reads the whole command line.
#
# What it is defending against: `npx <pkg>` silently downloads an arbitrary package and runs it
# against the repo. It does not read as "install", it reads as "run a command", and the tool result
# says so only after the fact: "The following package was not found and will be installed".
#
# Escape hatch is deliberate and narrow — install it first, then call it by name. That turns a
# network fetch into a reviewable dependency change.
set -euo pipefail

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

# Match only in COMMAND POSITION — start of line, or after a separator (&& || ; | newline, or an
# opening paren/brace). Matching the bare word anywhere blocks `git commit -m "drop the npx call"`,
# which the pipe-test caught: the first version refused the commit describing this very hook.
#
# The residual gap, stated rather than discovered: a separator inside a quoted string still reads as
# a separator here (`echo "a; npx b"` denies). Erring toward deny is the right way to be wrong for a
# control like this, and the message tells you how to proceed.
SEP='(^|&&|\|\||;|\||\(|\{|\n)[[:space:]]*'
if printf '%s' "$cmd" | grep -Eq "${SEP}(npx|bunx|uvx)([[:space:]]|\$)|${SEP}(pnpm|yarn|bun)[[:space:]]+dlx([[:space:]]|\$)|${SEP}pipx[[:space:]]+run([[:space:]]|\$)"; then
  jq -cn --arg c "$cmd" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Blocked: this fetches and executes a package from the network (" + $c + "). npx/bunx/uvx/dlx/pipx-run download an arbitrary package and run it against this repo — it reads like running a command, not installing one. If the tool belongs here, add it to the project and call it by name; that makes it a reviewable dependency change. If it is genuinely one-off, run it yourself in a terminal.")
    }
  }'
  exit 0
fi
exit 0
