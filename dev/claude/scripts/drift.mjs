#!/usr/bin/env node
/**
 * What differs between the seeds templates and one project. Read-only.
 *
 * This is an ENUMERATOR, not a syncer and not a classifier (DEC-S040). It says what is different.
 * It never says which side is right, never copies, and must never grow either ability — the moment
 * it has an opinion about which version wins, it has re-acquired the judgment DEC-S040 removed, and
 * the whole argument for deleting @sync-config applies to it instead.
 *
 * Why it exists: DEC-S040 predicted this. "Enumeration was the half worth keeping and the half that
 * cost almost nothing to rebuild if it turns out to matter — a read-only differ has no gate, no
 * classifier, and no write path to get wrong. It is not being built now… build the thing when the
 * need is observed." Two copies of a stale file and one parallel edit later, the need is observed.
 *
 * What it does NOT catch, so nobody mistakes its silence for safety: drift that appears *after* it
 * runs, and rules that were stated and not followed. It reports the state of the world right now.
 *
 *   node dev/claude/scripts/drift.mjs ../muster
 *   node dev/claude/scripts/drift.mjs            # defaults to cwd, run from inside a project
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

/**
 * `die` is a function DECLARATION, not a const arrow, and that is load-bearing. `findSeeds` runs
 * during module evaluation — before any `const` below it has been initialized — so a `const die`
 * sits in the temporal dead zone at exactly the moment the "cannot find seeds" path needs it. The
 * script then threw `ReferenceError: Cannot access 'die' before initialization` and exited 1,
 * swallowing the one message that says how to fix the invocation. Hoisting is the fix; keep it.
 *
 * Untested, and worth stating: seeds has no test runner (issue #186), so neither exit path here
 * has a check. Both were verified by hand against a cwd with no seeds anywhere.
 */
function die(m) { console.error(`drift: ${m}`); process.exit(2) }

/**
 * Parsed by scanning, because `--seeds` used to be honoured ONLY at argv[2] and the project
 * argument was excluded from the positionals by VALUE (`a !== process.argv[3]`) rather than by
 * position. Two silent failures came out of that: `drift.mjs <project> --seeds <seeds>` ignored the
 * flag entirely and fell through to the not-found path, and `drift.mjs --seeds /x /x` dropped the
 * project argument and compared against `process.cwd()` instead, exiting 0 on the wrong directory.
 * A read-only differ reporting a confident result about a directory nobody asked about is worse
 * than one that refuses.
 */
const argv = process.argv.slice(2)
const positional = []
let seedsArg = null
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--seeds') {
    seedsArg = argv[++i] ?? die('--seeds needs a path')
  } else if (argv[i].startsWith('--')) {
    die(`unknown flag ${argv[i]} — the only flag is --seeds`)
  } else {
    positional.push(argv[i])
  }
}

const SEEDS = resolve(seedsArg ?? findSeeds())
const PROJECT = resolve(positional[0] ?? process.cwd())

function findSeeds() {
  // Run from inside seeds, or from a project with seeds as a sibling.
  for (const c of [process.cwd(), join(process.cwd(), '..', 'seeds'), process.env.SEEDS_REPO]) {
    if (c && existsSync(join(c, 'dev', 'claude', 'CLAUDE.md'))) return c
  }
  die('Cannot find seeds. Pass it: --seeds /path/to/seeds')
}

if (!existsSync(join(SEEDS, 'dev', 'claude', 'CLAUDE.md'))) die(`${SEEDS} is not a seeds checkout`)

/**
 * Seeds is a consumer of its own templates, so it is a legitimate target — but it is a differently
 * shaped one, and four facts about it have to be stated or the run is 12 false findings and 1 real.
 * Measured, before this existed: bypassing the old blanket refusal produced exactly that ratio.
 *
 * The refusal itself was right about its reason and wrong about its scope. Seeds' root `CLAUDE.md`
 * and `dev/claude/CLAUDE.md` genuinely are different documents sharing a filename, and comparing
 * them reports the whole shell as drift. But that is ONE mapping, and it was used to decline the
 * whole repo — which left everything outside `agents/` and `skills/` unwatched here, including a
 * `logic`-class file that had been five lines stale since session 34 and that nothing reported to
 * anyone. `check-mirrors.mjs` (DEC-S047) covers `agents/` + `skills/` and does not look at `docs/`;
 * this covers the rest.
 *
 * Stated as data rather than branches so the seeds-shaped exceptions are readable in one place and
 * nothing else in the script has to know about them.
 */
