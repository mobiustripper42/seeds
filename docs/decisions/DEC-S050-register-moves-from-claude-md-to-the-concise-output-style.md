---
id: DEC-S050
title: "Register moves from CLAUDE.md to the built-in `Concise` output style"
topic: "Docs, decisions & context discipline"
---

## DEC-S050: Register moves from CLAUDE.md to the built-in `Concise` output style

**See also** — decisions this one changed part of:
- Supersedes the reply-kind tag trial declared in the shell's `## Communication` on 2026-08-09. The
  trial is closed here, and not by its own test — see **The trial closes, but not by passing**
- Refines DEC-S049 — that decision listed the `narration:` switch among what seeds gained by adopting
  the shell whole. The switch is removed here, two hours later, for the same reason as the rest of the
  register prose
- Refines DEC-S032 — S032 recorded as an honest limit that *"the shell rule is prose and will decay
  over a session"* and that the durable bite is a per-surface guard. This is the first time a surface
  other than prose was available for a whole class of rule

**Decision:** The shell's `## Communication` drops from **976 words to 363** — about a third of it the
three surviving rules, the rest a note explaining where register now lives and why nobody should put
it back here. Everything about register — reply length, shape, preamble, when to expand, the four
reply kinds and the tag that announced them — is deleted and handed to Claude Code's built-in **`Concise`** output style, set via
`"outputStyle": "Concise"` in `.claude/settings.local.json`. What stays in `CLAUDE.md` is the three
rules `Concise` says nothing about: **never lead with a false premise**, **ask in prose, never
`AskUserQuestion`**, and **cite facts; label proposals**.

**The mechanism, which is the whole argument.** `CLAUDE.md` is injected as a **user message**. An
output style is appended to the **system prompt**, and every output style fires adherence reminders
during the conversation. That is not a small difference for this class of rule, and the repo had
already conceded it in writing: DEC-S032:18 recorded that a shell rule *"is prose and will decay over
a session"* and that the durable bite belongs to a per-surface guard. For register there was no
surface. Now there is.

**The observed failure, and it is well measured.** The 2026-08-22 tape audit of session 36 produced
Finding 2 — *"Verbosity correction holds for exactly one reply, not durably; re-triggered 4 times."*
Four pushback episodes, all quoted, escalating to *"WAY TOO MANY WORD >>> ONE LINE FUCKIGN FIX AND I
HAVE TO READ 100 FUCKING PARAGRAPHS"*. Every one of them shortened the immediately following reply,
and none survived a topic change. The finding's own conclusion: *"the existing CLAUDE.md rule already
produces the correct behavior on the triggering turn, every time it was checked… What it doesn't
cover, and what a prose rule likely can't cover, is durability across topic changes."*

**Deleting the rules I expect `Concise` to miss is the point, not an oversight.** Two of the deleted
rules — *"one message can hold more than one kind, don't let the longer set the register for both"*
and *"when I push back, say less — never explain"* — are the ones a reading of `Concise`'s
description suggests it does not cover. They are also the two with the worst observed record: say-less
failed four times in one session, and the multi-part rule is the one broken in the soundings exchange
where a neutral question flipped a recommendation and drew three fresh paragraphs. Keeping the rules
predicted to be needed guarantees learning nothing. What `Concise` misses is the specification for a
future custom style; it cannot be discovered while the prose is still there to mask it.

**The trial closes, but not by passing.** The tag carried an explicit on-trial note with its own test:
count replies where the tag and the shape disagree; near zero, keep it. Finding 3 of the same audit
ran it — 49 tagged replies sampled, 4 disagreements — which reads as a pass. **That result is being
set aside, because the test measures the wrong thing.** The replies that drew every one of the four
pushback episodes were tagged `Judgment.` **correctly**, and `Judgment`'s own bullet granted
*"explain at whatever length it takes."* The tag worked as designed throughout the failure it was
meant to prevent. A trial that returns "pass" while the complaint it exists for is getting worse has
returned an answer to a different question, so the tag is retired on the register change rather than
on its own verdict.

That length permit is worth naming separately: **one clause was the standing licence.** Since nearly
every question in these repos is why-shaped, nearly every reply qualified as `Judgment`, so the
exception was the default and terseness was the thing that had to be requested. `Concise` inverts it
— short by default, full when asked — which is the actual fix, and it is structural rather than
exhortative.

