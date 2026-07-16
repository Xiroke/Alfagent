#!/usr/bin/env bash
# First-time / force Let's Encrypt certificate issue for production.
#
# Prerequisites:
#   - DOMAIN DNS A/AAAA records point to this host
#   - ports 80 and 443 are open
#   - .env.prod has DOMAIN and LETSENCRYPT_EMAIL
#
# Usage:
#   ./scripts/init-letsencrypt.sh
#   ./scripts/init-letsencrypt.sh --force
#   ./scripts/init-letsencrypt.sh --staging

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

FORCE=0
STAGING_OVERRIDE=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --staging) STAGING_OVERRIDE=1 ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy from .env.prod.example and set DOMAIN / LETSENCRYPT_EMAIL" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

DOMAIN="${DOMAIN:?Set DOMAIN in $ENV_FILE}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL in $ENV_FILE}"

if [ -n "$STAGING_OVERRIDE" ]; then
  export LETSENCRYPT_STAGING=1
fi

echo "Ensuring stack is up…"
"${COMPOSE[@]}" up -d db backend nginx

echo "Waiting for nginx…"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${HTTP_PORT:-80}/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [ "$FORCE" = "1" ]; then
  echo "Force: removing existing cert lineage for ${DOMAIN}"
  "${COMPOSE[@]}" run --rm --entrypoint sh certbot -c \
    "rm -rf /etc/letsencrypt/live/${DOMAIN} /etc/letsencrypt/archive/${DOMAIN} /etc/letsencrypt/renewal/${DOMAIN}.conf"
fi

STAGING_FLAG=()
if [ "${LETSENCRYPT_STAGING:-0}" = "1" ] || [ "${LETSENCRYPT_STAGING:-}" = "true" ]; then
  STAGING_FLAG=(--staging)
  echo "Using Let's Encrypt staging"
fi

echo "Requesting certificate for ${DOMAIN}…"
"${COMPOSE[@]}" run --rm --entrypoint certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  --rsa-key-size 4096 \
  -d "$DOMAIN" \
  "${STAGING_FLAG[@]}"

echo "Reloading nginx…"
"${COMPOSE[@]}" exec nginx nginx -s reload

echo "Starting certbot renewer…"
"${COMPOSE[@]}" up -d certbot

echo "Done. Open https://${DOMAIN}"
