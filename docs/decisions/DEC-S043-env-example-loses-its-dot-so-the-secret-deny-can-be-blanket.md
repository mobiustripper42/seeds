---
id: DEC-S043
title: "`.env.example` loses its leading dot, so the secret deny can be a blanket"
topic: "Tooling & safety"
amends:
  - id: DEC-S023
    relation: revises
    scope: "the enumerated `.env` Read denies become one blanket per tool; the default-allow posture and the distribution model are unchanged"
---

## DEC-S043: `.env.example` loses its leading dot, so the secret deny can be a blanket

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

**Schema:** additive — no skill reads either file. No version bump.

**Alternatives considered:** `Read(**/.env/*)` (rejected — matches children of a *directory* named `.env`, so it matches nothing at all). Keeping the enumeration and appending the two muster names (rejected — treats the symptom; the next hand-made backup file is unnamed today). Denying `Bash(cat *.env*)` and friends (rejected — unbounded, and a script defeats it in one line).
