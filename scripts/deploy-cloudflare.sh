#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $(basename "$0")"
}

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  usage
  exit 0
fi

# Builds the SPA into apps/web/dist (referenced by wrangler.jsonc's assets), then
# deploys the one Worker that serves both the app and the /ws/<code> socket plus
# the TableObject Durable Object. Single target, single name.
echo "Building app..."
export COMMIT_SHA="$(git rev-parse --short HEAD)"
npm run build

echo "Deploying Worker (app + Durable Object) to Cloudflare..."
npx wrangler deploy
