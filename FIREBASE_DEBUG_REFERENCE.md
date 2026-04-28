# Firebase Auth Debug — Reference Guide

## 🎯 Your Firebase Auth Fails With: 500 Error on `/api/auth/firebase`

This means:

1. ✅ Frontend Google login works
2. ✅ Firebase token is created
3. ✅ Token sent to backend
4. ❌ Backend crashes
5. ❌ No user logged in

**Goal:** Read backend logs and find the exact failure point.

---

## 📋 Perfect Success Flow (What to Expect)

When Google auth works perfectly, you'll see:

```
👉 [Firebase Auth] Received request
✅ [Firebase Auth] idToken received
✅ [Firebase Auth] Environment variables configured
✅ [Firebase Auth] Firebase client initialized
🔍 [Firebase Auth] Verifying ID token...
✅ [Firebase Auth] Token verified. Decoded user: {
  "uid": "abc123...",
  "email": "user@example.com",
  "name": "User Name",
  "phone_number": "+1234567890",
  "provider": "google.com"
}
🔍 [Firebase Auth] Creating/updating user in database...
✅ [Firebase Auth] User created/updated: {
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "User Name",
  "accountType": "personal"
}
✅ [Firebase Auth] JWT token generated. Login successful! {
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Then:** Home page loads, user is logged in ✅

---

## 🔥 Failure Point 1: Missing Environment Variables

### What You'll See:

```
👉 [Firebase Auth] Received request
✅ [Firebase Auth] idToken received
🔥 [Firebase Auth] Admin SDK not configured. Env check: {
  "FIREBASE_PROJECT_ID": "MISSING",
  "FIREBASE_CLIENT_EMAIL": "MISSING",
  "FIREBASE_PRIVATE_KEY": "MISSING"
}
```

**Stops here.** Returns 500 error.

### What to Do:

1. SSH to your server
2. Check `.env` file:
   ```bash
   cat /path/to/.env | grep FIREBASE
   ```
3. Should show:
   ```
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```
4. If missing, add them
5. Restart backend: `pm2 restart dealpost-backend`

---

## 🔥 Failure Point 2: Private Key Format Wrong

### What You'll See:

```
👉 [Firebase Auth] Received request
✅ [Firebase Auth] idToken received
✅ [Firebase Auth] Environment variables configured
🔥 [Firebase Auth] Firebase initialization error: {
  "message": "Incorrect number of segments",
  "code": "invalid_key"
}
```

**Stops here.** Returns 500 error.

### Most Common Cause:

Private key doesn't have proper `\n` characters.

### What to Do:

1. Go to Firebase Console
2. Download fresh service account JSON
3. Copy `private_key` field **exactly** as shown
4. Paste into `.env`:
   ```env
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\nXXX\n-----END PRIVATE KEY-----\n"
   ```
5. **Important:** Copy the WHOLE thing including quotes
6. Restart: `pm2 restart dealpost-backend`

### How to Verify Format (Optional):

```bash
cat /path/to/.env | grep FIREBASE_PRIVATE_KEY
```

Should show `\n` as literal characters, not real newlines.

---

## 🔥 Failure Point 3: Token Verification Fails

### What You'll See:

```
👉 [Firebase Auth] Received request
✅ [Firebase Auth] idToken received
✅ [Firebase Auth] Environment variables configured
✅ [Firebase Auth] Firebase client initialized
🔍 [Firebase Auth] Verifying ID token...
🔥 [Firebase Auth] Token verification failed: {
  "message": "ID token has invalid signature",
  "code": "auth/invalid-id-token"
}
```

**Stops here.** Returns 401 error.

### What This Means:

Token is real but doesn't match this Firebase project.

### What to Do:

1. **Check Frontend Project ID:**

   ```bash
   cat frontend/.env | grep FIREBASE_PROJECT_ID
   ```

2. **Check Backend Project ID:**

   ```bash
   cat backend/.env | grep FIREBASE_PROJECT_ID
   ```

3. **They must match exactly!**

4. If different, update the backend .env to match frontend
5. Restart: `pm2 restart dealpost-backend`

---

## 🔥 Failure Point 4: User Already Exists

### What You'll See:

```
...
✅ [Firebase Auth] Token verified. Decoded user: { ... }
🔍 [Firebase Auth] Creating/updating user in database...
🔥 [Firebase Auth] User creation/update failed: {
  "message": "ER_DUP_ENTRY: Duplicate entry 'test@example.com' for key 'users.email'",
}
```

**Stops here.** Returns 500 error.

### What This Means:

User with that email already exists in database.

### What to Do:

1. **If testing:** Use different email address each time
2. **In production:** This shouldn't happen. Report to dev team.

---

## 🔥 Failure Point 5: Database Connection Failed

### What You'll See:

```
...
✅ [Firebase Auth] Token verified. Decoded user: { ... }
🔍 [Firebase Auth] Creating/updating user in database...
🔥 [Firebase Auth] User creation/update failed: {
  "message": "connect ECONNREFUSED 127.0.0.1:3306"
}
```

### What This Means:

MySQL database is not running or unreachable.

### What to Do:

1. Check if MySQL is running:

   ```bash
   systemctl status mysql
   ```

2. If stopped, start it:

   ```bash
   sudo systemctl start mysql
   ```

3. Restart backend: `pm2 restart dealpost-backend`

---

## 🔥 Failure Point 6: User Creation Returned Null

### What You'll See:

```
...
✅ [Firebase Auth] Token verified. Decoded user: { ... }
🔍 [Firebase Auth] Creating/updating user in database...
🔥 [Firebase Auth] upsertUserFromFederatedIdentity returned null
```

**Stops here.** Returns 500 error.

### What This Means:

Database saved nothing (should never happen with good query).

### What to Do:

1. Check database connection (see Failure Point 5)
2. Check if users table exists:
   ```bash
   mysql -u root -p dealpost
   SHOW TABLES;
   ```
3. Restart backend and try again

---

## 👀 How to Read Logs in Real-Time

While testing Google login:

```bash
# Terminal 1: Watch logs
pm2 logs dealpost-backend --lines 50

