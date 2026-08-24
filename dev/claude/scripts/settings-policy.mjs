#!/usr/bin/env node
/**
 * settings-policy.mjs — is this machine's (or this repo's) permission policy current,
 * and repair it without destroying everything else in the file.
 *
 * DEC-S023 makes `dev/claude/settings.json` the master permission policy and distributes it
 * BY HAND, per machine and per repo. Nothing tracked what had actually been distributed. The
 * measured state on 2026-08-22: four generations live across seventeen checkouts, seven of them
 * on a policy with no secret denies at all, four with no file.
 *
 * DEC-S044 concluded that the user settings file "is not in any checkout, so nothing enumerates
 * it and nothing ever will." That is true of machines you are NOT on, and false of the one you
 * are sitting at — which is the only one you can fix anyway. This reads it directly.
 *
 * WHY --write EXISTS, AND WHY IT IS NOT `cp`. The master has exactly one top-level key,
 * `permissions`. A real user settings file has more — on mill-dev: hooks, enabledPlugins,
 * effortLevel, tui, theme, agentPushNotifEnabled. Copying the master over it destroys six of
 * seven. That is not hypothetical: it killed the SessionEnd capture hook on mill-dev for four
 * days, along with the theme and the effort level, and was recovered from a stray backup file.
 * `--write` replaces the `permissions` key and touches nothing else.
 *
 * THE COMPARISON IS STRICT, AND THAT IS A CHOICE. `permissions` must deep-equal the master's.
 * A tolerant check cannot tell a deliberate local addition from a stale entry nobody cleaned up,
 * which is the entire problem this script exists for. Per-project exceptions belong at
 * `.claude/settings.local.json` (level 3, gitignored, highest of the levels you control).
 * There is no user-level local file — the documented levels are managed > command line >
 * project local > shared project > user.
 *
 * Read-only unless --write is passed. Never edits the master.
 *
 * Usage:
 *   node settings-policy.mjs                      # check ~/.claude/settings.json
 *   node settings-policy.mjs --repo [path]        # check <repo>/.claude/settings.json
 *   node settings-policy.mjs --all [path]         # check both, for one repo
 *   node settings-policy.mjs --write [target]     # merge the policy into a target
 *   node settings-policy.mjs --seeds /path/to/seeds ...
 *
 * Exit: 0 = current; 1 = stale, absent or unreadable; 2 = usage error.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const die = (msg) => {
  console.error(`settings-policy: ${msg}`)
  process.exit(2)
}

const argv = process.argv.slice(2)
let seedsArg = null
let mode = 'user'
let writeTarget = null
const positional = []

/**
 * Mode flags are mutually exclusive and `--write` REQUIRES an adjacent target. Both rules exist
 * because the first version had neither, and a review demonstrated the consequence on a real
 * machine rather than in the abstract:
 *
 *   `--write --seeds /path`, `--all --write`, `<path> --write`  → wrote ~/.claude/settings.json
 *   `--write --repo /path`                                      → silently ran a CHECK instead
 *
 * The first shape is the bad one: the single file this script exists to protect is the one a
 * misordered flag reaches. A default target is a convenience worth exactly nothing here — the
 * check's own output prints the full `Fix:` command with the path already in it.
 */
let modeFlag = null
const setMode = (m, flag) => {
  if (modeFlag && modeFlag !== flag) die(`${modeFlag} and ${flag} cannot be combined — pick one`)
  modeFlag = flag
  mode = m
}

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--seeds') seedsArg = argv[++i] ?? die('--seeds needs a path')
  else if (a === '--repo') setMode('repo', '--repo')
  else if (a === '--all') setMode('all', '--all')
  else if (a === '--write') {
    setMode('write', '--write')
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) die('--write needs a target path immediately after it, e.g. --write ~/.claude/settings.json')
    writeTarget = argv[++i]
  } else if (a.startsWith('--')) die(`unknown flag ${a}`)
  else positional.push(a)
}

/**
 * The master is found relative to THIS FILE, not the working directory. The script is run from
 * whatever repo you happen to be in — that is the point — so cwd says nothing about where seeds
 * is. `--seeds` and the sibling/env fallbacks exist for the case where the script has been copied
 * somewhere else, which it should not be: it is seeds-only.
 */
