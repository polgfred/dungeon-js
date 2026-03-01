#!/usr/bin/env bash

set -euo pipefail

curl -sL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install --yes nodejs
