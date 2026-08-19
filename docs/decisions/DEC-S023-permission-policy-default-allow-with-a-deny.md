---
id: DEC-S023
title: "Permission policy — default-allow with a deny guardrail; master in seeds, distributed by hand (resolves DEC-S020)"
topic: "Tooling & safety"
---

## DEC-S023: Permission policy — default-allow with a deny guardrail; master in seeds, distributed by hand (resolves DEC-S020)

**See also** — decisions this one changed part of:
- Resolves DEC-S020 — settings.json ships as a manual-merge template, not an auto-synced JSON merge

**See also** — later decisions that changed part of this one:
- Revised by DEC-S043 — the enumerated `.env` Read denies become one blanket per tool; the default-allow posture and the distribution model are unchanged
- Refined by DEC-S044 — the per-repo settings.json now has one thing that notices when it is missing; distribution of its contents stays manual and unwatched
- Extended by DEC-S045 — adds a user-global-only hooks stanza to the hand-distribution list; the permission policy itself is untouched

**Decision:** The Claude Code permission posture is **default-allow**: `allow` carries `Bash(*)` (plus `Read`/`Edit`/`Write`/`Glob`/`Grep`), and a **deny list is the only seatbelt**. `deny` beats `allow`, so destructive/secret commands are blocked and everything else runs without prompting. The canonical "master" lives at `dev/claude/settings.json` in seeds. It is **NOT auto-synced** by `@sync-config`/the Routine — it's distributed by hand (see procedure in seeds `README.md` § Permission settings).

**Why default-allow:** the operator isn't reading long concatenated shell commands and wouldn't action them anyway, so a gated allow-list just produces prompts that get rubber-stamped — security theater. Flipping to `Bash(*)` + a solid deny list removes the noise and concentrates the protection where it's read: the deny list. (Use `defaultMode: default`, NOT `bypassPermissions` — bypass would disable the deny list too.)

