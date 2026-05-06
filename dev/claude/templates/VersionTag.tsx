/**
 * Build-time version tag. Renders e.g. "v1.2.3 (a1b2c3)".
 *
 * Reads:
 *   - process.env.npm_package_version (set automatically by `npm run build`)
 *   - process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA (set automatically by Vercel)
 *
 * Both env vars are inlined at build time. No runtime cost, no client bundle bloat.
 *
 * Usage:
 *   import { VersionTag } from "@/components/VersionTag";
 *   <VersionTag />                    // "v1.2.3 (a1b2c3)"
 *   <VersionTag className="text-xs" /> // with extra Tailwind classes
 *   <VersionTag showCommit={false} /> // "v1.2.3"
 *
 * Wire into login screen + footer per dev/claude/CLAUDE.md §Versioning.
 *
 * Local dev fallback: when NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA is undefined
 * (running `npm run dev` outside Vercel), the commit hash is omitted.
 */

type VersionTagProps = {
  className?: string;
  showCommit?: boolean;
};

export function VersionTag({ className, showCommit = true }: VersionTagProps) {
  const version = process.env.npm_package_version ?? "0.0.0";
  const commit = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const display = showCommit && commit ? `v${version} (${commit})` : `v${version}`;

  return (
    <span className={className} data-testid="version-tag">
      {display}
    </span>
  );
}
