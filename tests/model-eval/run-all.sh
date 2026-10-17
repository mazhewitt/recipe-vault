#!/bin/sh
# Runs every candidate in parallel, each on its own port, against the live Gemini API.
# Usage: GEMINI_API_KEY=... [FILTER=hard] tests/model-eval/run-all.sh <round-label>
# Results: tests/model-eval/runs/results/<round>-<label>.json; logs alongside in runs/.

# Candidates: port label model [extra env...]   (never use port 3001)
CANDIDATES='
3021 flash38     gemini-3.8-flash      X=1
3022 flash38-low gemini-3.8-flash      GEMINI_THINKING_LEVEL=low
3023 flash36     gemini-3.6-flash      X=1
3024 argon       gemini-4-argon        GEMINI_MAX_OUTPUT_TOKENS=32768
3025 flashlite35 gemini-3.5-flash-lite X=1
'
DIFFICULTY_MODEL=gemini-3.5-flash-lite

E=$(cd "$(dirname "$0")" && pwd); R=${1:?usage: run-all.sh <round-label>}
[ -n "$GEMINI_API_KEY" ] || { echo "GEMINI_API_KEY is not set; export it from your secret store first" >&2; exit 1; }
L="$E/runs/logs"; mkdir -p "$L"
run() { # port label model [env...]
  P=$1; N=$2; M=$3; shift 3
  ( env "$@" "$E/gemini-server.sh" "$P" "$M" "$DIFFICULTY_MODEL" > "$L/$R-$N.boot.log" 2>&1 \
      && node "$E/run-eval.cjs" "$P" "$R-$N" ${FILTER:-} > "$L/$R-$N.log" 2>&1
    lsof -ti:"$P" | xargs kill 2>/dev/null ) &
}
while read -r P N M X; do
  [ -n "$P" ] || continue
  run "$P" "$N" "$M" $X
done <<LIST
$CANDIDATES
LIST
wait
tail -n 1 "$L"/"$R"-*.log