**The deny list is therefore load-bearing** and a bit hardened beyond the obvious: destructive git (`push --force`/`-f`, `reset --hard`, `clean -f`, `branch -D`), `rm -rf` of dangerous roots + `.git*`, `dd`, `mkfs*`, `truncate`, recursive/`777` chmod, redirects to `/dev/*` (best-effort — CC's matcher is unreliable on redirections), all `sudo`, network-exfil (`curl`/`wget`/`nc`), and reads of `.env` secrets / `.envrc` / `.ssh/**` / private keys.

**Precedence gotcha (Claude Code):** `deny` beats `allow` — once denied you cannot re-allow a subset. So the `.env` deny is **enumerated** (`.env`, `.env.local`, `.env.*.local`, `.env.{development,production,preview,staging,test}`, `.envrc`) not a blanket `Read(**/.env.*)`, so `.env.example`/`.env.sample` stay readable. Trade-off: a novel `.env.<custom>` secret name isn't caught — add it explicitly.

> **No longer true as written — DEC-S043 reversed this paragraph specifically.** The trade-off's "novel name isn't caught" was not theoretical: two uncovered files turned up in one repo. Renaming the template to `env.example`, out of the `.env*` namespace, removed the reason for the enumeration, and the deny is now a blanket per tool. The precedence gotcha itself still holds and is why the rename was the fix rather than a wider glob. Stated inline because this paragraph makes a **live-state** claim about what the deny list contains, which a reader checking "what is denied today" would otherwise take at face value from the body.

**Distribution — master → machines (the real model):**
- **Real machines (windows laptop, mill-dev, bee-grace — distinct boxes):** copy the master into each machine's **user-global** `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`). One global file = every repo + every ad-hoc dir on that box. Globals don't travel via git; set once per machine.
- **Phone (CC on web — ephemeral container):** no editable global. Covered only by the **committed per-repo `.claude/settings.json`** (cloned with the repo). Reminder lives in the README: before a code-heavy phone session, confirm that repo's committed file matches the master.

**Updating the allowlist:** not self-service. The recurring trigger is never a simple missing command (default-allow covers those) — it's something gnarly that got denied. Procedure: bring it to a Claude session in seeds, which edits the master + emits the redistribute steps. No `/permissions` muscle-memory to maintain.

**`.claude/settings.local.json`** (per-machine, gitignored) is never templated, synced, or edited by skills — the user's per-box override surface. Under default-allow most accumulated local "always-allow" entries become redundant; a cleanup prompt lives in the README (preserves any personal `deny`, strips redundant/stale allows).

**Schema:** additive within v4 — no skill requires the settings file. No version bump.

**Alternatives considered:** gated allow-list of specific tools (rejected — produces rubber-stamped prompts; the operator doesn't read the commands). `bypassPermissions` mode (rejected — disables the deny list, the one thing we rely on). Auto-merge settings into `@sync-config` (rejected — security guardrails shouldn't be bot-edited; and default-allow makes per-repo allow churn rare anyway). Blanket `Read(**/.env.*)` deny (rejected — blocks `.env.example`, deny can't be carved back).

## Amendment, 2026-08-17 (workout) — the deny list may enforce a workflow rule, not only prevent damage

**What this changes:** the deny list's remit. **What still stands:** everything else — default-allow,
`deny` beats `allow`, the master in seeds, hand distribution, the precedence gotcha, and every existing
entry. This adds one entry and the principle that admits it.

Every entry before this one blocks something **damaging**: destructive git, `rm -rf`, secrets, network
exfil, remote-package runners. `Bash(sed -n *)` blocks something merely **wrong** —
`sed -n '120,160p' <file>` where `Read` with `offset`/`limit` does the same job. That is a new
category, and it is added on evidence rather than tidiness.

The rule against it has been written in `dev/claude/CLAUDE.md` § Workflow Notes for months, in a
paragraph that names the exact banned shape and cites the two `/kill-this` and `/promote-production`
stalls that motivated it. In one week of audited sessions it was violated **58 times across three
sessions and two repos** — 34 in one muster session, 21 in another, 3 in soundings — with no operator
correction in any of them, because there was nothing to correct: every call succeeded. The harm only
lands on the intermittent allow-pattern miss, and when it lands it stops a skill dead mid-run. A rule
whose violation is invisible 57 times out of 58 has a sample size of one no matter how often it
happens, and more prose next to prose that has already lost is accretion.

Evidence: `observations/archive/2026-08/2026-08-14-muster-686-resend-and-copy-link.md` (34),
`2026-08-17-muster-main.md` (21), `2026-08-14-soundings-3.7-poop-deck-publish.md` (3).

**What this costs, stated rather than discovered.** A legitimate `sed -n` — extracting from a pipe,
say — is now denied with a message that does not explain itself, and the same week's audits show a
denied command gets re-shaped and retried once or twice before the model pivots
(`2026-08-14-bushel-mobile-main.md`: `curl` denied, retried near-verbatim, then solved with `ss`).
So the entry buys 58 silent violations for a handful of noisy round trips. It also does not cover
`awk 'NR==...'` or a bare `cat <file>`, which the prose bans and no entry blocks; those stay prose,
and if they show up at this volume they earn their own line.

**A `PreToolUse` hook would be strictly better** — it can explain itself in the refusal, which is the
whole cause of the retry cost above. It is not built. This entry is the cheap version that binds
today; the hook stays the right answer if the retries turn out to be worse than the violations.

## Amendment, 2026-08-19 (eric) — the deny list stops protecting itself

**What this changes:** the three `Edit(.claude/settings.json)` / `Edit(.claude/settings.local.json)` / `Edit(~/.claude/settings.json)` entries are removed. **What still stands:** everything else — default-allow, `deny` beats `allow`, the master at `dev/claude/settings.json`, and hand distribution. The secret paths keep both their `Read` and `Edit` denies.

**Why the self-protection went.** It was defended as closing the obvious hole in a policy the restricted party can rewrite. It never closed it. `DEC-S043` says so in its own words — *"a deny list matches tool invocations, not intent… The guard is against reflex, not against a determined agent"* — and a session that wanted to rewrite the file could always do it through `Bash`, which no rule here covers.

So the entries bought a guard against reflex, and charged for it every time the policy legitimately needed to change. That bill came due in one session: the file was corrected in `dev/claude/settings.json` and then had to be hand-copied to a machine global, a second machine's checkout, and a project's committed copy, one `cp` at a time, with a wrong-file mistake in the middle because seeds ships two `settings.json` one directory apart. Four manual steps to distribute a change whose whole purpose was removing seven lines of noise.

**What is actually lost, stated plainly so nobody re-derives it as a surprise:** a session can now edit permission files with `Edit`/`Write` without a prompt, including the machine-global one. The thing that made this acceptable is that it could already do it, less visibly, through a shell command — the deny made the honest path harder and the dishonest path no harder at all.

**What remains the guard.** Review. The permission policy is a tracked file in a repo with a doc gate and a code review on every change, and a diff that loosens it is visible in exactly the place changes are looked at. That is a stronger control than a rule the same session can route around, and it is the one that was doing the work all along.

**Not reconsidered here:** the secret-file denies, the destructive-`Bash` guardrails, or hand distribution. This is one narrow removal.

**Schema:** additive. No version bump.
