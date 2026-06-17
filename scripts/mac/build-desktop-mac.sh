#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "========================================"
echo "  POS Billing - Desktop (macOS)"
echo "========================================"
echo
echo "This builds the Expo web bundle into ./dist and launches Electron in prod mode."
echo "Run this on macOS."
echo

npm run desktop:build
