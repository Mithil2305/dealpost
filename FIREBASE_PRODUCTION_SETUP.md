# Firebase Authentication — Production Setup Guide

## ⚠️ Critical Issues & Solutions

---

## Issue 1: 500 Error on `/api/auth/firebase` in Production

**Root Cause:** Firebase environment variables not set or incorrectly formatted in production.

### Diagnosis

1. **Check if Firebase is configured:**

   ```bash
   curl https://your-api-domain/api/config/debug/firebase
   ```

   Expected response (if configured):

   ```json
   {
   	"firebaseConfigured": true,
   	"projectId": "SET",
   	"clientEmail": "SET",
   	"privateKey": "SET (1234 chars)",
   	"firebaseClientAvailable": true,
   	"privateKeyValid": "Appears valid",
   	"status": "READY"
   }
   ```

2. **If status is NOT_READY**, check your production `.env` file.

---

## Solution 1: Set Firebase Environment Variables

### 1.1 Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., "dealpost")
3. Go to **Settings** (⚙️ icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. A JSON file will download — keep it safe ✓

### 1.2 Extract the Required Values from JSON

The downloaded JSON looks like:

```json
{
	"type": "service_account",
	"project_id": "dealpost-76f4c",
	"private_key_id": "abc123...",
	"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n",
	"client_email": "firebase-adminsdk-fbsvc@dealpost-76f4c.iam.gserviceaccount.com",
	"client_id": "...",
	"auth_uri": "...",
	"token_uri": "...",
	"auth_provider_x509_cert_url": "...",
	"client_x509_cert_url": "..."
}
```

Extract:

- **`project_id`** → `FIREBASE_PROJECT_ID`
- **`client_email`** → `FIREBASE_CLIENT_EMAIL`
- **`private_key`** → `FIREBASE_PRIVATE_KEY` (see step 1.3)

### 1.3 Set Environment Variables on Your Production Server

#### Option A: Using PM2 Ecosystem File (Recommended)

If you're already using PM2, edit your `ecosystem.config.cjs`:

```javascript
module.exports = {
	apps: [
		{
			name: "dealpost-backend",
			script: "backend/server.js",
			instances: 1,
			exec_mode: "cluster",
			env: {
				NODE_ENV: "production",
				PORT: 5000,
				// ... other env vars ...
				FIREBASE_PROJECT_ID: "dealpost-76f4c",
				FIREBASE_CLIENT_EMAIL:
					"firebase-adminsdk-fbsvc@dealpost-76f4c.iam.gserviceaccount.com",
				FIREBASE_PRIVATE_KEY:
					"-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n",
			},
		},
	],
};
```

Then restart PM2:

```bash
pm2 restart ecosystem.config.cjs --env production
```

#### Option B: Using .env File

Create `/var/www/dealpost/backend/.env` (or wherever your backend is deployed):

```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dealpost
DB_USER=dealpost_user
DB_PASSWORD=your_secure_password

FIREBASE_PROJECT_ID=dealpost-76f4c
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@dealpost-76f4c.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"

JWT_SECRET=your_jwt_secret_here
CLIENT_URL=https://dealpost.in,https://www.dealpost.in
```

#### Option C: Environment Variables in Hosting Panel (Hostinger/Other)

If your hosting has a control panel:

1. Go to **Environment Variables** section
2. Add these three:
   - Key: `FIREBASE_PROJECT_ID`, Value: `dealpost-76f4c`
   - Key: `FIREBASE_CLIENT_EMAIL`, Value: `firebase-adminsdk-fbsvc@...`
   - Key: `FIREBASE_PRIVATE_KEY`, Value: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
3. Save and restart your application

### 1.4 IMPORTANT: Private Key Formatting

**The private key MUST have literal `\n` characters, not actual newlines.**

❌ **WRONG** (actual newlines):

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkq...
hkiG9w0BAQEFAA...
-----END PRIVATE KEY-----
```

✅ **CORRECT** (literal `\n`):

```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\nhkiG9w0BAQEFAA...\n-----END PRIVATE KEY-----\n
```

**If you paste it from a JSON file:**

1. Open the JSON file in a text editor
2. Copy the entire `private_key` value (it already has `\n`)
3. Paste it into your environment variable exactly as-is

---

## Issue 2: COOP Policy Blocking `window.closed` Check (Console Warning)

**Current Setting:**

```javascript
crossOriginOpenerPolicy: {
	policy: "same-origin-allow-popups";
}
```

**This is correct** and should allow Firebase popups. The warning is a browser quirk.

### If COOP Warning Persists

The backend already sends the correct header. If you still see the warning:

1. **Clear browser cache** and reload
2. **Disable browser extensions** that might interfere with security headers
3. **Check in incognito mode** to isolate the issue

The warning is harmless — auth will still work. It's just a browser compatibility note from the Firebase SDK.

### If Popups Are Actually Blocked

Make sure:

1. ✓ Popup blocker is not active
2. ✓ Browser allows popups for your domain
3. ✓ Third-party cookies are not blocked globally
4. ✓ You're clicking the button (not just loading the page)

---

## Complete Production Checklist

### Before Deploying to Production

- [ ] **Firebase Project Created** at console.firebase.google.com
- [ ] **Service Account Downloaded** with private key
- [ ] **`FIREBASE_PROJECT_ID`** set in environment
- [ ] **`FIREBASE_CLIENT_EMAIL`** set in environment
- [ ] **`FIREBASE_PRIVATE_KEY`** set (with literal `\n` characters)
- [ ] **`CLIENT_URL`** set to your production domain(s)
- [ ] **Tested in localhost** — Google auth works
- [ ] **Verified `/api/config/debug/firebase`** returns `status: "READY"`
- [ ] **Backend restarted** after env changes
- [ ] **Tested in production** — Google signup/login works

### After Deploying to Production

- [ ] **Test Google login** from production domain
- [ ] **Check browser console** for COOP warnings (expected, harmless)
- [ ] **Verify backend logs** for any Firebase errors:
  ```bash
  pm2 logs dealpost-backend
  ```
- [ ] **Check monitoring** — no 500 errors on `/api/auth/firebase`
- [ ] **Test account creation** — user created in database
- [ ] **Test token persistence** — reload shows user still logged in

---

## Troubleshooting Guide

### Problem: `FIREBASE_PRIVATE_KEY: MISSING`

**Solution:** Ensure private key is set in your environment. Check:

```bash
echo $FIREBASE_PRIVATE_KEY  # Linux/Mac
echo %FIREBASE_PRIVATE_KEY%  # Windows
```

Should output something like:

```
-----BEGIN PRIVATE KEY-----\nMIIEvQI...
```

### Problem: `Firebase token verification error: Invalid signature`

**Solution:** Private key is wrong or corrupted. Download a fresh one from Firebase console.

### Problem: `Error getting access token: Error: "project_id" is required`

**Solution:** `FIREBASE_PROJECT_ID` is not set. Verify it's in your environment.

### Problem: `COOP policy would block the window.closed call`

**Solution:** This is harmless. Popups will still work. It's just a browser warning.

---

## Testing Email/Password Auth (No Firebase Needed)

If you just want to test before setting up Firebase:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test@1234567",
    "phone": "+911234567890",
    "accountType": "personal"
  }'
```

Response:

```json
{
	"token": "eyJhbGc...",
	"user": {
		"id": "uuid",
		"name": "Test User",
		"email": "test@example.com",
		"accountType": "personal"
	}
}
```

---

## Firebase Console URLs

- **Console:** https://console.firebase.google.com
- **Service Accounts:** https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk
- **Authentication:** https://console.firebase.google.com/project/_/authentication

Replace `_` with your Firebase project ID.

---

## Quick Restart (After Env Changes)

### Using PM2:

```bash
pm2 restart dealpost-backend
pm2 logs dealpost-backend
```

### Using Node directly:

```bash
pkill -f "node server.js"
cd /path/to/backend
NODE_ENV=production node server.js
```

---

## Questions?

Check these files first:

- [backend/.env.example](backend/.env.example) — template
- [backend/src/config/env.js](backend/src/config/env.js) — env parsing
- [backend/src/config/firebaseAdmin.js](backend/src/config/firebaseAdmin.js) — Firebase init
- [backend/src/controllers/auth.controller.js](backend/src/controllers/auth.controller.js) — Firebase endpoint
