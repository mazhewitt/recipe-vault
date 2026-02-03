## Why

The application can be containerized but has no automated release pipeline. Currently, deploying to the home Synology NAS requires manual builds and transfers. A CI/CD pipeline triggered by git tags will enable hands-off deployments while keeping secrets out of the repository.

## What Changes

- Add GitHub Actions workflow that builds and publishes Docker images on version tags
- Push images to Docker Hub with both version tag and `:latest`
- Document Watchtower setup on Synology for automatic container updates
- Establish secrets management pattern: runtime secrets live on the NAS in `.env`, not in the repo or image
- Add production docker-compose.yml template for Synology deployment

## Capabilities

### New Capabilities

_None - this extends the existing deployment capability_

### Modified Capabilities

- `deployment`: Adding CI/CD pipeline requirements for automated builds on tags, Docker Hub publishing, and Watchtower-based auto-updates

## Impact

- **New files**: `.github/workflows/release.yml`, `.dockerignore`, `deploy/docker-compose.prod.yml`
- **GitHub configuration**: Requires `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets
- **Synology setup**: Manual one-time setup of docker-compose and Watchtower (documented, not automated)
- **No code changes**: This is infrastructure/deployment only
