# Firebase Auth Production Deployment - Quick Start

## TL;DR — 3 Steps to Fix Production Firebase Auth

### Step 1: Get Firebase Credentials (5 min)

1. Go to https://console.firebase.google.com
2. Select your project
3. Click ⚙️ Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file

### Step 2: Extract 3 Environment Variables

From the downloaded JSON, copy these three values:

```
FIREBASE_PROJECT_ID = "project_id" field
FIREBASE_CLIENT_EMAIL = "client_email" field
FIREBASE_PRIVATE_KEY = "private_key" field (exactly as shown, with \n characters)
```

### Step 3: Set on Production Server

**Choose ONE method:**

#### Option A: PM2 Ecosystem (Recommended)

Edit `ecosystem.config.cjs`:

```javascript
env: {
  FIREBASE_PROJECT_ID: "your-project-id",
  FIREBASE_CLIENT_EMAIL: "firebase-adminsdk-fbsvc@your-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n",
}
```

Then:

```bash
pm2 restart ecosystem.config.cjs --env production
```

#### Option B: Hosting Panel Environment Variables

Add to your hosting control panel:

- `FIREBASE_PROJECT_ID` = your project ID
- `FIREBASE_CLIENT_EMAIL` = your service account email
- `FIREBASE_PRIVATE_KEY` = your private key (with `\n`)

#### Option C: .env File

Create/edit `.env` in your backend directory:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"
```

---

## ⚠️ CRITICAL: Private Key Format

The private key **MUST have literal `\n` characters**, not real newlines.

**From JSON file (correct):**

```
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQI...\nhkiG9w0BAQEFAA...\n-----END PRIVATE KEY-----\n"
```

**When copied to environment, it should look exactly like that** ✓

---

## Verify It Works

### Test 1: Check Diagnostics (localhost testing)

Copy your production `.env` values to local and run:

```bash
curl http://localhost:5000/api/config/debug/firebase
```

Expected response:

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

If status is "NOT_READY", check your environment variables.

### Test 2: Test in Production

1. Visit your app: https://your-domain.com
2. Click "Login"
3. Click "Continue with Google"
4. Select your Google account
5. Should redirect to home, user logged in

---

## If It Still Doesn't Work

**Check logs:**

```bash
pm2 logs dealpost-backend
```

Look for lines starting with "Firebase":

- `Firebase admin not configured` → env variables missing
- `Firebase initialization error` → private key format wrong
- `Firebase token verification error` → token is invalid

---

## Common Mistakes

❌ **Using wrong JSON file format**

- Make sure you downloaded from Firebase Console, not docs

❌ **Private key has real newlines**

- Copy-paste from JSON file, don't manually edit

❌ **Missing quotes around FIREBASE_PRIVATE_KEY**

- Always wrap in quotes: `"-----BEGIN PRIVATE KEY-----\n..."`

❌ **Set only some variables**

- All three must be set for it to work

---

## Email/Password Auth (No Firebase Needed)

If you want to test before setting up Firebase:

```bash
curl -X POST https://your-domain/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test@1234567",
    "phone": "+911234567890",
    "accountType": "personal"
  }'
```

This works regardless of Firebase config.

---

## Need Help?

- See [FIREBASE_PRODUCTION_SETUP.md](FIREBASE_PRODUCTION_SETUP.md) for detailed guide
- See [FIREBASE_AUTH_FIX_SUMMARY.md](FIREBASE_AUTH_FIX_SUMMARY.md) for what was fixed

---

## One More Thing

The COOP warning in browser console is harmless:

```
Cross-Origin-Opener-Policy policy would block the window.closed call
```

Google auth will still work. It's just a browser warning.
