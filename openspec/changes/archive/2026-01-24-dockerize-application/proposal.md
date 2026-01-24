# Change: Dockerize Application

## Why
Users currently need a Rust toolchain to run Recipe Vault. To improve distribution and ease of use, the application should be packaged as a Docker image. This allows users to download and run the server from Docker Hub without compiling source code.

## What Changes
- Add `Dockerfile` to build a multi-binary image.
- Add `docker-compose.yml` for orchestrating the API server and database volume.
- Add `entrypoint.sh` to route commands to the correct binary.
- Document deployment instructions for `mazhewitt/recipe-vault`.

## Impact
- **Affected specs:** `deployment` (new capability)
- **Affected code:** New files only (`Dockerfile`, `docker-compose.yml`, scripts). No Rust code changes.
