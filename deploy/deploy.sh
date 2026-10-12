#!/usr/bin/env bash
# Runs ON THE SERVER (CI calls it over SSH after the image and web builds have
# been uploaded). Brings the stack up on a new release, and rolls back to the
# previous one if it doesn't come up healthy.
#
#   TAG=<git sha> bash /opt/pospe/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pospe}"
cd "${APP_DIR}"
TAG="${TAG:?set TAG to the image tag to deploy}"
export TAG
LAST_GOOD_FILE="${APP_DIR}/.last-good-tag"
PREVIOUS="$(cat "${LAST_GOOD_FILE}" 2>/dev/null || true)"

docker image inspect "pospe-backend:${TAG}" >/dev/null

echo "==> Datastores"
docker compose up -d --wait postgres redis

echo "==> Database migrations (${TAG})"
docker compose run --rm migrate

echo "==> Services (${TAG})"
if ! docker compose up -d --remove-orphans --wait --wait-timeout 240; then
  echo "!! release ${TAG} did not become healthy"
  docker compose ps || true
  docker compose logs --tail=40 || true
  if [ -n "${PREVIOUS}" ] && docker image inspect "pospe-backend:${PREVIOUS}" >/dev/null 2>&1; then
    echo "==> Rolling back to ${PREVIOUS}"
    TAG="${PREVIOUS}" docker compose up -d --remove-orphans --wait --wait-timeout 240 || true
  fi
  exit 1
fi

echo "${TAG}" > "${LAST_GOOD_FILE}"

echo "==> Tidy up (keep the 3 most recent backend images)"
docker images pospe-backend --format '{{.Tag}}' | grep -vx latest | tail -n +4 | while read -r old; do
  docker rmi "pospe-backend:${old}" >/dev/null 2>&1 || true
done
docker image prune -f >/dev/null
for site in admin pos; do
  ls -1dt "${APP_DIR}/web/${site}/releases"/* 2>/dev/null | tail -n +4 | xargs -r rm -rf
done

# Pick up Caddyfile changes (bind-mounted files aren't noticed by compose).
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || true

docker compose ps
echo "deployed ${TAG}"
