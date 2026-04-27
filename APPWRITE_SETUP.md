# DealPost Appwrite Integration - Complete Setup Guide

## Overview

This guide covers deploying Appwrite on a self-hosted Ubuntu VPS at `148.230.66.192` and integrating it with the DealPost project (React/Vite frontend + Node/Express backend).

---

## PART 1: VPS SETUP (Ubuntu)

### 1.1 Initial Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y curl wget git ufw
```

### 1.2 Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Add current user to docker group (requires logout/login after)
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker installation
docker --version
docker run hello-world

# Install Docker Compose (included with modern Docker, verify:)
docker compose version
```

### 1.3 Configure Firewall (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (critical!)
sudo ufw allow 22/tcp

# Allow HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Docker ports (optional, for management)
sudo ufw allow 8080/tcp  # Appwrite console default

# Check status
sudo ufw status
```

### 1.4 VPS Requirements Check

```bash
# Check RAM (minimum 2GB needed)
free -h

# Check disk space (need 10GB+ free)
df -h

# Both should show sufficient resources
```

---

## PART 2: INSTALL & RUN APPWRITE

### 2.1 Clone and Setup Appwrite

```bash
# Create a directory for Appwrite
mkdir -p ~/appwrite
cd ~/appwrite

# Clone Appwrite repository
git clone https://github.com/appwrite/appwrite.git .

# Or download specific version (recommended for stability)
# wget https://github.com/appwrite/appwrite/archive/refs/tags/1.5.0.zip
# unzip 1.5.0.zip && cd appwrite-1.5.0
```

### 2.2 Configure Docker Compose

Replace `~/appwrite/docker-compose.yml` with the provided `docker-compose.appwrite.yml` included in this setup.

Key configurations:

- Hostname: `appwrite.dealpost.local` (update after domain setup)
- Ports: 80, 443 (will be proxied via Nginx)
- Volumes: For database persistence
- Environment: API keys and security settings

### 2.3 Start Appwrite

```bash
cd ~/appwrite

# Build and start services
docker compose up -d

# Wait 30-60 seconds for initialization
sleep 60

# Verify all containers are running
docker ps

# Check logs if needed
docker compose logs -f
```

### 2.4 Initial Access & Setup

```bash
# Temporary access via IP (for initial setup only)
# Navigate browser to: http://148.230.66.192

# OR if port 80 is blocked:
# http://148.230.66.192:8080

# Create admin account during first load
# Email: your-admin@dealpost.in
# Password: (strong password)
```

---

## PART 3: DOMAIN & HTTPS SETUP

### 3.1 Domain Configuration

1. Point your domain to the VPS IP:
   - Domain: `api.dealpost.in` (update your actual domain)
   - DNS Record (A): `api.dealpost.in` → `148.230.66.192`
   - DNS Record (A): `dealpost.in` → `148.230.66.192` (frontend domain)
   - Wait 5-15 minutes for DNS propagation

### 3.2 Install & Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Enable and start
sudo systemctl enable nginx
sudo systemctl start nginx

# Verify
sudo systemctl status nginx
```

### 3.3 Create Nginx Configuration

Create `/etc/nginx/sites-available/appwrite` (provided in `nginx.conf.appwrite`):

```bash
# Copy and configure the provided Nginx file
sudo nano /etc/nginx/sites-available/appwrite
# Paste the content from nginx.conf.appwrite
# Replace:
#   - YOUR_DOMAIN with api.dealpost.in
#   - FRONTEND_DOMAIN with dealpost.in (for CORS)

# Enable the site
sudo ln -s /etc/nginx/sites-available/appwrite /etc/nginx/sites-enabled/

# Disable default site (if applicable)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3.4 Enable HTTPS with Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot certonly --nginx -d api.dealpost.in -d dealpost.in

# Auto-renew setup
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### 3.5 Update Appwrite Configuration

Inside Appwrite Console:

1. Go to **Settings** → **Domains & APIs**
2. Add trusted domain: `https://api.dealpost.in`
3. Add CORS origins:
   - `https://dealpost.in`
   - `https://www.dealpost.in`
   - `http://localhost:5173` (dev frontend)

---

## PART 4: APPWRITE PROJECT SETUP

### 4.1 Create Project in Console

1. Login to Appwrite Console: `https://api.dealpost.in`
2. Click **Create Project**
   - Name: `DealPost`
   - Project ID: `dealpost` (use this in configs)
