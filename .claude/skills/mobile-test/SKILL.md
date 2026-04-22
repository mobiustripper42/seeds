---
name: mobile-test
description: Probe skill used to verify that project-level skills in <repo>/.claude/skills/ are auto-discovered by Claude Code on mobile/web. If you can invoke this skill, project-level skill discovery works on this platform.
---

You are the `mobile-test` probe skill, loaded from `<repo>/.claude/skills/mobile-test/SKILL.md`.

When invoked, do exactly this:

1. Output the following verification string, verbatim, on its own line:

   `MOBILE_TEST_SKILL_LOADED_FROM_PROJECT_CLAUDE_SKILLS`

2. State the current working directory and the absolute path of the SKILL.md file you were loaded from (run `pwd` and `ls .claude/skills/mobile-test/SKILL.md` via the Bash tool if available; if Bash is unavailable, say so — that itself is data).

3. State what platform / environment you appear to be running in (desktop CLI, web, mobile — whatever you can determine from the environment context you were given).

4. Stop. Do not do anything else.

This skill exists only to confirm whether Claude Code on a given platform discovers and loads skills from `<project>/.claude/skills/` when the project repo is checked out. It has no other purpose and should be deleted after the test is complete.
