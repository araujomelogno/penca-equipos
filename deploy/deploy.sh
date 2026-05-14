#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/opt/pencachi"
cd "$APP_DIR"

# Login to GHCR with this project's own PAT before pulling.
# The droplet hosts multiple projects that share ~/.docker/config.json,
# so any other project's deploy can stomp the cached token. Doing our
# own login here makes the deploy independent of that shared state.
# Expects .env.deploy in $APP_DIR with: GHCR_USER=... GHCR_TOKEN=...
if [[ -f .env.deploy ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.deploy
  set +a
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
else
  echo "WARNING: $APP_DIR/.env.deploy not found, relying on existing docker credentials"
fi

docker compose pull
docker compose up -d --remove-orphans
# Only prune images belonging to THIS project
docker images --filter "reference=ghcr.io/imasdev-org/pencachi/*" --format "{{.ID}} {{.Repository}}:{{.Tag}}" | grep -v latest | awk '{print $1}' | xargs -r docker rmi 2>/dev/null || true
# Reload nginx proxy
cd /opt/ai-dev-proxy
if docker compose exec -T proxy nginx -t 2>&1; then
  docker compose exec -T proxy nginx -s reload
else
  echo "WARNING: nginx config test failed, skipping reload."
  exit 1
fi
echo "Deploy complete."