3. Click **Create**

### 4.2 Generate API Keys

1. Go to **Settings** → **API Keys**
2. Create new key:
   - Name: `Frontend SDK`
   - Scopes: Select appropriate scopes for frontend
3. Create another:
   - Name: `Backend Server`
   - Scopes: All (server has full access)
4. Copy and save both keys securely

### 4.3 Add Web Platform Configuration

1. Go to **Settings** → **Platforms**
2. Add **Web App**:
   - Name: `DealPost Frontend`
   - Hostname: `dealpost.in`
   - Add alternate: `www.dealpost.in`
   - Add alternate for dev: `localhost:5173`

---

## PART 5: DATABASE COLLECTIONS

Create the following collections with indexes and permissions (see `appwrite-collections.md`):

### Collections to Create:

1. **users**
   - userId (primary)
   - email
   - name
   - avatar (file ID)
   - phone
   - verified (boolean)
   - businessVerified (boolean)
   - gstIn
   - createdAt
   - updatedAt

2. **listings**
   - listingId (primary)
   - title
   - description
   - specifications (array)
   - price
   - quantity
   - category
   - images (array of file IDs)
   - ownerId (index + permission)
   - location (geo-object)
   - status (active/sold/pending)
   - createdAt (index)
   - updatedAt

3. **messages**
   - messageId (primary)
   - conversationId
   - senderId (index)
   - receiverId (index)
   - message
   - attachments (optional)
   - readAt (nullable)
   - createdAt (index)

4. **conversations**
   - conversationId (primary)
   - participantIds (array)
   - lastMessage
   - updatedAt (index)

5. **notifications**
   - notificationId (primary)
   - userId (index)
   - type (message/listing/like/etc)
   - content
   - relatedId (listingId/userId/etc)
   - read (boolean)
   - createdAt

6. **reports**
   - reportId (primary)
   - reporterId
   - reportedEntityId
   - reportedEntityType (user/listing)
   - reason
   - description
   - status (pending/reviewed/resolved)
   - createdAt

---

## PART 6: FRONTEND INTEGRATION

### 6.1 Environment Configuration

Update `frontend/.env`:

```env
VITE_APPWRITE_ENDPOINT=https://api.dealpost.in/v1
VITE_APPWRITE_PROJECT_ID=dealpost
VITE_APPWRITE_API_KEY=<your-frontend-api-key>
```

### 6.2 Create Appwrite Service

Create `frontend/src/services/appwrite.js` (provided with this setup)

This service provides:

- `Client` initialization
- `Account` for authentication
- `Databases` for data operations
- `Storage` for file uploads
- `Realtime` for live updates

### 6.3 Create Authentication Hook

Create `frontend/src/hooks/useAppwriteAuth.js` (provided)

Replaces current localStorage-based auth with Appwrite Session management.

### 6.4 Update Axios Instance

Update `frontend/src/api/axios.js`:

- Add Appwrite session token to request headers
- Sync with Appwrite authentication

---

## PART 7: BACKEND INTEGRATION

### 7.1 Backend Strategy

**KEEP YOUR EXISTING BACKEND** for:

- Custom business logic
- Complex validations
- API orchestration
- Future AI features (Yukti integration)

**USE APPWRITE FOR:**

- Authentication validation
- Session verification
- File storage validation
- Realtime subscriptions

### 7.2 Create Backend Appwrite Client

Create `backend/src/services/appwrite.js` (server-to-server):

- Uses API key instead of session
- Full database access
- Admin operations

### 7.3 Update Authentication Middleware

Update `backend/src/middleware/auth.middleware.js`:

- Verify Appwrite session tokens
- Cross-validate with backend database
- Maintain backward compatibility

### 7.4 Hybrid Approach Example

For user registration:

1. Frontend: Appwrite signup
2. Backend: Create user record in your DB with Appwrite UID
3. Backend: Create Appwrite user profile in collections

---

## PART 8: REALTIME INTEGRATION

### 8.1 Frontend Realtime Subscriptions

Update React components with Appwrite Realtime:

```javascript
// Chat/Messages
realtimeClient.subscribe(
	`databases.dealpost.collections.messages.documents`,
	(response) => {
		// Update UI with new message
	},
);

// Notifications
realtimeClient.subscribe(
	`databases.dealpost.collections.notifications.documents`,
	(response) => {
		// Show notification toast
	},
);
```

