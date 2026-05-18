---
session: 28
dev: eric
slug: baseline-sweep-crewbook-seeds-iPeg2
branch: claude/baseline-sweep-crewbook-seeds-iPeg2
started: 2026-05-18T16:54:16Z
ended:
points:
pr_numbers: []
status: open
transcript: /root/.claude/projects/-home-user/bc6bacab-9d03-46ac-ae65-3c0af14c0887.jsonl
---

# Session 28 — baseline-sweep-crewbook-seeds-iPeg2

<!-- Task blocks appended by /kill-this, one per task. -->

**Next Steps:**

**Context:**
- Multi-repo session: working in both `seeds` and `crewbook`. Seeds session opened first (this file); crewbook session-file setup deferred until we actually touch that repo (per user choice "Start in seeds, then crewbook").
- Working directory is `/home/user` (not a git repo). Both repos sit under it; `/home/user/seeds` and `/home/user/crewbook` each carry the pre-cut branch `claude/baseline-sweep-crewbook-seeds-iPeg2`. The remote tracking branch was deleted (HTTP 403 on push --delete), so the local branch has no upstream until first push.
- Seeds fast-forwarded `main` 926779a → e2f064f at session start (one merge commit + sync-config backport from helm).
- Crewbook is on `main` exactly (33274f4). No drift.

**Cleanup pending (remote branch deletes — proxy blocks `git push --delete`; do via GitHub UI):**
- seeds — `claude/extract-captainslog-repo-4O6ln` (1 stray pre-DEC-014 session-file commit; user approved delete)
- seeds — `claude/organize-project-structure-GGPir` (2 commits adding `PORTFOLIO.md`; never PR'd, user did not authorize; user approved delete)
- seeds — `task/29-routine-duplicate-pr-detection` (0 commits ahead; user approved delete)
- crewbook — `auto-sync/downstream/2026-05-13` (0 commits ahead; user approved delete)

**Baseline-sweep findings (initial scan):**
- crewbook has **not migrated to DEC-014**: `sessions/` still on `main` (2 legacy session files), no `origin/sessions` orphan branch, no `.sessions-worktree/`. Migration is required before this session can open a per-project session file in crewbook the normal way.
- crewbook PR #6 (merged earlier today, 2026-05-18) deferred two files as "Both-modified" / uncertain customization — these are exactly what a baseline sweep should resolve:
  - `.claude/agents/ui-reviewer.md` (project had 7722 bytes vs template 8061 bytes)
  - `.claude/skills/retro/SKILL.md` (max(pr.createdAt) formula + read-before-edit not yet applied)
- crewbook `.claude/project-type` is empty (0 bytes); sync-config treats as ungated. May want to write `webapp` to it.
- PORTFOLIO.md surfaced as an orphan — useful prior-art for a cross-project status wall, but never landed and user wants it gone. If we want this concept, we re-author from scratch with full visibility.
