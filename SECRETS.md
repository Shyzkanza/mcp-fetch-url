# 🔐 GitHub Secrets Configuration

This file explains the secrets to configure in GitHub for automatic deployment via Portainer.

## 📍 Where to Configure Secrets

1. Go to your GitHub repo: `https://github.com/YOUR_USERNAME/mcp-fetch-url`
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click on **New repository secret**

---

## 🔑 Required Secrets

### For npm Publication

#### `NPM_TOKEN`
**Description**: npm access token to publish the package  
**How to get it**:
1. Go to https://www.npmjs.com/settings/YOUR_NPM_USERNAME/tokens
2. Click on "Generate New Token" → "Classic Token"
3. Select "Automation" (for CI/CD)
4. Copy the generated token

**Format**: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **Important**: This token allows publishing to npm. Keep it secure!

---

### For VPS Deployment (Portainer API)

### 1. `PORTAINER_URL`
**Description**: Your Portainer instance URL  
**Example**: `https://portainer.rankorr.red`  
**How to get it**: This is the URL you use to access Portainer

---

### 2. `PORTAINER_USERNAME`
**Description**: Portainer admin username  
**Example**: `admin` or your Portainer username  
**How to get it**: The username you use to log into Portainer

---

### 3. `PORTAINER_PASSWORD`
**Description**: Your Portainer account password  
**How to get it**: The password you use to log into Portainer

⚠️ **Important**: Make sure this account has admin rights on Portainer

---

### 4. `PORTAINER_STACK_ID`
**Description**: ID of the scrapidou stack in Portainer  
**Example**: `7`  
**How to get it**: 
1. Go to Portainer → Stacks → your stack
2. Look at the URL: `https://portainer.your-domain.com/#!/[ENDPOINT_ID]/docker/stacks/[STACK_NAME]?id=[STACK_ID]`
3. The `id=` parameter contains the STACK_ID

---

### 5. `PORTAINER_ENDPOINT_ID`
**Description**: Docker endpoint ID in Portainer  
**Example**: `3`  
**How to get it**: 
1. In the same stack URL
2. The number after `#!/` is the endpoint ID
3. Example: `https://portainer.your-domain.com/#!/3/...` → endpoint ID = `3`

---

## ✅ Verification

Once the 6 secrets are configured (1 npm + 5 Portainer), you can:

1. **Manually test** the GitHub action:
   - Go to **Actions** → **Deploy Scrapidou to VPS**
   - Click on **Run workflow**

2. **Or simply push** to the `main` branch:
   ```bash
   git add .
   git commit -m "feat: update deployment"
   git push origin main
   ```

The workflow will:
- ✅ Authenticate to Portainer
- ✅ Ask Portainer to redeploy from Git  
- ✅ Wait 30 seconds
- ✅ Test the healthcheck

All in **~1 minute**! 🚀

---

## 🛡️ Security

- ✅ **NEVER** commit these secrets in the code
- ✅ Use a dedicated Portainer account if possible (with limited rights)
- ✅ Keep this `SECRETS.md` file in the repo (it doesn't contain the real values)
- ✅ Regularly renew passwords

---

## 🔧 Prior Portainer Configuration

Before launching automatic deployment, make sure that in Portainer:

### 1. The stack exists
- Created from a Git repository
- Repository URL: `https://github.com/YOUR_USERNAME/mcp-fetch-url`
- Branch: `main`
- Compose path: `docker-compose.yml`

### 2. The Docker network exists
- Name: `playlist-server_web` (or the one defined in your docker-compose)
- Type: External
- Used by Traefik

### 3. Traefik is running and configured
- With Let's Encrypt (resolver: `myresolver`)
- HTTPS redirect middleware: `traefik-redirect-to-https@docker`

---

## 📞 In Case of Problems

### Error "Permission denied"
→ The Portainer credentials are incorrect. Check:
- That the username and password are correct
- That the account has admin rights

### Error "Stack not found"
→ The STACK_ID is incorrect. Check:
- That you're using the correct stack ID from the URL
- That the stack exists in Portainer

### Error "network playlist-server_web not found"
→ Create the network: `docker network create playlist-server_web`

---

**Last update**: 2025-11-25

