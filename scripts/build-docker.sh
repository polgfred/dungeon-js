#!/usr/bin/env bash

set -euo pipefail

COMMIT_SHA="$(git rev-parse --short HEAD)"

docker build \
  --build-arg COMMIT_SHA="$COMMIT_SHA" \
  -t "dungeon:latest" \
  .
