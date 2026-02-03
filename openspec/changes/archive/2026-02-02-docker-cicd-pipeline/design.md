## Context

Recipe Vault currently supports Docker deployment via manual builds. The target production environment is a Synology DS716+II NAS (Intel x86_64, 2GB RAM) running Docker. Development happens on a MacBook Pro, with code hosted in a public GitHub repository.

The deployment spec already covers local Docker builds. This design adds the CI/CD layer for automated releases.

**Current state:**
- Dockerfile exists for building the application
- Manual process: build locally, transfer to NAS, restart container
- Secrets (ANTHROPIC_API_KEY) managed ad-hoc

**Target state:**
- Push a git tag → image automatically built and published
- Synology pulls and restarts automatically via Watchtower
- Secrets externalized in `.env` on the NAS, never in repo or image

## Goals / Non-Goals

**Goals:**
- Automated Docker image builds triggered by version tags (v*)
- Images published to Docker Hub with version and `:latest` tags
- Self-updating production via Watchtower
- Clear secrets management pattern (runtime secrets on host only)
- Production-ready docker-compose template for Synology

**Non-Goals:**
- Multi-architecture builds (x86_64 only, matching the Synology)
- Kubernetes or orchestration beyond docker-compose
- Automated NAS provisioning (one-time manual setup is acceptable)
- Staging environments or promotion workflows
- Automated database backups (separate concern)

## Decisions

### Decision: GitHub Actions for CI/CD

**Choice:** GitHub Actions

**Rationale:** Already integrated with the repository, free for public repos, native Docker build support, and secrets management built in.

**Alternatives considered:**
- Jenkins: Overkill for a home project, requires hosting
- CircleCI/TravisCI: Additional account/integration, no clear benefit
- Local builds with scripts: Loses automation benefit

### Decision: Docker Hub for Image Registry

**Choice:** Docker Hub (public repository)

**Rationale:** User already has an account, free tier sufficient, Watchtower integrates natively.

**Alternatives considered:**
- GitHub Container Registry (ghcr.io): Would work, but Docker Hub already set up
- Self-hosted on Synology: Additional complexity, no clear benefit

### Decision: Watchtower for Auto-Updates

**Choice:** Watchtower container watching `:latest` tag

**Rationale:** Simple, battle-tested, no custom code needed. Polls registry and restarts containers when image changes.

**Alternatives considered:**
- Webhook-triggered deploys: Requires exposing NAS to internet or tunnel setup
- Cron-based pull scripts: More manual, same result with more code
- Manual deploys: Defeats the purpose of automation

### Decision: Tag-Based Releases (not every push)

**Choice:** Build only on `v*` tags, not on every push to main

**Rationale:** Gives control over when releases happen. Pushing a tag is an intentional release action.

**Workflow:**
```
git tag v1.2.0
git push --tags
# → triggers build → pushes to Docker Hub → Watchtower picks up within 5 min
```

### Decision: Secrets Management Pattern

**Choice:** Runtime secrets in `.env` file on NAS filesystem, referenced by docker-compose

**Rationale:**
- Secrets never enter git or Docker image
- Simple to manage on a single-host deployment
- Standard Docker pattern

**Layout on Synology:**
```
/volume1/docker/recipe-vault/
├── docker-compose.yml    # service definition
├── .env                  # ANTHROPIC_API_KEY, etc.
└── data/
    └── recipes.db        # persistent database on RAID
```

## Risks / Trade-offs

**[Risk] Watchtower polling delay** → Acceptable for home use (5-minute default). Can reduce interval if needed.

**[Risk] Docker Hub rate limits** → Unlikely to hit for a single-user home project. Free tier allows 200 pulls/6hr for anonymous, unlimited for authenticated.

**[Risk] NAS resource constraints (2GB RAM)** → Rust binary is lightweight (~50-100MB runtime). Watchtower adds minimal overhead.

**[Risk] No rollback mechanism** → Previous images remain on Docker Hub with version tags. Manual rollback by changing image tag in docker-compose. Acceptable for home use.

**[Trade-off] Public Docker Hub image** → Anyone can pull the image. Acceptable since source is already public and no secrets are baked in.
