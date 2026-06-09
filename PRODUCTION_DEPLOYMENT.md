# Wandr Production Deployment

## Build

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run backend:build
pnpm run frontend:build
```

## Environment

Configure MongoDB Atlas, Redis, Cloudinary, Stripe, Gemini, OpenWeather, SMTP, JWT secrets, and `PUBLIC_BASE_URL`.

## Runtime

Use PM2:

```powershell
pm2 start ecosystem.config.cjs
pm2 save
```

Use Docker Compose for API + Nginx reverse proxy:

```powershell
docker compose up --build
```

## Scaling

Run API with PM2 cluster mode, use MongoDB Atlas dedicated tier, Redis managed cache, CDN for static frontend, and Cloudinary auto-optimized media.

## Monitoring

Use `/api/v1/monitoring`, application logs, MongoDB Atlas metrics, Redis metrics, and PM2 process metrics.

## Backup

Queue backup records with `/api/v1/backups`. Production execution should run `mongodump --uri=$MONGODB_URI --archive --gzip` and Cloudinary Admin API exports from a scheduled job.
