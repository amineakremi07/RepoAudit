# infra/

Local development infrastructure. Owner: Security & Backend Engineer.

- `docker-compose.yml` runs Postgres 17 and Redis 7, bound to `127.0.0.1` only. App services are sketched and commented out until Sprint 4.
- `db/migrations/` holds the SQL schema. `001_init.sql` runs automatically on the first boot of an empty Postgres volume.
- The environment template is **`/.env.example` at the repo root**. Copy it to `/.env`.

```bash
pnpm infra:up     # from repo root
pnpm infra:down
docker compose -f infra/docker-compose.yml --env-file .env down -v   # wipe data (re-runs migrations next boot)
```
