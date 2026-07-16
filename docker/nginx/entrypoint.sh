#!/bin/sh
set -eu

DOMAIN="${DOMAIN:-localhost}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

mkdir -p /var/www/certbot "${CERT_DIR}"

# Bootstrap: nginx needs cert files present before the first Let's Encrypt issue.
if [ ! -f "${CERT_DIR}/fullchain.pem" ] || [ ! -f "${CERT_DIR}/privkey.pem" ]; then
  echo "No TLS cert for ${DOMAIN} — creating temporary self-signed certificate"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "${CERT_DIR}/privkey.pem" \
    -out "${CERT_DIR}/fullchain.pem" \
    -subj "/CN=${DOMAIN}" >/dev/null 2>&1
  # Let's Encrypt layout also expects chain.pem / cert.pem on some tooling paths
  cp "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/cert.pem"
  cp "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/chain.pem"
fi

export DOMAIN
envsubst '${DOMAIN}' </etc/nginx/nginx.conf.template >/etc/nginx/nginx.conf

nginx -t

# Reload when certbot writes a new certificate (mtime change).
watch_certs() {
  last_mtime=""
  while true; do
    sleep 60
    if [ -f "${CERT_DIR}/fullchain.pem" ]; then
      mtime=$(stat -c %Y "${CERT_DIR}/fullchain.pem" 2>/dev/null || stat -f %m "${CERT_DIR}/fullchain.pem")
      if [ -n "$last_mtime" ] && [ "$mtime" != "$last_mtime" ]; then
        echo "Certificate changed — reloading nginx"
        nginx -s reload || true
      fi
      last_mtime="$mtime"
    fi
  done
}

watch_certs &

exec nginx -g "daemon off;"
