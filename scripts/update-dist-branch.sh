#!/usr/bin/env bash

set -euo pipefail

DIST_WORKTREE="${DIST_WORKTREE:-/workspaces/dungeon-js-dist}"

usage() {
  echo "Usage: $(basename "$0")"
  echo "  DIST_WORKTREE=/path/to/worktree can override the default"
}

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -e "$DIST_WORKTREE/.git" ]]; then
  echo "Worktree not found at $DIST_WORKTREE" >&2
  echo "Create it with: git worktree add $DIST_WORKTREE dist" >&2
  exit 1
fi

BRANCH="$(git -C "$DIST_WORKTREE" rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "dist" ]]; then
  echo "Worktree at $DIST_WORKTREE is on '$BRANCH' (expected 'dist')" >&2
  exit 1
fi

echo "Building app..."
BUILD_COMMIT_HASH="$(git rev-parse --short HEAD)"
VITE_BUILD_COMMIT_HASH="$BUILD_COMMIT_HASH" npm run build -- --base=/dungeon-js/

echo "Syncing dist/ to dist worktree..."
git -C "$DIST_WORKTREE" rm -r --quiet .
rsync -a ./dist/ "$DIST_WORKTREE/"
git -C "$DIST_WORKTREE" add -A

if git -C "$DIST_WORKTREE" diff --cached --quiet; then
  echo "No changes to commit."
else
  git -C "$DIST_WORKTREE" commit -m "Update dist build"
fi
