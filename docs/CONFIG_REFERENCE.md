# Configuration Reference

## Frontend (`frontend/.env`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `REACT_APP_MAPBOX_TOKEN` | Yes | `pk.ey...` | Token Mapbox pour affichage carte. |
| `REACT_APP_SPACETIMEDB_URI` | Yes | `http://127.0.0.1:3000` | Endpoint HTTP/WS SpacetimeDB. |
| `REACT_APP_SPACETIMEDB_DB` | Yes | `lyon-transit` | Nom de la base SpacetimeDB cible. |
| `GENERATE_SOURCEMAP` | No | `false` | Desactive sourcemaps en build prod. |

## SpacetimeDB runtime

### Base locale

- DB name par defaut: `lyon-transit`
- Server alias par defaut: `local`

### Procedure `set_config`

Permet de stocker:
- `tcl_api_token` (base64 de `email:password`)
- `gtfs_zip_url` (optionnel)

Commande recommandee:

```bash
./scripts/set_config.sh "<email:password>" [gtfs_zip_url]
```

## Ingestion daemon (`scripts/ingest_daemon.sh`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_NAME` | No | `lyon-transit` | Base cible pour les calls ingestion. |
| `SERVER_NAME` | No | `local` | Server alias SpacetimeDB. |
| `REALTIME_INTERVAL` | No | `15` | Intervalle `ingest_realtime` (s). |
| `STATIC_INTERVAL` | No | `900` | Intervalle `ingest_static` (s). |
| `GTFS_INTERVAL` | No | `86400` | Intervalle `ingest_gtfs` (s). |
| `PURGE_INTERVAL` | No | `300` | Intervalle `purge_realtime` (s). |

Exemple:

```bash
DB_NAME=lyon-transit SERVER_NAME=local REALTIME_INTERVAL=10 ./scripts/ingest_daemon.sh
```

## Ports attendus

| Service | Port | Bind recommande |
|---|---|---|
| SpacetimeDB | `3000` | `127.0.0.1` |
| Front static | `3001` | `127.0.0.1` |

## Secrets et bonnes pratiques

- Ne pas commiter `.env` ni credentials.
- Garder les tokens dans des fichiers non versionnes.
- Restreindre permissions fichiers (`chmod 600` pour secrets).
- Rotation periodique du compte/token TCL.
