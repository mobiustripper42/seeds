#!/usr/bin/env node
/**
 * check-mirrors.mjs — SEEDS-ONLY. Compares seeds' shipped templates under
 * `dev/claude/` against seeds' own live copies under `.claude/`.
 *
 * Why this exists: seeds dogfoods several of the files it ships, so each of them
 * exists twice. `CLAUDE.md` § How Work Happens Here step 5 says to edit the
 * template and then mirror it — and nothing checked that anyone did. On
 * 2026-08-06 a promotion added `/its-dead` Step 4.5 to the template and never
 * mirrored it; eleven days later seeds ran `/its-dead`, hit the exact condition
 * Step 4.5 detects, and said nothing, because the copy that runs here did not
 * have it. That is silent by construction: a check that isn't installed cannot
 * report that it isn't installed.
 *
 * `drift.mjs` now DOES run against seeds, and still does not cover this. It skips
 * `context`-class files, because for a project a differing copy is correct — and
 * `agents/architect.md`, `code-review.md`, `pm.md` and `ui-reviewer.md` are all
 * `context`. For seeds only the `description:` line is legitimately project-owned;
 * the rest of the file should match, which is what this script compares. Two of the
 * five stale files the first run found were `context`-class agents the differ would
 * never have looked at.
 *
 * The differ used to refuse seeds outright, because seeds' root `CLAUDE.md` and
 * `dev/claude/CLAUDE.md` are different documents sharing a filename. That refusal
 * is now one excluded path rather than a whole-repo decline. This script never had
 * the problem: it compares only paths that exist on both sides, so the pair never
 * comes up.
 *
 * Read-only. Enumerates and stops there — it does not copy, and it has no
 * opinion about which side is right. Same constraint as drift.mjs, same reason
 * (DEC-S040).
 *
 * Usage:  node dev/claude/scripts/check-mirrors.mjs [--quiet] [--write]
 *
 * `--write` repairs instead of reporting: it copies each drifted or missing template over its
 * `.claude/` mirror, then re-runs the comparison so the exit code still means what it always did.
 * Detection and repair share one list of pairs on purpose — a separate sync script would be a
 * second opinion about which files mirror which, and the first thing to drift would be the two
 * opinions. EXEMPT files are never written: those differ deliberately (project-owned config,
 * hand-distributed policy), and copying over them is the one way this flag could destroy something.
 * Exit:   0 = every non-exempt mirrored file matches; 1 = at least one differs.
 */

import { readFileSync, readdirSync, statSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const ROOT = process.cwd();
const TEMPLATE_DIR = join(ROOT, 'dev', 'claude');
const MIRROR_DIR = join(ROOT, '.claude');
const QUIET = process.argv.includes('--quiet');
const WRITE = process.argv.includes('--write');

/**
 * Which templates seeds is expected to dogfood — i.e. where a MISSING mirror is a
 * defect rather than the normal case.
 *
 * This can't be "all of them". Seeds runs its scripts straight out of
 * `dev/claude/scripts/`, the `docs/` templates belong in a project's `docs/` and
 * not in `.claude/`, and `dev/claude/CLAUDE.md` is a different document from the
 * root `CLAUDE.md` on purpose. Requiring a mirror for every template produces 31
 * false positives against 1 real finding, and an exemption list of 31 is
 * furniture the day it is written.
 *
 * So the rule is two prefixes, which is the same mapping `drift.mjs`'s
 * `toProject()` already encodes: `dev/claude/agents/**` and
 * `dev/claude/skills/**` land at `.claude/**`. A prefix rule maintains itself —
 * add a new agent or skill and it is covered the same day, which is exactly when
 * a hand-maintained roster would have been left un-updated.
 */
const DOGFOODED = ['agents/', 'skills/'];

/**
 * Present, but never compared. Seeds MUST hold these — absence is a failure, the
 * same as for a dogfooded template — and their contents are none of this script's
 * business. This is DEC-S044's `presence` class, under a different roof.
 *
 * Keeping them out of the absence check was a real bug in the first version of
 * this rule: `settings.json` is the file whose deny list protects itself
 * (DEC-S023), and deleting seeds' copy produced a clean run. A blind spot for the
 * two files an exemption list already names by name is the same failure this
 * script exists for, one level up.
 */
const PRESENT_NOT_COMPARED = new Map([
  ['doc-check.json', 'project-owned config (DEC-S037) — the template ships placeholders, seeds fills them in'],
  ['settings.json', 'permission policy is distributed by hand, per machine (DEC-S023) — never auto-synced'],
]);

/**
 * Neither required nor compared. Seeds may hold these or not; if it does, the
 * copy is allowed to differ. Reserved for a file seeds has an argued reason not
 * to run — not for drift that is merely old or inconvenient.
 */
const OPTIONAL = new Map([
  [
    'agents/ui-reviewer.md',
    "seeds has no UI and `type-manifest.yaml` marks this file webapp-only — mirroring it would install an agent that correctly refuses to run. The real fix is deleting seeds' copy, which is a decision, not a mirror",
  ],
]);

/** Every path with a hand-written reason, whichever list it is on. */
const EXEMPT = new Map([...PRESENT_NOT_COMPARED, ...OPTIONAL]);

/** Seeds is expected to hold this: absence is a defect. */
const mustExist = (rel) =>
  !OPTIONAL.has(rel) && (DOGFOODED.some((p) => rel.startsWith(p)) || PRESENT_NOT_COMPARED.has(rel));

/**
 * An agent's `description:` frontmatter line is project-owned by design — the
 * install procedure (README § Setting Up a New Dev Project, step 5) says to put
 * the project's name in it. Comparing it would make every agent permanently
 * drifted, which is how a check turns into furniture. Everything else in the
 * file is compared byte for byte.
 */
const isAgent = (rel) => rel.startsWith('agents/');
const normalize = (text, rel) =>
  isAgent(rel) ? text.replace(/^description:.*$/m, 'description: <project-owned>') : text;

function walk(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full));
  }
  return out;
}

