#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_WORKTREE="${DIST_WORKTREE:-/workspaces/dungeon-js-dist}"

usage() {
  echo "Usage: $(basename "$0") [--push]"
  echo "  DIST_WORKTREE=/path/to/worktree can override the default"
}

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  usage
  exit 0
fi

PUSH=false
if [[ "${1-}" == "--push" ]]; then
  PUSH=true
elif [[ -n "${1-}" ]]; then
  echo "Unknown arg: $1" >&2
  usage
  exit 1
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
(cd "$ROOT_DIR" && npm run build)

echo "Syncing dist/ to dist worktree..."
git -C "$DIST_WORKTREE" rm -r --quiet .
rsync -a "$ROOT_DIR/dist/" "$DIST_WORKTREE/"
git -C "$DIST_WORKTREE" add -A

if git -C "$DIST_WORKTREE" diff --cached --quiet; then
  echo "No changes to commit."
else
  git -C "$DIST_WORKTREE" commit -m "Update dist build"
fi

if [[ "$PUSH" == "true" ]]; then
  git -C "$DIST_WORKTREE" push origin dist
fi
