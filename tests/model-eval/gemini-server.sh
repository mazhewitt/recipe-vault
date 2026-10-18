#!/bin/sh
# Usage: GEMINI_API_KEY=... gemini-server.sh <port> <chat_model> [difficulty_model]
# Starts a real-Gemini Recipe Vault server for model evals on <port>, with a fresh
# database under tests/model-eval/runs/<port>/, seeded with the eval recipe book
# (explicit difficulty + tags, so seeding triggers no background LLM calls).
# Needs `cargo build --release` first. Never runs on 3001 (the e2e suite's port).
PORT=${1:?usage: gemini-server.sh <port> <chat_model> [difficulty_model]}
MODEL=${2:?usage: gemini-server.sh <port> <chat_model> [difficulty_model]}
DMODEL=${3:-gemini-3.5-flash-lite}
if [ -z "$GEMINI_API_KEY" ]; then
  echo "GEMINI_API_KEY is not set; export it from your secret store first" >&2
  exit 1
fi
if [ "$PORT" = 3001 ]; then
  echo "refusing port 3001: it belongs to the e2e suite" >&2
  exit 1
fi
E=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$E/../.." && pwd)
BIN=${BIN:-$REPO/target/release/recipe-vault}
[ -x "$BIN" ] || { echo "no binary at $BIN; run cargo build --release" >&2; exit 1; }
lsof -ti:"$PORT" | xargs kill 2>/dev/null; sleep 1
D="$E/runs/$PORT"; rm -rf "$D"; mkdir -p "$D/photos"
cd "$REPO" || exit 1
AI_PROVIDER=gemini AI_MODEL="$MODEL" DIFFICULTY_MODEL="$DMODEL" \
DATABASE_URL="sqlite:$D/eval.db?mode=rwc" PHOTOS_DIR="$D/photos" \
DEV_USER_EMAIL=test@example.com FAMILIES_CONFIG_PATH=tests/e2e/families.ci.yaml \
BIND_ADDRESS=127.0.0.1:$PORT API_KEY=test-api-key-for-playwright \
RUST_LOG="info,recipe_vault=debug" \
nohup "$BIN" > "$D/server.log" 2>&1 &
for i in $(seq 1 60); do curl -sf "http://127.0.0.1:$PORT/static/app.js" >/dev/null && break; sleep 0.5; done
curl -sf "http://127.0.0.1:$PORT/static/app.js" >/dev/null || { echo "server failed" >&2; tail -20 "$D/server.log" >&2; exit 1; }
node "$E/seed.cjs" "http://127.0.0.1:$PORT" > "$D/ids.json" || exit 1
echo "up on $PORT with $MODEL; ids in $D/ids.json"
