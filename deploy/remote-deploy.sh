#!/usr/bin/env bash
# ============================================================================
# Runs ON the EC2 instance (invoked over SSH by the GitHub Actions deploy job).
# Writes the runtime .env, logs in to GHCR, pulls the freshly-built images,
# and (re)starts the stack with docker-compose.prod.yml.
#
# Required env vars (passed by the deploy job over SSH):
#   POSTGRES_PASSWORD  GHCR_USER  GHCR_TOKEN
# Optional:
#   IMAGE_TAG (defaults to "latest")
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${GHCR_USER:?GHCR_USER is required}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Runtime configuration consumed by docker-compose.prod.yml (and the containers).
cat > .env <<ENV
POSTGRES_USER=dreamuser
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=dreamvacations
BACKEND_PORT=3001
COUNTRIES_API_BASE_URL=https://restcountries.com/v3.1
REACT_APP_API_URL=
FRONTEND_PORT=80
IMAGE_TAG=${IMAGE_TAG}
ENV

echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin

echo ">> Pulling images (IMAGE_TAG=${IMAGE_TAG}) ..."
docker compose -f docker-compose.prod.yml pull

echo ">> Starting stack ..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

docker logout ghcr.io || true
docker image prune -f || true

echo ">> Deployed. Current state:"
docker compose -f docker-compose.prod.yml ps
