#!/bin/bash
set -e

# Usage: ./capture_llm_responses.sh <family-password>

if [ -z "$1" ]; then
    echo "Usage: $0 <family-password>"
    exit 1
fi

PASSWORD="$1"
BASE_URL="http://127.0.0.1:3000"
OUTPUT_DIR="./test_fixtures/llm_responses"

mkdir -p "$OUTPUT_DIR"

echo "=== Authenticating ==="

# Get session cookie by logging in
COOKIE_JAR=$(mktemp)
curl -s -c "$COOKIE_JAR" -d "password=$PASSWORD" "$BASE_URL/login" > /dev/null

# Extract the session cookie for use in subsequent requests
SESSION_COOKIE=$(grep rv_session "$COOKIE_JAR" | awk '{print $7}')

if [ -z "$SESSION_COOKIE" ]; then
    echo "ERROR: Failed to authenticate. Check your password."
    rm "$COOKIE_JAR"
    exit 1
fi

echo "Authenticated successfully."
echo ""

# Function to send chat message and capture SSE response
capture_chat() {
    local message="$1"
    local output_file="$2"
    local conversation_id="$3"

    echo "=== Sending: \"$message\" ==="
    echo "Output: $output_file"

    local body
    if [ -z "$conversation_id" ]; then
        body="{\"message\": \"$message\"}"
    else
        body="{\"message\": \"$message\", \"conversation_id\": \"$conversation_id\"}"
    fi

    # Capture the full SSE stream
    curl -s -N \
        -b "rv_session=$SESSION_COOKIE" \
        -H "Content-Type: application/json" \
        -d "$body" \
        "$BASE_URL/api/chat" > "$output_file"

    echo "Captured $(wc -l < "$output_file" | tr -d ' ') lines"
    echo ""

    # Extract conversation_id for subsequent requests
    grep -o '"conversation_id":"[^"]*"' "$output_file" | tail -1 | sed 's/.*:"\([^"]*\)".*/\1/'
}

echo "=== Capturing LLM Responses ==="
echo ""

# Capture 1: List all recipes
CONV_ID=$(capture_chat "List all the recipes" "$OUTPUT_DIR/list_recipes.txt")

echo "Conversation ID: $CONV_ID"
echo ""

# Wait a moment for the LLM to be ready
sleep 2

# Capture 2: Display a recipe (we'll ask it to show one)
capture_chat "Show me the first recipe from that list" "$OUTPUT_DIR/display_recipe.txt" "$CONV_ID"

# Cleanup
rm "$COOKIE_JAR"

echo "=== Done ==="
echo ""
echo "Captured responses saved to:"
echo "  $OUTPUT_DIR/list_recipes.txt"
echo "  $OUTPUT_DIR/display_recipe.txt"
echo ""
echo "You can inspect these files to see the SSE stream format."
