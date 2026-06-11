#!/usr/bin/env python3
"""
throughput.py — standalone throughput extractor (DEC-S026).

Replaces velocity.py's effort-hours-per-point model. Computes THROUGHPUT:
points shipped per calendar week, from GitHub issue `closedAt` dates + `points:N`
labels. Reads GitHub via `gh`; it NEVER parses RETROSPECTIVES.md.

WHY (DEC-S026): hrs/pt needed the session transcript to subtract breaks, and the
transcript is unreachable for ~every web/Desktop session — so the headline kept
degrading to wall_clock/pt, the one number the guide forbids. Issue dates +
labels live in GitHub forever, so throughput is measurable on every repo and
reconstructable retroactively.

POINTS ATTRIBUTION (load-bearing — do NOT "improve" this into PR-pairing):
  - Each CLOSED issue carrying a points:N label credits N points on the ISO week
    of its OWN closedAt.
  - A PR closing N labelled issues => those N issues each credit on their own
    closedAt and sum naturally. PRs are NEVER counted directly.
  - An issue (or PR) with no points:N label is SKIPPED, never guessed.
  This keys throughput to issues, not PRs — robust to merging PRs in any order
  (DEC-S022). Never re-pair PR-open -> PR-merge to recover "effort": that window
  math is exactly the DEC-S024 bug this replaces. Dates are not windows; they
  can't sum past wall-clock or assume merge ordering.

USAGE
  python3 throughput.py [REPO_PATH ...]          # one or more repos; default: cwd
  python3 throughput.py --window 8 ~/GitHub/bushel
  python3 throughput.py --issues ~/GitHub/bushel  # also show points:N histogram
  python3 throughput.py --self-test               # offline logic check, no gh

WHAT IT REPORTS
  - Per ISO week: points shipped (sum of points:N for issues closed that week).
    Weeks with no closes are shown as zero — a quiet week is real signal, not a
    gap to skip.
  - Trailing-band headline: rolling --window-week average pts/wk (default 4).
    Quoted as a BAND (min / median / max of the rolling series) plus the
    most-recent window — NEVER a single hot week.
  - Per phase (phase:N label): points / calendar weeks, where weeks =
    (last closedAt - first createdAt)/7 over that phase's issues.
  - Per repo and combined across all repos passed (summed by week, never an
    average of per-repo numbers).
  - --issues: points:N closed-issue histogram (pointing-habit view, unchanged).

HONEST LIMITS (by design, not omission)
  - Throughput is capacity INCLUDING availability — a slow week and a vacation
    week look identical. That is correct for "when does it ship," and wrong for
    "at-keyboard speed." Never quote it as the latter.
  - Solo part-time volume is noisy: one good weekend can swing a 4-week band ~2x.
    Widen --window (8 / 12) and read the output as +-50% coarse ("ships in ~5-8
    weeks"), not a date. The tool flags a band that swings >=2x.
  - Even more project-shape-specific than hrs/pt. NEVER forecast a new project
    from another's throughput.
"""

import sys
import os
import json
import statistics
import subprocess
from collections import defaultdict
from datetime import datetime, timedelta

POINT_VALUES = (2, 3, 5, 8, 13)


# ---------------------------------------------------------------------------
# Parsing helpers (pure — unit-tested by --self-test)
# ---------------------------------------------------------------------------

def parse_dt(s):
    """ISO8601 from gh (e.g. 2026-05-08T14:23:01Z) -> aware datetime. None if blank."""
    if not s:
        return None
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


def iso_week_key(dt):
    """(iso_year, iso_week) bucket key for a datetime."""
    iso = dt.isocalendar()
    return (iso[0], iso[1])


def week_monday(key):
    """Monday (date at 00:00) of an (iso_year, iso_week) key."""
    y, w = key
    return datetime.fromisocalendar(y, w, 1)


def label_points(labels):
    """Int N from a points:N label among label name strings, or None."""
    for name in labels:
        if name.startswith('points:'):
            try:
                return int(name.split(':', 1)[1])
            except ValueError:
                continue
    return None


