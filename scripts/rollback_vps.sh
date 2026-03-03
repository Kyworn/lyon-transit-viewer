#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TARGET_REF="${1:-HEAD~1}"
DB_NAME="${DB_NAME:-lyon-transit}"
SERVER_NAME="${SERVER_NAME:-local}"

cd "${REPO_DIR}"

echo "Rolling back to ${TARGET_REF}..."
git fetch --all --tags
git checkout "${TARGET_REF}"

echo "Rebuilding frontend..."
pushd frontend >/dev/null
npm ci
npm run build
popd >/dev/null

echo "Re-publishing SpacetimeDB module..."
spacetime publish --server "${SERVER_NAME}" --module-path spacetimedb/spacetimedb --yes "${DB_NAME}"

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart lyon-spacetime.service || true
  sudo systemctl restart lyon-ingest.service || true
  sudo systemctl restart lyon-frontend.service || true
fi

echo "Rollback complete on ${TARGET_REF}."

