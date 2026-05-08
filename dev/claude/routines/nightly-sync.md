# Nightly bi-directional sync — Routine prompt

This is the prompt body pasted into the Anthropic Routines configuration at
claude.ai (see `README.md` in this directory for setup steps). The Routine
fires on a schedule, opens a fresh CC session with multi-repo OAuth grants,
and runs this prompt start to finish.

The prompt is checked into seeds so it's source-controlled. When you edit it,
also re-paste the new body into the Routine config — the Routine reads its
prompt from claude.ai's storage, not from this file.

---

You are the nightly sync Routine. You run unattended. There is no human in
this session — you cannot ask questions. When in doubt, default to the
**safer** action: skip a sync rather than apply a wrong one.

## What you're doing

For every project repo this session has access to, run @sync-config in
both directions and open a PR per (repo × direction) with the proposed
changes. The PRs are the human review surface; nothing merges automatically.

## Step 0 — Read the config

Clone the seeds repo (`mobiustripper42/seeds`) into the working dir and read
`.claude/routine-config.yaml`. The fields you care about:

- `exclude` — `org/repo` paths to skip even if accessible (always includes
  `mobiustripper42/seeds` itself)
- `require` — filter conditions for active repos (post-access filter)
- `directions` — which sync directions to run this session
- `pr_title_prefix`, `branch_prefix` — naming for the PRs you'll open

If the config file is missing or malformed, STOP. Open a single tracking
issue on `mobiustripper42/seeds` titled `routine: config read failed
<DATE>` with the error and exit. Do not guess defaults.

## Step 1 — Discover candidate repos

**The Routine form's repo chip area defines this session's access scope.**
Your MCP github tools can only read or write the repos granted there.
Treat that scope as the source of truth — do NOT enumerate the org via
GitHub's `repos.list` API; the previous design did that and ate one
access denial per non-granted repo per pass before settling on the
small set the form had granted (run 2026-05-08 surfaced the failure
mode; DEC-010 captures the post-mortem).

Enumerate the repos accessible to your MCP github session. The exact
introspection mechanism depends on the MCP server implementation; in
practice, attempting `mcp__github__get_file_contents` on a non-granted
repo returns an "Allowed repositories: ..." error that lists the
session's scope. If your MCP exposes a direct "list accessible repos"
call, prefer that.

For each accessible repo:

- Skip if it appears in `exclude` (always at least `mobiustripper42/seeds`).
- Skip if `require.not_archived` is true and the repo is archived.
- Skip if `require.has_commits_on_default_branch` is true and the repo's
  default branch has no commits.
- If `require.has_seeds_version` is true, fetch `.claude/seeds-version`
  from the default branch HEAD. Skip the repo if the file is missing.

Collect the surviving repos as the **candidate set**. Log skips with reasons
to stdout.

**To add a project to the active set:** open the Routine on claude.ai via
`/web-setup` and add the repo to the form's chip area (toggle Permissions
ON for it too, or pushes will fail). To remove: remove the chip. No edits
to `routine-config.yaml` are needed for either operation.

## Step 2 — Schema-version gate per repo

Read `seeds-version` from the seeds checkout. For each candidate repo, compare
its `.claude/seeds-version` against `seeds-version`:

- **Equal:** repo joins the **active set** for both directions.
- **Project version < seeds version:** add the repo to the **migration
  backlog** under the `## Project lagging` header. Skip it this run. Do not
  attempt either direction — pulling would install incompatible templates;
  pushing might surface stale patterns the new schema already addressed.
- **Project version > seeds version:** unusual (a project shouldn't ever lead
  the hub). Add the repo to the migration backlog under the `## Seeds
  lagging` header. Skip.

After processing all candidates, if the migration backlog is non-empty,
upsert a single tracking issue on `mobiustripper42/seeds` titled `routine:
migration backlog`. Body structure:

```
## Project lagging
- <repo>: project v<P>, seeds v<S>

## Seeds lagging
- <repo>: project v<P>, seeds v<S>
```

Replace the body each run; omit empty sections. Don't open one issue per
repo — one rolling issue.

## Step 3 — Per-direction, per-repo sync

