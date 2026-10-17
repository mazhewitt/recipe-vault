#!/bin/sh
# Usage: tests/usability/server.sh <port> [mock_recipe_id]
#
# Starts the release binary with the mock LLM on 127.0.0.1:<port>, with cwd = this checkout so
# /static is served live from the working tree (frontend edits show up without a rebuild).
# Run state (SQLite db, photos, server.log, server.pid) lives in tests/usability/runs/<port>/ and
# persists across restarts; use fresh.sh to wipe and reseed it.
#
# Port 3001 is refused: it is reserved for `make test-e2e`.
# Override the binary with BIN=/path/to/recipe-vault (e.g. a worktree without its own build).
PORT=${1:?usage: server.sh <port> [mock_recipe_id]}
MRID=${2:-}
H=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$H/../.." && pwd)
RUN="$H/runs/$PORT"
BIN=${BIN:-$REPO/target/release/recipe-vault}

case "$PORT" in
  3001) echo "port 3001 is reserved for make test-e2e; pick another (e.g. 3011-3015)" >&2; exit 1 ;;
  ''|*[!0-9]*) echo "port must be a number, got '$PORT'" >&2; exit 1 ;;
esac
if [ ! -x "$BIN" ]; then
  echo "release binary not found at $BIN" >&2
  echo "build it first:  (cd $REPO && cargo build --release)" >&2
  exit 1
fi

# Stop whatever is still listening on the port from a previous run.
lsof -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill 2>/dev/null
sleep 1
mkdir -p "$RUN/photos"
cd "$REPO" || exit 1
MOCK_LLM=true \
DATABASE_URL="sqlite:$RUN/recipes.db?mode=rwc" \
PHOTOS_DIR="$RUN/photos" \
ANTHROPIC_API_KEY=mock-key \
DEV_USER_EMAIL=test@example.com \
FAMILIES_CONFIG_PATH=tests/e2e/families.ci.yaml \
BIND_ADDRESS=127.0.0.1:$PORT \
API_KEY=test-api-key-for-playwright \
MOCK_RECIPE_ID="$MRID" \
RUST_LOG=info \
nohup "$BIN" > "$RUN/server.log" 2>&1 &
PID=$!
echo "$PID" > "$RUN/server.pid"
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$PORT/static/app.js" >/dev/null; then
    echo "up on $PORT (pid $PID)"
    exit 0
  fi
  sleep 0.5
done
echo "server failed to start; see $RUN/server.log" >&2
tail -20 "$RUN/server.log" >&2
exit 1
