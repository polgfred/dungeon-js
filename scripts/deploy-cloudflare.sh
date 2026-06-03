#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $(basename "$0")"
}

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  usage
  exit 0
fi

echo "Building app..."
BUILD_COMMIT_HASH="$(git rev-parse --short HEAD)"
VITE_BUILD_COMMIT_HASH="$BUILD_COMMIT_HASH" npm run build

echo "Deploying dist/ to CloudFlare..."
npx wrangler pages deploy dist/
