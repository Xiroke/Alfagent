#!/bin/sh
set -eu

echo "Waiting for database migrations…"
alembic upgrade head

echo "Starting API…"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-2}" \
  --proxy-headers \
  --forwarded-allow-ips="*"
