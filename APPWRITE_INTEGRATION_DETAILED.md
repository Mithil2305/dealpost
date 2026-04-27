# DealPost Appwrite Integration Guide - Detailed Steps

## Table of Contents

1. [VPS Setup](#vps-setup)
2. [Appwrite Deployment](#appwrite-deployment)
3. [SSL/HTTPS Configuration](#sslhttps-configuration)
4. [Appwrite Console Setup](#appwrite-console-setup)
5. [Frontend Integration](#frontend-integration)
6. [Backend Integration](#backend-integration)
7. [Testing & Deployment](#testing--deployment)
8. [Troubleshooting](#troubleshooting)

---

## VPS Setup

### Prerequisites

- Ubuntu 20.04 or newer
- VPS with minimum 2GB RAM, 10GB storage
- SSH access to root or sudo user
- Domain name pointing to the VPS IP (148.230.66.192)

### Step 1: SSH into VPS

```bash
# Connect to your VPS
ssh root@148.230.66.192

# Or if using a specific key:
ssh -i /path/to/key.pem root@148.230.66.192
```

### Step 2: Update System

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git ufw net-tools software-properties-common
```

### Step 3: Install Docker

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run the installation script
sudo sh get-docker.sh

# Clean up
rm get-docker.sh

# Verify installation
docker --version

# Add current user to docker group (requires logout/login after)
sudo usermod -aG docker $USER

# Apply group changes without logout
newgrp docker

# Test Docker
docker run hello-world
```

### Step 4: Install Docker Compose

Docker Compose should already be included with modern Docker versions:

```bash
docker compose version
```

If not installed, install manually:

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker compose version
```

### Step 5: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (CRITICAL - do this before fully enabling)
sudo ufw allow 22/tcp

# Allow HTTP (port 80)
sudo ufw allow 80/tcp

# Allow HTTPS (port 443)
sudo ufw allow 443/tcp

# Check status
sudo ufw status verbose
```

### Step 6: Create Appwrite Directory

```bash
# Create directory for Appwrite
mkdir -p ~/appwrite
cd ~/appwrite

# Clone Appwrite (or use provided docker-compose.yml)
# Clone latest version:
git clone https://github.com/appwrite/appwrite.git .

# Or copy your prepared docker-compose.appwrite.yml:
# scp docker-compose.appwrite.yml root@148.230.66.192:~/appwrite/
```

### Step 7: Verify System Resources

```bash
# Check available RAM (need 2GB+ minimum)
free -h
# Output should show > 2GB available

# Check disk space (need 10GB+ free)
df -h /
# Output should show > 10GB in / filesystem

# Check CPU cores
nproc
# Output should show 1+
```

---

## Appwrite Deployment

### Step 1: Configure Environment File

```bash
cd ~/appwrite

# Create .env file from template
cp docker-compose.appwrite.yml docker-compose.yml
```

But first, we need to generate secure values. On your **local machine** or the VPS itself:

```bash
# Generate two OpenSSL keys (run twice)
openssl rand -hex 32

# Generate strong passwords
openssl rand -base64 32
```

Then create the `.env` file:

```bash
# On the VPS
cat > ~/appwrite/.env << 'EOF'
_APP_ENV=production
_APP_LOCALE=en
_APP_CONSOLE_WHITELIST_IPS=*
_APP_DOMAIN=api.dealpost.in
_APP_DOMAIN_TARGET=api.dealpost.in
_APP_OPENSSL_KEY_V1=<first-32-hex-chars>
_APP_OPENSSL_KEY_V2=<second-32-hex-chars>

DB_PASSWORD=<strong-random-password>
_APP_DB_HOST=mariadb
_APP_DB_PORT=3306
_APP_DB_USER=appwrite
_APP_DB_PASS=${DB_PASSWORD}
_APP_DB_SCHEMA=appwrite

_APP_REDIS_HOST=redis
_APP_REDIS_PORT=6379

INFLUX_PASSWORD=<another-strong-password>
_APP_INFLUXDB_HOST=influxdb
_APP_INFLUXDB_PORT=8086
_APP_INFLUXDB_USERNAME=appwrite
_APP_INFLUXDB_PASSWORD=${INFLUX_PASSWORD}

_APP_STORAGE_DEVICE=local
_APP_LOGGING_LEVEL=error
_APP_SECURITY_COOKIE_SECURE=true
_APP_SECURITY_COOKIE_HTTPONLY=true
_APP_SECURITY_COOKIE_SAMESITE=Strict
EOF
```

### Step 2: Start Appwrite

```bash
cd ~/appwrite

# Pull the latest images (optional, docker-compose up will do this)
docker compose pull

# Build and start all services
docker compose up -d

# Wait for initialization (60 seconds)
sleep 60

# Check status
docker compose ps

# View logs
docker compose logs -f

# Exit logs: Ctrl+C
```

Expected output:

```
CONTAINER ID   IMAGE                      STATUS
xxxxx          appwrite/appwrite:1.5.0    Up 1 min (healthy)
xxxxx          mariadb:11                 Up 1 min (healthy)
xxxxx          redis:7                    Up 1 min (healthy)
xxxxx          influxdb:2.7               Up 1 min (healthy)
```

### Step 3: Verify Appwrite is Running

```bash
# Check if Appwrite responds on port 80
curl -I http://localhost:80

# Expected: HTTP/1.1 200 OK

# Or check logs for startup messages
docker compose logs appwrite | grep "Starting Appwrite"

# Monitor container health
docker compose ps --format "table {{.Names}}\t{{.Status}}"
```

---

## SSL/HTTPS Configuration

### Step 1: Install Nginx

```bash
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx
```

### Step 2: Point Domain to VPS

Before proceeding, ensure your domain's DNS records point to the VPS IP:

```bash
# Verify DNS is set up
nslookup api.dealpost.in
# Should return: 148.230.66.192

# Or use dig
dig api.dealpost.in
```

If DNS isn't propagated yet, wait 5-15 minutes and try again.

### Step 3: Create Nginx Configuration

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/appwrite

# Paste the content from provided nginx.conf.appwrite file
# Replace YOUR_DOMAIN with api.dealpost.in
# Replace FRONTEND_DOMAIN with dealpost.in
```

Or copy it directly:

```bash
# Copy from your local machine or provided file
scp nginx.conf.appwrite root@148.230.66.192:/etc/nginx/sites-available/appwrite

# Make sure it's executable
sudo chmod 644 /etc/nginx/sites-available/appwrite
```

### Step 4: Enable Nginx Site

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/appwrite /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
# Output: nginx: configuration file test successful

# Reload Nginx
sudo systemctl reload nginx
```

### Step 5: Install Certbot (Let's Encrypt)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate for api.dealpost.in
sudo certbot certonly --nginx -d api.dealpost.in \
  --non-interactive \
  --agree-tos \
  -m admin@dealpost.in

# Should output: Successfully received certificate
```

If you have multiple domains, add them all at once:

```bash
sudo certbot certonly --nginx \
  -d api.dealpost.in \
  -d dealpost.in \
  -d www.dealpost.in \
  --non-interactive \
  --agree-tos \
  -m admin@dealpost.in
```

### Step 6: Verify SSL Certificate

```bash
# List certificates
sudo certbot certificates

# Output should show:
# Certificate Name: api.dealpost.in
# Domains: api.dealpost.in
# Expiry Date: (date 3 months from now)

# Test the certificate
curl -I https://api.dealpost.in
# Look for: "SSL certificate problem" - if you see this, something's wrong
```

### Step 7: Enable Automatic Renewal

```bash
# Enable certbot renewal timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal (dry-run)
sudo certbot renew --dry-run

# Check if renewal works
sudo systemctl status certbot.timer
```

---

## Appwrite Console Setup

### Step 1: Access Appwrite Console

1. Open browser and navigate to: `https://api.dealpost.in`
2. You'll see the Appwrite setup wizard
3. Create admin account:
   - Email: `admin@dealpost.in` (or your preferred email)
   - Password: (strong password - save this!)
   - Confirm password

### Step 2: Create Project

1. Click **"Create Project"** button
2. Fill in details:
   - **Project Name:** DealPost
   - **Project ID:** dealpost (keep this lowercase)
3. Click **"Create"**

### Step 3: Generate API Keys

1. Navigate to **Settings → API Keys**
2. Click **"Create API Key"**

For Frontend API Key:

- **Name:** Frontend SDK
- **Scopes:** account.read, account.write, files.read, files.write, databases.read, databases.write

3. Copy the key and save to `frontend/.env`

For Backend API Key:

- **Name:** Backend Server
- **Scopes:** (select all or as needed)

4. Copy the key and save to `backend/.env`

### Step 4: Configure Platforms

1. Go to **Settings → Platforms**
2. Click **"Add Platform" → Web**
3. Fill in details:
   - **Name:** DealPost Frontend
   - **Hostname:** dealpost.in
   - Add alternate hostname: www.dealpost.in
   - Add alternate for dev: localhost:5173
4. Click **"Save"**

### Step 5: Configure CORS Origins

1. Still in **Settings → Platforms**
2. Edit the platform and add CORS origins:
   - https://dealpost.in
   - https://www.dealpost.in
   - http://localhost:5173 (for development)
3. Click **"Save"**

### Step 6: Create Collections

Refer to `appwrite-collections.md` for detailed schema.

Quick steps for each collection:

1. Go to **Databases** (left sidebar)
2. Click on **"dealpost"** database (create if not exists)
3. Click **"Create Collection"**
4. Fill in collection ID and click **"Create"**
5. Add attributes according to the schema document
6. Configure indexes
7. Set permissions

Example for `users` collection:

```
Collection ID: users
Attributes:
  - userId (String, 255)
  - email (String, 255, required)
  - name (String, 255, required)
  - avatar (String, 255)
  - businessVerified (Boolean, default: false)
  - createdAt (DateTime)
  - updatedAt (DateTime)

Indexes:
  - idx_users_email (on email)
  - idx_users_createdAt (on createdAt)
```

Repeat for: listings, conversations, messages, notifications, reports, likes

---

## Frontend Integration

### Step 1: Install Appwrite SDK

```bash
cd frontend

# Install Appwrite Web SDK
npm install appwrite

# Or if using yarn
yarn add appwrite
```

### Step 2: Update Environment File

```bash
# Edit frontend/.env
cd frontend
nano .env

# Add these lines:
VITE_APPWRITE_ENDPOINT=https://api.dealpost.in/v1
VITE_APPWRITE_PROJECT_ID=dealpost
VITE_APPWRITE_API_KEY=<your-frontend-api-key>
```

### Step 3: Copy Appwrite Service File

The service file has already been created at `frontend/src/services/appwrite.js`.

Verify it exists and has all the necessary exports:

- `authService`
- `listingService`
- `messageService`
- `notificationService`
- `likeService`
- `fileService`
- `realtimeService`

### Step 4: Copy Auth Hook

The hook has been created at `frontend/src/hooks/useAppwriteAuth.js`.

Verify it exported properly:

```javascript
export default useAppwriteAuth;
```

### Step 5: Update Auth Context

Update your existing AuthContext to use Appwrite instead of localStorage:

**frontend/src/context/AuthContext.jsx:**

```javascript
import { createContext } from "react";
import useAppwriteAuth from "../hooks/useAppwriteAuth";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const auth = useAppwriteAuth();

	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
```

### Step 6: Update useAuth Hook

**frontend/src/context/useAuth.jsx:**

```javascript
import { useContext } from "react";
import { AuthContext } from "./AuthContext";

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
};
```

### Step 7: Replace API Calls with Appwrite

In components that use authentication, replace axios calls:

**Before (using backend API):**

```javascript
const handleLogin = async (email, password) => {
	const response = await axios.post("/api/auth/login", { email, password });
	// ...
};
```

**After (using Appwrite):**

```javascript
import { useAuth } from "../context/useAuth";

function LoginComponent() {
	const { login } = useAuth();

	const handleLogin = async (email, password) => {
		try {
			const result = await login(email, password);
			// Redirect to dashboard
		} catch (error) {
			console.error("Login failed:", error);
		}
	};
}
```

### Step 8: Update Listings Page

Replace listing API calls with Appwrite:

```javascript
import { listingService } from "../services/appwrite";

function ListingsPage() {
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchListings = async () => {
			try {
				const response = await listingService.getListings({
					category: selectedCategory,
					minPrice: minPrice,
					maxPrice: maxPrice,
				});
				setListings(response.documents);
			} catch (error) {
				console.error("Failed to fetch listings:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchListings();
	}, [selectedCategory, minPrice, maxPrice]);

	// Rest of component...
}
```

### Step 9: Add File Upload Support

For user avatars and listing images:

```javascript
import { fileService, BUCKETS } from "../services/appwrite";

async function handleAvatarUpload(file) {
	try {
		const result = await fileService.uploadAvatar(file);
		const previewUrl = fileService.getFilePreview(BUCKETS.AVATARS, result.$id);
		setAvatarUrl(previewUrl);
	} catch (error) {
		console.error("Upload failed:", error);
	}
}
```

### Step 10: Enable Realtime (Optional)

For real-time chat/notifications:

```javascript
import { realtimeService } from "../services/appwrite";

useEffect(() => {
	// Subscribe to messages
	const unsubscribe = realtimeService.subscribeToMessages(
		conversationId,
		(response) => {
			setMessages((prev) => [...prev, response.payload]);
		},
	);

	// Cleanup
	return () => realtimeService.unsubscribe(unsubscribe);
}, [conversationId]);
```

---

## Backend Integration

### Step 1: Install Appwrite SDK

```bash
cd backend

# Install Node.js Appwrite SDK
npm install node-appwrite

# Or using yarn
yarn add node-appwrite
```

### Step 2: Update Environment File

```bash
# Edit backend/.env
nano .env

# Add these lines:
APPWRITE_ENDPOINT=https://api.dealpost.in/v1
APPWRITE_PROJECT_ID=dealpost
APPWRITE_API_KEY=<your-backend-api-key>
DB_ID=dealpost
```

### Step 3: Copy Appwrite Service File

The backend service file has been created at `backend/src/services/appwrite.js`.

Verify it includes all services:

- `userService`
- `listingService`
- `conversationService`
- `messageService`
- `notificationService`

### Step 4: Update Authentication Middleware

**backend/src/middleware/auth.middleware.js:**

Keep your existing middleware but add Appwrite session verification:

```javascript
import { account } from "../services/appwrite";

export const verifyAppwriteSession = async (req, res, next) => {
	try {
		// Get session token from cookies or headers
		const token = req.cookies.session || req.headers["x-appwrite-session"];

		if (!token) {
			return res.status(401).json({ error: "No session found" });
		}

		// Verify with Appwrite (backend API)
		// Appwrite SDK will automatically validate the session

		next();
	} catch (error) {
		res.status(401).json({ error: "Invalid session" });
	}
};
```

### Step 5: Update Routes to Use Appwrite

Replace database calls with Appwrite:

**Example: User Registration**

```javascript
import { Router } from "express";
import { userService } from "../services/appwrite";

const router = Router();

router.post("/register", async (req, res) => {
	try {
		const { email, password, name } = req.body;

		// Create user using Appwrite
		const user = await userService.createUser({
			email,
			password,
			name,
		});

		res.status(201).json({ user });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
});

export default router;
```

**Example: Create Listing**

```javascript
import { listingService } from "../services/appwrite";

router.post("/listings", async (req, res) => {
	try {
		const { title, description, price, category, images, ownerId } = req.body;

		const listing = await listingService.createListing({
			title,
			description,
			price,
			category,
			images,
			ownerId,
			status: "active",
		});

		res.status(201).json(listing);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
});
```

### Step 6: Add Notification Triggers

When important events happen, create notifications:

```javascript
import { notificationService } from "../services/appwrite";

// After message is created
const message = await messageService.createMessage(messageData);

// Notify receiver
await notificationService.notifyNewMessage(
	conversationId,
	message.receiverId,
	senderName,
);
```

### Step 7: Hybrid Approach (Keep Existing Backend)

Your backend can continue handling:

- Complex business logic
- Custom validations
- API orchestration
- Backward compatibility with existing clients

While Appwrite handles:

- Authentication (via frontend SDK)
- File storage
- Realtime updates
- Basic database operations

---

## Testing & Deployment

### Step 1: Test Appwrite Connectivity

```bash
# Test from frontend
cd frontend
npm run dev

# Try signing up/logging in in the browser
# Check browser console for any errors

# Test from backend
cd backend
npm test

# Or run a quick test:
node -e "
const appwrite = require('./src/services/appwrite');
console.log('Appwrite services loaded:', Object.keys(appwrite));
"
```

### Step 2: Test Collections

In Appwrite Console:

1. Go to a collection
2. Click "Add Document"
3. Fill in sample data
4. Save
5. Verify it appears in the list

### Step 3: Test File Uploads

```bash
# In the frontend
# Try uploading an avatar
# Verify it appears in Appwrite Storage

# Check in console:
# Settings → Storage → Buckets → avatars
```

### Step 4: Test Real-time Updates

In two browser windows:

1. Window 1: Open chat
2. Window 2: Open same chat
3. Send message from Window 1
4. Verify message appears instantly in Window 2

### Step 5: Test End-to-End Flow

1. **Sign up** with new email
2. **Create listing** with images
3. **Message** another user
4. **Check notification** appears
5. **Like listing** and verify counter updates
6. **Upload avatar** and verify it appears

### Step 6: Load Testing (Optional)

```bash
# Use Apache Bench
ab -n 1000 -c 10 https://api.dealpost.in/health

# Or use wrk
wrk -t4 -c100 -d30s https://api.dealpost.in
```

### Step 7: Backup Before Production

```bash
# Backup Appwrite database
docker exec appwrite-mariadb mysqldump -u appwrite -p appwrite > backup_$(date +%Y%m%d).sql

# Backup volumes
docker run --rm \
  -v appwrite_mariadb:/source \
  -v $(pwd):/backup \
  alpine tar czf /backup/mariadb_backup.tar.gz /source
```

---

## Troubleshooting

### Q: "Connection refused" when accessing https://api.dealpost.in

**Check:**

1. Is Appwrite running? `docker ps`
2. Is Nginx running? `sudo systemctl status nginx`
3. Is firewall allowing port 443? `sudo ufw status`
4. Is DNS propagated? `nslookup api.dealpost.in`
5. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

**Solution:**

```bash
# Restart all services
docker compose restart
sudo systemctl restart nginx

# Check logs
docker compose logs -f appwrite
sudo journalctl -u nginx -f
```

### Q: "CORS error" when frontend tries to reach API

**Check:**

1. Is domain added to CORS origins in Appwrite Settings?
2. Is hostname correct (no trailing slashes)?
3. Is protocol correct (https:// not http://)?

**Solution:**

- Go to Appwrite Console → Settings → Platforms
- Edit web platform
- Verify all domains are listed
- Save changes
- Clear browser cache (Ctrl+Shift+Delete)

### Q: SSL certificate issues / "Not Secure"

**Check:**

```bash
# Verify certificate exists
sudo ls -la /etc/letsencrypt/live/api.dealpost.in/

# Check certificate expiry
sudo openssl x509 -in /etc/letsencrypt/live/api.dealpost.in/fullchain.pem -noout -dates

# Test SSL
curl -I https://api.dealpost.in
ssl-test https://api.dealpost.in
```

**Solution:**

```bash
# Force certificate renewal
sudo certbot renew --force-renewal

# Check renewal status
sudo certbot certificates
```

### Q: "Database connection failed"

**Check:**

```bash
# Is database running?
docker ps | grep mariadb

# Check database logs
docker logs appwrite-mariadb

# Test connection
docker exec appwrite-mariadb mysql -u appwrite -p appwrite -e "SELECT 1;"
```

**Solution:**

```bash
# Restart database
docker compose restart mariadb

# If corrupted, rebuild:
docker compose down
docker volume rm appwrite_mariadb
docker compose up -d
```

### Q: Frontend can login but can't fetch listings

**Check:**

1. Are collections created in Appwrite?
2. Are sample documents Added?
3. Are permissions set to allow public read?

**Solution:**

- Go to each collection in Appwrite
- Verify documents exist
- Check Permissions (should allow role:any for public read)
- Try direct API call: `curl https://api.dealpost.in/v1/databases/dealpost/collections/listings/documents`

### Q: Session expires after logout but cookie persists

**Check:**

- Appwrite sessions are server-side validated
- Local storage tokens should be cleared

**Solution:**

```javascript
// Ensure logout clears all storage
const logout = async () => {
	await authService.logout();
	localStorage.clear();
	sessionStorage.clear();
	window.location.href = "/login";
};
```

### Q: File uploads fail

**Check:**

1. Are buckets created? (avatars, listing-images)
2. Is storage device configured? (should be local)
3. Is disk space available? `df -h`
4. Are file sizes within limits?

**Solution:**

```bash
# Check storage usage
docker exec appwrite df -h /storage

# Check file permissions
docker exec appwrite ls -la /storage/

# Verify bucket exists
# In Appwrite console: Settings → Storage → Buckets
```

---

## Quick Reference - Common Commands

```bash
# On VPS

# Appwrite control
docker compose ps                    # Check status
docker compose logs -f               # View logs
docker compose restart               # Restart services
docker compose stop                  # Stop services
docker compose down                  # Remove containers
docker compose up -d                 # Start services

# Nginx control
sudo systemctl status nginx          # Check status
sudo nginx -t                        # Test config
sudo systemctl reload nginx          # Reload config
sudo systemctl restart nginx         # Restart
sudo tail -f /var/log/nginx/error.log  # View errors

# SSL certificates
sudo certbot certificates            # List certs
sudo certbot renew --dry-run         # Test renewal
sudo certbot renew --force-renewal   # Force renewal

# Database backup
docker exec appwrite-mariadb mysqldump -u appwrite -p appwrite > backup.sql

# Check resources
free -h                              # RAM usage
df -h                                # Disk usage
docker stats                         # Container stats
```

---

## Next Steps After Deployment

1. ✅ Monitor Appwrite logs for errors
2. ✅ Set up automated backups
3. ✅ Configure email/SMTP for notifications
4. ✅ Enable Google/GitHub OAuth (optional)
5. ✅ Set up monitoring/alerts (optional)
6. ✅ Configure CDN for static assets
7. ✅ Document API endpoints for team
8. ✅ Create user documentation

---

## Support Resources

- **Appwrite Docs:** https://appwrite.io/docs
- **Appwrite Discord:** https://appwrite.io/discord
- **Stack Overflow:** tag: appwrite
- **GitHub Issues:** https://github.com/appwrite/appwrite/issues

---

**Last Updated:** 2025-01-01
**Version:** 1.0 Final