const SEEDS_IS_TARGET = resolve(SEEDS) === resolve(PROJECT)

/**
 * Template paths whose project-side mapping does not apply when the project IS seeds.
 * Each is a document seeds owns, not a copy it holds.
 */
const seedsOwnPath = (rel) =>
  // `dev/claude/CLAUDE.md` → `CLAUDE.md` is the mapping the old refusal existed for. Seeds' root
  // CLAUDE.md describes THIS repo; the template is the shell shipped to projects.
  rel === 'dev/claude/CLAUDE.md' ||
  // `dev/claude/docs/X` → `docs/X`: seeds' own SPEC, PROJECT_PLAN, AGENTS and CHEATSHEET are about
  // seeds, and every one of them is `context` class. Named as `context` rather than "not logic",
  // which is what this said first: "not logic" would also swallow a future `hybrid` or `presence`
  // doc, and swallowing a class nobody has thought about yet is the failure mode this whole script
  // keeps rediscovering. A `logic` doc IS meant to be byte-identical everywhere — that is how the
  // stale velocity guide surfaced — so those are deliberately not excluded.
  (rel.startsWith('dev/claude/docs/') && classOf(rel) === 'context') ||
  // `dev/claude/scripts/X` → `scripts/X`: seeds has no root `scripts/`. It runs them in place, out
  // of `dev/claude/scripts/`, which is the point — it validates the files it ships rather than a
  // copy that could drift.
  rel.startsWith('dev/claude/scripts/')

const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

/** `logic` files are byte-identical by design; `context` is project-owned; `hybrid` is the shell. */
function fileClasses() {
  const cfg = join(SEEDS, '.claude', 'routine-config.yaml')
  if (!existsSync(cfg)) die('no .claude/routine-config.yaml in seeds — nothing to classify against')
  const body = readFileSync(cfg, 'utf8').split(/^file-classes:/m)[1] ?? ''
  const out = []
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*-\s*"([^"]+)"\s*:\s*(\w+)/)
    if (m) out.push({ glob: m[1], cls: m[2] })
  }
  return out
}

/** Seeds-side path → project-side path. The mapping the registry documents but cannot express. */
function toProject(seedsRel) {
  if (seedsRel === 'dev/claude/CLAUDE.md') return 'CLAUDE.md'
  if (seedsRel.startsWith('dev/claude/scripts/')) return seedsRel.replace('dev/claude/scripts/', 'scripts/')
  if (seedsRel.startsWith('dev/claude/docs/')) return seedsRel.replace('dev/claude/docs/', 'docs/')
  if (seedsRel.startsWith('dev/claude/skills/')) return seedsRel.replace('dev/claude/', '.claude/')
  if (seedsRel.startsWith('dev/claude/agents/')) return seedsRel.replace('dev/claude/', '.claude/')
  if (seedsRel.startsWith('dev/claude/')) return seedsRel.replace('dev/claude/', '.claude/')
  return seedsRel
}

/** Files this project's type has no use for (DEC-S011) — absence is correct, not drift. */
function typeGated() {
  const t = join(PROJECT, '.claude', 'project-type')
  const manifest = join(SEEDS, '.claude', 'type-manifest.yaml')
  if (!existsSync(t) || !existsSync(manifest)) return new Set()
  const type = readFileSync(t, 'utf8').trim()
  const gated = new Set()
  for (const line of readFileSync(manifest, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w/.-]+):\s*\[([^\]]+)\]/)
    if (m && !m[2].split(',').map((s) => s.trim()).includes(type)) gated.add(`dev/claude/${m[1]}`)
  }
  return gated
}

function walk(dir, base = dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e)
    return statSync(p).isDirectory() ? walk(p, base) : [p.slice(base.length + 1)]
  })
}

