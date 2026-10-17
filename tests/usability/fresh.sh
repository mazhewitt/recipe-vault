#!/bin/sh
# Usage: tests/usability/fresh.sh <port>
#
# Gives you a clean, seeded mock-LLM server on <port>:
#   1. wipes tests/usability/runs/<port>/ (db, photos, logs)
#   2. starts server.sh <port>
#   3. seeds the 10-recipe family book (seed.cjs; 4 recipes have photos)
#   4. restarts with MOCK_RECIPE_ID=<lasagne id> so a chat note containing "show"/"display"
#      opens Granny's Beef Lasagne
# Prints the recipe ids JSON (also saved to tests/usability/runs/<port>/ids.json).
# Re-run it any time to reset. Stop the server with: lsof -tiTCP:<port> -sTCP:LISTEN | xargs kill
PORT=${1:?usage: fresh.sh <port>}
H=$(cd "$(dirname "$0")" && pwd)
RUN="$H/runs/$PORT"
case "$PORT" in
  3001) echo "port 3001 is reserved for make test-e2e" >&2; exit 1 ;;
  ''|*[!0-9]*) echo "port must be a number, got '$PORT'" >&2; exit 1 ;;
esac

lsof -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill 2>/dev/null
rm -rf "$RUN"
"$H/server.sh" "$PORT" >/dev/null || exit 1
node "$H/seed.cjs" "http://127.0.0.1:$PORT" > "$RUN/ids.json" 2>"$RUN/seed.err" || { cat "$RUN/seed.err" >&2; exit 1; }
[ -s "$RUN/seed.err" ] && cat "$RUN/seed.err" >&2
MR=$(node -e 'console.log(require(process.argv[1]).ids.lasagne)' "$RUN/ids.json") || exit 1
"$H/server.sh" "$PORT" "$MR" >/dev/null || exit 1
cat "$RUN/ids.json"
