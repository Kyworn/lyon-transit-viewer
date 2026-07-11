#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl not found in PATH"
  exit 1
fi

DB_NAME="${DB_NAME:-lyon-transit}"
SERVER_URL="${SERVER_URL:-http://127.0.0.1:3000}"

REALTIME_INTERVAL="${REALTIME_INTERVAL:-15}"
STATIC_INTERVAL="${STATIC_INTERVAL:-900}"
GTFS_INTERVAL="${GTFS_INTERVAL:-86400}"
PURGE_INTERVAL="${PURGE_INTERVAL:-300}"
PURGE_RUNS_INTERVAL="${PURGE_RUNS_INTERVAL:-3600}"
VELOV_INTERVAL="${VELOV_INTERVAL:-60}"
AUTOPARTAGE_INTERVAL="${AUTOPARTAGE_INTERVAL:-3600}"
TOILETS_INTERVAL="${TOILETS_INTERVAL:-86400}"

now_ts() { date +%s; }

EMPTY_ARGS='[{}]'

call_procedure() {
  local name="$1"
  local args="${2:-$EMPTY_ARGS}"
  curl -sS -X POST "${SERVER_URL}/v1/database/${DB_NAME}/call/${name}" \
    -H "Content-Type: application/json" \
    -d "${args}" \
    -w " [HTTP %{http_code}]\n" || true
}

next_realtime=$(now_ts)
next_static=$(now_ts)
next_gtfs=$(now_ts)
next_purge=$(now_ts)
next_purge_runs=$(now_ts)
next_velov=$(now_ts)
next_autopartage=$(now_ts)
next_toilets=$(now_ts)

echo "SpacetimeDB ingestion loop started for ${DB_NAME} (${SERVER_URL})"
echo "Intervals: realtime=${REALTIME_INTERVAL}s static=${STATIC_INTERVAL}s gtfs=${GTFS_INTERVAL}s purge=${PURGE_INTERVAL}s purge_runs=${PURGE_RUNS_INTERVAL}s velov=${VELOV_INTERVAL}s autopartage=${AUTOPARTAGE_INTERVAL}s"

while true; do
  now=$(now_ts)

  if (( now >= next_realtime )); then
    echo "[$(date +%H:%M:%S)] ingest_realtime"
    call_procedure ingest_realtime
    next_realtime=$(( now + REALTIME_INTERVAL ))
  fi

  if (( now >= next_static )); then
    echo "[$(date +%H:%M:%S)] ingest_static"
    call_procedure ingest_static
    next_static=$(( now + STATIC_INTERVAL ))
  fi

  if (( now >= next_gtfs )); then
    echo "[$(date +%H:%M:%S)] ingest_gtfs"
    call_procedure ingest_gtfs
    next_gtfs=$(( now + GTFS_INTERVAL ))
  fi

  if (( now >= next_purge )); then
    echo "[$(date +%H:%M:%S)] purge_realtime"
    call_procedure purge_realtime
    next_purge=$(( now + PURGE_INTERVAL ))
  fi

  if (( now >= next_purge_runs )); then
    echo "[$(date +%H:%M:%S)] purge_ingestion_runs"
    call_procedure purge_ingestion_runs
    next_purge_runs=$(( now + PURGE_RUNS_INTERVAL ))
  fi

  if (( now >= next_velov )); then
    echo "[$(date +%H:%M:%S)] ingest_velov"
    call_procedure ingest_velov
    next_velov=$(( now + VELOV_INTERVAL ))
  fi

  if (( now >= next_autopartage )); then
    echo "[$(date +%H:%M:%S)] ingest_autopartage"
    call_procedure ingest_autopartage
    next_autopartage=$(( now + AUTOPARTAGE_INTERVAL ))
  fi

  if (( now >= next_toilets )); then
    echo "[$(date +%H:%M:%S)] ingest_public_toilets"
    call_procedure ingest_public_toilets
    next_toilets=$(( now + TOILETS_INTERVAL ))
  fi

  sleep 2
done