const classes = fileClasses()
const gated = typeGated()
/**
 * `**` is parked under a placeholder so the single-`*` pass can't chew it in half, then restored.
 * That placeholder used to be a raw NUL byte, which made this entire file BINARY to git: every
 * diff of drift.mjs printed `Binary files a/… and b/… differ`, so no change to it was ever
 * reviewable in a PR and @code-review read none of them — including the change that introduced the
 * NUL. A printable token costs nothing and keeps the file text. Collision isn't a real risk:
 * `routine-config.yaml` holds repo paths, and one containing this string isn't worth defending.
 */
const classOf = (rel) => classes.find(({ glob }) => {
  const re = new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '@@GLOBSTAR@@').replace(/\*/g, '[^/]*').replace(/@@GLOBSTAR@@/g, '.*') + '$')
  return re.test(rel)
})?.cls

const rows = []
const missing = []   // `presence` class — reported when absent, never diffed. See below.
const unclassified = []  // no registry entry at all (DEC-S046) — a seeds-side gap, not project drift.
for (const rel of walk(join(SEEDS, 'dev', 'claude')).map((r) => `dev/claude/${r}`)) {
  if (gated.has(rel)) continue
  const cls = classOf(rel)
  /**
   * Ordered after `classOf` on purpose, and guarded on the class existing. The first version
   * skipped `seedsOwnPath` files before this line and thereby swallowed an UNCLASSIFIED file
   * under `docs/` or `scripts/` — silently, in the one mode this change introduces. That is
   * DEC-S046's exact failure reintroduced by the fix for a different one: a file with no
   * registry entry has to be reported before anything gets to decide it is uninteresting,
   * because "no entry" is the absence of an answer rather than an answer. Caught in review,
   * reproduced with a throwaway file under `dev/claude/docs/`.
   */
  if (SEEDS_IS_TARGET && cls !== undefined && seedsOwnPath(rel)) continue  // seeds owns it; not a copy
  if (cls === 'seeds-only') continue        // lives in seeds; a project never holds a copy
  if (cls === 'context') continue          // project-owned; differing is correct
  /**
   * `presence` (DEC-S044): the file must EXIST here, and what is in it is none of this
   * script's business. `.claude/settings.json` is the case — its contents are distributed
   * by hand per machine (DEC-S023), so a project legitimately carrying a different revision
   * is not drift, and reporting "differs" would amount to claiming seeds' copy is the right
   * one. That is the opinion this script must never acquire. Absence is a different kind of
   * fact: it is checkable, it is never correct, and nothing else notices it.
   */
  if (cls === 'presence') {
    if (!existsSync(join(PROJECT, toProject(rel)))) missing.push(toProject(rel))
    continue
  }
  /**
   * No entry in the registry at all (DEC-S046). NOT the same as a class this script
   * doesn't diff: `context`, `seeds-only` and `presence` are answers, and skipping
   * them is honoring one. `undefined` is the absence of an answer, and skipping it
   * silently is how `agents/pm.md` and `agents/doc-consistency.md` sat outside the
   * registry from the day they were written — bushel's `doc-consistency.md` still
   * routed findings to the deleted `@sync-config`, and every drift run on that repo
   * reported it clean. The registry's own header already says an unmatched file
   * "has never been classified; treat it as unclassified rather than assuming a
   * default, and decide deliberately" — this reports it so there is something to
   * decide about. Reported whether or not the copies differ: the defect is the
   * missing entry, not the bytes.
   */
  if (cls === undefined) { unclassified.push(toProject(rel)); continue }
  if (cls !== 'logic' && cls !== 'hybrid') continue  // a classified file this script doesn't diff
  const theirs = join(PROJECT, toProject(rel))
  if (!existsSync(theirs)) rows.push([cls, toProject(rel), 'absent here'])
  else if (hash(join(SEEDS, rel)) !== hash(theirs)) rows.push([cls, toProject(rel), cls === 'hybrid' ? 'differs (shell; the paired context file is yours)' : 'differs'])
}