function findSeeds() {
  const here = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..')
  for (const c of [seedsArg, here, join(process.cwd(), '..', 'seeds'), process.env.SEEDS_REPO]) {
    if (c && existsSync(join(c, 'dev', 'claude', 'settings.json'))) return resolve(c)
  }
  die('cannot find seeds. Pass it: --seeds /path/to/seeds')
}

const SEEDS = findSeeds()
const MASTER = join(SEEDS, 'dev', 'claude', 'settings.json')
const USER_SETTINGS = join(homedir(), '.claude', 'settings.json')
const repoRoot = resolve(positional[0] ?? process.cwd())
const REPO_SETTINGS = join(repoRoot, '.claude', 'settings.json')

const readJson = (p) => {
  try {
    return { ok: true, value: JSON.parse(readFileSync(p, 'utf8')) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

const master = readJson(MASTER)
if (!master.ok) die(`cannot read the master policy at ${MASTER} — ${master.error}`)
const masterPerms = master.value.permissions ?? die(`${MASTER} has no "permissions" key`)

/**
 * Stable, order-insensitive comparison. A reordered deny list is not a policy change — and
 * neither is a duplicated entry, so arrays are deduped too. Without the dedupe, a file with a
 * repeated rule reported STALE while `describe()` (Set-based) had nothing to name, printing a
 * failure with a blank explanation.
 */
const canon = (v) =>
  Array.isArray(v)
    ? [...new Set(v)].sort()
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v

const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b))

/**
 * What differs, in the terms a person fixing it needs: which rules are missing here, which are
 * here and not in the master, and which scalar settings disagree. "3 entries differ" sends you
 * to a diff; naming them means you can decide without one.
 */
function describe(theirs) {
  const lines = []
  for (const key of ['allow', 'deny']) {
    const m = new Set(masterPerms[key] ?? [])
    const t = new Set(theirs[key] ?? [])
    const missing = [...m].filter((x) => !t.has(x))
    const extra = [...t].filter((x) => !m.has(x))
    if (missing.length) lines.push(`      missing ${missing.length} ${key}: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ` … +${missing.length - 4}` : ''}`)
    if (extra.length) lines.push(`      extra ${extra.length} ${key}: ${extra.slice(0, 4).join(', ')}${extra.length > 4 ? ` … +${extra.length - 4}` : ''}`)
    const dupes = (theirs[key] ?? []).filter((x, i, a) => a.indexOf(x) !== i)
    if (dupes.length) lines.push(`      note: ${dupes.length} duplicate ${key} entr${dupes.length === 1 ? 'y' : 'ies'} — harmless, not why this is stale`)
  }
  const keys = new Set([...Object.keys(masterPerms), ...Object.keys(theirs)])
  for (const k of keys) {
    if (k === 'allow' || k === 'deny') continue
    if (!same(masterPerms[k], theirs[k])) lines.push(`      ${k}: ${JSON.stringify(theirs[k])} — master has ${JSON.stringify(masterPerms[k])}`)
  }
  return lines
}

/**
 * `outputStyle` is checked at the USER level only, and nowhere else.
 *
 * It is the one non-permission key with a single fleet-wide right answer: it sets register
 * (DEC-S050) and that is a workflow decision, not a per-machine taste. `theme`, `effortLevel`,
 * `tui` and `enabledPlugins` are taste and have no fleet value. `hooks` would be one — except the
 * capture hook's command is an absolute path that differs per machine (`/home/eric/…` here,
 * `/home/estoffer/…` on bee-grace), so it cannot be a single shared value and is not attempted.
 *
 * User level only because a machine preference belongs on the machine: one edit covers every repo
 * on the box and a new checkout inherits it. Putting it per-repo was the mistake this check exists
 * to stop repeating.
 */
function outputStyleProblem(doc) {
  const want = master.value.outputStyle
  if (!want) return null
  const got = doc.outputStyle
  if (got === want) return null
  return got === undefined
    ? `      outputStyle: not set — master expects ${JSON.stringify(want)}`
    : `      outputStyle: ${JSON.stringify(got)} — master expects ${JSON.stringify(want)}`
}

/**
 * The `SessionEnd` capture hook (DEC-S045), checked at the USER level only — it must never go in a
 * repo's committed settings, which would install it everywhere to no effect.
 *
 * Unlike `outputStyle` this has no fixed master value: the `command` is an absolute path and the
 * home directory differs per machine (`/home/eric/…` here, `/home/estoffer/…` on bee-grace). So the
 * expected value is *derived* — `<home>/.claude/tape-capture.sh` — and the script it points at is
 * compared byte-for-byte against the template seeds ships.
 *
 * Reported, never repaired. Installing a hook is more than a JSON merge: it copies a script,
 * marks it executable, and only then wires the entry. That is a session on the machine, by hand.
 */
function hookProblems(doc) {
  const want = join(homedir(), '.claude', 'tape-capture.sh')
  const template = join(SEEDS, 'dev', 'claude', 'scripts', 'tape-capture.sh')
  const out = []

  // A new machine also needs this, and nothing else reports it: the session skills read the dev
  // handle from here and it is the one file with no template and no default.
  const devname = join(homedir(), '.claude', 'devname')
  if (!existsSync(devname)) out.push(`      ${devname}: missing — session filenames need a dev handle`)

  const commands = (doc.hooks?.SessionEnd ?? [])
    .flatMap((e) => e.hooks ?? [])
    .filter((h) => h.type === 'command')
    .map((h) => h.command)
  if (!commands.length) out.push(`      SessionEnd hook: no command hook wired — transcripts are never captured (DEC-S045)`)
  else if (!commands.includes(want)) out.push(`      SessionEnd hook: wired to ${commands.join(', ')} — expected ${want}`)

  if (!existsSync(want)) out.push(`      ${want}: missing`)
  else {
    try {
      if (existsSync(template) && readFileSync(want, 'utf8') !== readFileSync(template, 'utf8'))
        out.push(`      ${want}: differs from the template — diff it against ${rel(new URL(`file://${template}`))}`)
      // A hook script that is not executable is the silent version of this failure: the content
      // is right, the wiring is right, and the hook never fires. Reporting it "current" would be
      // exactly the capture loss DEC-S045 exists to prevent.
      if (!(statSync(want).mode & 0o111)) out.push(`      ${want}: not executable — the hook will never run. chmod +x it`)
    } catch (e) {
      out.push(`      ${want}: unreadable — ${e.message}`)
    }
  }

  if (out.length) out.push(`      Install by hand, on this machine — see README.md § Learning loop. Not repaired by --write.`)
  return out
}

/** @returns {'current'|'stale'|'absent'|'unreadable'} */
function check(label, path, { style = false } = {}) {
  if (!existsSync(path)) {
    console.log(`  ABSENT   ${label}`)
    console.log(`           ${path}`)
    console.log(`           No policy here at all — not a stale revision, no seatbelt.`)
    console.log(`           Fix: node ${rel(import.meta.url)} --write ${path}`)
    return 'absent'
  }
  const got = readJson(path)
  if (!got.ok) {
    console.log(`  UNREADABLE ${label} — ${got.error}`)
    console.log(`           ${path}`)
    return 'unreadable'
  }
  const perms = got.value.permissions
  if (!perms) {
    console.log(`  NO POLICY ${label} — the file exists but has no "permissions" key`)
    console.log(`           ${path}`)
    console.log(`           Fix: node ${rel(import.meta.url)} --write ${path}`)
    return 'stale'
  }
  const styleIssue = style ? outputStyleProblem(got.value) : null
  const hookIssues = style ? hookProblems(got.value) : []
  if (same(perms, masterPerms) && !styleIssue && !hookIssues.length) {
    console.log(`  current  ${label}`)
    return 'current'
  }
  console.log(`  STALE    ${label}`)
  console.log(`           ${path}`)
  for (const l of describe(perms)) console.log(l)
  if (styleIssue) console.log(styleIssue)
  for (const l of hookIssues) console.log(l)
  // Only offer --write when --write can actually fix what was reported. The hook is not one of
  // those things, and a repair command printed under a problem it does not repair is worse than
  // no command: it gets run, it reports success, and the problem is still there.
  if (!same(perms, masterPerms) || styleIssue) console.log(`           Fix: node ${rel(import.meta.url)} --write ${path}`)
  return 'stale'
}

const rel = (u) => {
  const p = fileURLToPath(u)
  return p.startsWith(process.cwd()) ? p.slice(process.cwd().length + 1) : p
}

/**
 * Merge, never copy. Every key other than `permissions` is preserved exactly as found, and the
 * previous file is kept alongside as `.bak` — this writes to the file that carries a machine's
 * hooks, and being wrong here is the failure the whole script is named after.
 */
function write(path) {
  // The header says "never edits the master" — say it in code, not just in a comment. Without
  // this, `--seeds <other-checkout>` plus a target that happens to be a master rewrites the
  // actual source of truth, silently and in the direction nobody wants.
  if (resolve(path) === resolve(MASTER)) die(`refusing to write: ${path} is the master policy itself`)

  const existed = existsSync(path)
  let doc = {}
  let backup = null
  if (existed) {
    const got = readJson(path)
    if (!got.ok) die(`refusing to write: ${path} is not valid JSON (${got.error}). Fix or move it first.`)
    doc = got.value
    // Timestamped, because a fixed `.bak` name loses the original on the second run — and the
    // incident this script is named after was recovered from exactly such a stray backup.
    backup = `${path}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`
    copyFileSync(path, backup)
  } else {
    const dir = resolve(path, '..')
    if (!existsSync(dir)) die(`refusing to write: ${dir} does not exist. Create it first.`)
  }
  doc.permissions = JSON.parse(JSON.stringify(masterPerms))
  // `outputStyle` rides along ONLY when repairing the user settings file — it is a machine
  // preference (DEC-S050 as amended), and writing it into a repo's committed file would put a
  // per-repo override where none is wanted.
  const styleWritten = resolve(path) === resolve(USER_SETTINGS) && master.value.outputStyle
  if (styleWritten) doc.outputStyle = master.value.outputStyle
  // Computed AFTER the writes, so a key this run overwrote is never listed as "untouched" —
  // it read as reassurance about the exact key that had just changed.
  const written = ['permissions', ...(styleWritten ? ['outputStyle'] : [])]
  const preserved = Object.keys(doc).filter((k) => !written.includes(k))
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`)
  console.log(`settings-policy: wrote ${written.join(' + ')} into ${path}`)
  console.log(`  ${backup ? `backed up to ${backup}` : 'created (no previous file)'}`)
  console.log(
    preserved.length
      ? `  preserved ${preserved.length} other key(s) untouched: ${preserved.join(', ')}`
      : `  no other keys were present`
  )
  // Re-read rather than assume the write took. Same reason check-mirrors re-runs after --write:
  // "I wrote it" and "the file matches" are different claims.
  const after = readJson(path)
  const styleOk = !styleWritten || after.ok === true && after.value.outputStyle === master.value.outputStyle
  if (!after.ok || !same(after.value.permissions, masterPerms) || !styleOk) {
    console.error(`settings-policy: the file does not match the master after writing. Check ${path}.`)
    process.exit(1)
  }
  console.log(`  verified: ${written.join(' + ')} now match the master`)
  console.log(`  Takes effect at the NEXT session start — settings are read once, at launch.`)
  process.exit(0)
}

console.log(`\nsettings-policy — against ${rel(new URL(`file://${MASTER}`))}`)
console.log(`  master: ${masterPerms.allow?.length ?? 0} allow, ${masterPerms.deny?.length ?? 0} deny, defaultMode ${JSON.stringify(masterPerms.defaultMode)}\n`)

if (mode === 'write') write(resolve(writeTarget ?? USER_SETTINGS)) // exits

const results = []
if (mode === 'user' || mode === 'all') results.push(check('user settings   (this machine, every project)', USER_SETTINGS, { style: true }))
if (mode === 'repo' || mode === 'all') results.push(check('shared project  (committed; travels with the repo)', REPO_SETTINGS))

const bad = results.filter((r) => r !== 'current').length
console.log(
  bad
    ? `\n${bad} of ${results.length} not current. Per-project exceptions belong in .claude/settings.local.json, not here.\n`
    : `\nCurrent.\n`
)
process.exit(bad ? 1 : 0)