def label_phase(labels):
    """phase:N value (as string) among label name strings, or None."""
    for name in labels:
        if name.startswith('phase:'):
            return name.split(':', 1)[1]
    return None


# ---------------------------------------------------------------------------
# Computation (pure — unit-tested by --self-test)
# ---------------------------------------------------------------------------

def weekly_points(issues):
    """dict {(iso_year, iso_week): points} summed over each issue's closedAt."""
    wk = defaultdict(float)
    for it in issues:
        wk[iso_week_key(it['closedAt'])] += it['points']
    return dict(wk)


def week_range(keys):
    """Inclusive (iso_year, iso_week) list from earliest to latest key, gaps filled.

    Quiet weeks matter: throughput includes availability, so a zero week is a
    real data point, not something to drop. Filling the range is what makes the
    rolling band honest."""
    keys = list(keys)
    if not keys:
        return []
    start, end = week_monday(min(keys, key=week_monday)), week_monday(max(keys, key=week_monday))
    out, d = [], start
    while d <= end:
        iso = d.isocalendar()
        out.append((iso[0], iso[1]))
        d += timedelta(weeks=1)
    return out


def rolling_band(issues, window):
    """Dense weekly series + rolling-window average series.

    Returns {'series': [(key, points), ...], 'rolls': [avg, ...]}. `rolls` holds
    one trailing-`window`-week average per position once `window` weeks exist."""
    wp = weekly_points(issues)
    weeks = week_range(wp.keys())
    series = [(wk, wp.get(wk, 0.0)) for wk in weeks]
    pts = [p for _, p in series]
    rolls = []
    if len(pts) >= window >= 1:
        for i in range(window - 1, len(pts)):
            rolls.append(sum(pts[i - window + 1:i + 1]) / window)
    return {'series': series, 'rolls': rolls}


def phase_throughput(issues):
    """Per-phase list: {phase, n, points, weeks, throughput}, sorted by phase number.

    weeks = (last closedAt - first createdAt)/7 over that phase's issues."""
    by = defaultdict(list)
    for it in issues:
        if it['phase'] is not None:
            by[it['phase']].append(it)
    out = []
    for ph, items in by.items():
        points = sum(i['points'] for i in items)
        closes = [i['closedAt'] for i in items]
        starts = [i['createdAt'] for i in items if i['createdAt']]
        first = min(starts) if starts else min(closes)
        last = max(closes)
        weeks = max((last - first).total_seconds() / (7 * 86400), 1e-9)
        out.append({'phase': ph, 'n': len(items), 'points': points,
                    'weeks': weeks, 'throughput': points / weeks})

    def sortkey(d):
        try:
            return (0, int(d['phase']))
        except (ValueError, TypeError):
            return (1, str(d['phase']))
    return sorted(out, key=sortkey)


def issue_histogram(issues):
    """Count of closed points-labelled issues per point value."""
    out = {n: 0 for n in POINT_VALUES}
    for it in issues:
        if it['points'] in out:
            out[it['points']] += 1
    return out


# ---------------------------------------------------------------------------
# GitHub fetch (the only impure boundary)
# ---------------------------------------------------------------------------

def fetch_issues(repo):
    """Closed points-labelled issues via gh, as dicts
    {number, points, phase, closedAt(dt), createdAt(dt)}. Only issues carrying a
    points:N label are returned. None on gh failure (not installed, not a repo,
    auth, bad JSON)."""
    try:
        r = subprocess.run(
            ['gh', 'issue', 'list', '--state', 'closed',
             '--json', 'number,closedAt,createdAt,labels', '--limit', '1000'],
            cwd=repo, capture_output=True, text=True, timeout=60)
    except Exception:
        return None
    if r.returncode != 0:
        return None
    try:
        raw = json.loads(r.stdout or '[]')
    except json.JSONDecodeError:
        return None
    issues = []
    for it in raw:
        labels = [l.get('name', '') for l in it.get('labels', [])]
        pts = label_points(labels)
        if pts is None:
            continue
        closed = parse_dt(it.get('closedAt'))
        if closed is None:
            continue
        issues.append({
            'number': it.get('number'),
            'points': pts,
            'phase': label_phase(labels),
            'closedAt': closed,
            'createdAt': parse_dt(it.get('createdAt')),
        })
    return issues


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def fmt(x, n=2):
    return '—' if x is None else f'{x:.{n}f}'


