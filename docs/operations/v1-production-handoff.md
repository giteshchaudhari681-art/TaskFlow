# TaskFlow v1.0 Production Deployment Handoff

This document explicitly details how a human operator deploys TaskFlow into a live production environment.

## Prerequisites

- **HUMAN ACTION**: A deployed Postgres 16 database.
- **CLOUD PROVIDER**: A container runtime (AWS ECS, Render, Railway, Fly.io).

## Required infrastructure

- PostgreSQL (Database)
- Node.js Container Environment (API, Worker)
- Python Container Environment (AI Service)
- Static Hosting (Frontend)

## Required secrets

- **HUMAN ACTION**: Securely generate and inject into your secrets manager (DO NOT COMMIT):
  - `DATABASE_URL`
  - `JWT_SECRET` (min 32 chars)
  - `COOKIE_SECRET` (min 32 chars)
  - `AI_SERVICE_TOKEN` (min 16 chars)
  - `OPENAI_API_KEY`
  - `CLOUDINARY_URL`

## Database

- Provision a production-grade PostgreSQL instance.

## Migrations

- **STAGING/PRODUCTION**: Run `npx prisma migrate deploy` in the API container environment before starting the main process. Do NOT use `prisma migrate dev`.

## API deployment

- **PRODUCTION**: Deploy `taskflow-api:1.0.0` container mapping port 5000 securely. Provide secrets via environment.

## AI deployment

- **PRODUCTION**: Deploy `taskflow-ai:1.0.0`. Do NOT expose public ports. Keep strictly within internal VPC boundary reachable only by the API.

## Worker deployment

- **PRODUCTION**: Deploy `taskflow-worker:1.0.0`. Background queue consumes jobs securely.

## Frontend deployment

- **PRODUCTION**: Build via `npm run build --workspace=@taskflow/web`. Deploy `dist` directory to a CDN/static host.

## Domain / DNS

- **CLOUD PROVIDER**: Configure A/CNAME records mapping to your frontend and API edges.

## TLS

- **CLOUD PROVIDER**: Terminate TLS at the edge/load balancer.

## CORS

- **PRODUCTION**: Set `CORS_ORIGIN` strictly to the frontend production URL.

## Sentry

- **HUMAN ACTION**: Inject `SENTRY_DSN` and `SENTRY_ENVIRONMENT` into the production environment securely.

## Cloudinary

- **HUMAN ACTION**: Inject `CLOUDINARY_URL` into the production environment securely.

## OpenAI

- **HUMAN ACTION**: Inject `OPENAI_API_KEY` securely to the AI container.

## Health checks

- Route load balancer health checks to `GET /health` and `GET /health/live`.

## Readiness checks

- Route load balancer readiness checks to `GET /health/ready`.

## Smoke tests

- **HUMAN ACTION**: Execute Playwright suite against live production staging endpoint prior to traffic routing.

## Backup

- **CLOUD PROVIDER**: Configure daily off-site snapshots (pg_dump format).

## Restore

- **HUMAN ACTION**: Run `pg_restore` against a secondary instance to verify integrity monthly.

## Rollback

- **HUMAN ACTION**: If application fails, rollback container image SHA. If database migration fails destructively, invoke Disaster Recovery (DR) via `pg_restore`.

## Incident response

- **HUMAN ACTION**: Monitor Sentry for spiked error rates. Trigger degraded AI mode via config if OpenAI experiences an outage.

## Monitoring

- **CLOUD PROVIDER**: Aggregate logs using container tooling (Datadog/CloudWatch).

## Secret rotation

- **HUMAN ACTION**: For compromised JWT, roll `JWT_SECRET` gracefully (invalidates active sessions safely).

## Post-deployment validation

- **HUMAN ACTION**: Manually log in, create an organization, assign a task, and verify AI advisory generation.
