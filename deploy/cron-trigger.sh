#!/bin/bash
# Reads CRON_SECRET + NEXTAUTH_URL from the .env beside this script and POSTs to
# the given Pencachi API path. Used by the host (droplet) crontab.
#
# Usage: cron-trigger.sh /api/cron/highlights
#
# Why host-side: the in-container dcron daemon (`crond -b`) wedges and never
# fires jobs (see investigation 2026-06-06). The host crontab is the reliable,
# observable scheduler — one script per instance reading its own .env.
set -e
ENDPOINT="$1"
if [ -z "$ENDPOINT" ]; then
  echo "usage: $0 /api/cron/..." >&2
  exit 2
fi
DIR="$(cd "$(dirname "$0")" && pwd)"
CRON_SECRET=$(grep '^CRON_SECRET=' "$DIR/.env" | cut -d= -f2-)
BASE_URL=$(grep '^NEXTAUTH_URL=' "$DIR/.env" | cut -d= -f2-)
if [ -z "$CRON_SECRET" ]; then
  echo "CRON_SECRET missing from $DIR/.env" >&2
  exit 3
fi
if [ -z "$BASE_URL" ]; then
  echo "NEXTAUTH_URL missing from $DIR/.env" >&2
  exit 4
fi
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] POST $BASE_URL$ENDPOINT"
exec curl -sSf --max-time 300 -X POST -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL$ENDPOINT"