# Terminal 2 (in browser): Click Google Login
# Watch Terminal 1 for output
```

The logs appear instantly as the request processes.

---

## 🎯 Debug Checklist

1. Try Google login
2. Check `pm2 logs dealpost-backend`
3. Find the line with 🔥 (if any)
4. Match it to **Failure Point** sections above
5. Follow the **What to Do** steps
6. Restart backend
7. Try again

---

## Common Myths

❌ **"COOP warning means auth is broken"**

- No. Warning is harmless. Auth still works.

❌ **"If private key has weird characters it's wrong"**

- No. Just copy from JSON as-is. It's supposed to have `\n` characters.

❌ **"If I get 500, the frontend is broken"**

- No. Frontend works fine. Backend misconfigured.

---

## Quick Test (Skip Frontend)

If you want to test backend directly:

```bash
# 1. Get a Firebase token manually (from browser dev tools)
# After clicking Google Login, go to console and run:
# firebase.auth().currentUser.getIdToken()

# 2. Then curl the backend:
curl -X POST https://your-domain/api/auth/firebase \
  -H "Content-Type: application/json" \
  -d '{"idToken": "PASTE_TOKEN_HERE"}'

# Expected response:
# {"token": "...", "user": {...}}
```

If this works, frontend is the issue. If it fails, backend is the issue.

---

## Never Gets Here But Useful

If no 🔥 errors and user is created, but login doesn't redirect:

1. Check frontend `Login.jsx` — does it call `navigate("/")`?
2. Check if redirect is within `loginWithFirebase()` function
3. Frontend auth chapter has solutions

---

## Still Stuck?

Share:

1. First 🔥 error line from logs
2. Corresponding FAILURE POINT number
3. What you already tried
4. Backend `.env` values (without actual secrets)
