#!/usr/bin/env bash
set -euo pipefail

if ! command -v spacetime >/dev/null 2>&1; then
  echo "spacetime CLI not found in PATH"
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/set_config.sh <email:password> [gtfs_zip_url]"
  exit 1
fi

CREDS="$1"
GTFS_URL="${2-}"

TOKEN="$(printf '%s' "${CREDS}" | base64)"

if [[ -n "${GTFS_URL}" ]]; then
  spacetime call lyon-transit set_config "{\"tcl_api_token\":{\"some\":\"${TOKEN}\"},\"gtfs_zip_url\":{\"some\":\"${GTFS_URL}\"}}"
else
  spacetime call lyon-transit set_config "{\"tcl_api_token\":{\"some\":\"${TOKEN}\"},\"gtfs_zip_url\":{\"none\":[]}}"
fi
