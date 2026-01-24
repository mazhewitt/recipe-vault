#!/bin/bash
set -e

echo "=== 1. Cleaning up previous runs ==="
docker compose down -v || true

echo "=== 2. Building Docker image ==="
docker build -t mazhewitt/recipe-vault:test .

echo "=== 3. Starting API Server ==="
# Use the test image tag in a temporary override or just force the image name via env if supported, 
# but for simplicity we will tag it as latest locally or just rely on the build
docker tag mazhewitt/recipe-vault:test mazhewitt/recipe-vault:latest
docker compose up -d

echo "=== 4. Waiting for API to be ready ==="
# Simple wait loop
for i in {1..30}; do
    if curl -s http://localhost:3000/api/recipes > /dev/null; then
        echo "API is up!"
        break
    fi
    echo "Waiting for API..."
    sleep 1
done

echo "=== 5. Testing REST API ==="
# Create a recipe via API
curl -s -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Docker Test Recipe",
    "description": "Created via curl integration test",
    "servings": 4,
    "ingredients": [{"name": "test ingredient", "quantity": 1, "unit": "cup"}],
    "steps": [{"instruction": "mix it"}]
  }' > /dev/null

echo "Recipe created via API."

echo "=== 6. Testing MCP Server via Docker ==="
# Run MCP list_recipes to verify it sees the same DB
# We use 'docker exec' to run inside the existing container, avoiding file locking issues
# that can occur when mounting the same sqlite volume in two different containers simultaneously.
RESPONSE=$(echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_recipes","arguments":{}},"id":1}' | \
    docker exec -i recipe-vault-api-1 recipe-vault-mcp)

echo "MCP Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "Docker Test Recipe"; then
    echo "SUCCESS: MCP server found the recipe created by API!"
else
    echo "FAILURE: MCP server did not find the recipe."
    exit 1
fi

echo "=== 7. Cleanup ==="
docker compose down -v
echo "Test passed successfully!"
