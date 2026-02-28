#!/usr/bin/env bash

set -euo pipefail

BUILD_COMMIT_HASH="$(git rev-parse --short HEAD)"

docker build \
  --build-arg VITE_BUILD_COMMIT_HASH="$BUILD_COMMIT_HASH" \
  -t "dungeon:latest" \
  .
