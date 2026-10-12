# Deployment

Production runs on one server (Docker Compose) at `mypospe.com`:

| Host | What |
|---|---|
| `mypospe.com`, `www.`, `app.` | Landing page + admin portal (same build) |
| `pos.` | Web POS (PWA) |
| `api.` | API gateway (`/api/*`) and the POS realtime channel (`/socket.io`) |
| `cdn.` | Public product images |

HTTPS certificates are issued and renewed automatically by Caddy.

## How a release ships (CI/CD)

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the two
web apps and one backend image (all 12 services) on the GitHub runner, uploads
them over SSH, and runs `/opt/pospe/deploy.sh` on the server. That script
applies database migrations, restarts the stack, waits for every service to
report healthy, and rolls back to the previous release if it doesn't.
Nothing is built on the server.

### Repository secrets (Settings -> Secrets and variables -> Actions)

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server IP, `139.59.35.81` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | the private deploy key (whole file, including the BEGIN/END lines) |
| `DEPLOY_KNOWN_HOSTS` | the server's host key, e.g. `139.59.35.81 ssh-ed25519 AAAA...` (`ssh-keyscan -t ed25519 139.59.35.81`) |

You can also run it by hand from the Actions tab (**Deploy -> Run workflow**).

## On the server (`/opt/pospe`)

| File | Purpose |
|---|---|
| `.env` | Secrets (database password, JWT secrets, SMTP, Razorpay). Generated once; **never committed**. Edit, then `docker compose up -d`. |
| `docker-compose.yml`, `Caddyfile` | Copied from `deploy/` on every release. |
| `deploy.sh` | Release script (migrate, restart, health-gate, rollback). |
| `bootstrap-admin.sh` | Creates / resets the platform super admin: `SUPER_ADMIN_EMAIL=you@x.com bash bootstrap-admin.sh` |
| `server-setup.sh` | One-time server preparation (Docker, swap, firewall). Safe to re-run. |
| `backups/` | Nightly Postgres dumps (02:30, 14 days kept) via `/etc/cron.d/pospe-backup`. |

### Useful commands

```bash
cd /opt/pospe
docker compose ps                          # status / health
docker compose logs -f --tail=100 api-gateway
TAG=<previous sha> docker compose up -d    # manual rollback (images for the last 3 releases are kept)
gunzip -c backups/pospe-YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U pospe -d pospe   # restore
```

## Sizing

The server is 1 vCPU / 2 GB RAM with 3 GB swap. It runs, but twelve Node
services plus Postgres leave little headroom; upgrade to 4 GB / 2 vCPU before
real traffic. Elasticsearch (global search) is not deployed on this size.

## Not configured yet

Blank in `/opt/pospe/.env`: SMTP (sign-up verification and password-reset
emails won't send until set), Razorpay keys, Sentry.
