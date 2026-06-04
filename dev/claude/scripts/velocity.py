#!/usr/bin/env python3
"""
velocity.py — standalone velocity extractor.

Run on demand. Reads each repo's docs/RETROSPECTIVES.md and reports your real
velocity: active hours per effort point (active = wall_clock - breaks). It does
NOT require you to log anything — everything is recomputed from data /retro
already wrote into the retros.

USAGE
  python3 velocity.py [REPO_PATH ...]        # one or more repos; default: cwd
  python3 velocity.py ~/GitHub/bushel ~/GitHub/sailbook
  python3 velocity.py --issues ~/GitHub/bushel   # also show points:N label histogram (needs gh)

WHAT IT REPORTS
  - Per phase: points, active hours, active h/pt.
  - Per repo lifetime: SUM(active hours) / SUM(points)  -- the honest overall number.
    (Never the mean of per-phase h/pt -- averaging ratios overweights small phases.)
  - Per-session h/pt spread (min / median / max / stdev) -- your pointing-consistency
    signal: tight spread = consistent pointing, wide scatter = noise.
  - Combined across all repos passed.

HONEST LIMITS (by design, not omission)
  - Phases that predate the active-time model carry only a legacy "Velocity: X hrs/pt"
    and no active hours. They are shown but EXCLUDED from the active rollup -- a legacy
    velocity is a different metric and must not be blended with active h/pt.
  - The denominator is each retro's curated **Points** line (shipped points), not the
    sum of points:N issue labels -- label sums count moved/cut/closed-not-built issues
    and would inflate the denominator. Use --issues for the raw label histogram, which is
    a pointing-habit view only (it is NOT joined to time).
  - "Within-bucket time variance" (do all your 5-pt tasks take similar time?) needs
    per-task timing, which the data doesn't carry -- active time is measured per session,
    points per task. Per-session h/pt spread is the closest honest proxy.
"""

import sys
import os
import re
import statistics
import subprocess

NUM = re.compile(r'[-+]?\d*\.?\d+')

def lead_num(cell):
    """Leading number from a table cell, tolerating footnote marks/units. None if absent."""
    m = NUM.match(cell.strip())
    return float(m.group()) if m else None

def split_phases(text):
    """Yield (header_line, body_text) per '## Phase ...' block."""
    parts = re.split(r'(?m)^(##\s+Phase\b.*)$', text)
    # parts: [pre, header1, body1, header2, body2, ...]
    for i in range(1, len(parts), 2):
        yield parts[i].strip(), parts[i + 1]

def parse_points(body):
    m = re.search(r'\*\*Points(?:\s+completed)?:\*\*\s*([\d.]+)', body)
    return float(m.group(1)) if m else None

def parse_summary_active(body):
    m = re.search(r'Active time[^:\n]*:\**\s*([\d.]+)\s*h', body, re.IGNORECASE)
    return float(m.group(1)) if m else None

def parse_legacy_velocity(body):
    m = re.search(r'\*\*Velocity:\*\*\s*([\d.]+)\s*hrs?/pt', body, re.IGNORECASE)
    return float(m.group(1)) if m else None

def parse_session_table(body):
    """Return list of dicts {session, wall, breaks, active, points} from the
    per-session breakdown table, computing active = wall - breaks when no Active column."""
    rows = []
    header = None
    colmap = {}
    for line in body.splitlines():
        if not line.strip().startswith('|'):
            header = None
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        low = [c.lower() for c in cells]
        if any('session' in c for c in low) and any('point' in c for c in low):
            header = cells
            colmap = {}
            for idx, name in enumerate(low):
                key = re.sub(r'\s*\(.*?\)', '', name).strip()  # drop "(h)" etc.
                colmap[key] = idx
            continue
        if header is None:
            continue
        if set(cells[0]) <= set('-: '):  # separator row
            continue
        sess = lead_num(cells[colmap.get('session', 0)]) if 'session' in colmap else None
        if sess is None:
            continue
        def get(k):
            i = colmap.get(k)
            return lead_num(cells[i]) if i is not None and i < len(cells) else None
        wall = get('wall')
        breaks = get('breaks')
        active = get('active')
        if active is None and wall is not None and breaks is not None:
            active = max(0.0, wall - breaks)
        rows.append({'session': int(sess), 'wall': wall, 'breaks': breaks,
                     'active': active, 'points': get('points')})
    return rows

def issue_histogram(repo):
    """points:N closed-issue counts via gh. Returns dict or None on failure."""
    out = {}
    for n in (2, 3, 5, 8, 13):
        try:
            r = subprocess.run(
                ['gh', 'issue', 'list', '--label', f'points:{n}', '--state', 'closed',
                 '--json', 'number', '-q', 'length', '--limit', '500'],
                cwd=repo, capture_output=True, text=True, timeout=30)
            if r.returncode != 0:
                return None
            out[n] = int((r.stdout or '0').strip() or 0)
        except Exception:
            return None
    return out

