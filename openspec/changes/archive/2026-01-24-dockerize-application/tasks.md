## 1. Configuration
- [x] 1.1 Create `Dockerfile` with multi-stage build (planner + builder + runtime)
- [x] 1.2 Create `docker-compose.yml` defining the API service and volume
- [x] 1.3 Add `.dockerignore` to exclude target/ and other artifacts

## 2. Documentation
- [x] 2.1 Update `README.md` with "Running via Docker" instructions
- [x] 2.2 Add instructions for pushing to Docker Hub (`docker push mazhewitt/recipe-vault`)
- [x] 2.3 Add instructions for configuring Claude/Gemini to use the Dockerized MCP server

## 3. Verification
- [x] 3.1 Build the image locally
- [x] 3.2 Test the API server via Docker Compose
- [x] 3.3 Test the MCP server via `docker run -i`