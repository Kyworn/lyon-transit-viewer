#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES_DIR="${REPO_DIR}/deploy/systemd"

APP_USER="${APP_USER:-${SUDO_USER:-$(id -un)}}"
PROJECT_DIR="${PROJECT_DIR:-/home/${APP_USER}/lyon-transit-viewer}"
DB_NAME="${DB_NAME:-lyon-transit}"
FRONT_PORT="${FRONT_PORT:-3001}"

render_template() {
  local input="$1"
  local output="$2"
  sed \
    -e "s|{{USER}}|${APP_USER}|g" \
    -e "s|{{PROJECT_DIR}}|${PROJECT_DIR}|g" \
    -e "s|{{DB_NAME}}|${DB_NAME}|g" \
    -e "s|{{FRONT_PORT}}|${FRONT_PORT}|g" \
    "${input}" > "${output}"
}

render_template "${TEMPLATES_DIR}/lyon-spacetime.service.template" "/etc/systemd/system/lyon-spacetime.service"
render_template "${TEMPLATES_DIR}/lyon-ingest.service.template" "/etc/systemd/system/lyon-ingest.service"
render_template "${TEMPLATES_DIR}/lyon-frontend.service.template" "/etc/systemd/system/lyon-frontend.service"

systemctl daemon-reload
systemctl enable --now lyon-spacetime.service
systemctl enable --now lyon-ingest.service
systemctl enable --now lyon-frontend.service

echo "Installed and started:"
echo "- lyon-spacetime.service"
echo "- lyon-ingest.service"
echo "- lyon-frontend.service"

