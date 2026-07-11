# Deploiement VPS (Production)

Ce guide documente 2 modes:
- A) Lancement manuel (dev/test)
- B) Systemd natif (recommande pour production)

Exposition externe recommandee: **Cloudflare Tunnel**.

> Note: les procedures SpacetimeDB sont invoquees via HTTP (`curl POST`).
> Le CLI `spacetime call` ne gere que les reducers. `scripts/ingest_daemon.sh`
> et `scripts/set_config.sh` utilisent deja le bon mecanisme.

---

## 0) Prerequis VPS

- Ubuntu 22.04/24.04 LTS
- CPU/RAM: 2 vCPU / 4 GB min recommande
- Ports locaux libres: `3000` (SpacetimeDB), `3001` (frontend static)
- DNS gere via Cloudflare (si tunnel)
- `git`, `curl`, `python3`, `node`, `npm`, `spacetime` installes

Cloner le repo:

```bash
git clone https://github.com/Kyworn/lyon-transit-viewer.git
cd lyon-transit-viewer
```

---

## A) Lancement manuel (dev/test)

### A.1 Variables de prod

Creer `frontend/.env`:

```env
# Exposition publique single-hostname (voir section 1): pointer sur le domaine.
# En local/dev: http://127.0.0.1:3000
REACT_APP_SPACETIMEDB_URI=https://tcl.zorko.xyz
REACT_APP_SPACETIMEDB_DB=lyon-transit
GENERATE_SOURCEMAP=false
```

> Carte: MapLibre GL + tuiles CARTO (dark-matter), sans cle API. Aucun token
> Mapbox a fournir ni a restreindre.

### A.2 Build frontend

```bash
cd frontend
npm ci
npm run build
cd ..
```

### A.3 Demarrer SpacetimeDB + publier

```bash
spacetime start --listen-addr 127.0.0.1:3000
# dans un autre shell:
spacetime publish --server local --module-path spacetimedb/spacetimedb --yes lyon-transit
./scripts/set_config.sh "<email:password>"
```

### A.4 Lancer services applicatifs

```bash
# terminal 1
./scripts/ingest_daemon.sh

# terminal 2
python3 -m http.server 3001 --bind 127.0.0.1 -d frontend/build
```

> Mode manuel reserve aux tests. Pour la production durable, utiliser systemd (section B).

---

## B) Systemd natif (production durable)

### B.1 Installer les units automatiquement

Les templates sont dans `deploy/systemd/` et le script d'installation est:

```bash
sudo APP_USER=<vps_user> PROJECT_DIR=/home/<vps_user>/lyon-transit-viewer DB_NAME=lyon-transit FRONT_PORT=3001 ./scripts/install_systemd_units.sh
```

Le script:
- rend les templates `lyon-*.service.template`,
- installe dans `/etc/systemd/system/`,
- fait `daemon-reload`,
- active et demarre les 3 services.

### B.2 Publier module apres start

```bash
spacetime publish --server local --module-path spacetimedb/spacetimedb --yes lyon-transit
./scripts/set_config.sh "<email:password>"
```

---

## 1) Cloudflare Tunnel (recommande) — expo publique single-hostname

Objectif: exposer frontend **et** SpacetimeDB sous un seul domaine
(`tcl.zorko.xyz`) sans ouvrir de port public. Le navigateur du visiteur parle
directement a SpacetimeDB (subscribe WebSocket + `call/calculate_journey`),
donc `/v1/*` doit etre joignable publiquement — mais **pas** les procedures
d'administration.

Routing par path (le SDK tape `${uri}/v1/...`, le front sert `/`):
- `/` et assets -> frontend statique (`127.0.0.1:3001`)
- `/v1/*` -> SpacetimeDB (`127.0.0.1:3000`)
- `/v1/database/lyon-transit/call/(set_config|set_config_plain|ingest_*)` -> **403**

Le daemon d'ingestion local tape `127.0.0.1:3000` en direct (hors tunnel), donc
le blocage public des reducers admin ne le gene pas.

### 1.1 Installer `cloudflared`

Voir doc Cloudflare officielle selon OS.

### 1.2 Creer et configurer tunnel

`~/.cloudflared/config.yml` (ordre = priorite, premiere regle qui matche gagne):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  # 1. Bloque publiquement les procedures d'admin (creds/ingestion)
  - hostname: tcl.zorko.xyz
    path: ^/v1/database/lyon-transit/call/(set_config|set_config_plain|ingest_).*$
    service: http_status:403
  # 2. SpacetimeDB: subscribe WS + calculate_journey + identity/schema
  - hostname: tcl.zorko.xyz
    path: ^/v1/.*$
    service: http://127.0.0.1:3000
  # 3. Frontend statique
  - hostname: tcl.zorko.xyz
    service: http://127.0.0.1:3001
  - service: http_status:404
```

### 1.3 Demarrer tunnel

```bash
cloudflared tunnel run <TUNNEL_NAME>
```

(Option: service systemd Cloudflared)

### 1.4 Verifier le durcissement

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://tcl.zorko.xyz/                 # 200 (front)
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://tcl.zorko.xyz/v1/database/lyon-transit/call/set_config -d '[]'         # 403 attendu
```

---

## 2) Validation post-deploiement

```bash
ss -ltnp | rg ':3000|:3001'
spacetime sql --server local lyon-transit "select count(*) from lines"
spacetime sql --server local lyon-transit "select id,job_name,status,rows_upserted,error from ingestion_runs order by id desc limit 20"
```

Tester depuis le frontend:
- chargement map
- stats non nulles
- calcul d'itineraire fonctionnel

---

## 3) Upgrade / Redeploy

```bash
cd ~/lyon-transit-viewer
./scripts/deploy_vps.sh
```

Variables utiles:

```bash
SKIP_PULL=1 DB_NAME=lyon-transit SERVER_URL=http://127.0.0.1:3000 ./scripts/deploy_vps.sh
TCL_CREDENTIALS="<email:password>" ./scripts/deploy_vps.sh
```

Rollback (par defaut `HEAD~1`):

```bash
./scripts/rollback_vps.sh
./scripts/rollback_vps.sh <tag_or_commit>
```

---

## 4) Securite minimale

- **Table `config` privee (obligatoire pour expo publique).** Elle contient
  `tcl_api_token` = base64(`email:password`) TCL. Le module la declare sans le
  flag `public` — un client ne peut donc pas s'y abonner. Les procedures y
  accedent cote serveur quel que soit le flag. Ne jamais la repasser en
  `public`. Republier apres tout changement de schema:
  ```bash
  spacetime publish --server local --module-path spacetimedb/spacetimedb --yes lyon-transit
  spacetime generate --lang typescript --out-dir frontend/src/spacetime --module-path spacetimedb/spacetimedb
  ```
- **Procedures d'admin bloquees au niveau tunnel** (section 1.2): `set_config`,
  `set_config_plain`, `ingest_*` n'ont pas de garde d'identite (ProcedureContext
  beta), donc SpacetimeDB reste bind `127.0.0.1` et le tunnel est la seule voie
  publique. Ne pas exposer le port `3000` autrement.
- Ne jamais commiter de tokens/secrets.
- Restreindre les permissions des fichiers de config.
- Sauvegarder `~/.local/share/spacetime/data` regulierement.
- Verifier periodiquement les logs d'ingestion.
