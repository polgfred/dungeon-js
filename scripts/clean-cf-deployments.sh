#!/usr/bin/env bash

set -euo pipefail

PROJECT="dungeon-of-doom"

usage() {
  echo "Usage: $(basename "$0") [--apply] [--force]"
  echo
  echo "Deletes all CloudFlare Pages deployments except the current production"
  echo "one (the deployment whose Source matches the tip of main)."
  echo
  echo "  --apply   Actually delete. Without it, runs as a dry run."
  echo "  --force   Pass -f to wrangler (delete even with an active alias)."
}

apply=false
force_flag=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --apply) apply=true ;;
    --force) force_flag=(--force) ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

current="$(git rev-parse --short HEAD)"
echo "Current production source (tip of main): $current"

echo "Listing deployments for $PROJECT..."
list="$(npx wrangler pages deployment list --json --project-name "$PROJECT")"

# Every deployment id whose Source does not match the current tip of main.
stale=()
while IFS= read -r id; do
  [[ -n "$id" ]] && stale+=("$id")
done < <(echo "$list" | jq -r --arg keep "$current" '.[] | select(.Source != $keep) | .Id')

kept="$(echo "$list" | jq -r --arg keep "$current" '[.[] | select(.Source == $keep)] | length')"

echo "Keeping $kept deployment(s) matching $current; ${#stale[@]} to delete."

if [[ ${#stale[@]} -eq 0 ]]; then
  echo "Nothing to delete."
  exit 0
fi

if [[ "$apply" != true ]]; then
  echo
  echo "Dry run. Would delete:"
  printf '  %s\n' "${stale[@]}"
  echo
  echo "Re-run with --apply to delete."
  exit 0
fi

failures=0
for id in "${stale[@]}"; do
  echo "Deleting $id..."
  if ! npx wrangler pages deployment delete "$id" --project-name "$PROJECT" ${force_flag[@]+"${force_flag[@]}"}; then
    echo "  failed to delete $id" >&2
    failures=$((failures + 1))
  fi
done

if [[ $failures -gt 0 ]]; then
  echo "Done with $failures failure(s)." >&2
  exit 1
fi

echo "Done. Deleted ${#stale[@]} deployment(s)."
