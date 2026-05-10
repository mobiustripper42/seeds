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

Runs nightly. For every project repo this Routine has access to, runs
`@sync-config` in both directions (upstream and downstream) and opens a PR
per (repo × direction) with the proposed changes.

**Active-set source of truth:** the Routine form's repo chip area on
claude.ai — *not* `routine-config.yaml`. Adding a project to the active set
= add it to the form's chip area (and toggle the per-repo "Allow
unrestricted git push" Permissions toggle for it). Removing = remove the
chip. No edits to `routine-config.yaml` are needed for either operation.

**Config file:** `seeds/.claude/routine-config.yaml` carries the
**filter** rules (exclude list — at minimum `mobiustripper42/seeds`
itself — and `require:` block) and the **direction** config (which sync
directions to run, per-direction PR + branch prefixes). It does NOT carry
an `orgs:` list or active-repo list — see DEC-010 for the post-mortem.

**Schema-version gating:** repos on a different `seeds-version` than seeds
itself are skipped and rolled into a single `routine: migration backlog`
issue on `mobiustripper42/seeds`. They rejoin the active set the run after
they migrate.

**Provenance labeling:** `@sync-config` Step 3 tags each diff hunk with
`Project-only` / `Template-only` / `Both-modified` (Step 2 hunk rubric)
or `Type-gated` (whole-file scoping per DEC-011 — file dropped because
the project's `.claude/project-type` doesn't match the manifest's
allowed list). Every PR body the Routine opens shows where each change
came from at a glance. See the agent file
(`<seeds>/dev/claude/agents/sync-config.md` § Step 1 + Step 2) for the
full classification rubric.

## Deploying a Routine (one-time per Routine)

The form on claude.ai is one combined screen, not a wizard. Walk through
top-to-bottom:

1. On claude.ai, run the `/web-setup` skill flow to reach the Routines
   configuration UI.
2. Pick **Remote** when asked Local vs Remote. Local = scheduled task on
   your laptop (requires the desktop app running); Remote = runs on
   Anthropic's cloud, unattended, subject to the Pro plan's 5 runs/day cap.
   Nightly multi-repo sync needs Remote.
3. **Name:** `seeds nightly sync` (or whatever you'll recognize at 3am).
4. **Instructions (prompt body):** paste everything below the top `---`
   separator from `nightly-sync.md`.
5. **Model:** **Sonnet** (default workhorse for repetitive diff/PR work). The
   form may default to a different model — switch it. Opus on a nightly
   Routine is real money for no benefit on this kind of task.
6. **Repositories:** add `mobiustripper42/seeds` (the Routine clones seeds
   to read its config). Then add each project repo you want this Routine
   to sync — one chip per active project. Adding a repo here is the active-
   set source of truth.
7. **Environment:** **Default** (provides the internet access the Routine
   needs for git clone and GitHub API calls).
8. **Trigger:** **Daily** at off-hours in your local timezone (e.g.
   `2:00 AM`). Form converts to UTC.
9. **Connectors / Behavior / Permissions** (tabs at the bottom):
   - **Connectors:** leave the GitHub connector enabled; remove any
     unrelated connectors (Slack, Linear, etc.) the Routine doesn't need.
   - **Permissions:** toggle **"Allow unrestricted git push"** ON for every
     repo in the chip area. The Routine pushes to branches matching the
     `branch_prefix` values in `routine-config.yaml` (e.g.
     `auto-sync/upstream/...`); without unrestricted push the default
     `claude/*`-only allowlist will reject those.
10. Click **Create**.

After save, click **Run now** on the routine's detail page once to verify
the setup works before the schedule kicks in. Then check
`mobiustripper42/seeds` for the `routine: last run <DATE>` issue — body is
replaced each run, so if you want to see prior-run history use the issue's
edit log.

## Updating a Routine

When you edit a `.md` file in this directory:

1. Open a PR with the prompt change.
2. After the PR merges, copy the new prompt body (everything below the top
   `---` separator) into the Routine's config on claude.ai. **This step is
   manual.** There's no automated sync — claude.ai doesn't read prompts
   from a git URL.
3. Note the update in the PR description so future-you knows to check.

## Backing out a Routine

To pause a Routine without deleting it: disable the schedule in claude.ai.
The prompt + repo grants stay; nothing fires until you re-enable.

To remove permanently: delete it in claude.ai and remove the corresponding
`.md` file here in a follow-up PR.
