---
id: DEC-S002
title: "Skills live project-level, not user-global"
topic: "Template families & repo structure"
---

## DEC-S002: Skills live project-level, not user-global

**Decision:** Session skills (`/its-alive`, `/kill-this`, etc.) live in `<project>/.claude/skills/`, checked into each project's repo. Not in `~/.claude/skills/` (user-global).
**Why:** Skills are project-shaped, not device-shaped — `/kill-this` in a Next.js repo runs `npm run build`; in a farm repo it doesn't. Project-level skills ride along with the git checkout, so they're automatically consistent across laptop, headless box, and mobile — no separate device-sync mechanism needed.
**Verified (2026-04-22):** Mobile CC auto-discovers `<project>/.claude/skills/` from a cloned repo. Confirmed via `mobile-test` probe skill.
**Tradeoff:** Setup step per new project (seed the skills from seeds). `~/.claude/skills/` becomes empty or holds only truly cross-project skills.