**Built-in, not custom, and the two cannot be combined.** `outputStyle` takes one name; a custom style
**replaces** the built-in rather than extending it. So "`Concise` plus our tweaks" does not exist as a
configuration. Writing a custom style now would mean re-deriving Anthropic's text from its
description, blind, and then owning it. Built-in first is therefore both the cheaper and the more
informative order.

**Seeds is not the test bed.** No coding happens here; **muster** is where sessions do real work, so
that is where `outputStyle` has to be set and where the audit will have something to measure. That
makes distribution part of this decision rather than a follow-up: a project receiving the shortened
shell **without** the style set loses the register rules and gains nothing. **Ship the shell edit and
set `outputStyle` in the same visit, per repo.**

**Where `Explanatory` fits.** Design and planning want the opposite of `Concise` — a style that
volunteers insight rather than waiting to be asked — and switching is a per-session act, since the
style is read once at session start and never applies mid-turn. That happens to match how phases
already run: planning sessions and build sessions are already different sessions.

**One unresolved signal, recorded so it is not rediscovered as news.** Three different things share
the word "deprecated" here and only one of them is settled:

| Thing | Status |
|---|---|
| the `/output-style` **slash command** | deprecated v2.1.73, **removed** v2.1.91 — documented, settled. Use `/config` or the setting |
| the **`Explanatory` built-in style** | listed as current in the docs, with no deprecation note |
| the `explanatory-output-style` **marketplace plugin** | its own `plugin.json`, author Anthropic, describes its target as *"the deprecated Explanatory output style"* |

So one Anthropic source calls the style deprecated and another lists it as current. A draft of this
decision resolved that in favour of the plugin manifest and told every project not to build a habit on
`Explanatory` — **wrong weighting**, caught by the operator: a line of plugin metadata is not evidence
against the documentation, and it had been written into a file copied verbatim into every project. The
documentation wins until something contradicts it in the documentation. Recorded here rather than in
the shell, because an unresolved signal is a note for whoever next touches this, not a rule for twelve
repos.

**What this does not fix, stated so a quiet failure is not read as success:**

- **`Concise` is a built-in whose text cannot be read or pinned.** If Anthropic changes it, the
  register changes with it, silently. Accepted because the setting is one line and reverting is
  cheaper than maintaining a fork of prose we cannot see. If it drifts, that is the moment to write
  the custom style.
- **Subagents are unaffected** — a subagent runs its own system prompt, so `@code-review`,
  `@tape-reader` and the rest are unchanged. Confirmed against the documentation rather than assumed;
  the operator's position is that reviewers have never been constrained here and it has been fine.
- **Two rules were drafted and deliberately not added** — *"a question is not a correction"* and *"say
  how strongly you hold a view, inside the view."* Both address the soundings failure where a neutral
  question inverted a recommendation with no new evidence. They are held back because adding rules in
  the same change that removes them makes the result unattributable, and because both already have a
  poor record as prose: the first is close to guidance already present at the harness level, and the
  second is a rule the model generated for itself, unprompted, in the very transcript where it failed.
- **Nothing here is mechanically checked.** No gate reads a reply. The measurement is
  `/read-the-tape`, and the baseline to beat is session 36's four pushback episodes.

**Proof:** none available, and saying so is the point. Prose has no mechanical check in this repo, and
this change is prose being deleted. `npm run verify` passing means the citations still resolve and the
mirror matches — it says nothing about whether the replies get shorter. The evidence will be the next
audit.

**Alternatives considered:** writing a custom output style now, carrying the deleted rules forward
(rejected — it replaces `Concise` rather than extending it, so it means re-deriving text we cannot
read, and it pre-empts the measurement that would tell us what to write). Keeping the register prose
and setting `Concise` alongside it (rejected — the `Judgment` permit contradicts a system prompt that
says short by default, so the test would be confounded from the first turn). Putting the register in
`~/.claude/output-styles/` (rejected — per-machine, absent from git, invisible to `check-mirrors` and
`drift.mjs`, and absent entirely in cloud and phone containers; that is the surface this repo spent
DEC-S049 moving *away* from).
