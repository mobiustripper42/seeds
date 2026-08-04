---
id: DEC-S009
title: "Supabase prod-write guard — discipline + wrapper script"
topic: "Tooling & safety"
---

## DEC-S009: Supabase prod-write guard — discipline + wrapper script

**Decision:** Two-layer defense against destructive Supabase CLI ops landing on production:
- **Discipline:** never `supabase link` to a prod project ref from a dev box. Production reads its `SUPABASE_URL` + service-role key from Vercel env vars; there is no reason for a local link to prod.
- **Wrapper script:** `scripts/safe-supabase.sh` (template at `dev/claude/scripts/safe-supabase.sh`) reads the linked ref from `supabase/.temp/project-ref` and a per-project prod-ref allowlist from `.claude/prod-supabase-refs` (gitignored). For destructive subcommands, if the linked ref is in the prod list, refuses the operation and prints a remediation hint. Pass-through for everything else. The matcher walks adjacent argument pairs (not just `$1 $2`), so leading global flags don't shift the destructive subcommand out of view.

**Guards (extend as new destructive forms surface):** `db reset`, `db push`, `db remote *`, `migration up`, `migration repair`.

**Why:** `supabase db reset` is a common dev-loop command that needs to work freely on staging — but the same command on a prod link would wipe production. Discipline alone fails the day someone runs `supabase link --project-ref <prod>` to "just check something" and forgets to relink. The wrapper closes that gap without restricting the staging dev loop.

**Tradeoff:** Wrapper only catches CLI ops that go through the linked-project mechanism. Bypass surfaces (by design — the wrapper is opt-in protection, not a sandbox):
- `--db-url postgres://...prod...` on `db push` / `db remote commit` bypasses the link entirely.
- Dashboard ops, direct `psql` against the prod URL, any tool not going through the `supabase` binary.
- A user who keeps invoking `supabase` directly (no shell alias) sees no protection.

These rely on the discipline (no prod URL in local env, no prod password on disk). Aliasing `supabase='./scripts/safe-supabase.sh'` is what makes the protection transparent.

**Detection — "is this a Supabase project?":** presence of `supabase/` directory at the repo root. Projects without it skip the script + setup entirely.

**Where the prod list lives:** `<project>/.claude/prod-supabase-refs`, gitignored. One ref per line, blank lines + `#` comments allowed. Per-project rather than global so multi-project dev boxes don't cross-contaminate (e.g. project A's prod ref shouldn't block project B's destructive ops). A stale ref from a retired project would silently un-protect a global file; per-project keeps the blast radius scoped.

**Alternatives considered:** Single global `~/.claude/prod-supabase-refs` (rejected — cross-project bleed, retired-project staleness). Wrap with a shell alias only, no script (rejected — discipline becomes "remember to type `safe-supabase` instead of `supabase`"; a script + alias is just-as-easy and transparent). Block at the CLI argv level via a hook in the supabase CLI itself (rejected — Supabase CLI has no plugin hook; we'd be patching their binary). PR-test that runs against staging-only (rejected — different concern; this guard is for the developer's local box, not CI).

---
