# seeds

Personal templates and workflow tooling for Claude Code projects. Two families:

- **`dev/`** — software development projects (Next.js + Supabase shape, session lifecycle skills, agent workflow)
- **`domain/`** — non-dev domains (bread, tomatoes, ops workflows, etc.) — aspirational; populated as domains get scaffolded

## `dev/`

### `dev/bash/`
- `aliases.sh` — shell aliases for Claude Code workflows

### `dev/claude/`
- `CLAUDE.md` — project CLAUDE.md template (fill in project-specific sections)
- `settings.json` — **master Claude Code permission policy** (default-allow + deny guardrail). Source of truth; distributed by hand — see § Permission settings (DEC-S023).
- `session-log.md` — blank session log (copy to project root)
- `agents/` — Claude Code agent definitions (copy to `.claude/agents/` in your project)
  - `architect.md` — architectural decision reviewer
  - `code-review.md` — post-commit code reviewer
  - `pm.md` — project manager / velocity tracker
  - `ui-reviewer.md` — visual design reviewer (fill in your design system details)
  - `tape-reader.md` — session transcript observer; writes to seeds, edits nothing locally
- `skills/` — session lifecycle slash commands (copy to `.claude/skills/` in your project)
  - `its-alive/` — session start ritual
  - `kill-this/` — session end part 1 (build, commit, draft log)
  - `its-dead/` — session end part 2 (finalize log, push, PM check)
  - `pause-this/` — mid-session pause with WIP commit
  - `restart-this/` — resume from pause
  - `read-the-tape/` — audits a session transcript, writes one observation to seeds
- `docs/` — project document templates (copy to `docs/` in your project)
  - `AGENTS.md` — agent and skill reference (adapt project name/details)
  - `SPEC.md` — product specification template
  - `DECISIONS.md` — architectural decisions log (starts with standard DEC-001–004)
  - `USER_STORIES.md` — user story template
  - `BRAND.md` — brand and visual direction template
  - `PROJECT_PLAN.md` — project plan with Phase 0 pre-filled
  - `RETROSPECTIVES.md` — phase-end retrospective template (velocity, scope, forecast)
  - `VELOCITY_AND_POKER_GUIDE.md` — estimation method and velocity tracking

## `domain/`

Non-dev domain templates. Nothing here yet — populated as domains get scaffolded. Starting with bread.

## Setup (new dev project)

1. **Project docs** — copy `dev/claude/docs/` contents to `docs/` in your project root. Fill in all `[Project Name]` and `[placeholder]` fields.
2. **Session log** — copy `dev/claude/session-log.md` to your project root. Update the header.
3. **CLAUDE.md** — copy `dev/claude/CLAUDE.md` to your project root. Fill in all project-specific sections.
4. **Agents** — copy `dev/claude/agents/` to `.claude/agents/` in your project root. Update `description:` frontmatter with your project name.
5. **Skills** — copy `dev/claude/skills/` directories to `.claude/skills/` in the project root (project-level install, not global).
6. **Shell alias** — source `dev/bash/aliases.sh` from `~/.bashrc` and add a project-specific alias (see comments in the file).

After setup, run `/its-alive` in the new project to start your first session.

## Setup (new machine)

Per box, once. Everything below lives outside any repo, so none of it arrives by `git pull`.

```
git clone git@github.com:mobiustripper42/seeds.git          # 1. nothing reports until seeds is here
cd seeds
node dev/claude/scripts/settings-policy.mjs                 # 2. names everything that's missing
```

Step 2 is the checklist — it reports each item below as absent and prints the fix. Work through what it says:

| # | What | How |
|---|---|---|
| 1 | **Permissions + `outputStyle`** | `node dev/claude/scripts/settings-policy.mjs --write ~/.claude/settings.json` — merges the master's `permissions` and `outputStyle` into `~/.claude/settings.json`, preserving every other key. **Never `cp` the master over that file.** |
| 2 | **Dev handle** | `echo <yourhandle> > ~/.claude/devname` — one line, used in session filenames so two machines never collide |
| 3 | **Capture hook** | Copy `dev/claude/scripts/tape-capture.sh` to `~/.claude/`, `chmod +x`, then wire a `SessionEnd` hook in `~/.claude/settings.json` pointing at it. Full steps in § Learning loop below. Not repaired by `--write` |

Re-run step 2 until it prints `Current.` **Permissions and `outputStyle` are read once at launch**, so start a new session before trusting the result.

After that, `/its-alive` Step 8.6 runs the same check every session in any repo carrying the current skill — the machine reports on itself from then on.

**Windows:** `~/.claude` is `%USERPROFILE%\.claude`. Node runs natively, no WSL needed.

## Permission settings (DEC-S023)

**Posture: default-allow.** `dev/claude/settings.json` is the **master** — `allow` carries `Bash(*)`, and the **deny list is the only seatbelt** (`deny` beats `allow`, so dangerous/secret commands are blocked and everything else runs without prompting). Use `defaultMode: default`, never `bypassPermissions` (that turns the deny list off too).

### The four levels, by their documented names

"Global" is not a Claude Code term and this README used to invent it. The levels, highest precedence first:

| Level | Path | Scope | In git? |
|---|---|---|---|
| Managed | `managed-settings.json` (MDM) | your org | n/a |
| Command line | `claude --settings` | one session | no |
| **Project local** | `<repo>/.claude/settings.local.json` | you, this repo | no — gitignored |
| **Shared project** | `<repo>/.claude/settings.json` | everyone in the repo | **yes** |
| **User** | `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`) | you, every project on this box | no |

