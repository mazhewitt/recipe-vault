# Synology NAS Deployment

This guide explains how to deploy Recipe Vault to your Synology NAS using Container Manager (formerly Docker).

## Prerequisites

- Synology NAS with "Container Manager" installed
- A Docker Hub account (or use the public image `mazhewitt/recipe-vault:latest` if available)
- SSH access enabled (optional, but recommended for setup)

## Deployment Steps

### 1. Prepare Directory Structure

It is best practice to keep your Docker configurations in a dedicated folder.

1.  Open **File Station** on your Synology.
2.  Navigate to the `docker` shared folder.
3.  Create a folder named `recipe-vault`.
4.  Inside it, create a folder named `data`.

Structure:
```
/volume1/docker/
└── recipe-vault/
    └── data/         <-- Recipes will be stored here
```

### 2. Upload Configuration Files

1.  Download `docker-compose.prod.yml` and `.env.example` from the `deploy/` directory of this repository.
2.  Upload them to `/volume1/docker/recipe-vault/` on your NAS.
3.  Rename `docker-compose.prod.yml` to `docker-compose.yml`.
4.  Rename `.env.example` to `.env`.

### 3. Configure Environment Variables

Edit the `.env` file on your NAS (using Synology Text Editor or via SSH).

**Required Settings:**

- `ANTHROPIC_API_KEY`: Your API key from Anthropic console.
- `FAMILY_PASSWORD`: A secure password for web access.
- `DOCKERHUB_USERNAME`: Set this to `mazhewitt` (or your own username if you built your own image).

### 4. Start the Application

#### Option A: Using Synology Container Manager (UI)

1.  Open **Container Manager**.
2.  Go to **Project** tab.
3.  Click **Create**.
4.  **Project Name**: `recipe-vault`
5.  **Path**: Select `/docker/recipe-vault`.
6.  **Source**: Choose "Create docker-compose.yml" (it will automatically use the file you uploaded).
7.  Click **Next**, verify settings, and click **Done**.

#### Option B: Using SSH (Command Line)

```bash
ssh your-user@your-synology-ip
cd /volume1/docker/recipe-vault
sudo docker-compose up -d
```

### 5. Verify Installation

- Open your browser to `http://<synology-ip>:3000/chat`.
- Log in with your `FAMILY_PASSWORD`.
- Try asking: "What recipes do I have?"

## Automatic Updates

The configuration includes **Watchtower**, a service that automatically keeps your application up to date.

- It checks for new Docker images every 5 minutes.
- If a new version is released (tagged `latest`), it will automatically pull the image and restart Recipe Vault.
- Your recipe data is persistent in the `data/` folder and will not be lost during updates.

## Troubleshooting

- **Check Logs**: In Container Manager, click on the container > Log to see startup errors.
- **Permission Issues**: Ensure the `data` folder is writable by the container user.
- **Port Conflicts**: If port 3000 is used, change `"3000:3000"` to `"3001:3000"` in `docker-compose.yml` and access on port 3001.