### 8.2 Message Chat Integration

- Connect WebSocket via Appwrite Realtime instead of Socket.io (optional)
- Or keep Socket.io and add Appwrite sync for persistence

---

## PART 9: DOCKER MANAGEMENT

### 9.1 Persistent Volumes

```bash
# Create Docker volumes for data persistence
docker volume create appwrite_mariadb
docker volume create appwrite_redis
docker volume create appwrite_influxdb

# Update docker-compose.yml to use these named volumes
```

### 9.2 Auto-Restart

Docker Compose `restart_policy`:

```yaml
services:
  appwrite:
    restart_policy:
      condition: on-failure
      delay: 5s
      max_attempts: 5
```

### 9.3 Logs & Monitoring

```bash
# View Appwrite logs
docker compose logs -f appwrite

# Monitor all containers
docker stats

# Check specific service
docker logs appwrite_mariadb
```

---

## PART 10: SECURITY CHECKLIST

- [ ] Firewall configured (80, 443 open; 22 restricted)
- [ ] HTTPS enabled with Let's Encrypt
- [ ] SSL certificate auto-renewal set up
- [ ] Appwrite admin password is strong
- [ ] API keys stored securely (not in git/code)
- [ ] CORS origins properly configured (specific domains only)
- [ ] Document-level permissions enforced
- [ ] User data encrypted at rest (verify in Appwrite settings)
- [ ] Backups configured (daily snapshots recommended)
- [ ] Monitoring/alerts set up (optional: Grafana, Prometheus)

---

## PART 11: DEPLOYMENT CHECKLIST

- [ ] Appwrite running and healthy
- [ ] Nginx reverse proxy working
- [ ] SSL/HTTPS validated via browser
- [ ] Frontend can reach Appwrite API
- [ ] Authentication flow working (signup/login/logout)
- [ ] File uploads working
- [ ] Realtime messages updating live
- [ ] Database queries returning correct data
- [ ] Admin dashboard accessible
- [ ] Backups automated

---

## FILE REFERENCES

The following files are included in this setup:

1. **docker-compose.appwrite.yml** - Appwrite Docker Compose configuration
2. **nginx.conf.appwrite** - Nginx reverse proxy configuration
3. **appwrite-collections.md** - Database collection schemas & permissions
4. **appwrite.js** (frontend service) - Appwrite SDK initialization & helpers
5. **appwrite.js** (backend service) - Server-to-server Appwrite client
6. **useAppwriteAuth.js** - React authentication hook
7. **appwrite-integration-guide.md** - Detailed integration steps

---

## QUICK REFERENCE COMMANDS

```bash
# View Appwrite status
docker ps | grep appwrite

# Restart Appwrite
docker compose restart appwrite

# View logs
docker compose logs -f appwrite

# SSH into container
docker exec -it appwrite bash

# Backup database
docker exec appwrite-mariadb mysqldump -u root -ppassword appwrite > backup.sql

# Stop all services
docker compose down

# Rebuild images
docker compose build --no-cache

# Check Nginx config
sudo nginx -t

# View SSL cert expiration
sudo certbot certificates

# Renew SSL manually
sudo certbot renew --force-renewal
```

---

## TROUBLESHOOTING

### Appwrite not accessible via domain

- Verify DNS propagation: `nslookup api.dealpost.in`
- Check Nginx: `sudo nginx -t` and `sudo systemctl reload nginx`
- Check firewall: `sudo ufw status`
- Verify Docker: `docker ps`

### SSL certificate issues

- Check cert renewal: `sudo certbot renew --dry-run`
- View certs: `sudo certbot certificates`
- Check Nginx SSL paths point to correct cert files

### CORS errors on frontend

- Verify domain in Appwrite Settings → Platforms
- Check Nginx headers in config
- Clear browser cache

### Database connection issues

- Check MariaDB container: `docker ps | grep mariadb`
- View logs: `docker compose logs mariadb`
- Verify volumes: `docker volume ls`

---

## NEXT STEPS

1. Follow VPS Setup section on your Ubuntu server
2. Deploy Appwrite using provided docker-compose.yml
3. Configure domain & HTTPS
4. Create collections in Appwrite console
5. Integrate frontend (update .env, create services)
6. Test authentication flow
7. Enable realtime features
8. Deploy to production

---

**Estimated Time: 2-4 hours for complete setup**
**Support: Check Appwrite docs at https://appwrite.io/docs**