**There is no user-level local file.** The policy belongs in **user** and **shared project**; per-project exceptions go in **project local**, which is why the master comparison can be strict.

### Distribution (DEC-S051)

Still by hand, but it now tells you when it is needed and repairs itself safely:

```
node dev/claude/scripts/settings-policy.mjs --all .      # check both levels for this repo + box
node dev/claude/scripts/settings-policy.mjs --write <path>
```

`/its-alive` Step 8.6 runs the check at session start, so **every machine checks itself, every session** — there is no fleet ledger to maintain and nothing to remember. A machine you are not sitting at cannot be read (DEC-S044) and is also the one you cannot fix.

> ⚠ **Never `cp` the master over a user settings file.** The master has one top-level key; a real settings file has several. That copy destroyed mill-dev's `SessionEnd` capture hook, its theme and its effort level, and went unnoticed for four days. `--write` replaces the `permissions` key, preserves every other key, and backs the file up first.

**Why the committed file earns its place** (DEC-S023, rationale updated DEC-S051): it is the only policy that **travels with the repo**. A fresh machine — or bee-grace before its user settings were installed — has no user-level file at all, and the committed one stands in until someone sets it up. Seven repos were in exactly that state.

It used to be justified as the only policy a browser/web session gets, since a session running on Anthropic's hardware has no user settings file. That scenario no longer arises here: repo-backed work goes through Remote Control, which drives a session on one of the three machines above and inherits that machine's user settings.

Permissions are read once at launch, so a repair applies at the **next** session, not the running one.

### Learning loop — the capture hook (DEC-S045)

The `SessionEnd` hook that feeds `/read-the-tape --queue` goes in **user settings only**, and rides the same hand-distribution as the policy above. It must **not** go in a repo's committed `.claude/settings.json`: that file reaches the cloud container, which has no durable filesystem and no seeds checkout, so the hook there would fire on every session to no effect.

Install:

```
cp dev/claude/scripts/tape-capture.sh ~/.claude/tape-capture.sh
chmod +x ~/.claude/tape-capture.sh
```

Then add to `~/.claude/settings.json` alongside `permissions` (not inside it):

```json
"hooks": {
  "SessionEnd": [
    { "hooks": [ { "type": "command", "command": "/home/eric/.claude/tape-capture.sh" } ] }
  ]
}
```

**Absolute path, not `~`.** Tilde expansion in a hook `command` is not something the docs promise, and every failure mode here is silent — a hook that never resolves looks exactly like a hook that fires and finds nothing.

No `matcher` — every `reason` should capture. Needs `jq`; without it the script exits silently, which is the correct behaviour for a hook that must never block a session and the reason the queue filling up is the only signal that capture works. **Check it occasionally:** `wc -l ~/.claude/tape-queue/index.jsonl`.

Per machine:

| Where | Install | Note |
|-------|---------|------|
| **mill-dev** | done 2026-08-14 | `/home/eric/.claude/tape-capture.sh` |
| **bee-grace** | same steps | adjust the absolute path if the home dir differs |
| **windows laptop** | `%USERPROFILE%\.claude\settings.json` | the script is bash — needs Git Bash or WSL, and the `command` must be a path that shell can run. Untried; expect to adjust it |
| **phone (CC on web)** | **not applicable** | no editable global, and the container's filesystem dies with the session. Nothing to capture and nowhere to keep it |

> ⚠ **Coverage is partial and will look complete.** This captures sessions that end on a machine with a durable filesystem. Cloud-container sessions (phone, web) cannot be captured at all — the container dies with the session — and a box without the hook installed captures nothing. As of 2026-08-14 the session log shows 12 of 18 sessions ran in cloud containers. A green queue is not full coverage; it is coverage of the boxes you installed it on.

**Changing the policy.** Don't fiddle with `/permissions` per-machine. The recurring trigger is never a simple missing command (default-allow covers those) — it's something gnarly that got denied. Bring it to a Claude session in seeds: it edits the master and hands you the redistribute steps above.

**Cleaning up `.claude/settings.local.json`** (per-repo, gitignored — accumulates "always allow" entries). Under default-allow most become redundant. Paste this into a CC session in any repo to prune it (preserves your personal denies):

```
Clean up this repo's .claude/settings.local.json.
1. Read it and show me the current contents.
2. Under our posture (global ~/.claude/settings.json allows Bash(*); the master deny
   list is the guardrail), flag each entry: REDUNDANT (allow already covered by global
   Bash(*) → remove); STALE (allow for something the master now DENIES → remove);
   KEEP (any `deny` I added here → do NOT touch); UNCLEAR (leave it, ask me).
3. Show the proposed cleaned file. Wait for my OK before writing.
4. On OK: write it, confirm valid JSON. If everything was removable, leave
   {"permissions":{}} rather than deleting the file.
```

## Moving improvements between seeds and a project

**By hand, one file at a time** (DEC-S040). There is no sync skill and no classifier — `/pull-seeds`, `/push-seeds`, and `@sync-config` were all retired once it became clear the projects differ more than they agree, and that choosing which file should cross is the part that needs a person.

Before copying, check `.claude/routine-config.yaml` § `file-classes`: `logic` files are identical everywhere and safe to `cp` wholesale, `context` files are project-owned and must never be copied, `hybrid` means copy the shell only, `presence` must exist in every project but is never compared (DEC-S044), and `seeds-only` never leaves this repo. `.claude/type-manifest.yaml` says which files a given project type doesn't want.

What a session *reveals* by going wrong travels a different route — see `docs/SPECS/2026-08-workflow-learning-loop.md`.
