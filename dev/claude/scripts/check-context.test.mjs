// Tests for the context-doc path checker.
//
// The value of this suite is almost entirely in the NEGATIVE cases. A path checker that finds
// nothing looks identical whether it is working or whether its matcher stopped matching — the
// #589 failure. So the cases below pin what it deliberately ignores as hard as what it catches.
//
// EVERYTHING RUNS AGAINST A FIXTURE TREE, not against the repo the suite happens to sit in.
// That is the whole reason this file was rewritten. `check-context.mjs` reads the filesystem
// through the cwd — `ROOTS` is built from `readdirSync('.')` at module load, and `resolves()`
// calls `existsSync` on a relative path — so every assertion below is a claim about the layout
// of whatever repo runs it. The original suite asserted that `src/adapters/twilio-channel.ts`
// and `app/(crew)/crew/shift/[shiftId]` were real, which is true in exactly one repo. It passed
// there and failed 9 ways in seeds, and nobody knew, because seeds had no test runner (issue
// #186) and no other project ran the script tests either. A suite that can only pass in the
// repo it was written in is not portable, and this one ships to every project.
//
// So: build the tree the assertions describe, `chdir` into it, and import the module afterwards
// so its cwd-derived constants are computed against the fixture. The import must come after the
// chdir — `ROOTS` is module-load-time state, which is exactly why this can't be done with a
// plain top-level import.
//
// What this deliberately gives up: the old `check()` case asserted the REAL docs of the host
// repo were clean. That assertion belongs to the gate — running `check-context.mjs` in `verify`
// is what checks a project's actual docs, on every run, against the real tree. A unit suite
// doing it too only bought a second opinion in one repo while making it unrunnable everywhere.

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let check, expandBraces, isClaim;
let fixture;
let cwdBefore;

/**
 * The tree the assertions below describe. Shaped like a Next.js + App Router project because
 * that is what the checker's own comments cite as the motivating cases: a route group, a dynamic
 * segment whose brackets are not a character class, and an adapter glob.
 */
const FIXTURE_FILES = [
  "CLAUDE.md",
  ".claude/CLAUDE-context.md",
  "src/adapters/twilio-channel.ts",
  "src/adapters/sms-channel.ts",
  "app/lib/channel.ts",
  "app/(crew)/crew/shift/[shiftId]/page.tsx",
  "docs/decisions/DEC-143-x.md",
  "scripts/check-decisions.mjs",
  "scripts/gen-decisions-index.mjs",
  // A top-level `components/` so the `<placeholder>` case proves the angle-bracket rule rather
  // than passing for the uninteresting reason that `components` is not a root here.
  "components/.keep",
];

// Deliberately ABSENT from the fixture, and each absence is load-bearing:
//   dev/                        — so `dev/claude/...` reads as another repo's path, not a claim
//   origin/, feature/           — so those spans read as git refs
//   @core/                      — so the tsconfig alias is not a path
//   app/(crew)/crew/ask/        — the dead-brace case cites `{ask,nowhere}`, and `patternMatches`
//                                 passes a brace pattern if ANY alternative resolves (`.some()`
//                                 at check-context.mjs:122). So BOTH alternatives have to be
//                                 missing for that expansion to count as dead. Creating `ask/`
//                                 here silently turned the negative control green — caught only
//                                 because the assertion pins an exact failure count.

beforeAll(async () => {
  fixture = mkdtempSync(join(tmpdir(), "check-context-fixture-"));
  for (const rel of FIXTURE_FILES) {
    const abs = join(fixture, rel);
    mkdirSync(dirname(abs), { recursive: true });
    // The two context docs must parse as clean: they are what no-arg `check()` reads.
    writeFileSync(abs, rel.endsWith(".md") ? "See `src/adapters/twilio-channel.ts`.\n" : "");
  }
  cwdBefore = process.cwd();
  process.chdir(fixture);
  // Imported AFTER the chdir on purpose — see the header note.
  ({ check, expandBraces, isClaim } = await import("./check-context.mjs"));
});

