#!/bin/sh
set -eu

echo "Waiting for database migrations…"
alembic upgrade head

# Idempotent RAG seed (skips existing docs). Needs API_KEY for embeddings.
RUN_SEED="${RUN_SEED:-true}"
case "$RUN_SEED" in
  1|true|TRUE|yes|YES) should_seed=1 ;;
  *) should_seed=0 ;;
esac

if [ "$should_seed" = "1" ]; then
  if [ -z "${API_KEY:-}" ]; then
    echo "Skipping seed: API_KEY is not set"
  else
    echo "Seeding knowledge base…"
    if python -m scripts.seed; then
      echo "Seed complete"
    else
      echo "WARNING: seed failed — API will start anyway" >&2
    fi
  fi
else
  echo "Skipping seed (RUN_SEED=${RUN_SEED})"
fi

echo "Starting API…"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-2}" \
  --proxy-headers \
  --forwarded-allow-ips="*"
