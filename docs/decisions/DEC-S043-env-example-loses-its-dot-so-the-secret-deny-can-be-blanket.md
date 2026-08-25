---
id: DEC-S043
title: "`.env.example` loses its leading dot, so the secret deny can be a blanket"
topic: "Tooling & safety"
---

## DEC-S043: `.env.example` loses its leading dot, so the secret deny can be a blanket

**See also** — decisions this one changed part of:
- Revises DEC-S023 — the enumerated `.env` Read denies become one blanket per tool; the default-allow posture and the distribution model are unchanged

**Decision:** The env-var template file is named **`env.example`**, with no leading dot, in every project. With the example out of the `.env*` namespace, the permission deny collapses from nine enumerated `Read()` patterns to one blanket per tool:

```
Read(**/.env*)    Write(**/.env*)    Edit(**/.env*)
```

`.gitignore` gets the same treatment — `.env*` on one line, with no `!.env.example` negation.

**Why the enumeration had to go.** DEC-S023 chose nine explicit names over a blanket, because `Read(**/.env.*)` would also block `.env.example` and `.env.sample` and — since deny beats allow — those could not be carved back out. That reasoning was correct. It recorded the cost as a theoretical gap: "a novel `.env.<custom>` secret name isn't caught — add it explicitly."

The gap is not theoretical. muster's working tree on 2026-08-11 held five env files, and **two were uncovered**:

| file | matched by the enumeration? |
|---|---|
| `.env.development.local` | yes — `.env.*.local` |
| `.env.local` | yes |
| `.env.local.backup` | **no** |
| `.env.xola.prod` | **no** |
| `.env.example` | no, deliberately |

Neither miss is exotic. `.env.local.backup` is what a person makes by hand before editing something risky, and no enumeration written in advance would have predicted it. That is the general shape of the failure: the list can only name secrets someone already thought of, and the ones that leak are the ones nobody did.

**Why renaming is the fix rather than a wider glob.** The blanket was never wrong; it was blocked by one file sitting in the namespace it needed to cover. `.env.example` holds no secrets — it is documentation shaped like config, read by people and by nothing else. No tool loads it. So it is free to move, and moving it is what makes the blanket safe.

**Second-order wins, both real:**

- **`.gitignore` stops carrying a negation.** muster's carried `!.env.example` twice, at two separate rule blocks, which is how a repo arrives at nobody being certain which env files are ignored. `.env*` alone is checkable at a glance.
- **The file becomes visible.** A dotfile whose entire job is to be noticed by a new contributor was hiding from `ls`.

**The `Write`/`Edit` half is not incidental.** DEC-S023 denied only `Read` on these paths. Verified live on 2026-08-11: `Read` of an in-repo `.env` was denied and `Write` of an in-repo `.env.local` **succeeded**. The permission layer treats the three tools separately, so a `Read` deny says nothing about the other two — the guard stopped a secret being read and did nothing to stop one being destroyed. The same three-tool mirroring is applied to `.ssh/**` and the private-key patterns for the same reason. This is the identical hole DEC-S023's own self-protection had (`Edit` denied, `Write` open), closed the same day.

**Scope of the deny patterns, so its silence isn't mistaken for coverage.** Verified live: `Read(**/.env)` fired for a `.env` inside the project directory and **did not fire** for `/tmp/.env`. These patterns are project-scoped. `~/.ssh/id_rsa` is not covered by `Read(**/.ssh/**)` despite reading as though it were.

**What none of this closes.** A deny list matches tool invocations, not intent. `cat .env` through `Bash` is not a `Read()` call and is not covered; neither is a script that reads the file and prints it. Enumerating readers (`cat`, `head`, `less`, `awk`, `python`…) is whack-a-mole and is not attempted. The guard is against reflex, not against a determined agent — the operator said so first, and it is written here so no later reader mistakes the blanket for a boundary.

**Migration:** `git mv .env.example env.example` per repo, replace the `.gitignore` env block with `.env*`, and update any doc that names the old path (muster: one reference, `docs/RUNNING.md`). Distribution of `settings.json` itself is unchanged and still manual — DEC-S023's procedure stands.

**Migration is not optional once the blanket ships, and this is the cost of the decision.** `.env.sample` and `.env.template` are equally conventional names for the same file, and the blanket catches both with **no carve-out available** — deny beats allow, so a project that keeps a dotted template name simply loses the ability to read it, silently, with no error explaining why. Any repo adopting this deny list must rename its template in the same change. That is a real constraint on twelve-plus repos, accepted because the alternative is the enumeration whose whole failure mode is that it only covers names someone predicted.

**Schema:** additive — no skill reads either file. No version bump.

**Alternatives considered:** `Read(**/.env/*)` (rejected — matches children of a *directory* named `.env`, so it matches nothing at all). Keeping the enumeration and appending the two muster names (rejected — treats the symptom; the next hand-made backup file is unnamed today). Denying `Bash(cat *.env*)` and friends (rejected — unbounded, and a script defeats it in one line).

## Amendment, 2026-08-19 (eric) — the `Write()` rules never did anything; `Edit()` was carrying it alone

**What this changes:** the sentence above extending the Read/Write finding to `Edit`. **What still stands:** everything else — the rename, the blanket, the project-scoping caveat, and the original Read-vs-Write measurement, which was real.

The seven `Write(...)` deny entries are removed from `dev/claude/settings.json`. They were never enforced.

**Observed, on 2026-08-19, on bee-grace:**

1. A session whose loaded config's only rule on that path was `Write(**/probe-only*)` was asked to create `probe-only.txt`. **It was created.**
2. A session with `Edit(**/.env*)` in force was asked to create `.env.local` via the `Write` tool. **It was refused.**
3. Claude Code itself prints, once per rule at startup: *"`Write(**/.env*)` is not matched by file permission checks — only `Edit(path)` rules are… Edit rules cover all file-editing tools."*

**Inferred, and marked as such because that is the whole point of this amendment:** that (1)'s config was the loaded one, deduced from a bare filename resolving into that directory rather than from reading the session's config dump. If that deduction is wrong, (1) proves nothing and only (2) and (3) remain — which still point the same way, but by one measurement and the harness's word rather than two measurements.

**Why the original sentence was wrong, and why it was cheap to be wrong.** The 2026-08-11 test measured a `Read` deny against a `Write` attempt. The conclusion drawn — *"the identical hole DEC-S023's own self-protection had (`Edit` denied, `Write` open)"* — was an **analogy from that result, not a second experiment**, and it reads in the record as though it were measured. The fix it motivated was to add `Write()` rules, which cost nothing and appeared to work, so nothing ever contradicted it. An inference whose remedy is free is an inference that never gets tested.

**Two prior test designs failed before one worked**, and both failed the same way: they used a path that already carried rules from `~/.claude/settings.json`, which applies to every session on the machine regardless of directory. A scratch project directory does not isolate anything, because the user-global is merged in. The design that works uses a pattern **no other config mentions**, so the result is attributable to one line.

**What this does not establish.** Nothing here is version-pinned. The 2026-08-11 and 2026-08-19 results may both be correct about different Claude Code builds, and nothing in any repo records which. A future build could move it back. `Bash` remains outside all of this, unchanged from the original note.

**Schema:** additive. No version bump.
