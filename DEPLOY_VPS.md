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
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
REACT_APP_SPACETIMEDB_URI=http://127.0.0.1:3000
REACT_APP_SPACETIMEDB_DB=lyon-transit
GENERATE_SOURCEMAP=false
```

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

## 1) Cloudflare Tunnel (recommande)

Objectif: exposer le frontend sans ouvrir directement les ports publics.

### 1.1 Installer `cloudflared`

Voir doc Cloudflare officielle selon OS.

### 1.2 Creer et configurer tunnel

Exemple config `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<vps_user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: transit.example.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

### 1.3 Demarrer tunnel

```bash
cloudflared tunnel run <TUNNEL_NAME>
```

(Option: service systemd Cloudflared)

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

- Ne jamais commiter de tokens/secrets.
- Restreindre les permissions des fichiers de config.
- Sauvegarder `~/.local/share/spacetime/data` regulierement.
- Verifier periodiquement les logs d'ingestion.
