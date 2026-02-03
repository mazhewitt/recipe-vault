## 1. Docker Build Configuration

- [x] 1.1 Review and update `.dockerignore` to ensure all sensitive files (secrets, logs, AI tool artifacts) are excluded
- [x] 1.2 Verify existing Dockerfile builds for linux/amd64 and produces optimized image

## 2. GitHub Actions Workflow

- [x] 2.1 Create `.github/workflows/release.yml` that triggers on `v*` tags
- [x] 2.2 Configure workflow to build Docker image for linux/amd64
- [x] 2.3 Configure workflow to push to Docker Hub with version tag and `latest` tag
- [x] 2.4 Document required GitHub Secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`)

## 3. Production Deployment Configuration

- [x] 3.1 Create `deploy/docker-compose.prod.yml` with recipe-vault service configuration
- [x] 3.2 Add Watchtower service to docker-compose for automatic updates
- [x] 3.3 Create `deploy/.env.example` documenting required environment variables
- [x] 3.4 Create `deploy/README.md` with Synology setup instructions
