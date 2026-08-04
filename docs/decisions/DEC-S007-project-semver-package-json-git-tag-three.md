---
id: DEC-S007
title: "Project semver — `package.json` + git tag, three triggers, dev projects only"
topic: "Branches, versioning & release"
---

## DEC-S007: Project semver — `package.json` + git tag, three triggers, dev projects only

**Decision:** Dev projects carry a SemVer version (`MAJOR.MINOR.PATCH`) stored in `package.json` and mirrored to a git tag (`vX.Y.Z`) on `main`. Three triggers move it:
- **Patch:** bumped by `/its-dead` on every PR merge to the working branch. CHANGELOG entry derived from PR title.
- **Minor:** bumped by `/retro` on phase close. CHANGELOG entry derived from phase summary.
- **Major:** bumped manually by a new `/bump-major` skill. User supplies the rationale.

Tags are applied on the active trunk (`main`) at bump time (DEC-S022). Promotion to a `production` deploy branch (if the project has one) carries the already-tagged commit via ff-merge; `/promote-production` does not tag. (Under the retired DEC-S008 staging model, bumps were untagged on `staging` and tagged at `/promote-staging` — no longer the case.)

**Detection — "is this a dev project?":** presence of `package.json` at the repo root. Seeds + domain repos have no `package.json` → all version-bump steps no-op silently.

**Bump tool:** `npm version <patch|minor|major> --no-git-tag-version` mutates `package.json` (and `package-lock.json`) in place and prints the new version. The `--no-git-tag-version` flag is critical — we control tagging ourselves so a release gets exactly one tag.

**`<VersionTag />` template:** `dev/claude/templates/VersionTag.tsx` reads `process.env.NEXT_PUBLIC_APP_VERSION` + `process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` at build time and renders `v1.2.3 (a1b2c3)`. The `NEXT_PUBLIC_` prefix is required — Next.js only inlines those into client bundles, so a Server-Component-only read of `process.env.npm_package_version` would silently render `v0.0.0` in any client tree. The component requires a one-time `next.config.js` setup that forwards `npm_package_version` into `NEXT_PUBLIC_APP_VERSION`. Wired into login screen + footer per project.

**Why:** Vercel-displayed version on the login screen is the highest-priority surface — without a version surface, "what's deployed?" is unanswerable. SemVer is the only ladder users already know how to read. Tying patch to PR merges and minor to phase close means version movement matches work cadence with no extra ceremony.

**Tradeoff:** Patch-per-PR can produce noisy version numbers for short tasks. Acceptable — version is for communication, not collectible.

**Limitation:** `package.json` detection presumes a node-shaped dev project. When a non-node dev project lands (Rust, Python, etc.), generalize the detector — likely "any of `package.json`, `Cargo.toml`, `pyproject.toml`" with a per-language bump strategy. Not built now (YAGNI until that project actually exists).

**Alternatives considered:** Standalone `VERSION` file (rejected — duplicates `package.json` for node projects, no benefit); date-based versioning like CalVer (rejected — communicates time-since-release, not change magnitude); auto-categorize PR titles into Added/Changed/Fixed (rejected — heuristic, would lie often, not worth the complexity for a solo dev's CHANGELOG).
