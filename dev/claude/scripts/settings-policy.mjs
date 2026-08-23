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

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
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

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--seeds') seedsArg = argv[++i] ?? die('--seeds needs a path')
  else if (a === '--repo') mode = 'repo'
  else if (a === '--all') mode = 'all'
  else if (a === '--write') {
    mode = 'write'
    // Optional target: the next arg, unless it is another flag.
    if (argv[i + 1] && !argv[i + 1].startsWith('--')) writeTarget = argv[++i]
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

/** Stable, order-insensitive comparison. A reordered deny list is not a policy change. */
const canon = (v) =>
  Array.isArray(v)
    ? [...v].sort()
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
  }
  const keys = new Set([...Object.keys(masterPerms), ...Object.keys(theirs)])
  for (const k of keys) {
    if (k === 'allow' || k === 'deny') continue
    if (!same(masterPerms[k], theirs[k])) lines.push(`      ${k}: ${JSON.stringify(theirs[k])} — master has ${JSON.stringify(masterPerms[k])}`)
  }
  return lines
}

/** @returns {'current'|'stale'|'absent'|'unreadable'} */
function check(label, path) {
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
  if (same(perms, masterPerms)) {
    console.log(`  current  ${label}`)
    return 'current'
  }
  console.log(`  STALE    ${label}`)
  console.log(`           ${path}`)
  for (const l of describe(perms)) console.log(l)
  console.log(`           Fix: node ${rel(import.meta.url)} --write ${path}`)
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
  const existed = existsSync(path)
  let doc = {}
  if (existed) {
    const got = readJson(path)
    if (!got.ok) die(`refusing to write: ${path} is not valid JSON (${got.error}). Fix or move it first.`)
    doc = got.value
    copyFileSync(path, `${path}.bak`)
  } else {
    const dir = resolve(path, '..')
    if (!existsSync(dir)) die(`refusing to write: ${dir} does not exist. Create it first.`)
  }
  const preserved = Object.keys(doc).filter((k) => k !== 'permissions')
  doc.permissions = JSON.parse(JSON.stringify(masterPerms))
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`)
  console.log(`settings-policy: wrote the master permissions into ${path}`)
  console.log(`  ${existed ? `backed up to ${path}.bak` : 'created (no previous file)'}`)
  console.log(
    preserved.length
      ? `  preserved ${preserved.length} other key(s) untouched: ${preserved.join(', ')}`
      : `  no other keys were present`
  )
  // Re-read rather than assume the write took. Same reason check-mirrors re-runs after --write:
  // "I wrote it" and "the file matches" are different claims.
  const after = readJson(path)
  if (!after.ok || !same(after.value.permissions, masterPerms)) {
    console.error(`settings-policy: the file does not match the master after writing. Check ${path}.`)
    process.exit(1)
  }
  console.log(`  verified: permissions now match the master`)
  console.log(`  Takes effect at the NEXT session start — permissions are read once, at launch.`)
  process.exit(0)
}

console.log(`\nsettings-policy — against ${rel(new URL(`file://${MASTER}`))}`)
console.log(`  master: ${masterPerms.allow?.length ?? 0} allow, ${masterPerms.deny?.length ?? 0} deny, defaultMode ${JSON.stringify(masterPerms.defaultMode)}\n`)

if (mode === 'write') write(resolve(writeTarget ?? USER_SETTINGS)) // exits

const results = []
if (mode === 'user' || mode === 'all') results.push(check('user settings   (this machine, every project)', USER_SETTINGS))
if (mode === 'repo' || mode === 'all') results.push(check('shared project  (committed; travels with the repo)', REPO_SETTINGS))

const bad = results.filter((r) => r !== 'current').length
console.log(
  bad
    ? `\n${bad} of ${results.length} not current. Per-project exceptions belong in .claude/settings.local.json, not here.\n`
    : `\nCurrent.\n`
)
process.exit(bad ? 1 : 0)
