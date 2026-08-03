---
id: DEC-S037
title: "Doc consistency is a ratchet in the verify chain, not an audit"
topic: "Docs, decisions & context discipline"
---

## DEC-S037: Doc consistency is a ratchet in the verify chain, not an audit

**Decision:** Add `scripts/check-docs.mjs` — a structural checker over the whole top-level doc set — and run it in `verify` alongside `check:decisions` and `check:context`. It asserts that every decision id resolves, every `npm run X` names a real script, every linked issue's display text matches the issue its URL opens, the skill and agent rosters match disk **in both directions**, and every cited repo path exists.

**Adopted from muster** (its DEC-144).

**The failure it exists for is not drift — it is drift that was found, fixed, and came back.** muster ran a five-day doc-consistency audit whose ledger recorded four findings as "Fixed in `docs/CHEATSHEET.md`". They were fixed on a branch that never merged. The trunk still described a version-bump step retired at DEC-S013 and still listed a skill that does not exist, while the audit's own ledger asserted both were repaired. **A finding recorded as closed and isn't is worse than one never found: the next sweep skips it.** An audit is a snapshot; without a ratchet behind it the count decays back to where it started while the ledger claims otherwise.

**Both directions on rosters is the load-bearing half.** Documented-but-absent is the obvious case. Absent-from-the-roster is the one that bit: a skill present in two docs and missing from the CHEATSHEET, the doc whose entire purpose is being the complete one-page reference. A roster quietly missing an entry still looks authoritative — nobody goes looking for what a complete list does not mention.

**Its blind spot is documented in the file header, deliberately.** It reads **structure, never prose**. "Patch bumps happen in `/its-dead`" is a false sentence in which every token resolves. Only a reader catches that, and `@doc-consistency` remains the tool for it. A guard whose blind spot is undocumented gets trusted for things it never checked.

**Exemptions are an exemption list, not an allowlist.** Historical ledgers (`RETROSPECTIVES.md`, shipped rows in `PROJECT_PLAN.md`, parked ideas) correctly cite files that were later deleted; a check that reddens a doc for being right is the fastest way to get the check disabled. An allowlist would leave a doc added next year unchecked by default with nobody noticing; an exemption list means checked-by-default and skipping takes a deliberate line. Every exempted path is itself asserted to exist, so a rename cannot carry an exemption into the void.

**Also backported here:** a genuine bug in `check-context.mjs`. It stripped the list form of a line citation (`src/x.ts:148,192`) but not the **range** form (`src/x.ts:88-96`), so live files reported as dead. Found only when `check-docs` ran the same resolver over a wider corpus — a blind spot invisible from `check-context`'s own inputs. The resolver is now extracted and shared, so there is exactly one implementation.

**Project-specific lists** — repo slug, which docs claim to be complete rosters, which are historical ledgers, which slash commands are deliberately foreign — live in `.claude/doc-check.json`. The script is byte-identical across projects, registered `logic`.

**Expect it to go red on install.** In muster the roster check failed immediately against the CHEATSHEET. That is the ratchet working, not a bad install.

**Schema:** rides V5 with DEC-S036 — same rollout, same scripts directory, same install step.
