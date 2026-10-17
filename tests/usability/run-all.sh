#!/bin/sh
# Usage: tests/usability/run-all.sh <label> [journey ...]
#
# The quick re-measure loop. For each journey (default: find cook ask manage counter):
#   - starts its own fresh seeded mock server (fresh.sh) on its own port,
#   - runs tests/usability/remeasure/<journey>.cjs against it (all journeys in parallel),
#   - writes stdout to tests/usability/runs/<label>/<journey>.txt (stderr to <journey>.err),
# then stops every server it started and prints a diff against the baseline.
#
# Env:
#   PORT_BASE=3011   ports used are PORT_BASE..PORT_BASE+4 (find, cook, ask, manage, counter).
#                    Change it if another session is already using 3011-3015. Never covers 3001.
#   BASELINE=<dir>   baseline to diff against (default tests/usability/baseline-2026-10-17)
#   BIN=<path>       release binary (default target/release/recipe-vault)
LABEL=${1:?usage: run-all.sh <label> [journey ...]}
shift
case "$LABEL" in
  */*|.|..) echo "label must be a plain name, got '$LABEL'" >&2; exit 1 ;;
esac
H=$(cd "$(dirname "$0")" && pwd)
OUT="$H/runs/$LABEL"
BASELINE=${BASELINE:-$H/baseline-2026-10-17}
PORT_BASE=${PORT_BASE:-3011}
JOURNEYS=${*:-find cook ask manage counter}

if [ "$PORT_BASE" -le 3001 ] && [ "$((PORT_BASE + 4))" -ge 3001 ]; then
  echo "PORT_BASE=$PORT_BASE would use port 3001 (reserved for make test-e2e)" >&2; exit 1
fi

port_of() {
  case "$1" in
    find) echo "$PORT_BASE" ;;
    cook) echo "$((PORT_BASE + 1))" ;;
    ask) echo "$((PORT_BASE + 2))" ;;
    manage) echo "$((PORT_BASE + 3))" ;;
    counter) echo "$((PORT_BASE + 4))" ;;
    *) echo "unknown journey '$1' (expected find cook ask manage counter)" >&2; return 1 ;;
  esac
}

PORTS=""
for j in $JOURNEYS; do
  p=$(port_of "$j") || exit 1
  PORTS="$PORTS $p"
done

stop_servers() {
  for p in $PORTS; do lsof -tiTCP:"$p" -sTCP:LISTEN | xargs kill 2>/dev/null; done
}
trap stop_servers EXIT
trap 'stop_servers; exit 130' INT TERM

mkdir -p "$OUT"
echo "== starting servers:$PORTS"
for j in $JOURNEYS; do
  p=$(port_of "$j")
  rm -f "$OUT/$j.FAILED"
  ( "$H/fresh.sh" "$p" > "$OUT/$j.seed.json" 2> "$OUT/$j.seed.err" || touch "$OUT/$j.FAILED" ) &
done
wait
FAILED=0
for j in $JOURNEYS; do
  if [ -f "$OUT/$j.FAILED" ]; then
    echo "!! $j: server/seed failed:" >&2; cat "$OUT/$j.seed.err" >&2; FAILED=1
  fi
done
[ "$FAILED" = 1 ] && exit 1

echo "== running remeasure scripts in parallel ($JOURNEYS) -> $OUT"
START=$(date +%s)
for j in $JOURNEYS; do
  p=$(port_of "$j")
  ( node "$H/remeasure/$j.cjs" "$p" > "$OUT/$j.txt" 2> "$OUT/$j.err"; echo "   $j done ($(wc -l < "$OUT/$j.txt" | tr -d ' ') lines)" ) &
done
wait
echo "== finished in $(( $(date +%s) - START ))s"
stop_servers
for j in $JOURNEYS; do
  [ -s "$OUT/$j.err" ] && { echo "!! $j wrote to stderr ($OUT/$j.err):"; head -5 "$OUT/$j.err"; }
  grep -H ": ERROR" "$OUT/$j.txt" 2>/dev/null | sed 's/^/!! /'
done

# Share tokens are random and the manage journey prints its server port, so mask both before diffing.
norm() { sed -E 's#127\.0\.0\.1:[0-9]+#127.0.0.1:PORT#g; s#/share/[A-Za-z0-9_-]+#/share/TOKEN#g' "$1"; }

echo
echo "== diff vs $(basename "$BASELINE")  (- baseline, + this run; ports and share tokens masked)"
for j in $JOURNEYS; do
  if [ ! -f "$BASELINE/$j.txt" ]; then
    echo "-- $j: no baseline file"
    continue
  fi
  norm "$BASELINE/$j.txt" > "$OUT/.$j.base.norm"
  norm "$OUT/$j.txt" > "$OUT/.$j.run.norm"
  if cmp -s "$OUT/.$j.base.norm" "$OUT/.$j.run.norm"; then
    echo "-- $j: identical to baseline"
  else
    echo "-- $j:"
    diff "$OUT/.$j.base.norm" "$OUT/.$j.run.norm" | grep '^[<>]' | sed 's/^</  -/; s/^>/  +/'
  fi
  rm -f "$OUT/.$j.base.norm" "$OUT/.$j.run.norm"
done
echo
echo "outputs: $OUT"
