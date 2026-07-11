#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl not found in PATH"
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/set_config.sh <email:password> [gtfs_zip_url]"
  exit 1
fi

DB_NAME="${DB_NAME:-lyon-transit}"
SERVER_URL="${SERVER_URL:-http://127.0.0.1:3000}"

CREDS="$1"
GTFS_URL="${2-}"

TOKEN="$(printf '%s' "${CREDS}" | base64)"

if [[ -n "${GTFS_URL}" ]]; then
  PAYLOAD="[{\"tcl_api_token\":{\"some\":\"${TOKEN}\"},\"gtfs_zip_url\":{\"some\":\"${GTFS_URL}\"}}]"
else
  PAYLOAD="[{\"tcl_api_token\":{\"some\":\"${TOKEN}\"},\"gtfs_zip_url\":{\"none\":[]}}]"
fi

curl -sS -X POST "${SERVER_URL}/v1/database/${DB_NAME}/call/set_config" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" \
  -w "\nHTTP %{http_code}\n"