afterAll(() => {
  if (cwdBefore) process.chdir(cwdBefore);
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe("isClaim — what counts as a claim about this repo", () => {
  it("accepts a path rooted in a real top-level directory", () => {
    expect(isClaim("src/adapters/twilio-channel.ts")).toBe(true);
    expect(isClaim("app/lib/channel.ts")).toBe(true);
    expect(isClaim("docs/decisions/DEC-143-x.md")).toBe(true);
  });

  it("ignores a bare filename, which is shorthand rather than a location", () => {
    // `layout.tsx`, `DEPLOY.md`, `login-code.ts` all appear this way in the docs today.
    expect(isClaim("layout.tsx")).toBe(false);
    expect(isClaim("DEPLOY.md")).toBe(false);
  });

  it("ignores git refs, which are not paths", () => {
    expect(isClaim("origin/production")).toBe(false);
    expect(isClaim("feature/reservations")).toBe(false);
  });

  it("ignores another repo's paths, which correctly do not exist in this one", () => {
    expect(isClaim("dev/claude/templates/VersionTag.tsx")).toBe(false);
  });

  it("ignores an explicit <placeholder>, since Next route params are real dirs", () => {
    // `components/<feature>/` describes a shape; `app/(crew)/crew/shift/[shiftId]` is a real
    // directory, so brackets can't be the placeholder marker — angle brackets are. `components`
    // IS a root in the fixture, so this fails for the right reason if the rule is removed.
    expect(isClaim("components/<feature>/")).toBe(false);
    expect(isClaim("app/(crew)/crew/shift/[shiftId]")).toBe(true);
  });

  it("ignores a tsconfig alias", () => {
    expect(isClaim("@core/*")).toBe(false);
  });
});

describe("expandBraces", () => {
  it("expands a brace list, including the empty alternative", () => {
    expect(expandBraces("crew/{,open,calendar}/page.tsx")).toEqual([
      "crew//page.tsx",
      "crew/open/page.tsx",
      "crew/calendar/page.tsx",
    ]);
  });

  it("expands nested groups and leaves a brace-free pattern alone", () => {
    expect(expandBraces("{a,b}/{x,y}")).toEqual(["a/x", "a/y", "b/x", "b/y"]);
    expect(expandBraces("src/*.ts")).toEqual(["src/*.ts"]);
  });
});

describe("check", () => {
  it("passes on docs whose every cited path and pattern resolves", () => {
    // No-arg `check()` reads the two context docs off disk — here, the fixture's. Asserting the
    // HOST repo's real docs is the gate's job, not this suite's; see the header note.
    expect(check()).toEqual([]);
  });

  it("catches a dead path, a dead glob, and a dead brace expansion", () => {
    // The negative control. Without it, a matcher that quietly stopped matching would leave
    // this suite green and the check permanently inert.
    const failures = check([
      { path: "fixture.md", text: "See `src/adapters/no-such-channel.ts` and `src/adapters/*-nope.ts`." },
      { path: "fixture2.md", text: "Surfaces: `app/(crew)/crew/{ask,nowhere}/page.tsx`." },
    ]);
    expect(failures).toHaveLength(3);
    expect(failures[0]).toMatch(/no-such-channel\.ts.*does not exist/);
    expect(failures[1]).toMatch(/\*-nope\.ts.*does not exist/);
    expect(failures[2]).toMatch(/nowhere.*does not exist/);
  });

  it("resolves a glob under a Next dynamic segment, whose brackets are not a character class", () => {
    // `globSync` reads `[shiftId]` as "one character from s,h,i,f,t,I,d" and matches nothing, so
    // every dynamic route in an App Router project was uncitable in the two always-loaded docs —
    // the check reported the doc as wrong for being right. `isClaim` above already asserts these
    // are real directories, which is what made the pair contradict each other.
    expect(check([{ path: "f.md", text: "`app/(crew)/crew/shift/[shiftId]/**`" }])).toEqual([]);
    // Still a negative control: escaping must not turn every bracket pattern into a pass.
    expect(check([{ path: "f.md", text: "`app/(crew)/crew/nope/[shiftId]/**`" }])[0]).toMatch(/does not exist/);
  });

  it("resolves a real glob and a real brace expansion", () => {
    expect(
      check([{ path: "fixture.md", text: "`src/adapters/*-channel.ts` and `scripts/{check,gen}-decisions*.mjs`" }]),
    ).toEqual([]);
  });

  it("checks a pointer written as the `ls <path>` command a reader would run", () => {
    // The first version's no-whitespace rule made every `ls `-prefixed span invisible — including
    // the two authoritative-list pointers in CLAUDE-context.md and the one this script's own
    // comment holds up as the worked example. The check was blind to exactly the pattern it
    // exists to encourage, and the docs asserted it was covered.
    expect(check([{ path: "f.md", text: "list: `ls src/adapters/*-channel.ts`" }])).toEqual([]);
    expect(check([{ path: "f.md", text: "list: `ls src/adapters/*-nope.ts`" }])[0]).toMatch(/does not exist/);
  });

  it("reads a span the author escaped for a shell paste", () => {
    // `app/\(crew\)/crew/` is written backslashed so it can be pasted into bash. Those slashes
    // are for the shell, not for a filesystem lookup.
    expect(check([{ path: "f.md", text: "`ls app/\\(crew\\)/crew/`" }])).toEqual([]);
  });

  it("never invokes a shell, so a doc cannot execute anything", () => {
    // Review demonstrated real command execution against the first version, which interpolated
    // the span into `bash -lc "ls ${pattern}"`. This runs in `verify` on every dev machine and in
    // CI, and the premise of this whole check is that docs get less scrutiny than code.
    const payload = "src/*;touch$IFS/tmp/check-context-should-not-exist";
    expect(check([{ path: "evil.md", text: `\`${payload}\`` }])[0]).toMatch(/does not exist/);
    expect(existsSync("/tmp/check-context-should-not-exist")).toBe(false);
  });

  it("reports the line number, so a failure is one click from the claim", () => {
    const failures = check([{ path: "fixture.md", text: "line one\nline two\n`src/nope/gone.ts`" }]);
    expect(failures[0]).toContain("fixture.md:3");
  });
});