if (!existsSync(TEMPLATE_DIR) || !existsSync(MIRROR_DIR)) {
  console.error(
    `check-mirrors: expected both dev/claude/ and .claude/ under ${ROOT}.\n` +
      `This script is seeds-only — run it from the seeds repo root.`
  );
  process.exit(1);
}

const drifted = [];
const missing = [];
const exempted = [];
let compared = 0;

for (const rel of walk(TEMPLATE_DIR)) {
  const mirror = join(MIRROR_DIR, rel);
  if (!existsSync(mirror)) {
    /**
     * The blind spot this check shipped with, and the third instance of one
     * mechanism: DEC-S044 found `settings.json` invisible because unclassified,
     * DEC-S046 found nine more, and then THIS script — written to catch invisible
     * drift — skipped every absent mirror in silence. `agents/ideas.md` had been
     * missing since the day it was written, so `@ideas` did not resolve in a seeds
     * session, and the run that shipped this file reported "all mirrored files
     * match". Both statements were true at once, which is the whole problem: a
     * missing file cannot differ from anything.
     */
    if (mustExist(rel)) missing.push(rel);
    continue; // outside that set, absence is the normal case
  }
  compared++;
  const same =
    normalize(readFileSync(join(TEMPLATE_DIR, rel), 'utf8'), rel) ===
    normalize(readFileSync(mirror, 'utf8'), rel);
  if (same) continue;
  if (EXEMPT.has(rel)) exempted.push(rel);
  else drifted.push(rel);
}

// --write: repair before reporting. Two gates, and both are load-bearing.
//
// EXEMPT, because those files differ on purpose — project-owned config, hand-distributed
// permission policy — and copying over one is the only way this flag destroys something.
//
// `mustExist`, because a template having a `.claude/` copy is not the same as it deserving one.
// The DOGFOODED prefix rule exists precisely because requiring a mirror for every template would
// be wrong 31 times out of 32; without this gate, a stray copy of a non-dogfooded file (a script,
// a `docs/` template) reads as DRIFT and gets silently overwritten — repairing toward a mirror
// that should not exist at all. Caught in review: the first version gated only on EXEMPT while
// its own comment claimed otherwise, which is the shape of hazard where the comment is the only
// thing anyone reads.
if (WRITE && (drifted.length || missing.length)) {
  const written = [];
  for (const rel of [...drifted, ...missing]) {
    if (EXEMPT.has(rel) || !mustExist(rel)) continue;
    const dest = join(MIRROR_DIR, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(TEMPLATE_DIR, rel), dest);
    written.push(rel);
  }
  for (const rel of written) console.log(`  wrote   ${rel}`);
  // Re-run the comparison rather than assuming the copies took: this script's whole subject is
  // that "I copied it" and "the two files match" are different claims.
  drifted.length = 0;
  missing.length = 0;
  for (const rel of walk(TEMPLATE_DIR)) {
    const mirror = join(MIRROR_DIR, rel);
    if (!existsSync(mirror)) {
      if (mustExist(rel)) missing.push(rel);
      continue;
    }
    const same =
      normalize(readFileSync(join(TEMPLATE_DIR, rel), 'utf8'), rel) ===
      normalize(readFileSync(mirror, 'utf8'), rel);
    if (!same && !EXEMPT.has(rel)) drifted.push(rel);
  }
}

