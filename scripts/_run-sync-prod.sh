#!/usr/bin/env bash
# Run a one-off tsx script against the PROD DB via an SSH tunnel.
# Usage: bash scripts/_run-sync-prod.sh [script] [--write ...]
#   script defaults to scripts/sync-fixtures.ts; extra args pass through.
#   e.g. bash scripts/_run-sync-prod.sh scripts/seed-match-probabilities.ts --write
# Secrets (prod DB password) are never printed.
set -uo pipefail

SERVER="root@162.243.77.63"
LOCAL_PORT="${LOCAL_PORT:-15437}"
REMOTE="127.0.0.1:5436"
SCRIPT="${1:-scripts/sync-fixtures.ts}"
shift || true
PASS_ARGS=("$@")

# 1. Fetch prod DATABASE_URL (value only, never echoed)
PROD_URL=$(ssh -o BatchMode=yes -o ConnectTimeout=8 "$SERVER" \
  'grep -E "^DATABASE_URL=" /opt/pencachi-prod/.env | head -1 | cut -d= -f2-')
PROD_URL="${PROD_URL%\"}"; PROD_URL="${PROD_URL#\"}"
PROD_URL="${PROD_URL%\'}"; PROD_URL="${PROD_URL#\'}"
if [ -z "$PROD_URL" ]; then echo "FATAL: could not read prod DATABASE_URL" >&2; exit 2; fi

# 2. Repoint @host:port -> tunnel (preserve user:pass, dbname, query params)
TUNNEL_URL=$(printf '%s' "$PROD_URL" | sed -E "s#@[^/?]+#@127.0.0.1:${LOCAL_PORT}#")

# 3. Open SSH tunnel as a child of THIS shell (MSYS pid space -> kill is reliable)
ssh -o BatchMode=yes -o ExitOnForwardFailure=yes -N \
  -L "${LOCAL_PORT}:${REMOTE}" "$SERVER" &
SSH_PID=$!

# 4. Wait for the forwarded port
UP=0
for i in $(seq 1 20); do
  if (exec 3<>"/dev/tcp/127.0.0.1/${LOCAL_PORT}") 2>/dev/null; then UP=1; exec 3>&- 3<&-; break; fi
  if ! kill -0 "$SSH_PID" 2>/dev/null; then echo "FATAL: tunnel process exited (port ${LOCAL_PORT} in use?)" >&2; exit 3; fi
  sleep 0.5
done
if [ "$UP" -ne 1 ]; then echo "FATAL: tunnel port not reachable" >&2; kill "$SSH_PID" 2>/dev/null; exit 4; fi

# 5. Run the target script (dry-run unless --write passed)
echo "=== Running ${SCRIPT} against PROD ${PASS_ARGS[*]:-(dry-run)} ==="
DATABASE_URL="$TUNNEL_URL" npx tsx "$SCRIPT" "${PASS_ARGS[@]}"
RC=$?

# 6. Tear down the tunnel
kill "$SSH_PID" 2>/dev/null
wait "$SSH_PID" 2>/dev/null
echo "=== Done (exit $RC), tunnel closed ==="
exit $RC