def week_label(key):
    y, w = key
    return f'{y}-W{w:02d}'


def report(res, window):
    repo = res['repo']
    issues = res['issues']
    print(f"\n{'=' * 64}\n{repo}\n{'=' * 64}")
    if not issues:
        print("  no points-labelled closed issues — nothing to measure.")
        return

    total_pts = sum(i['points'] for i in issues)
    band = res['band']
    series, rolls = band['series'], band['rolls']

    print(f"  {len(issues)} closed points-labelled issues, "
          f"{fmt(total_pts, 0)} points, across {len(series)} calendar weeks.")

    print("\n  Points shipped per ISO week:")
    for key, p in series:
        print(f"    {week_label(key)}  {fmt(p, 0):>3}  {'█' * int(round(p))}")

    print(f"\n  Trailing {window}-week throughput (rolling avg pts/wk):")
    if rolls:
        print(f"    most-recent window: {rolls[-1]:.2f} pts/wk")
        print(f"    band over all windows: min {min(rolls):.2f}  "
              f"median {statistics.median(rolls):.2f}  max {max(rolls):.2f}")
        if min(rolls) > 0 and max(rolls) / min(rolls) >= 2:
            print("    ⚠ band swings ≥2× — dominated by individual weeks; "
                  "widen --window before forecasting.")
    else:
        avg = total_pts / len(series) if series else 0.0
        print(f"    <{window} weeks of history — lifetime avg {avg:.2f} pts/wk "
              f"over {len(series)} wks. Need ≥{window} weeks for a trailing band.")

    if res['phases']:
        print("\n  Per phase (points ÷ calendar weeks):")
        print(f"    {'Phase':<10}{'Issues':>7}{'Points':>8}{'Weeks':>8}{'pts/wk':>9}")
        for ph in res['phases']:
            print(f"    {('phase:' + str(ph['phase']))[:10]:<10}{ph['n']:>7}"
                  f"{fmt(ph['points'], 0):>8}{fmt(ph['weeks'], 1):>8}"
                  f"{fmt(ph['throughput'], 2):>9}")

    if res['show_issues']:
        hist = issue_histogram(issues)
        print("\n  Closed points:N histogram (pointing-habit view — NOT joined to weeks):")
        for n in POINT_VALUES:
            print(f"    {n:>2}-pt: {hist.get(n, 0)}")


def report_combined(measurable, window):
    combined = [it for r in measurable for it in r['issues']]
    band = rolling_band(combined, window)
    total = sum(i['points'] for i in combined)
    rolls = band['rolls']
    print(f"\n{'#' * 64}")
    print(f"COMBINED across {len(measurable)} repos: {fmt(total, 0)} points, "
          f"{len(band['series'])} weeks.")
    if rolls:
        print(f"  trailing {window}-wk band: min {min(rolls):.2f}  "
              f"median {statistics.median(rolls):.2f}  max {max(rolls):.2f} pts/wk "
              f"(most-recent {rolls[-1]:.2f})")
    print("  (summed across repos by week — not an average of per-repo numbers)")
    print('#' * 64)


# ---------------------------------------------------------------------------
# Offline self-test (proves the computation without gh / network)
# ---------------------------------------------------------------------------

