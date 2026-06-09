# Wandr Launch Readiness

## Production Checklist

- Configure MongoDB Atlas dedicated cluster, backups, alerts, and indexes.
- Configure Redis managed cache.
- Configure Cloudinary signed uploads and responsive transformations.
- Configure Stripe live keys and webhook validation.
- Configure Gemini, OpenWeather, SMTP, and Sentry.
- Run `pnpm run typecheck`, backend build, frontend build, API tests, and E2E tests.
- Verify accessibility with keyboard navigation and screen reader labels.
- Verify PWA install, offline fallback, and cached critical pages.

## Security Checklist

- Rotate JWT secrets.
- Enable Helmet, rate limiting, sanitization, CSRF policy for browser-mutating routes, and audit logging.
- Review admin RBAC permissions before launch.
- Add WAF/CDN rules for `/api`.

## Performance Checklist

- Keep average API response under 300ms for cached/list endpoints.
- Warm Redis for destinations, packages, hotels, weather, and search.
- Use Cloudinary `f_auto,q_auto` and lazy-loaded images.
- Split frontend bundles for admin/phase consoles.

## Disaster Recovery

- Schedule `mongodump --archive --gzip`.
- Export Cloudinary folders regularly.
- Store backups in a separate cloud account.
- Practice restore into staging monthly.

## Scaling Guide

- Run API with PM2 cluster or containers.
- Use Nginx reverse proxy and CDN.
- Scale MongoDB Atlas tier and Redis memory based on p95 latency.
- Move booking queue to Redis Streams or managed queue when concurrency grows.
