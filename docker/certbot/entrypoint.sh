#!/bin/sh
# Obtain or renew Let's Encrypt certificates (HTTP-01 webroot).

set -eu

DOMAIN="${DOMAIN:-}"
EMAIL="${LETSENCRYPT_EMAIL:-}"

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost" ] || [ -z "$EMAIL" ]; then
  echo "Let's Encrypt skipped (set DOMAIN + LETSENCRYPT_EMAIL for HTTPS certs)."
  echo "Idle — container stays up so compose does not restart-loop."
  exec sh -c "trap exit TERM; while :; do sleep 86400 & wait \${!}; done"
fi

STAGING_FLAG=""
if [ "${LETSENCRYPT_STAGING:-0}" = "1" ] || [ "${LETSENCRYPT_STAGING:-false}" = "true" ]; then
  STAGING_FLAG="--staging"
  echo "Using Let's Encrypt staging environment"
fi

echo "Waiting for nginx…"
i=0
while [ "$i" -lt 60 ]; do
  if python -c "import urllib.request; urllib.request.urlopen('http://nginx/healthz', timeout=2)" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 2
done

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
NEED_ISSUE=1

if [ -f "$CERT_PATH" ]; then
  if openssl x509 -in "$CERT_PATH" -noout -issuer 2>/dev/null | grep -qi "Let's Encrypt"; then
    NEED_ISSUE=0
    echo "Existing Let's Encrypt certificate found for ${DOMAIN}"
  else
    echo "Replacing temporary/self-signed certificate for ${DOMAIN}"
    rm -rf "/etc/letsencrypt/live/${DOMAIN}" \
           "/etc/letsencrypt/archive/${DOMAIN}" \
           "/etc/letsencrypt/renewal/${DOMAIN}.conf"
  fi
fi

if [ "$NEED_ISSUE" = "1" ]; then
  echo "Requesting certificate for ${DOMAIN}…"
  # shellcheck disable=SC2086
  certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --rsa-key-size 4096 \
    -d "$DOMAIN" \
    $STAGING_FLAG
  echo "Certificate issued — nginx reloads within ~60s (or: docker compose exec nginx nginx -s reload)"
fi

echo "Starting renewal loop (every 12h)…"
trap exit TERM
while true; do
  # shellcheck disable=SC2086
  certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot \
    --non-interactive \
    --quiet \
    $STAGING_FLAG || true
  sleep 12h &
  wait $! || true
done