def run_self_test(window):
    def iss(number, points, phase, created, closed):
        return {'number': number, 'points': points, 'phase': phase,
                'createdAt': parse_dt(created), 'closedAt': parse_dt(closed)}

    # W03=8, gap W04, W05=8, gap W06, W07=5, gap W08, W09=2  (ISO weeks of 2026).
    # Times pinned to 00:00 so phase deltas are whole days (= whole weeks).
    issues = [
        iss(1, 5, '1', '2026-01-05T00:00:00Z', '2026-01-12T00:00:00Z'),  # W03
        iss(2, 3, '1', '2026-01-06T00:00:00Z', '2026-01-12T00:00:00Z'),  # W03
        iss(3, 8, '1', '2026-01-07T00:00:00Z', '2026-01-26T00:00:00Z'),  # W05
        iss(4, 5, '2', '2026-02-02T00:00:00Z', '2026-02-09T00:00:00Z'),  # W07
        iss(5, 2, '2', '2026-02-03T00:00:00Z', '2026-02-23T00:00:00Z'),  # W09
    ]
    fails = []

    def check(name, got, want):
        if got != want:
            fails.append(f"{name}: got {got!r}, want {want!r}")

    wp = weekly_points(issues)
    check('weekly W03', wp[(2026, 3)], 8.0)
    check('weekly W05', wp[(2026, 5)], 8.0)
    check('weekly W07', wp[(2026, 7)], 5.0)
    check('weekly W09', wp[(2026, 9)], 2.0)
    check('weekly has no gap key', (2026, 4) in wp, False)

    series = [p for _, p in rolling_band(issues, 4)['series']]
    check('dense series (gaps filled)', series, [8.0, 0.0, 8.0, 0.0, 5.0, 0.0, 2.0])

    rolls = rolling_band(issues, 4)['rolls']
    check('rolling-4 series', [round(x, 4) for x in rolls], [4.0, 3.25, 3.25, 1.75])

    short = rolling_band(issues, 99)['rolls']
    check('window > history -> no rolls', short, [])

    phases = phase_throughput(issues)
    check('phase count', len(phases), 2)
    check('phase 1 points', phases[0]['points'], 16)
    check('phase 1 weeks', round(phases[0]['weeks'], 4), 3.0)      # Jan05 -> Jan26 = 21d
    check('phase 1 throughput', round(phases[0]['throughput'], 4), round(16 / 3, 4))
    check('phase 2 points', phases[1]['points'], 7)
    check('phase 2 weeks', round(phases[1]['weeks'], 4), 3.0)      # Feb02 -> Feb23 = 21d

    hist = issue_histogram(issues)
    check('histogram', [hist[n] for n in POINT_VALUES], [1, 1, 2, 1, 0])

    check('empty weekly', weekly_points([]), {})
    check('empty week_range', week_range([]), [])
    check('empty band rolls', rolling_band([], 4)['rolls'], [])

    if fails:
        print("SELF-TEST FAILED:")
        for f in fails:
            print(f"  ✗ {f}")
        sys.exit(1)
    print("SELF-TEST PASSED — 17 assertions, computation verified offline (no gh).")
    print("Note: this exercises the pure logic only. Real-repo validation needs "
          "`gh` + the project repos (run on a dev machine).")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    argv = sys.argv[1:]
    show_issues = '--issues' in argv
    self_test = '--self-test' in argv
    rest = [a for a in argv if a not in ('--issues', '--self-test')]

    window, positional, j = 4, [], 0
    while j < len(rest):
        a = rest[j]
        if a == '--window':
            if j + 1 >= len(rest):
                print("error: --window needs a value", file=sys.stderr)
                sys.exit(2)
            window, j = int(rest[j + 1]), j + 2
        elif a.startswith('--window='):
            window, j = int(a.split('=', 1)[1]), j + 1
        else:
            positional.append(a)
            j += 1

    if window < 1:
        print("error: --window must be >= 1", file=sys.stderr)
        sys.exit(2)

    if self_test:
        run_self_test(window)
        return

    repos = positional or [os.getcwd()]
    results = []
    for repo in repos:
        path = os.path.abspath(os.path.expanduser(repo))
        issues = fetch_issues(path)
        if issues is None:
            print(f"\nskip: {repo} — gh unavailable, not authed, or not a GitHub repo here.")
            continue
        results.append({'repo': path, 'issues': issues,
                        'band': rolling_band(issues, window),
                        'phases': phase_throughput(issues),
                        'show_issues': show_issues})

    for res in results:
        report(res, window)

    measurable = [r for r in results if r['issues']]
    if len(measurable) > 1:
        report_combined(measurable, window)


if __name__ == '__main__':
    main()