// Present in the project, absent from the templates — a retired file nobody removed.
for (const kind of ['skills', 'agents']) {
  const mine = new Set(readdirSync(join(SEEDS, 'dev', 'claude', kind), { withFileTypes: true }).map((d) => d.name.replace(/\.md$/, '')))
  const dir = join(PROJECT, '.claude', kind)
  if (!existsSync(dir)) continue
  for (const e of readdirSync(dir)) {
    const name = e.replace(/\.md$/, '')
    if (!mine.has(name) && !gated.has(`dev/claude/${kind}/${name}.md`)) rows.push([kind.slice(0, -1), `.claude/${kind}/${e}`, 'not a template — retired, or project-owned'])
  }
}

const v = (p) => (existsSync(p) ? readFileSync(p, 'utf8').trim() : '?')
const sv = v(join(SEEDS, 'seeds-version'))
const pv = v(join(PROJECT, '.claude', 'seeds-version'))

console.log(`\ndrift — ${SEEDS_IS_TARGET ? 'seeds against its own templates' : `${basename(PROJECT)} vs seeds`}`)
/**
 * Seeds has no `.claude/seeds-version` and deliberately never will — PR #173 deleted it, because
 * the file answers "which generation is this project installed at" and seeds IS the generation.
 * Printing `? vs 5  ← owes a migration` at it is a false statement in the first line of output.
 */
if (SEEDS_IS_TARGET) console.log(`seeds-version ${sv} — the source; a migration is never owed here\n`)
else console.log(`seeds-version ${pv} vs ${sv}${pv !== sv ? '  ← owes a migration; see docs/SCHEMA_VERSIONS.md' : ''}\n`)
/**
 * Split, because the two groups need different amounts of attention. A file that DIFFERS is drift:
 * two versions of something meant to be identical, and one of them is stale. A file that is ABSENT
 * is usually fine — one-time migration helpers, stack-specific tooling a project has no use for.
 * Printing them in one list buries four real problems under five non-problems, which is how a
 * report stops being read.
 */
const differs = rows.filter((r) => r[2].startsWith('differs'))
const other = rows.filter((r) => !r[2].startsWith('differs'))
const show = (title, rs) => {
  if (!rs.length) return
  const w = Math.max(...rs.map((r) => r[1].length))
  console.log(title)
  for (const [cls, path, note] of rs.sort((a, b) => a[1].localeCompare(b[1]))) {
    console.log(`  ${cls.padEnd(7)} ${path.padEnd(w)}  ${note}`)
  }
  console.log('')
}
if (!rows.length && !missing.length && !unclassified.length) console.log('  nothing differs.\n')
/**
 * A seeds-side gap, printed last and phrased as one. It is not this project's drift and
 * there is nothing to copy in response — the fix is an entry in seeds' registry. Kept out
 * of both drift tables for that reason: a row a reader cannot act on from here, sitting in
 * a table of rows they can, is how the actionable ones stop being read.
 */
if (unclassified.length) {
  console.log(`UNCLASSIFIED in seeds — no file-class entry, so never compared (${unclassified.length}):`)
  for (const p of unclassified.sort()) console.log(`  ?       ${p}`)
  console.log('  Fix in seeds: .claude/routine-config.yaml § file-classes. Not this project\'s drift.\n')
}
/**
 * Printed FIRST and in its own block, above the two drift tables. It does not belong in
 * "also absent — often fine", whose whole job is to say *ignore me*: filing a missing
 * permission policy under that heading is how a real gap reads as a non-problem. Nor does it
 * belong in DRIFT, which means two copies of something meant to be identical — there is only
 * one copy here, and it is on the other machine.
 */
if (missing.length) {
  console.log(`MISSING — no copy here, and nothing else reports it (${missing.length}):`)
  for (const p of missing.sort()) console.log(`  absent  ${p}`)
  console.log('  Contents are yours and are never compared. Only the absence is reported.\n')
}
show(`DRIFT — meant to be identical, and is not (${differs.length}):`, differs)
show(`Also absent or unexpected (${other.length}) — often fine: one-time migrations, stack-specific tooling:`, other)
if (differs.length) console.log('  This says what differs, not which side is right. Read them and decide.\n')
