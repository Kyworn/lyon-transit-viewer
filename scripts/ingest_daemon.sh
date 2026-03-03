#!/usr/bin/env bash
set -euo pipefail

if ! command -v spacetime >/dev/null 2>&1; then
  echo "spacetime CLI not found in PATH"
  exit 1
fi

DB_NAME="${DB_NAME:-lyon-transit}"
SERVER_NAME="${SERVER_NAME:-local}"

REALTIME_INTERVAL="${REALTIME_INTERVAL:-15}"
STATIC_INTERVAL="${STATIC_INTERVAL:-900}"
GTFS_INTERVAL="${GTFS_INTERVAL:-86400}"
PURGE_INTERVAL="${PURGE_INTERVAL:-300}"

now_ts() { date +%s; }

next_realtime=$(now_ts)
next_static=$(now_ts)
next_gtfs=$(now_ts)
next_purge=$(now_ts)

echo "SpacetimeDB ingestion loop started for ${DB_NAME} (${SERVER_NAME})"
echo "Intervals: realtime=${REALTIME_INTERVAL}s static=${STATIC_INTERVAL}s gtfs=${GTFS_INTERVAL}s purge=${PURGE_INTERVAL}s"

while true; do
  now=$(now_ts)

  if (( now >= next_realtime )); then
    spacetime call --server "${SERVER_NAME}" "${DB_NAME}" ingest_realtime "{}" || true
    next_realtime=$(( now + REALTIME_INTERVAL ))
  fi

  if (( now >= next_static )); then
    spacetime call --server "${SERVER_NAME}" "${DB_NAME}" ingest_static "{}" || true
    next_static=$(( now + STATIC_INTERVAL ))
  fi

  if (( now >= next_gtfs )); then
    spacetime call --server "${SERVER_NAME}" "${DB_NAME}" ingest_gtfs "{}" || true
    next_gtfs=$(( now + GTFS_INTERVAL ))
  fi

  if (( now >= next_purge )); then
    spacetime call --server "${SERVER_NAME}" "${DB_NAME}" purge_realtime "{}" || true
    next_purge=$(( now + PURGE_INTERVAL ))
  fi

  sleep 2
done