// An exemption naming a file that no longer differs (or no longer exists) is a
// stale claim; say so rather than letting the list rot quietly.
for (const rel of EXEMPT.keys()) {
  if (!existsSync(join(TEMPLATE_DIR, rel))) {
    console.log(`note: exemption for ${rel} names a template that no longer exists`);
  } else if (
    !exempted.includes(rel) &&
    existsSync(join(MIRROR_DIR, rel)) &&
    !PRESENT_NOT_COMPARED.has(rel)
  ) {
    // PRESENT_NOT_COMPARED entries are excluded from this note on purpose. Since `--write`, an
    // exemption does two jobs: don't report the difference, and never copy over the file. The
    // second does not expire when the two copies happen to match — `settings.json` matching today
    // is not a reason to drop the guard that stops tomorrow's --write clobbering a hand-distributed
    // policy (DEC-S023). Only OPTIONAL exemptions, which exist purely to suppress a report, can go
    // stale this way.
    console.log(`note: exemption for ${rel} is no longer needed — the two copies match`);
  }
}

if (!QUIET) {
  console.log(`check-mirrors: compared ${compared} mirrored file(s) under dev/claude/ ↔ .claude/`);
  for (const rel of exempted) console.log(`  exempt  ${rel} — ${EXEMPT.get(rel)}`);
}

if (drifted.length === 0 && missing.length === 0) {
  // Deliberately "mirrored or exempt": `agents/ui-reviewer.md` is OPTIONAL, and its own
  // exemption reason says deleting seeds' copy is the right end state. The day someone acts
  // on that, "all templates are mirrored" would be a false sentence printed by a green run.
  if (!QUIET) console.log('  every required mirror is present or exempt, and every present mirror matches.');
  process.exit(0);
}

const HERE = relative(ROOT, resolve(new URL(import.meta.url).pathname));

if (missing.length > 0) {
  console.error(`\ncheck-mirrors: ${missing.length} dogfooded template(s) have no copy in .claude/:\n`);
  for (const rel of missing) {
    // `mkdir -p` is not decoration: a brand-new skill lives at `skills/<name>/SKILL.md`, and
    // `.claude/skills/<name>/` does not exist yet, so a bare `cp` fails with ENOENT — on
    // precisely the new-skill case the prefix rule is sold on covering the day it is written.
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    console.error(`  ABSENT  dev/claude/${rel}`);
    console.error(
      dir
        ? `          mkdir -p .claude/${dir} && cp dev/claude/${rel} .claude/${rel}`
        : `          cp dev/claude/${rel} .claude/${rel}`
    );
  }
  console.error(
    `\nSeeds ships this and does not run it. Copy it, or — if seeds genuinely should not\n` +
      `hold it — add it to EXEMPT in ${HERE} with the reason, the same as a permanent difference.\n`
  );
}

if (drifted.length > 0) {
  console.error(`\ncheck-mirrors: ${drifted.length} mirrored file(s) differ from the template:\n`);
  for (const rel of drifted) {
    console.error(`  DRIFT  dev/claude/${rel}`);
    console.error(`         diff dev/claude/${rel} .claude/${rel}`);
  }
  console.error(
    `\nSeeds is running different rules than it ships. Reconcile each one deliberately —\n` +
      `the template is usually right, but not always, and this script deliberately won't guess.\n` +
      `If a difference is permanent and project-owned, add it to EXEMPT in ${HERE} with a reason.\n`
  );
}

process.exit(1);