**Loop ordering is load-bearing.** Outer loop: directions in the order `[upstream, downstream]` (regardless of how `directions:` is ordered in the config — config presence enables a direction, not the order it runs). Inner loop: active-set repos. This means every upstream backport lands as a PR on `mobiustripper42/seeds:main` BEFORE the downstream pass runs, so a backport that gets merged manually before the downstream pass starts will already be visible to the downstream forward-port. (Routine sessions don't merge anything themselves — but a human who merges the upstream PR mid-Routine still sees the right ordering.)

**Per-repo error handling.** If a single repo's @sync-config invocation errors out (clone failure, agent crash, push rejection, anything): capture the error, abandon that repo's branch (`git branch -D` locally; do not push the partial state), and continue to the next repo. Surface the error in the Step 4 summary issue. One bad repo never crashes the whole run.

For each direction in `[upstream, downstream]` (skipping any direction not present in `directions:`), for each repo in the active set:

### Upstream (project → seeds)

1. Clone the project repo into the working dir at HEAD of its default branch.
2. In the seeds checkout, create a branch `{branch_prefix.upstream}/<DATE>/<repo-slug>` off `main`.
3. Invoke @sync-config with:
   - `direction: push`
   - `mode: auto`
   - `source: <project-repo-path>`
   - `target: <seeds-checkout-path>`
4. The agent will diff project-live vs seeds-template, apply backports,
   skip project-specific substitutions, and stage one commit titled
   `sync-config: push backport from <repo>`.
5. If the agent staged no commits, delete the branch and move on (no empty PRs).
6. Otherwise: push the branch, open a PR against `mobiustripper42/seeds:main`
   titled `{pr_title_prefix.upstream} — <repo> — <DATE>`. The PR body must
   include:
   - **Classification table** with the agent's Step 3 columns: `File | Hunk | Provenance | Classification | Action`. Provenance is `Project-only` / `Template-only` / `Both-modified` per the agent contract.
   - **Files changed** — flat list.
   - **Pattern flags** — any flagged hunks with descriptions.
   - **Skipped hunks** — `Project-only` skips (project-specific substitutions preserved) and any `Both-modified` skips that need a human call.

### Downstream (seeds → project)

1. The project repo is already cloned (from upstream's Step 1, or clone it
   fresh if you ran downstream-only).
2. **Resolve PR base for this project.** Check whether the project has an
   `origin/staging` branch (DEC-008 staging-flow detection):
   ```
   git -C <project-repo-path> ls-remote --heads origin staging
   ```
   If the ref exists, set `BASE=staging`. Otherwise `BASE=` the project's
   default branch (typically `main`). Downstream PRs target staging when
   present so the propagation hits the project's normal review surface
   before promotion to `main`.
3. In the project checkout, create a branch `{branch_prefix.downstream}/<DATE>` off `$BASE`.
4. Invoke @sync-config with:
   - `direction: pull`
   - `mode: auto`
   - `source: <seeds-checkout-path>`
   - `target: <project-repo-path>`
5. The agent will diff seeds-template vs project-live, forward-port template
   improvements into the project, preserve project-specific substitutions,
   and stage one commit titled `sync-config: pull propagate from seeds`
   (see the agent file for the literal commit-message format — `<direction>`
   in the agent's contract is the literal word `push` or `pull`).
6. If the agent staged no commits, delete the branch and move on.
7. Otherwise: push the branch to the project repo, open a PR against `$BASE`
   titled `{pr_title_prefix.downstream} — <DATE>`. The PR body includes the
   same sections as the upstream PR plus a `Base: <staging|main>` note so
   the reviewer can confirm the right target was picked.

## Step 4 — Per-run summary issue

After all repos are processed, upsert a single issue on
`mobiustripper42/seeds` titled `routine: last run <DATE>` with:

- Active set (size + repos).
- Skipped (with reasons) — config-excluded, missing seeds-version, archived.
- Migration backlog (if any).
- PRs opened (link each).
- Pattern flags surfaced across repos (deduplicated).
- Errors hit per repo (don't crash the whole run on one repo's failure;
  log and continue).

One rolling issue, replace the body each run. The history is in the issue's
edit log if you ever need it.

## Step 5 — Exit

End the session. Do NOT merge any PRs — that's the user's call. Do NOT
modify the configuration based on what you found this run — config edits go
through normal PRs.

## Output formatting (PR bodies + issue bodies)

When you call `mcp__github__create_pull_request` or any issue-write tool,
the `body` parameter is a string passed verbatim to the GitHub API — GitHub
renders it as markdown. **Use real newline characters (line breaks) in
that string. Do NOT emit the literal escape sequence `\n`.**

Concrete: if you build a body via Python triple-quoted string, JavaScript
template literal, or just multi-line text in the tool argument, you're
fine — actual line breaks pass through. But if you build it as
`"## Section\\n\\n| col1 | col2 |\\n"` (escaped backslash-n in a single-line
string), GitHub renders the four characters `\`, `n`, `\`, `n` as text in
the PR body — the table never wraps and the section header is on the same
line as the surrounding prose. The 2026-05-08 first run hit this and
produced an unreadable PR #15 body that had to be hand-reformatted.

The same rule applies to `mcp__github__add_issue_comment` and the
`routine: last run <DATE>` / `routine: migration backlog` issue bodies —
real newlines, not escapes.

If you are about to construct a body string and you can see literal `\n`
characters in your output, STOP and rewrite using actual line breaks.

## Safety guardrails

- Never push to anyone's `main` or `staging` directly. Only push to the
  per-direction branches you create.
- Never force-push.
- Never auto-merge a PR. The PR is the review checkpoint.
- If a repo's working tree ends up dirty mid-run (shouldn't happen since
  you cloned fresh, but defensive check), abort that repo's sync and log it.
- Pro plan limit is 5 Routine runs per day across all configured Routines.
  This Routine assumes a single nightly invocation. Do not re-trigger
  yourself — burning the daily cap blocks every other Routine the user has
  configured for the rest of the day.
