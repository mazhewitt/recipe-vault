#!/bin/bash
set -e

# Configuration
CONTAINER_NAME="recipe-vault"
IMAGE_NAME="recipe-vault"
PORT=3000

echo "Stopping existing container (if any)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Building Docker image..."
docker build -t $IMAGE_NAME .

echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:3000 \
  --env-file .env \
  -e BIND_ADDRESS=0.0.0.0:3000 \
  -e DATABASE_URL=sqlite:///app/data/recipes.db?mode=rwc \
  -v recipe-data:/app/data \
  $IMAGE_NAME

echo "Container started! Logs:"
docker logs $CONTAINER_NAME
