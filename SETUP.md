# Setup Local - Lyon Transit Viewer (SpacetimeDB)

## 1) Prerequis

- `spacetime` CLI installe et accessible dans le `PATH`
- Node.js + npm
- `curl` (pour invoquer les procedures via HTTP)
- Python 3 (pour servir le build frontend)
- Identifiants TCL (`email:password`) pour ingestion realtime

> Carte: MapLibre GL + tuiles CARTO, sans cle API — aucun token a fournir.

Verification rapide:

```bash
spacetime --version
node --version
npm --version
curl --version
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

Le script invoque la procedure `set_config` via HTTP (les procedures ne sont
pas appelables via `spacetime call` — seulement les reducers le sont).

```bash
./scripts/set_config.sh "<email:password>"
```

Optionnel avec URL GTFS custom:

```bash
./scripts/set_config.sh "<email:password>" "https://....zip"
```

Variables d'environnement supportees: `DB_NAME` (defaut: `lyon-transit`),
`SERVER_URL` (defaut: `http://127.0.0.1:3000`).

## 6) Lancer l'ingestion continue

Dans un terminal dedie:

```bash
./scripts/ingest_daemon.sh
```

Le daemon appelle les procedures `ingest_realtime`, `ingest_static`,
`ingest_gtfs`, `purge_realtime`, `purge_ingestion_runs` via HTTP.

Variables utiles:

```bash
DB_NAME=lyon-transit \
SERVER_URL=http://127.0.0.1:3000 \
REALTIME_INTERVAL=15 \
STATIC_INTERVAL=900 \
GTFS_INTERVAL=86400 \
PURGE_INTERVAL=300 \
PURGE_RUNS_INTERVAL=3600 \
./scripts/ingest_daemon.sh
```

## 7) Lancer le frontend

```bash
cd frontend
npm install
npm run build
python3 -m http.server 3001 --bind 127.0.0.1 -d build
```

Mode dev (hot reload):

```bash
cd frontend
PORT=3001 npm start
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

Tester une procedure (les procedures s'invoquent via HTTP, pas `spacetime call`):

```bash
# Realtime ingest manuellement
curl -X POST http://127.0.0.1:3000/v1/database/lyon-transit/call/ingest_realtime \
  -H "Content-Type: application/json" -d '[{}]'

# Calcul d'itineraire
curl -X POST http://127.0.0.1:3000/v1/database/lyon-transit/call/calculate_journey \
  -H "Content-Type: application/json" \
  -d '[{"from_lat":45.765572,"from_lng":4.910809,"to_lat":45.740671,"to_lng":4.818846,"datetime":"2026-03-02T22:10:00.000Z","is_arrival_time":false,"transport_modes":"[\"metro\",\"tramway\",\"bus\"]","walk":"normal","bike":{"none":[]},"pmr":false,"car":false,"data_freshness":"1"}]'
```

## 9) Troubleshooting

### A) Carte vide / tuiles absentes

Symptome:
- fond de carte gris, aucune tuile

Action:
- verifier l'acces reseau a `basemaps.cartocdn.com` (tuiles CARTO)
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

Le backend contient un fallback automatique sur payload simplifie.
Si l'erreur persiste:

```bash
spacetime logs --server local lyon-transit
```

et tester l'appel manuel (section 8).

### D) Aucun vehicule / stats a 0

Action:
- verifier `set_config` (token TCL)
- verifier `ingest_daemon.sh` actif (`pgrep -fa ingest_daemon`)
- verifier les dernieres lignes de `ingestion_runs`
- verifier logs daemon: chaque appel doit retourner `[HTTP 200]`

### E) `ERROR: External attempt to call nonexistent reducer "ingest_realtime"`

Cause: tentative d'appeler une procedure via `spacetime call` (le CLI ne gere
que les reducers). Utiliser `curl` (voir section 8) ou `scripts/ingest_daemon.sh`.

### F) Erreur Option SpacetimeDB (`some`/`none`)

Pour les options dans les payloads JSON:
- valeur definie: `{"some":"..."}`
- valeur absente: `{"none":[]}`

Les payloads procedures sont toujours dans un tableau: `[{...}]`.
