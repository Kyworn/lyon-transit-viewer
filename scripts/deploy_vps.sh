#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DB_NAME="${DB_NAME:-lyon-transit}"
SERVER_NAME="${SERVER_NAME:-local}"

cd "${REPO_DIR}"

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  git pull --ff-only
fi

echo "Building frontend..."
pushd frontend >/dev/null
npm ci
npm run build
popd >/dev/null

echo "Publishing SpacetimeDB module..."
spacetime publish --server "${SERVER_NAME}" --module-path spacetimedb/spacetimedb --yes "${DB_NAME}"

if [[ -n "${TCL_CREDENTIALS:-}" ]]; then
  echo "Updating TCL credentials from TCL_CREDENTIALS env..."
  ./scripts/set_config.sh "${TCL_CREDENTIALS}"
fi

if command -v systemctl >/dev/null 2>&1; then
  echo "Restarting services..."
  sudo systemctl restart lyon-spacetime.service || true
  sudo systemctl restart lyon-ingest.service || true
  sudo systemctl restart lyon-frontend.service || true
fi

echo "Deployment done."
echo "Health checks:"
echo "  spacetime sql --server ${SERVER_NAME} ${DB_NAME} \"select count(*) as lines_count from lines\""
echo "  spacetime sql --server ${SERVER_NAME} ${DB_NAME} \"select id,job_name,status,rows_upserted,error from ingestion_runs order by id desc limit 20\""

