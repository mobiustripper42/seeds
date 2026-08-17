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
 * `drift.mjs` cannot cover this — it refuses to run against seeds on purpose,
 * because seeds' root `CLAUDE.md` and `dev/claude/CLAUDE.md` are different
 * documents sharing a filename. This script compares only paths that exist on
 * both sides, so that pair never comes up.
 *
 * Read-only. Enumerates and stops there — it does not copy, and it has no
 * opinion about which side is right. Same constraint as drift.mjs, same reason
 * (DEC-S040).
 *
 * Usage:  node dev/claude/scripts/check-mirrors.mjs [--quiet]
 * Exit:   0 = every non-exempt mirrored file matches; 1 = at least one differs.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const TEMPLATE_DIR = join(ROOT, 'dev', 'claude');
const MIRROR_DIR = join(ROOT, '.claude');
const QUIET = process.argv.includes('--quiet');

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
const isDogfooded = (rel) => DOGFOODED.some((p) => rel.startsWith(p));

/**
 * Files that legitimately differ, or that seeds legitimately does not hold at
 * all. Each entry needs a reason, and the reason has to be about the file being
 * *project-owned*, not about the drift being old or inconvenient — an exemption
 * added to silence a real gap is how this check becomes furniture.
 *
 * An entry suppresses BOTH a content difference and an absence. `agents/ui-reviewer.md`
 * is why: its reason already says the right end state is deleting seeds' copy, so
 * flagging that deletion as a missing mirror would punish the fix.
 */
const EXEMPT = new Map([
  ['doc-check.json', 'project-owned config (DEC-S037) — the template ships placeholders, seeds fills them in'],
  ['settings.json', 'permission policy is distributed by hand, per machine (DEC-S023) — never auto-synced'],
  [
    'agents/ui-reviewer.md',
    "seeds has no UI and `type-manifest.yaml` marks this file webapp-only — mirroring it would install an agent that correctly refuses to run. The real fix is deleting seeds' copy, which is a decision, not a mirror",
  ],
]);

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
    if (isDogfooded(rel) && !EXEMPT.has(rel)) missing.push(rel);
    continue; // outside the dogfooded prefixes, absence is the normal case
  }
  compared++;
  const same =
    normalize(readFileSync(join(TEMPLATE_DIR, rel), 'utf8'), rel) ===
    normalize(readFileSync(mirror, 'utf8'), rel);
  if (same) continue;
  if (EXEMPT.has(rel)) exempted.push(rel);
  else drifted.push(rel);
}

// An exemption naming a file that no longer differs (or no longer exists) is a
// stale claim; say so rather than letting the list rot quietly.
for (const rel of EXEMPT.keys()) {
  if (!existsSync(join(TEMPLATE_DIR, rel))) {
    console.log(`note: exemption for ${rel} names a template that no longer exists`);
  } else if (!exempted.includes(rel) && existsSync(join(MIRROR_DIR, rel))) {
    console.log(`note: exemption for ${rel} is no longer needed — the two copies match`);
  }
}

if (!QUIET) {
  console.log(`check-mirrors: compared ${compared} mirrored file(s) under dev/claude/ ↔ .claude/`);
  for (const rel of exempted) console.log(`  exempt  ${rel} — ${EXEMPT.get(rel)}`);
}

if (drifted.length === 0 && missing.length === 0) {
  if (!QUIET) console.log('  all dogfooded templates are mirrored, and every mirror matches.');
  process.exit(0);
}

const HERE = relative(ROOT, resolve(new URL(import.meta.url).pathname));

if (missing.length > 0) {
  console.error(`\ncheck-mirrors: ${missing.length} dogfooded template(s) have no copy in .claude/:\n`);
  for (const rel of missing) {
    console.error(`  ABSENT  dev/claude/${rel}`);
    console.error(`          cp dev/claude/${rel} .claude/${rel}`);
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
