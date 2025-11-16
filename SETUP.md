# Setup Guide - Lyon Transit Viewer

## Prerequisites

- Docker & Docker Compose
- Mapbox API Token (free tier available)
- TCL API Token (optional - for real-time data)

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/lyon-transit-viewer.git
cd lyon-transit-viewer
```

---

## Step 2: Configure Environment Variables

### 2.1 Root Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```bash
# TCL API Token
TCL_API_TOKEN=your_base64_encoded_token

# Database credentials
POSTGRES_USER=user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=lyon_transit

# Redis
REDIS_URL=redis://redis:6379

# Database URL (update password to match above)
DATABASE_URL=postgres://user:your_secure_password@db:5432/lyon_transit
```

### 2.2 Frontend Environment Variables

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```bash
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
GENERATE_SOURCEMAP=false
```

---

## Step 3: Get Your API Tokens

### Mapbox Token (Required)

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up (free tier available)
3. Go to **Access Tokens**
4. Create a new token or use the default public token
5. Copy the token to `frontend/.env`

### TCL API Token (Optional - for real-time data)

The TCL API token is base64-encoded credentials in format `email:password`.

**Option 1: Contact TCL/SYTRAL**
- Request API access from [TCL Open Data](https://data.grandlyon.com/)

**Option 2: Use public data (limited)**
- Some endpoints work without authentication
- Real-time vehicle positions may be restricted

**To encode your credentials:**

```bash
echo -n "your_email@example.com:your_password" | base64
```

Copy the output to `.env` as `TCL_API_TOKEN`.

---

## Step 4: Build and Run with Docker

Start all services:

```bash
docker compose up --build -d
```

This will start:
- **PostgreSQL** database (port 5432)
- **Redis** cache (port 6379)
- **Backend API** (port 5000)
- **Frontend** (port 3000)
- **PgAdmin** (port 8080)
- **Adminer** (port 8081)

---

## Step 5: Access the Application

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **PgAdmin:** [http://localhost:8080](http://localhost:8080)
  - Email: `admin@example.com` (or as configured in `.env`)
  - Password: `admin` (or as configured in `.env`)
- **Adminer:** [http://localhost:8081](http://localhost:8081)

---

## Step 6: Verify Everything Works

Check container status:

```bash
docker compose ps
```

All containers should show `Up`.

Check backend logs:

```bash
docker logs lyon_transit_backend
```

You should see:
- `✓ Successfully ingested X stops`
- `✓ Successfully ingested X vehicle positions`

---

## Troubleshooting

### Database Connection Error

If backend shows database connection errors:

1. Check that `.env` has correct `DATABASE_URL`
2. Ensure passwords match between `POSTGRES_PASSWORD` and `DATABASE_URL`
3. Restart containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

### Mapbox Map Not Loading

1. Verify `REACT_APP_MAPBOX_TOKEN` in `frontend/.env`
2. Check browser console for errors
3. Ensure token is valid at [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)

### No Real-Time Vehicle Data

This likely means:
- `TCL_API_TOKEN` is missing or invalid
- API endpoint is down
- Check backend logs: `docker logs lyon_transit_backend`

---

## Development Mode

To run with live reload:

### Backend:

```bash
cd backend
npm install
npm run dev
```

### Frontend:

```bash
cd frontend
npm install
npm start
```

---

## Production Deployment

For production:

1. Change all default passwords in `.env`
2. Use strong credentials for `POSTGRES_PASSWORD`
3. Set `NODE_ENV=production` in backend
4. Build frontend: `npm run build`
5. Use reverse proxy (nginx) for HTTPS
6. Restrict database ports (don't expose 5432 publicly)

---

## Security Notes

⚠️ **NEVER commit `.env` files to Git!**

- `.env` is already in `.gitignore`
- Only commit `.env.example` files
- Rotate tokens regularly
- Use different credentials for production

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check backend/frontend logs
- Review Docker container status

---

**Last Updated:** November 2025