def analyze_repo(repo, show_issues):
    path = os.path.join(repo, 'docs', 'RETROSPECTIVES.md')
    if not os.path.isfile(path):
        return None
    with open(path, encoding='utf-8') as f:
        text = f.read()

    phases = []          # active-bearing phases
    legacy = []          # pre-active phases
    all_sessions = []
    for header, body in split_phases(text):
        table = parse_session_table(body)
        # Numerator and denominator from the SAME session rows, so they always
        # cover the same work. (The curated **Points:** line can differ -- e.g.
        # "36 labeled / 56 counted" -- and would desync from the active hours.)
        rows_a = [r for r in table if r['active'] is not None]
        active = sum(r['active'] for r in rows_a) if rows_a else parse_summary_active(body)
        points = (sum(r['points'] or 0 for r in rows_a) if rows_a else None) or parse_points(body)
        for r in table:
            if r['active'] is not None and r['points']:
                all_sessions.append((header, r['active'] / r['points'], r))
        label = header.replace('## ', '').strip()
        if active is not None and points:
            phases.append({'label': label, 'points': points, 'active': active})
        else:
            legacy.append({'label': label, 'points': parse_points(body),
                           'legacy_v': parse_legacy_velocity(body)})

    return {'repo': repo, 'phases': phases, 'legacy': legacy, 'sessions': all_sessions,
            'issues': issue_histogram(repo) if show_issues else None}

def fmt(x, n=2):
    return '—' if x is None else f'{x:.{n}f}'

def report(res):
    print(f"\n{'='*64}\n{res['repo']}\n{'='*64}")
    tot_a = tot_p = 0.0
    if res['phases']:
        print(f"  {'Phase':<34}{'Points':>7}{'Active h':>10}{'h/pt':>8}")
        for ph in res['phases']:
            tot_a += ph['active']; tot_p += ph['points']
            print(f"  {ph['label'][:34]:<34}{fmt(ph['points'],0):>7}"
                  f"{fmt(ph['active']):>10}{fmt(ph['active']/ph['points'],3):>8}")
        print(f"  {'-'*59}")
        print(f"  {'LIFETIME (Σactive ÷ Σpoints)':<34}{fmt(tot_p,0):>7}"
              f"{fmt(tot_a):>10}{fmt(tot_a/tot_p,3):>8}")
    else:
        print("  No active-time phases found.")

    if res['legacy']:
        print("\n  Pre-active-time phases (legacy metric — excluded from rollup):")
        for lg in res['legacy']:
            v = f"{lg['legacy_v']:.2f} hrs/pt (legacy)" if lg['legacy_v'] else "no velocity recorded"
            print(f"    {lg['label'][:46]:<46} {v}")

    sp = [hp for _, hp, _ in res['sessions']]
    if len(sp) >= 2:
        print(f"\n  Per-session active h/pt spread ({len(sp)} sessions):")
        print(f"    min {min(sp):.3f}  median {statistics.median(sp):.3f}  "
              f"max {max(sp):.3f}  stdev {statistics.pstdev(sp):.3f}")
        print("    (tight spread = consistent pointing; wide scatter = pointing noise)")
    elif sp:
        print(f"\n  Per-session spread: only {len(sp)} measurable session — need ≥2.")

    if res['issues'] is not None:
        print("\n  Closed points:N issues (pointing histogram — NOT joined to time):")
        for n in (2, 3, 5, 8, 13):
            print(f"    {n:>2}-pt: {res['issues'].get(n, 0)}")
    return tot_a, tot_p

def main():
    args = [a for a in sys.argv[1:] if a != '--issues']
    show_issues = '--issues' in sys.argv[1:]
    repos = args or [os.getcwd()]

    results = []
    for repo in repos:
        r = analyze_repo(os.path.abspath(os.path.expanduser(repo)), show_issues)
        if r is None:
            print(f"\nskip: {repo} — no docs/RETROSPECTIVES.md")
            continue
        results.append(r)

    grand_a = grand_p = 0.0
    for r in results:
        a, p = report(r)
        grand_a += a; grand_p += p

    if len(results) > 1 and grand_p:
        print(f"\n{'#'*64}")
        print(f"COMBINED across {len(results)} repos: "
              f"{grand_a:.2f} active h ÷ {grand_p:.0f} pts = {grand_a/grand_p:.3f} h/pt")
        print("(properly summed — not an average of per-repo numbers)")
        print('#'*64)

if __name__ == '__main__':
    main()
