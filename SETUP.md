# Setup Local - Lyon Transit Viewer (SpacetimeDB)

## 1) Prerequis

- `spacetime` CLI installe et accessible dans le `PATH`
- Node.js + npm
- Python 3 (pour servir le build frontend)
- Token Mapbox
- Identifiants TCL (`email:password`) pour ingestion realtime

Verification rapide:

```bash
spacetime --version
node --version
npm --version
python3 --version
```

## 2) Cloner le projet

```bash
git clone https://github.com/Kyworn/lyon-transit-viewer.git
cd lyon-transit-viewer
```

## 3) Configurer le frontend

```bash
cp frontend/.env.example frontend/.env
```

Editer `frontend/.env`:

```env
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
REACT_APP_SPACETIMEDB_URI=http://127.0.0.1:3000
REACT_APP_SPACETIMEDB_DB=lyon-transit
GENERATE_SOURCEMAP=false
```

## 4) Demarrer SpacetimeDB local

Dans un terminal dedie:

```bash
spacetime start --listen-addr 127.0.0.1:3000
```

Publier le module:

```bash
spacetime publish --server local --module-path spacetimedb/spacetimedb --yes lyon-transit
```

## 5) Configurer les identifiants TCL (recommande)

```bash
./scripts/set_config.sh "<email:password>"
```

Optionnel avec URL GTFS custom:

```bash
./scripts/set_config.sh "<email:password>" "https://....zip"
```

## 6) Lancer l'ingestion continue

Dans un terminal dedie:

```bash
./scripts/ingest_daemon.sh
```

Variables utiles:

```bash
DB_NAME=lyon-transit SERVER_NAME=local REALTIME_INTERVAL=15 STATIC_INTERVAL=900 GTFS_INTERVAL=86400 PURGE_INTERVAL=300 ./scripts/ingest_daemon.sh
```

## 7) Lancer le frontend

```bash
cd frontend
npm install
npm run build
python3 -m http.server 3001 --bind 127.0.0.1 -d build
```

Acces:

- Front: `http://127.0.0.1:3001`
- SpacetimeDB: `http://127.0.0.1:3000`

## 8) Verifications

Verifier que les donnees remontent:

```bash
spacetime sql --server local lyon-transit "select count(*) as lines_count from lines"
spacetime sql --server local lyon-transit "select count(*) as vehicles_count from vehicle_positions_current"
spacetime sql --server local lyon-transit "select id,job_name,status,rows_upserted,error from ingestion_runs order by id desc limit 20"
spacetime sql --server local lyon-transit "select * from config limit 5"
```

Verifier la procedure d'itineraire:

```bash
spacetime call --server local lyon-transit calculate_journey '{"from_lat":45.765572,"from_lng":4.910809,"to_lat":45.740671,"to_lng":4.818846,"datetime":"2026-03-02T22:10:00.000Z","is_arrival_time":false,"transport_modes":"[\"metro\",\"tramway\",\"bus\"]","walk":"normal","bike":{"none":[]},"pmr":false,"car":false,"data_freshness":"1"}'
```

## 9) Troubleshooting

### A) Mapbox token absent

Symptome:
- `Mapbox access token is not set`

Action:
- verifier `frontend/.env`
- refaire `npm run build`
- hard refresh navigateur (`Ctrl+Shift+R`)

### B) Erreur WebSocket SpacetimeDB

Symptome:
- `WebSocket ... /subscribe failed`

Action:
- verifier que `spacetime start` est actif
- verifier `REACT_APP_SPACETIMEDB_URI`
- verifier port 3000 ouvert localement

### C) `calculate_journey` en erreur 500

Le backend contient maintenant un fallback automatique sur payload simplifie.
Si l'erreur persiste:

```bash
spacetime logs --server local lyon-transit
```

et tester l'appel manuel (section 8).

### D) Aucun vehicule / stats a 0

Action:
- verifier `set_config` (token TCL)
- verifier `ingest_daemon.sh` actif
- verifier les dernieres lignes de `ingestion_runs`

### E) Erreur Option SpacetimeDB (`some`/`none`)

Pour les options dans `spacetime call`:
- valeur definie: `{"some":"..."}`
- valeur absente: `{"none":[]}`

