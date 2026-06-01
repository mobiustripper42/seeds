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
both directions. **Upstream is aggregated:** all project → seeds backports
land in ONE seeds PR per nightly run. **Downstream is per-project:** seeds →
project propagation opens one PR per project. The PRs are the human review
surface; nothing merges automatically.

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

## Step 3 — Sync

**Direction ordering is load-bearing.** Run upstream (aggregated) first,
then downstream (per-project). This means every upstream backport lands
as a single seeds PR BEFORE the downstream pass runs, so a backport that
gets merged manually before the downstream pass starts will already be
visible to downstream forward-ports. (Routine sessions don't merge
anything themselves — but a human who merges the upstream PR mid-Routine
still sees the right ordering.)

**Per-repo error handling.** If a single repo's @sync-config invocation
errors out (clone failure, agent crash, push rejection, anything):
capture the error, abandon that repo's contribution to whichever branch
is in flight (`git reset --hard HEAD~1` if a commit was staged for that
repo; never push partial state from a crashed run), and continue to the
next repo. Surface the error in the Step 4 summary issue. One bad repo
never crashes the whole run.

### Step 3a — Upstream (project → seeds, aggregated into one PR)

The upstream pass produces **one** seeds PR per nightly run, aggregating
backports from every project in the active set. This replaces the prior
per-(repo × direction) PR model on the upstream side, which produced
inter-PR conflicts when two projects independently proposed changes to
the same seeds file (e.g., the 2026-05-30 case where crewbook PR #86
and crewculator PR #85 both targeted `dev/claude/docs/AGENTS.md`).

Skip Step 3a entirely if `directions:` in the config doesn't include
`upstream`.

1. In the seeds checkout, create a branch
   `{branch_prefix.upstream}/<DATE>` off `main` (no per-repo suffix —
   one branch covers all sources for this run).
2. For each repo in the active set (any stable order; alphabetical is
   fine):
   - Clone the project repo into the working dir at HEAD of its default
     branch (skip the clone if already present from a prior step).
   - Invoke @sync-config with:
     - `direction: push`
     - `mode: auto`
     - `source: <project-repo-path>`
     - `target: <seeds-checkout-path>`
   - The agent diffs project-live vs seeds-template — where the
     "template" already reflects any prior project's already-applied
     backports from earlier iterations of this loop — applies its
     classified backports, skips project-specific substitutions, and
     stages **one commit per source repo** titled
     `sync-config: push backport from <repo>`.
   - **Inter-source conflict handling falls out naturally.** Because
     each invocation diffs against the current state of seeds files in
     the working dir (with prior projects' backports already applied),
     a later project that would have proposed conflicting content on
     the same hunk now sees that hunk as Both-modified (its content vs
     the just-applied content from the prior project) and skips in
     `mode: auto`. Complementary hunks from different projects on the
     same file apply cleanly; literal conflicts on the same hunk
     resolve to "first project in iteration order wins, later projects
     skip with Both-modified."
   - Collect the agent's Step 3 classification table from each invocation
     for inclusion in the aggregated PR body. Tag every row with its
     source repo so the PR body can show per-source classifications.
3. After all active-set projects are processed:
   - If zero commits were staged across all projects (every source was
     already in sync with seeds): delete the branch and skip opening a
     PR.
   - Otherwise: push the branch and open ONE PR against
     `mobiustripper42/seeds:main` titled
     `{pr_title_prefix.upstream} — <DATE>` (no per-repo suffix). The PR
     body must include:
     - **Sources** — bulleted list. One line per active-set project:
       `- <repo>: <N> hunks backported, <M> skipped`. Projects that
       staged zero commits are marked `(no changes — already in sync)`.
     - **Per-source classification tables** — one subsection per source
       project (`#### <repo>`), each containing that project's
       @sync-config Step 3 table (`File | Hunk | Provenance |
       Classification | Action`). Omit subsections for sources that
       staged zero commits — the Sources list already notes them.
     - **Aggregated files changed** — flat list of every seeds-side file
       touched in the PR, deduplicated across sources. For files
       touched by more than one source, annotate `(touched by: <repo
       list>)` so reviewers can spot multi-source files at a glance.
     - **Pattern flags** — any flagged hunks with descriptions, each
       attributed to its source project.
     - **Skipped hunks** — aggregated across sources. Project-specific
       substitutions, Both-modified skips (explicitly include any
       inter-source conflicts: "Both-modified — same hunk as <prior
       repo>'s backport applied earlier this run"), Type-gated skips,
       Already-proposed skips with PR URLs.

**Per-source revertability.** The PR contains one commit per source
project. If a specific source's backports prove wrong, revert that
single commit with `git revert <sha>` — no need to revert the whole PR.
This preserves the per-source rollback property DEC-010's per-PR design
prized while eliminating the inter-PR conflict cost.

### Step 3b — Downstream (seeds → project, one PR per project)

The downstream pass remains one PR per project. Different projects
receive different forward-ports (because each project has different
gaps from the template), so aggregation provides no benefit and would
complicate per-project rollback.

Skip Step 3b entirely if `directions:` in the config doesn't include
`downstream`.

For each repo in the active set:

1. The project repo is already cloned (from Step 3a, or clone it
   fresh if upstream was skipped).
2. **Resolve PR base for this project.** Always the project's default
   branch — the active trunk (DEC-022):
   ```
   BASE=$(git -C <project-repo-path> remote show origin | sed -n 's/.*HEAD branch: //p')
   [ -z "$BASE" ] && BASE=main
   ```
   Downstream PRs always target the trunk the project is actually worked
   on. **Never target a `production` branch** — it is a downstream deploy
   pointer, not a dev branch. (DEC-008 once targeted `staging` here; that
   was the read-source/PR-target split that produced the sailbook noise
   loop — the routine read the default branch but PR'd into `staging`,
   so a stale-vs-active branch gap was re-proposed as drift every night.
   DEC-022 retired it: trunk = default branch = what we diff and target.)
3. In the project checkout, create a branch
   `{branch_prefix.downstream}/<DATE>` off `$BASE`.
4. Invoke @sync-config with:
   - `direction: pull`
   - `mode: auto`
   - `source: <seeds-checkout-path>`
   - `target: <project-repo-path>`
5. The agent diffs seeds-template vs project-live, forward-ports template
   improvements into the project, preserves project-specific substitutions,
   and stages one commit titled `sync-config: pull propagate from seeds`
   (see the agent file for the literal commit-message format —
   `<direction>` in the agent's contract is the literal word `push` or
   `pull`).
6. If the agent staged no commits, delete the branch and move on.
7. Otherwise: push the branch to the project repo, open a PR against
   `$BASE` titled `{pr_title_prefix.downstream} — <DATE>`. The PR body
   includes the same sections as the upstream PR's per-source table (the
   single project here is the "source") plus a `Base: <BASE>`
   note so the reviewer can confirm the trunk was targeted.

## Step 4 — Per-run summary issue

After all repos are processed, upsert a single issue on
`mobiustripper42/seeds` titled `routine: last run <DATE>` with:

- Active set (size + repos).
- Skipped (with reasons) — config-excluded, missing seeds-version, archived.
- Migration backlog (if any).
- PRs opened — link the single aggregated upstream PR (if any) and each
  per-project downstream PR.
- Pattern flags surfaced across repos (deduplicated, with source
  attribution).
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
