# Build Vite SPA, then serve via nginx with API reverse-proxy + TLS.

FROM node:22-alpine AS frontend-build
WORKDIR /web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache openssl gettext \
    && mkdir -p /var/www/certbot /etc/letsencrypt

COPY docker/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/nginx/entrypoint.sh /entrypoint.sh
COPY --from=frontend-build /web/dist /usr/share/nginx/html

RUN chmod +x /entrypoint.sh

EXPOSE 80 443

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

ENTRYPOINT ["/entrypoint.sh"]
