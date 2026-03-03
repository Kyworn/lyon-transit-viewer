# Operations Runbook

## Services cibles

- SpacetimeDB local: `127.0.0.1:3000`
- Frontend static: `127.0.0.1:3001`
- Ingestion daemon: `scripts/ingest_daemon.sh`

## Checks rapides

```bash
ss -ltnp | rg ':3000|:3001'
spacetime sql --server local lyon-transit "select count(*) as vehicles from vehicle_positions_current"
spacetime sql --server local lyon-transit "select id,job_name,status,rows_upserted,error from ingestion_runs order by id desc limit 20"
```

## Start / Restart (sans systemd)

```bash
# SpacetimeDB
setsid -f spacetime start --listen-addr 127.0.0.1:3000 --non-interactive > /tmp/spacetime.log 2>&1

# Ingestion
setsid -f ./scripts/ingest_daemon.sh > /tmp/lyon-ingest-daemon.log 2>&1

# Front
setsid -f python3 -m http.server 3001 --bind 127.0.0.1 -d frontend/build > /tmp/lyon-frontend.log 2>&1
```

## Start / Restart (systemd)

```bash
sudo systemctl restart lyon-spacetime.service
sudo systemctl restart lyon-ingest.service
sudo systemctl restart lyon-frontend.service
```

Status:

```bash
sudo systemctl status lyon-spacetime.service --no-pager
sudo systemctl status lyon-ingest.service --no-pager
sudo systemctl status lyon-frontend.service --no-pager
```

## Logs

Sans systemd:
- `/tmp/spacetime.log`
- `/tmp/lyon-ingest-daemon.log`
- `/tmp/lyon-frontend.log`

Avec systemd:

```bash
journalctl -u lyon-spacetime.service -n 200 --no-pager
journalctl -u lyon-ingest.service -n 200 --no-pager
journalctl -u lyon-frontend.service -n 200 --no-pager
```

Logs DB:

```bash
spacetime logs --server local lyon-transit
```

## Incident playbooks

### 1) Stats a zero / pas de vehicules

1. Verifier token TCL:
   ```bash
   spacetime sql --server local lyon-transit "select * from config limit 5"
   ```
2. Verifier ingestion runs:
   ```bash
   spacetime sql --server local lyon-transit "select id,job_name,status,rows_upserted,error from ingestion_runs order by id desc limit 50"
   ```
3. Relancer ingestion daemon.

### 2) Route planner en erreur

1. Tester procedure manuelle:
   ```bash
   spacetime call --server local lyon-transit calculate_journey '{"from_lat":45.765572,"from_lng":4.910809,"to_lat":45.740671,"to_lng":4.818846,"datetime":"2026-03-02T22:10:00.000Z","is_arrival_time":false,"transport_modes":"[\"metro\",\"tramway\",\"bus\"]","walk":"normal","bike":{"none":[]},"pmr":false,"car":false,"data_freshness":"1"}'
   ```
2. Verifier `spacetime logs`.

### 3) Front inaccessible

1. Verifier process python/service frontend.
2. Verifier port `3001`.
3. Rebuild frontend puis restart service.

## Redeploy minimal

```bash
git pull
cd frontend && npm ci && npm run build && cd ..
spacetime publish --server local --module-path spacetimedb/spacetimedb --yes lyon-transit
```

Puis restart des services frontend/ingestion.
