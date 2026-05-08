# Anthropic Routines for seeds

This directory holds source-controlled prompt bodies for scheduled
[Anthropic Routines](https://claude.ai/) that run against this workflow.

A Routine is a scheduled CC session: configured once via the `/web-setup`
skill flow on claude.ai, it fires on its schedule, opens an unattended CC
session with the configured prompt + GitHub OAuth grants, and exits. Pro
plan limit is 5 runs per day across all your Routines (DEC-010).

## Why prompts live here

The Routine actually runs from prompt text stored in claude.ai — not from
this repo. But keeping the canonical prompt under version control means:

- Prompt changes flow through PRs like any other code change.
- The Routine's behavior is reviewable in `git log`.
- If the claude.ai-stored prompt drifts (someone hand-edits in /web-setup),
  diffing against this file flags the drift.

When a Routine prompt changes here, copy the new body into the Routine config
on claude.ai. There's no automated push; do it as the last step of merging
the PR.

## Routines defined here

### `nightly-sync.md` — bi-directional sync (DEC-010)

Runs nightly. For every active project repo in the configured org list, runs
@sync-config in both directions (upstream and downstream) and opens a PR per
(repo × direction) with the proposed changes.

**Config file it reads:** `seeds/.claude/routine-config.yaml`. Edit that to
add/remove orgs, exclude repos, or toggle directions.

**Schema-version gating:** repos on a different `seeds-version` than seeds
itself are skipped and rolled into a single `routine: migration backlog`
issue on `mobiustripper42/seeds`. They rejoin the active set the run after
they migrate.

## Deploying a Routine (one-time per Routine)

1. On claude.ai, run the `/web-setup` skill flow to reach the Routines
   configuration UI.
2. Create a new Routine. Set:
   - **Name:** `seeds nightly sync` (or whatever you'll recognize at 3am).
   - **Schedule:** nightly, off-hours for your timezone.
   - **Repo OAuth grants:** check every org listed in `routine-config.yaml`'s
     `orgs:`. Without the grant, the Routine can list repos but can't push
     branches or open PRs.
3. Paste the prompt body from `nightly-sync.md` (everything below the `---`
   separator at the top) into the Routine's prompt field.
4. Save. The first run will fire at the next scheduled tick.
5. After the first run, check `mobiustripper42/seeds` for the
   `routine: last run <DATE>` issue. The body summarizes what happened.

## Updating a Routine

When you edit a `.md` file in this directory:

1. Open a PR with the prompt change.
2. After the PR merges, copy the new prompt body into the Routine's config on
   claude.ai. **This step is manual.** There's no automated sync — claude.ai
   doesn't read prompts from a git URL.
3. Note the update in the PR description so future-you knows to check.

## Backing out a Routine

To pause a Routine without deleting it: disable the schedule in claude.ai.
The prompt + OAuth grants stay; nothing fires until you re-enable.

To remove permanently: delete it in claude.ai and remove the corresponding
`.md` file here in a follow-up PR.
