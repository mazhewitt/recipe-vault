# Cloudflare Tunnel Setup Guide

Securely expose Recipe Vault to the internet using Cloudflare Tunnel and Access, with Google authentication.

## Overview

```
┌──────────────┐     ┌─────────────────────────────────────┐     ┌─────────────────┐
│    Family    │────▶│         Cloudflare                  │◄────│   Synology NAS  │
│   (Google)   │     │  • Access (Google OAuth)            │     │   cloudflared   │
│              │     │  • Tunnel (recipes.domain.com)     │     │   (outbound)    │
└──────────────┘     └─────────────────────────────────────┘     └─────────────────┘
```

**What this achieves:**
- No ports opened on your router
- Google authentication for family members only
- HTTPS automatic (Cloudflare's certificate)
- DDoS protection, rate limiting, bot detection
- Your NAS only makes outbound connections

---

## Prerequisites

- [ ] Cloudflare account with `domain.com` DNS managed
- [ ] Synology NAS with Docker/Container Manager installed
- [ ] recipe-vault already running on the NAS
- [ ] Google Cloud account (for OAuth - you already have this)

---

## Step 1: Set Up Google OAuth in Cloudflare

Before creating the tunnel, configure Google as an identity provider.

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Name: `Cloudflare Access`
7. Authorized redirect URIs, add:
   ```
   https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/callback
   ```
   (You'll get your team name in the next step - you can come back and update this)
8. Click **Create**
9. Save the **Client ID** and **Client Secret**

### 1.2 Configure Google in Cloudflare Zero Trust

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. If first time: create a team name (e.g., `domain`) - this becomes `domain.cloudflareaccess.com`
3. Go to **Settings → Authentication → Login methods**
4. Click **Add new → Google**
5. Enter your **Client ID** and **Client Secret** from Google
6. Click **Save**

> **Note:** Go back to Google Cloud Console and update the redirect URI with your actual team name if needed:
> `https://domain.cloudflareaccess.com/cdn-cgi/access/callback`

---

## Step 2: Create the Tunnel

### 2.1 Create Tunnel in Dashboard

1. In Zero Trust Dashboard, go to **Networks → Tunnels**
2. Click **Create a tunnel**
3. Select **Cloudflared** as the connector
4. Name it: `recipe-vault` (or whatever you prefer)
5. Click **Save tunnel**
6. You'll see a token - **copy this**, you'll need it for Docker

The token looks like:
```
eyJhIjoiNjM...long-string...
```

### 2.2 Configure Public Hostname

Still in the tunnel configuration:

1. Go to the **Public Hostname** tab
2. Click **Add a public hostname**
3. Configure:
   - **Subdomain:** `recipes`
   - **Domain:** `domain.com`
   - **Type:** `HTTP`
   - **URL:** `recipe-vault:3000` (or `host.docker.internal:3000` or your NAS IP - see notes below)
4. Click **Save hostname**

> **URL Options depending on your Docker setup:**
> - If cloudflared runs in the same docker-compose as recipe-vault: `recipe-vault:3000`
> - If recipe-vault is on the host/different network: `192.168.x.x:3000` (your NAS local IP)
> - Or `host.docker.internal:3000` on some setups

---

## Step 3: Run cloudflared on Synology

### 3.1 Update docker-compose.prod.yml

Update your `deploy/docker-compose.prod.yml` to add cloudflared:

```yaml
version: '3.8'

services:
  recipe-vault:
    image: mazhewitt/recipe-vault:latest
    container_name: recipe-vault
    restart: unless-stopped
    ports:
      - "3000:3000"  # Kept for local network access
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    networks:
      - recipe-net

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    networks:
      - recipe-net
    depends_on:
      - recipe-vault

  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --cleanup recipe-vault cloudflared

networks:
  recipe-net:
    driver: bridge
```

### 3.2 Add Tunnel Token to .env

Add the tunnel token to your `deploy/.env` file:

```bash
# Existing vars
ANTHROPIC_API_KEY=your-anthropic-key
FAMILY_PASSWORD=your-family-password
DATABASE_URL=sqlite:///app/data/recipes.db

# Add this - get from Cloudflare dashboard when you create the tunnel
TUNNEL_TOKEN=eyJhIjoiNjM...your-token-here
```

> **Important:** The token is sensitive - don't commit it to git. Your `.env` should already be in `.gitignore`.

### 3.3 Configure Tunnel URL in Cloudflare

When setting up the public hostname in Step 2, use:
- **Type:** `HTTP`
- **URL:** `recipe-vault:3000`

Since both containers are on the `recipe-net` network, cloudflared can reach recipe-vault by container name.

### 3.4 Deploy

1. In Synology Container Manager, update the stack
2. Or via SSH: `cd /path/to/deploy && docker-compose -f docker-compose.prod.yml up -d`
3. Watch the logs: `docker logs cloudflared`

### 3.3 Verify Tunnel is Connected

1. Go back to Cloudflare Zero Trust → Networks → Tunnels
2. Your tunnel should show **Healthy** status with a green dot
3. If not, check container logs in Synology

---

## Step 4: Create Access Policy

Now protect the tunnel with Google authentication.

### 4.1 Create an Access Application

1. In Zero Trust Dashboard, go to **Access → Applications**
2. Click **Add an application**
3. Select **Self-hosted**
4. Configure:
   - **Application name:** `Recipe Vault`
   - **Session duration:** `24 hours` (or longer - up to you)
   - **Subdomain:** `recipes`
   - **Domain:** `domain.com`
5. Click **Next**

### 4.2 Add Policy

1. **Policy name:** `Family Only`
2. **Action:** `Allow`
3. **Configure rules:**
   - **Selector:** `Emails`
   - **Value:** Add each family member's email:
     ```
     daughter@gmail.com
     you@gmail.com
     spouse@gmail.com
     ```

   Or use **Emails ending in** if you have a family domain:
   - **Selector:** `Emails ending in`
   - **Value:** `@yourfamilydomain.com`

4. Click **Next** then **Add application**

---

## Step 5: Test It

### 5.1 Test from Your Network

1. Open a browser (incognito/private mode to avoid cached sessions)
2. Go to `https://recipes.domain.com`
3. You should see the Cloudflare Access login page
4. Click **Sign in with Google**
5. Select your Google account
6. If your email is in the allow list, you'll be redirected to Recipe Vault
7. Log in with your family password (still required for now)

### 5.2 Test Rejection

1. Open another incognito window
2. Go to `https://recipes.domain.com`
3. Try to sign in with a Google account NOT on your list
4. Should see "Access Denied"

### 5.3 Have Your Daughter Test

1. Send her the URL: `https://recipes.domain.com`
2. She signs in with her Google account
3. Then enters the family password
4. She's in!

---

## Troubleshooting

### Tunnel shows "Inactive" or "Down"

- Check cloudflared container logs in Synology
- Verify the tunnel token is correct
- Ensure container can reach the internet (outbound)

### "Bad Gateway" or "Connection refused"

- The tunnel is working but can't reach recipe-vault
- Check the URL in Cloudflare tunnel config
- Verify recipe-vault is running and accessible at that address
- Try using the NAS IP directly: `192.168.x.x:3000`

### Google login not appearing

- Verify Google is configured in Settings → Authentication
- Check the OAuth redirect URI matches your team name
- Ensure the Access application is using Google as an identity provider

### Access denied for allowed email

- Check spelling of email in the policy
- Emails are case-insensitive but double-check
- Try removing and re-adding the email

### Certificate errors

- Cloudflare handles HTTPS automatically
- If you see cert errors, ensure you're accessing via `https://` not `http://`
- Check that Cloudflare proxy is enabled (orange cloud) for the DNS record

---

## Security Notes

### What's protected

- **Cloudflare Access** blocks all unauthenticated traffic at Cloudflare's edge
- Attackers can't even see your login page without valid Google auth
- Your NAS IP is never exposed (traffic goes through Cloudflare)
- No ports need to be opened on your router

### Current authentication flow

```
User → Google OAuth (Cloudflare) → Family Password (recipe-vault) → Access
```

### Future: Remove family password

Once you're comfortable with this setup, you can:
1. Trust Cloudflare Access as the sole authentication
2. Read user identity from Cloudflare headers in the app
3. Add "created by" / "updated by" tracking

Cloudflare passes these headers to your app:
- `Cf-Access-Authenticated-User-Email` - the user's email
- `Cf-Access-Jwt-Assertion` - JWT token for verification

This would be a code change to recipe-vault (a future phase).

---

## Quick Reference

| Item | Value |
|------|-------|
| URL | `https://recipes.domain.com` |
| Cloudflare Dashboard | https://one.dash.cloudflare.com/ |
| Google Cloud Console | https://console.cloud.google.com/ |
| Tunnel Name | `recipe-vault` |
| Access App Name | `Recipe Vault` |

---

## Adding More Family Members

1. Go to Zero Trust → Access → Applications
2. Click on **Recipe Vault**
3. Edit the **Family Only** policy
4. Add the new email address
5. Save

That's it - they can now sign in with Google.
