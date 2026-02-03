# Recipe Vault Production Deployment

This directory contains configuration for deploying Recipe Vault to a Synology NAS (or any Docker-capable server).

## Prerequisites

- Synology NAS with "Container Manager" (Docker) installed
- SSH access enabled on Synology (for initial setup)
- A Docker Hub account with the `recipe-vault` image pushed (see repo README)

## Setup Instructions

1.  **Prepare Directory**
    SSH into your Synology or use File Station to create a folder:
    `/volume1/docker/recipe-vault`

2.  **Upload Files**
    Upload `docker-compose.prod.yml` and `.env.example` to this folder.

3.  **Configure**
    - Rename `docker-compose.prod.yml` to `docker-compose.yml`.
    - Edit `docker-compose.yml`: Change `username/recipe-vault:latest` to your actual image name.
    - Rename `.env.example` to `.env`.
    - Edit `.env`: Add your `ANTHROPIC_API_KEY` and `FAMILY_PASSWORD`.

4.  **Start Services**
    
    **Option A: Synology Container Manager (UI)**
    - Open Container Manager.
    - Go to "Project".
    - Click "Create".
    - Name: `recipe-vault`.
    - Path: Select `/docker/recipe-vault`.
    - Source: "Create docker-compose.yml" (it will use the existing one).
    - Click "Next", then "Done".

    **Option B: SSH (Command Line)**
    ```bash
    cd /volume1/docker/recipe-vault
    sudo docker-compose up -d
    ```

5.  **Access**
    Open `http://<synology-ip>:3000` in your browser.

## Automatic Updates

The `watchtower` service is configured to check for new images every 5 minutes. When a new version is pushed to Docker Hub with the `latest` tag:
1.  Watchtower pulls the new image.
2.  It restarts the `recipe-vault` container.
3.  Your data in `data/` is preserved.
