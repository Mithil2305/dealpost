# DealPost — Production Deployment Guide

**Target Server:** Hostinger VPS · IP `148.230.66.192`  
**Stack:** Node.js 20, MySQL 8, Nginx, PM2, React (Vite)

---

## Table of Contents

1. [Critical Code Changes (Do First)](#1-critical-code-changes-do-first)
2. [Server Provisioning](#2-server-provisioning)
3. [MySQL Setup](#3-mysql-setup)
4. [Environment Files](#4-environment-files)
5. [Backend Deployment](#5-backend-deployment)
6. [Frontend Build & Deployment](#6-frontend-build--deployment)
7. [Nginx Configuration](#7-nginx-configuration)
8. [SSL Certificate (HTTPS)](#8-ssl-certificate-https)
9. [PM2 Process Manager](#9-pm2-process-manager)
10. [Firewall Rules](#10-firewall-rules)
11. [Post-Deployment Checks](#11-post-deployment-checks)
12. [Maintenance & Troubleshooting](#12-maintenance--troubleshooting)

---

## 1. Critical Code Changes (Do First)

Make all these changes **on your local machine** before pushing to the server.

---

### 1.1 — Fix `frontend/index.html` (CRITICAL)

The CDN Tailwind browser script is **not for production**. Remove it entirely — the Vite build uses `tailwind.config.js` + PostCSS which compiles Tailwind properly.

**File:** `frontend/index.html`

```html
<!-- REMOVE this line completely: -->
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

**Final `frontend/index.html` should look like:**

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>DealPost — The Digital Gallery</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/main.jsx"></script>
	</body>
</html>
```

---

### 1.2 — Add Gzip Compression to Backend

Install the package:

```bash
cd backend && npm install compression
```

**File:** `backend/src/app.js`

Add after the existing imports at the top:

```js
import compression from "compression";
```

Add as the **first middleware** right after `const app = express();`:

```js
app.use(compression());
```

---

### 1.3 — Add Sequelize Connection Pool

**File:** `backend/src/config/db.js`

Replace the `new Sequelize(...)` call with:

```js
export const sequelize = new Sequelize(
	env.DB_NAME,
	env.DB_USER,
	env.DB_PASSWORD,
	{
		host: env.DB_HOST,
		port: env.DB_PORT,
		dialect: "mysql",
		logging: false,
		define: {
			underscored: true,
		},
		pool: {
			max: 10,
			min: 2,
			acquire: 30000,
			idle: 10000,
		},
	},
);
```

---

### 1.4 — Add Request Size Security & Security Headers Fix

**File:** `backend/src/app.js`

Find the existing JSON body parser line and replace it:

```js
// Replace this:
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));

// With this (larger limit for listing creation with specs):
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
```

---

### 1.5 — Fix `backend/src/config/env.js` for Production Guard

Add `NODE_ENV` export so the rest of the app can reference it cleanly:

**File:** `backend/src/config/env.js`

Add at the top of the `env` object export:

```js
export const env = {
	NODE_ENV: process.env.NODE_ENV || "development",
	PORT: getNumber(process.env.PORT, 5000),
	// ... rest of existing config
};
```

---

### 1.6 — Add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to `.env.example`

**File:** `backend/.env.example`

Append these lines:

```
# Admin seeding (only used with: npm run seed:admin)
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=YourSecureAdminPassword123!
SEED_ADMIN_NAME=Super Admin
```

---

### 1.7 — Add `frontend/.env.example`

**File:** `frontend/.env.example` (update existing)

```
VITE_API_URL=https://yourdomain.com/api
```

---

### 1.8 — Fix Socket.io to Handle Multiple Origins Correctly

The current code already handles `CLIENT_URL` as a comma-separated list. No code change needed — just set the env variable correctly (see Section 4).

---

### 1.9 — Add PM2 Ecosystem Config

Create this file at the **project root** (next to `backend/` and `frontend/`):

**File:** `ecosystem.config.cjs`

```js
module.exports = {
	apps: [
		{
			name: "dealpost-api",
			script: "./backend/server.js",
			cwd: "/var/www/dealpost",
			interpreter: "node",
			instances: 2,
			exec_mode: "cluster",
			watch: false,
			max_memory_restart: "512M",
			env: {
				NODE_ENV: "production",
				PORT: 5000,
			},
			error_file: "/var/log/dealpost/error.log",
			out_file: "/var/log/dealpost/out.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
		},
	],
};
```

---

### 1.10 — Add `.gitignore` entry for production env

Make sure `backend/.gitignore` contains (it already does, but verify):

```
.env
.env.*
!.env.example
!.env.*.example
```

---

## 2. Server Provisioning

SSH into your Hostinger VPS:

```bash
ssh root@148.230.66.192
```

### 2.1 — Update System

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential ufw nginx certbot python3-certbot-nginx
```

### 2.2 — Install Node.js 20 (via NVM)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version   # should show v20.x.x
npm --version
```

### 2.3 — Install PM2 Globally

```bash
npm install -g pm2
```

### 2.4 — Install MySQL 8

```bash
apt install -y mysql-server
mysql_secure_installation
# Answer: Y, set strong root password, Y, Y, Y, Y
```

### 2.5 — Create Application User

```bash
adduser --system --group dealpost
```

### 2.6 — Create Directory Structure

```bash
mkdir -p /var/www/dealpost
mkdir -p /var/log/dealpost
chown -R $USER:$USER /var/www/dealpost
chown -R $USER:$USER /var/log/dealpost
```

---

## 3. MySQL Setup

```bash
mysql -u root -p
```

Inside MySQL shell:

```sql
-- Create database
CREATE DATABASE dealpost CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user (never use root for app)
CREATE USER 'dealpost_user'@'localhost' IDENTIFIED BY 'YourStrongDBPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON dealpost.* TO 'dealpost_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### 3.1 — Tune MySQL for Small VPS

```bash
nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add inside `[mysqld]` section:

```ini
innodb_buffer_pool_size = 256M
max_connections = 100
query_cache_size = 0
query_cache_type = 0
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

```bash
systemctl restart mysql
```

---

## 4. Environment Files

### 4.1 — Backend `.env` (Production)

```bash
nano /var/www/dealpost/backend/.env
```

Paste and fill in all values:

```env
NODE_ENV=production
PORT=5000

# IMPORTANT: set this to your actual domain or IP
# Comma-separate if you have multiple frontends
CLIENT_URL=http://148.230.66.192

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=dealpost
DB_USER=dealpost_user
DB_PASSWORD=YourStrongDBPassword123!

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=REPLACE_WITH_64_BYTE_HEX_STRING
JWT_EXPIRES_IN=7d

# Cloudflare R2 Storage (fill in your values)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://your-public-r2-domain.com

# Image processing
IMAGE_MAX_WIDTH=1920
IMAGE_MAX_HEIGHT=1920
IMAGE_WEBP_QUALITY=75

# Google Maps
GOOGLE_MAPS_BROWSER_API_KEY=your_google_maps_browser_api_key_here

# E2E Encryption — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MESSAGE_ENCRYPTION_KEY=REPLACE_WITH_64_CHAR_HEX_STRING

# Admin seeding
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=YourSecureAdminPassword123!
SEED_ADMIN_NAME=Super Admin
```

**Generate secrets on the server:**

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate MESSAGE_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set strict permissions:

```bash
chmod 600 /var/www/dealpost/backend/.env
```

### 4.2 — Frontend `.env` (Production)

```bash
nano /var/www/dealpost/frontend/.env
```

```env
VITE_API_URL=http://148.230.66.192/api
```

> **Note:** If you add a domain + SSL later, change this to `https://yourdomain.com/api`.

---

## 5. Backend Deployment

### 5.1 — Upload Code

**Option A — Git (recommended):**

```bash
cd /var/www/dealpost
git clone https://github.com/yourusername/dealpost.git .
# OR if repo is private:
git clone https://YOUR_TOKEN@github.com/yourusername/dealpost.git .
```

**Option B — SCP from local machine:**

```bash
# Run from your LOCAL machine
scp -r ./backend root@148.230.66.192:/var/www/dealpost/
scp -r ./frontend root@148.230.66.192:/var/www/dealpost/
scp ecosystem.config.cjs root@148.230.66.192:/var/www/dealpost/
```

### 5.2 — Install Backend Dependencies

```bash
cd /var/www/dealpost/backend
npm install --omit=dev

# Also install compression (if you haven't already pushed the package.json change)
npm install compression
```

### 5.3 — Verify Environment and DB Connection

```bash
cd /var/www/dealpost/backend
node -e "
import('./src/config/env.js').then(({ env }) => {
  console.log('DB_HOST:', env.DB_HOST);
  console.log('DB_NAME:', env.DB_NAME);
  console.log('JWT_SECRET length:', env.JWT_SECRET.length);
  console.log('NODE_ENV:', env.NODE_ENV);
});
"
```

### 5.4 — Run Database Sync (First Time Only)

Start the backend once to let Sequelize create all tables:

```bash
cd /var/www/dealpost/backend
NODE_ENV=production node server.js &
sleep 10
# Check tables were created
mysql -u dealpost_user -p dealpost -e "SHOW TABLES;"
# Stop the test run
kill %1
```

### 5.5 — Seed Categories and Admin

```bash
cd /var/www/dealpost/backend
NODE_ENV=production node scripts/seedCategories.js
NODE_ENV=production node scripts/seedAdmin.js
```

---

## 6. Frontend Build & Deployment

### 6.1 — Install Frontend Dependencies

```bash
cd /var/www/dealpost/frontend
npm install
```

### 6.2 — Build for Production

```bash
cd /var/www/dealpost/frontend
npm run build
```

This produces `/var/www/dealpost/frontend/dist/`.

### 6.3 — Verify Build

```bash
ls -la /var/www/dealpost/frontend/dist/
# Should contain: index.html, assets/ folder with JS/CSS files
```

---

## 7. Nginx Configuration

### 7.1 — Create Site Configuration

```bash
nano /etc/nginx/sites-available/dealpost
```

Paste the following:

```nginx
server {
    listen 80;
    server_name 148.230.66.192;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Increase max upload size for listing images (6 files * 5MB each)
    client_max_body_size 35M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml
               application/rss+xml font/woff font/woff2 image/svg+xml;

    # ── API & WebSocket proxy ────────────────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;

        # Hide server info
        proxy_hide_header X-Powered-By;
    }

    # ── Socket.io ───────────────────────────────────────────────────
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # ── React SPA (static files) ────────────────────────────────────
    location / {
        root /var/www/dealpost/frontend/dist;
        index index.html;

        # Cache static assets aggressively
        location ~* \.(js|css|woff|woff2|ttf|ico|svg|webp|png|jpg|jpeg|gif)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # Always serve index.html for client-side routing
        try_files $uri $uri/ /index.html;
    }

    # ── Health check ─────────────────────────────────────────────────
    location /health {
        proxy_pass http://127.0.0.1:5000/api/health;
        access_log off;
    }

    # ── Block common attack paths ────────────────────────────────────
    location ~ /\. {
        deny all;
        access_log off;
    }

    location ~* \.(env|log|git)$ {
        deny all;
    }
}
```

### 7.2 — Enable the Site

```bash
# Enable site
ln -s /etc/nginx/sites-available/dealpost /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Reload nginx
systemctl reload nginx
systemctl enable nginx
```

---

## 8. SSL Certificate (HTTPS)

### Option A — If You Have a Domain Pointed to `148.230.66.192`

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Then update your `.env` files:

**`backend/.env`:**

```env
CLIENT_URL=https://yourdomain.com
```

**`frontend/.env`:**

```env
VITE_API_URL=https://yourdomain.com/api
```

Rebuild frontend:

```bash
cd /var/www/dealpost/frontend && npm run build
```

Auto-renew:

```bash
systemctl enable certbot.timer
systemctl start certbot.timer
```

### Option B — IP Only (Self-Signed, Development Use)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/dealpost.key \
  -out /etc/ssl/certs/dealpost.crt \
  -subj "/CN=148.230.66.192"
```

Add to your nginx config's server block:

```nginx
listen 443 ssl;
ssl_certificate     /etc/ssl/certs/dealpost.crt;
ssl_certificate_key /etc/ssl/private/dealpost.key;
```

> **Recommendation:** Get a domain name and use Let's Encrypt. Self-signed certs will show browser warnings.

---

## 9. PM2 Process Manager

### 9.1 — Start the Application

```bash
cd /var/www/dealpost

# Start with ecosystem config
pm2 start ecosystem.config.cjs --env production

# Check status
pm2 status

# View logs live
pm2 logs dealpost-api
```

### 9.2 — Enable PM2 on Boot

```bash
# Generate startup script
pm2 startup systemd -u root --hp /root

# Copy the command it outputs and run it, then:
pm2 save
```

### 9.3 — Useful PM2 Commands

```bash
pm2 status                    # See all processes
pm2 logs dealpost-api         # Stream logs
pm2 logs dealpost-api --lines 100  # Last 100 lines
pm2 restart dealpost-api      # Restart after code updates
pm2 reload dealpost-api       # Zero-downtime reload (cluster mode)
pm2 stop dealpost-api         # Stop
pm2 monit                     # Real-time CPU/Memory dashboard
```

---

## 10. Firewall Rules

```bash
# Allow SSH (important — do this first or you'll lock yourself out)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Block direct access to Node.js port (only nginx should access it)
ufw deny 5000/tcp

# Block direct MySQL access
ufw deny 3306/tcp

# Enable firewall
ufw enable

# Verify
ufw status verbose
```

---

## 11. Post-Deployment Checks

### 11.1 — Test API

```bash
# Health check
curl http://148.230.66.192/api/health
# Expected: {"ok":true}

# Test categories
curl http://148.230.66.192/api/categories
# Expected: {"categories":[...]}

# Test listings
curl http://148.230.66.192/api/listings
# Expected: {"listings":[...],"total":0,...}
```

### 11.2 — Test Frontend

Open in browser: `http://148.230.66.192`

Check:

- [ ] Home page loads with Tailwind styles (not bare HTML)
- [ ] No `@tailwindcss/browser` CDN script tag in page source
- [ ] Login page works
- [ ] Signup creates a user
- [ ] Admin login works (with seeded admin credentials)
- [ ] Post an ad (if R2 is configured)
- [ ] Messages work in real-time

### 11.3 — Test Socket.io

```bash
curl -I http://148.230.66.192/socket.io/?EIO=4&transport=polling
# Expected: HTTP/1.1 200 OK
```

### 11.4 — Check Logs

```bash
# PM2 logs
pm2 logs --lines 50

# Nginx access log
tail -f /var/log/nginx/access.log

# Nginx error log
tail -f /var/log/nginx/error.log

# MySQL slow queries
tail -f /var/log/mysql/slow.log
```

### 11.5 — Performance Check

```bash
# Response time test
curl -o /dev/null -s -w "Total time: %{time_total}s\n" http://148.230.66.192/api/health

# Check gzip is working
curl -H "Accept-Encoding: gzip" -I http://148.230.66.192/api/categories
# Look for: Content-Encoding: gzip
```

---

## 12. Maintenance & Troubleshooting

### 12.1 — Deploying Updates

```bash
cd /var/www/dealpost

# Pull latest code
git pull origin main

# Backend update
cd backend
npm install --omit=dev
cd ..

# Frontend rebuild
cd frontend
npm install
npm run build
cd ..

# Reload backend (zero-downtime)
pm2 reload dealpost-api

# Nginx reload (if config changed)
nginx -t && systemctl reload nginx
```

### 12.2 — Backup Database

```bash
# Create backup script
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
mysqldump -u dealpost_user -pYourStrongDBPassword123! dealpost | gzip > $BACKUP_DIR/dealpost_$DATE.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "Backup completed: dealpost_$DATE.sql.gz"
EOF

chmod +x /root/backup-db.sh

# Schedule daily backup at 2am
crontab -e
# Add: 0 2 * * * /root/backup-db.sh >> /var/log/dealpost/backup.log 2>&1
```

### 12.3 — Log Rotation

```bash
cat > /etc/logrotate.d/dealpost << 'EOF'
/var/log/dealpost/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 12.4 — Common Issues & Fixes

| Problem                             | Likely Cause                                  | Fix                                                           |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| Frontend shows unstyled HTML        | `@tailwindcss/browser` CDN script not removed | Remove CDN script from `index.html`, rebuild                  |
| API returns 502 Bad Gateway         | Backend not running                           | `pm2 status`, then `pm2 restart dealpost-api`                 |
| API returns 413 (Payload Too Large) | Nginx body size too small                     | Check `client_max_body_size` in nginx config                  |
| Socket.io connections fail          | CORS mismatch                                 | Ensure `CLIENT_URL` in `.env` matches the browser URL exactly |
| Images not uploading                | R2 not configured or wrong credentials        | Check R2 env vars; app falls back to placeholder in dev only  |
| DB connection refused               | MySQL not running or wrong credentials        | `systemctl status mysql`, verify `.env` DB\_ vars             |
| Admin login fails                   | Admin not seeded                              | Run `NODE_ENV=production node scripts/seedAdmin.js`           |
| `Cannot find module 'compression'`  | Package not installed                         | `cd backend && npm install compression`                       |
| Blank page after frontend load      | React Router issue                            | Verify nginx `try_files $uri $uri/ /index.html` is present    |
| High memory usage                   | Too many PM2 instances                        | Reduce `instances` in `ecosystem.config.cjs` to `1`           |

### 12.5 — Monitor Resource Usage

```bash
# CPU and Memory
htop

# Disk usage
df -h

# PM2 built-in monitor
pm2 monit

# Check which port the app is on
ss -tlnp | grep 5000
```

---

## Quick Start Checklist

After reading this guide, here's the exact order of operations:

### Local machine (before pushing):

- [ ] Remove CDN script from `frontend/index.html`
- [ ] Run `cd backend && npm install compression`
- [ ] Add `compression` middleware to `backend/src/app.js`
- [ ] Add pool config to `backend/src/config/db.js`
- [ ] Create `ecosystem.config.cjs` at project root
- [ ] Update `backend/.env.example` with seed fields
- [ ] Push all changes to git

### On the VPS:

- [ ] `apt update && apt upgrade -y`
- [ ] Install Node 20, PM2, Nginx, MySQL
- [ ] Create `dealpost` MySQL database and user
- [ ] Clone repo to `/var/www/dealpost`
- [ ] Create `backend/.env` with all production values
- [ ] Create `frontend/.env` with `VITE_API_URL`
- [ ] `cd backend && npm install --omit=dev`
- [ ] `cd frontend && npm install && npm run build`
- [ ] Start once manually to sync DB tables
- [ ] Run seed scripts (categories + admin)
- [ ] Configure and enable Nginx
- [ ] `ufw enable` with correct rules
- [ ] `pm2 start ecosystem.config.cjs`
- [ ] `pm2 startup && pm2 save`
- [ ] Test all endpoints

---

## Security Reminders

1. **Never commit `.env` files** — they're already in `.gitignore`, keep it that way
2. **Rotate JWT_SECRET** if you suspect it was ever exposed
3. **Use a strong, unique DB password** — not a variation of your other passwords
4. **Keep Node.js updated** — run `nvm install 20` regularly for patch releases
5. **Monitor failed logins** — the auth rate limiter (10 req/15min) is already in place
6. **R2 credentials** — use Cloudflare's token permissions to restrict to bucket-only access
7. **Google Maps key** — restrict by HTTP referrer in Google Cloud Console to prevent abuse

---

_Generated for DealPost · Hostinger VPS deployment · IP 148.230.66.192_
