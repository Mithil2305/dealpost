# Firebase Troubleshooting Guide — Read Backend Logs

## 🔍 How to Diagnose Firebase Auth 500 Errors

When Google login fails with a 500 error, the backend logs tell you **exactly** what went wrong.

---

## Step 1: View Backend Logs

### Using PM2:

```bash
pm2 logs dealpost-backend --lines 100
```

Then try Google login in your app. Watch the logs in real-time.

### Direct SSH:

```bash
ssh your-server
tail -f /var/log/dealpost/backend.log
```

Or with PM2:

```bash
cd /path/to/dealpost
pm2 logs dealpost-backend
```

---

## Step 2: What Each Log Line Means

### ✅ Good Flow

```
👉 [Firebase Auth] Received request
✅ [Firebase Auth] idToken received
✅ [Firebase Auth] Environment variables configured
✅ [Firebase Auth] Firebase client initialized
🔍 [Firebase Auth] Verifying ID token...
✅ [Firebase Auth] Token verified. Decoded user: { uid: "...", email: "..." }
🔍 [Firebase Auth] Creating/updating user in database...
✅ [Firebase Auth] User created/updated: { id: "...", email: "...", name: "..." }
✅ [Firebase Auth] JWT token generated. Login successful!
```

### ❌ Bad Flow — Where It Stops

---

## FAILURE POINT 1: Environment Variables Missing

```
🔥 [Firebase Auth] Admin SDK not configured. Env check: {
  "FIREBASE_PROJECT_ID": "MISSING",
  "FIREBASE_CLIENT_EMAIL": "MISSING",
  "FIREBASE_PRIVATE_KEY": "MISSING"
}
```

**Fix:**

1. SSH to your server
2. Check your `.env` file has all three variables
3. Restart backend

```bash
pm2 restart dealpost-backend
```

---

## FAILURE POINT 2: Firebase Private Key Incorrect

```
🔥 [Firebase Auth] Firebase initialization error: {
  "message": "Incorrect number of segments",
  "code": "invalid_key",
  "stack": "..."
}
```

**Most Common Cause:** Private key is not properly formatted.

**Fix:**

1. Download fresh private key from Firebase Console
2. Copy `private_key` field **exactly as shown** from the JSON
3. Paste into `.env`:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"
```

**Key Point:** The `\n` must be literal characters, not actual newlines.

---

## FAILURE POINT 3: Token Verification Fails

```
🔥 [Firebase Auth] Token verification failed: {
  "message": "ID token has invalid signature",
  "code": "auth/invalid-id-token",
  "stack": "..."
}
```

**Possible Causes:**

- Frontend and backend use different Firebase projects
- Token is expired
- Private key doesn't match the project

**Fix:**

1. Check `FIREBASE_PROJECT_ID` matches Firebase Console
2. Verify private key is from same project
3. On frontend, ensure `VITE_FIREBASE_PROJECT_ID` matches backend `FIREBASE_PROJECT_ID`

---

## FAILURE POINT 4: Database User Creation Fails

```
🔥 [Firebase Auth] User creation/update failed: {
  "message": "ER_DUP_ENTRY: Duplicate entry 'test@example.com' for key 'users.email'",
  "stack": "..."
}
```

**Possible Causes:**

- User already exists with that email
- Database constraint violation

**Fix:**

- First time: It's a duplicate entry bug (report to dev)
- If testing: Use different email each time or delete user from DB

---

## FAILURE POINT 5: User Not Found After Creation

```
🔥 [Firebase Auth] upsertUserFromFederatedIdentity returned null
```

**Possible Causes:**

- Database connection failed
- User query returned nothing

**Fix:**

1. Check database connection
2. Verify database has users table

```bash
mysql -u root -p dealpost
SELECT * FROM users LIMIT 1;
```

---

## Step 3: Common Error Codes to Know

| Error                                 | Cause                     | Fix                                  |
| ------------------------------------- | ------------------------- | ------------------------------------ |
| `FIREBASE_PROJECT_ID: MISSING`        | Env var not set           | Add to `.env` or hosting panel       |
| `Incorrect number of segments`        | Private key format wrong  | Copy from JSON exactly (with `\n`)   |
| `ID token has invalid signature`      | Wrong Firebase project    | Verify `FIREBASE_PROJECT_ID` matches |
| `ER_DUP_ENTRY`                        | User email already exists | This is rare — contact dev           |
| `Connection timeout`                  | DB unreachable            | Check database is running            |
| `getFirebaseAuthClient returned null` | Firebase init failed      | Check all 3 env vars set correctly   |

---

## Step 4: Full Debug Request

If logs seem healthy but you still get 500, test the endpoint directly with curl:

```bash
# Get a Firebase token first (from browser console after Google popup)
# console.log(await firebase.auth().currentUser.getIdToken())

curl -X POST https://your-domain/api/auth/firebase \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "PASTE_TOKEN_HERE"
  }'
```

Expected response:

```json
{
	"token": "eyJhbGc...",
	"user": {
		"id": "uuid",
		"name": "...",
		"email": "..."
	}
}
```

---

## Step 5: Enable More Verbose Logging (Dev Only)

Add this to `backend/.env`:

```env
DEBUG=firebase:*
```

Then restart. (This is optional, the standard logs are enough.)

---

## Quick Checklist for 500 Errors

When you get a 500 on Firebase auth:

- [ ] Check PM2 logs: `pm2 logs dealpost-backend`
- [ ] Identify the **🔥 error line**
- [ ] Match it to the "FAILURE POINT" sections above
- [ ] Apply the corresponding fix
- [ ] Restart: `pm2 restart dealpost-backend`
- [ ] Test Google login again

---

## Still Not Working?

1. **Paste the exact error line** from `pm2 logs` output
2. **Share which FAILURE POINT** it matches
3. **Include your next steps** from the guide above

This guide is matched to the logging format in the backend, so errors will be labeled clearly. 👆
