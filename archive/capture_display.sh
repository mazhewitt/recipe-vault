#!/bin/bash
# Quick capture for display_recipe case
# Usage: ./capture_display.sh <family-password>

PASSWORD="$1"
BASE_URL="http://127.0.0.1:3000"
CONV_ID="461f1b19-5cca-450f-bc1a-6326f8c597aa"
OUTPUT="./test_fixtures/llm_responses/display_recipe.txt"

# Authenticate
COOKIE=$(curl -s -c - -d "password=$PASSWORD" "$BASE_URL/login" | grep rv_session | awk '{print $7}')

# Send the display request
curl -s -N \
    -b "rv_session=$COOKIE" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Show me the Chicken Curry recipe\", \"conversation_id\": \"$CONV_ID\"}" \
    "$BASE_URL/api/chat" > "$OUTPUT"

echo "Captured to $OUTPUT"
cat "$OUTPUT"
