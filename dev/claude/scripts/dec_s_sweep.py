#!/usr/bin/env python3
"""
dec_s_sweep.py — one-shot fleet migration helper for the DEC-S namespace (DEC-S025).

Converts references to *seeds-workflow* decisions (DEC-NNN -> DEC-SNNN) inside a
project, while leaving the project's OWN decisions plain. It does the safe,
unambiguous conversions automatically and PRINTS everything it can't decide for
you to resolve by hand. It is deliberately not fully automatic: a blind
s/DEC-NNN/DEC-SNNN/ mangles a project's own DECs (bushel DEC-008 = "Fulfillment",
not seeds' staging), which is the bug DEC-S025 exists to prevent.

USAGE
  cd <project> && python3 path/to/dec_s_sweep.py            # dry run: report only
  cd <project> && python3 path/to/dec_s_sweep.py --apply    # write the safe conversions

HOW IT DECIDES
  1. Reads the project's own DEC numbers from its `docs/DECISIONS.md` (`## DEC-NNN`
     headers). The highest is the project's "own ceiling".
  2. Seeds-mirrored files (.claude/skills/**, .claude/agents/sync-config.md,
     .claude/agents/doc-consistency.md): every DEC ref is seeds-workflow ->
     converted. The two illustrative `e.g.` examples are skipped.
  3. Every other text file is project-specific (CLAUDE.md, docs, source, .gitignore):
       - a ref ABOVE the own ceiling is unambiguously seeds -> converted.
       - a ref AT/BELOW the ceiling is AMBIGUOUS (could be the project's own DEC or a
         seeds ref like DEC-005 branch-model) -> left plain and listed under
         "NEEDS REVIEW" with file:line + context for you to judge.
  4. `docs/DECISIONS.md`, the architect template, and any path under EXCLUDE stay
     untouched (project's own defs; illustrative-only).

ALWAYS dry-run first. The NEEDS REVIEW list always includes the project's OWN DECs
(the script can't tell them from seeds refs by regex) — that is expected, not a
failure. Your job: scan that list for any line that is actually a *seeds* ref
hiding at/below the ceiling (e.g. a bare "DEC-005" meaning the branch-model DEC in
your CLAUDE.md), hand-convert those, then run --apply for the unambiguous rest.
Done = the NEEDS REVIEW list contains only refs you've confirmed are project-own or
illustrative.
"""
import argparse, os, re, subprocess, sys

DEC = re.compile(r'\bDEC-(0\d\d)\b')
SHORT = re.compile(r'\bDEC-S(0\d\d)/(0\d\d)\b')  # "DEC-S013/014" shorthand fixup

# Seeds-mirrored files: copied verbatim from seeds, so every DEC ref is seeds-workflow.
MIRRORED = [
    ".claude/skills/*/SKILL.md",
    ".claude/agents/sync-config.md",
    ".claude/agents/doc-consistency.md",
]
# Lines never touched anywhere (illustrative `e.g.` examples per DEC-S025).
SKIP_SUBSTR = ['this contradicts DEC-007', 'is not stubbed locally']
# Paths never touched: project's own decision log + the architect template (example only).
EXCLUDE = {"docs/DECISIONS.md", ".claude/agents/architect.md"}


def tracked_text_files():
    out = subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout
    files = []
    for p in out.splitlines():
        if not os.path.isfile(p):
            continue
        try:
            open(p, encoding="utf-8").read()
        except (UnicodeDecodeError, IsADirectoryError):
            continue
        files.append(p)
    return files


def own_ceiling():
    path = "docs/DECISIONS.md"
    if not os.path.isfile(path):
        print("WARN: no docs/DECISIONS.md — treating project as having no own DECs "
              "(every DEC ref will be considered seeds).", file=sys.stderr)
        return 0
    nums = [int(m) for m in re.findall(r'^#+\s*DEC-(\d{3})\b', open(path, encoding="utf-8").read(), re.M)]
    return max(nums) if nums else 0


def expand(globs):
    import glob
    return {p for g in globs for p in glob.glob(g)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    args = ap.parse_args()

    ceiling = own_ceiling()
    mirrored = expand(MIRRORED) - EXCLUDE
    review, applied = [], {}

    for path in tracked_text_files():
        if path in EXCLUDE:
            continue
        is_mirrored = path in mirrored
        lines, changed = open(path, encoding="utf-8").readlines(), 0
        out = []
        for i, ln in enumerate(lines, 1):
            if any(s in ln for s in SKIP_SUBSTR):
                out.append(ln); continue

            def repl(m):
                nonlocal changed
                n = int(m.group(1))
                if is_mirrored or n > ceiling:        # unambiguously seeds
                    changed += 1
                    return "DEC-S" + m.group(1)
                review.append((path, i, m.group(0), ln.strip()[:140]))  # ambiguous
                return m.group(0)

            new = DEC.sub(repl, ln)
            new = SHORT.sub(lambda m: f"DEC-S{m.group(1)}/S{m.group(2)}"
                            if (is_mirrored or int(m.group(2)) > ceiling) else m.group(0), new)
            out.append(new)
        if changed:
            applied[path] = changed
            if args.apply:
                open(path, "w", encoding="utf-8").writelines(out)

    print(f"Project own-DEC ceiling: DEC-{ceiling:03d} (from docs/DECISIONS.md)\n")
    print(f"{'APPLIED' if args.apply else 'WOULD CONVERT'} — safe seeds-workflow refs:")
    for p, c in sorted(applied.items()):
        print(f"  {c:4d}  {p}")
    print(f"  ---- {sum(applied.values())} total\n")

    if review:
        print(f"NEEDS REVIEW — {len(review)} ambiguous ref(s) at/below DEC-{ceiling:03d} "
              "(could be this project's own DEC OR a seeds ref like DEC-005). Judge per line:")
        for p, i, tok, ctx in review:
            print(f"  {p}:{i}  [{tok}]  {ctx}")
    else:
        print("No ambiguous refs — nothing left to judge by hand.")

    if not args.apply:
        print("\nDry run. Re-run with --apply once the NEEDS REVIEW list is hand-resolved.")


if __name__ == "__main__":
    main()
