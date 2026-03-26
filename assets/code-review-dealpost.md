# Production Code Review: `Mithil2305/dealpost`

**Stack:** Node.js (Express) + React (Vite) + MySQL (Sequelize) + Socket.IO + Cloudflare R2
**Purpose:** Classified ads / local marketplace (Post, browse, and message about listings)

---

## 🔴 SECURITY & LOOPHOLES

---

**Severity:** Critical
**Category:** Security
**Location:** `backend/src/config/env.js` — `JWT_SECRET`, `DB_USER`, `DB_PASSWORD`
**The Issue:** If `JWT_SECRET` is missing, the code silently falls back to `"dev_insecure_secret_change_me"`. Same for DB_USER defaulting to `"root"`. There is no hard crash on startup for missing critical secrets. Any production deployment where these vars aren't set will silently use weak, publicly-known secrets — making every JWT trivially forgeable.
**The Fix:**
```js
// env.js — fail fast for required secrets
function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`FATAL: Required environment variable "${key}" is not set.`);
  }
  return value;
}

export const env = {
  JWT_SECRET: requireEnv("JWT_SECRET"), // crash on startup if missing
  DB_USER: requireEnv("DB_USER"),
  DB_PASSWORD: requireEnv("DB_PASSWORD"),
  // ...
};
```

---

**Severity:** Critical
**Category:** Security
**Location:** `backend/scripts/seedAdmin.js` — lines 3–4
**The Issue:** Hardcoded admin credentials (`admin@123` / `123456`) are committed to the public repo. The seed script **also re-sets** the admin password on every run (`existing.password = ADMIN_PASSWORD`), meaning running it on production resets the admin account to this trivially guessable password.
**The Fix:**
```js
// Read credentials from env, never hardcode
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in env");
}
// Remove the "update existing" branch entirely — seed should only create, never reset
if (!existing) {
  await models.User.create({ ... });
} else {
  console.log("Admin already exists, skipping.");
}
```

---

**Severity:** Critical
**Category:** Security
**Location:** `backend/src/middleware/auth.middleware.js` — `protect()` and `optionalAuth()`
**The Issue:** The `"dev-local-token"` bypass is gated on `process.env.NODE_ENV !== "production"`. This is a dangerously weak safeguard. If `NODE_ENV` is accidentally undefined, not set, or set to `"staging"`, this bypass is live in production, granting full admin-level developer access to anyone who knows the static token string (which is hardcoded and public on GitHub).
**The Fix:**
```js
// Remove the dev bypass entirely from production-bound code.
// Use proper test tokens via a separate test-only middleware file.
// In protect():
const token = auth.split(" ")[1];
const payload = verifyToken(token); // just verify — no bypass
```

---

**Severity:** Critical
**Category:** Security
**Location:** `backend/src/sockets/chat.socket.js` — `io.on("connection")`
**The Issue:** Socket connections are completely unauthenticated. `userId` is trusted blindly from `socket.handshake.auth.userId` — no JWT verification is performed. Any unauthenticated client can connect, join any conversation room by ID, and receive all real-time messages in that conversation. This is a full authorization bypass for the messaging system.
**The Fix:**
```js
import { verifyToken } from "../utils/jwt.js";
import { models } from "../config/db.js";

// Add auth middleware to Socket.IO
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const payload = verifyToken(token);
    const user = await models.User.findByPk(payload.id);
    if (!user || !user.isActive) return next(new Error("Unauthorized"));
    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  // Use socket.user.id — verified server-side, not client-supplied
  socket.on("join_conversation", async (conversationId) => {
    // Verify user is a participant before joining the room
    const conv = await models.Conversation.findByPk(conversationId);
    const isParticipant = conv && (
      Number(conv.buyerId) === socket.user.id ||
      Number(conv.sellerId) === socket.user.id
    );
    if (!isParticipant) return socket.emit("error", "Forbidden");
    socket.join(String(conversationId));
  });
});
```

---

**Severity:** Critical
**Category:** Security
**Location:** `frontend/.env` — committed to the repository root
**The Issue:** A `frontend/.env` file containing `VITE_API_URL` pointing to localhost is committed to the public GitHub repo. While this specific value is benign, the `.env` file **itself** is in version control with no `.gitignore` protection visible. This pattern normalizes committing env files, making it highly likely real credentials will be leaked here or in derived forks.
**The Fix:**
```
# .gitignore — ensure this covers all env files
.env
.env.*
!.env.example
!.env.*.example
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/listing.controller.js` — `getListings()`, `getAllUsers()` (admin.controller.js)
**The Issue:** Search terms from `req.query` are injected directly into Sequelize `Op.like` clauses as `%${searchTerm}%` with no sanitization. While Sequelize parameterizes these queries (preventing classic SQL injection), there is no length limit on the search query — an attacker can submit arbitrarily long strings, causing expensive DB LIKE scans on unlimited-size inputs, leading to ReDoS or DoS conditions.
**The Fix:**
```js
const searchTerm = String(q || search || "").trim().slice(0, 200);
if (searchTerm.length > 0) {
  where[Op.or] = [
    { title: { [Op.like]: `%${searchTerm}%` } },
    { description: { [Op.like]: `%${searchTerm}%` } },
  ];
}
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/sponsoredAd.controller.js` — `upsertAdminGoogleAdsSnippet()` + `backend/src/controllers/config.controller.js` — `getPublicConfig()`
**The Issue:** The Google Ads snippet is arbitrary HTML/JS stored in the DB by admins and served to all frontend clients via a public API endpoint. While React doesn't render it as HTML by default (the current ad-sidebar shows only a placeholder text), the snippet value is stored in state and could trivially be rendered via `dangerouslySetInnerHTML` in the future or by a developer copy-paste mistake. There is zero sanitization or Content Security Policy enforcement on the snippet value. This is a stored XSS time bomb.
**The Fix:**
```js
// Server-side: validate that the snippet is a known Google AdSense pattern
// Reject arbitrary HTML/script content
const ALLOWED_SNIPPET_PATTERN = /^(<script[^>]*src="https:\/\/pagead2\.googlesyndication\.com[^"]*"[^>]*><\/script>)?$/;
if (snippet && !ALLOWED_SNIPPET_PATTERN.test(snippet.trim())) {
  return res.status(400).json({ message: "Invalid Google Ads snippet format" });
}
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/app.js` — `morgan("dev")`, globally applied
**The Issue:** Morgan's `"dev"` format logs every request path and method to stdout. In production, request URLs will contain user data, email addresses, and listing IDs. More critically, any query parameters (including potential tokens passed incorrectly in URLs) will be logged. `"dev"` format is explicitly for development — it should **never** be the production log format.
**The Fix:**
```js
// app.js
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// Or use a structured logger (winston/pino) with PII scrubbing
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/app.js` — No rate limiting anywhere in the application
**The Issue:** There is no rate limiting on any endpoint. The login endpoint (`POST /api/auth/login`) has no brute-force protection. The registration endpoint has no signup flood protection. The image upload endpoint has no per-user throttle. This makes the app trivially vulnerable to credential stuffing attacks, account enumeration, and storage exhaustion.
**The Fix:**
```js
// Install: npm install express-rate-limit
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", apiLimiter);
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/config.controller.js` — `getPublicConfig()`
**The Issue:** The Google Maps browser API key is served to every unauthenticated visitor via `GET /api/config/public`. The comment in `env.js` says "restrict by referrer in Google Cloud" but this is a documentation note, not enforced code. There is no server-side check that this endpoint is called from legitimate origins, and the key is fully visible in browser network requests to anyone who visits the site.
**The Fix:**
```js
// The API key restriction MUST be enforced in Google Cloud Console (HTTP referrer restriction).
// Additionally, don't expose the key unless the user is authenticated:
export const getPublicConfig = asyncHandler(async (req, res) => {
  // Only return key to authenticated users, or use a Maps proxy
  res.json({
    googleMapsBrowserApiKey: req.user ? env.GOOGLE_MAPS_BROWSER_API_KEY : "",
  });
});
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/user.controller.js` — `getUserProfile()` — `GET /api/users/:id`
**The Issue:** The public profile endpoint exposes all user fields **except** `password`. This includes `phone`, `email`, `location`, `gstOrMsme`, `businessName`, `likedListingIds`, `isActive`, `role`, and `accountType`. Any unauthenticated user can enumerate all user accounts by iterating numeric IDs and harvest PII (phone numbers, emails, GST numbers) at scale.
**The Fix:**
```js
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await models.User.findByPk(req.params.id, {
    attributes: ["id", "name", "avatar", "accountType", "businessName", "createdAt"],
    // Only expose PII to the account owner or admin
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/listing.controller.js` — `updateListing()` — `PUT /api/listings/:id`
**The Issue:** The `updateListing` handler allows the owner to set `status` to any value — including `"active"`, `"sold"`, or `"removed"` — without restriction. More critically, it also sets `isFeatured` on create via `premiumBoost`, but `patchListing` allows changing `status` without validating allowed transitions. A user who has had their listing `"removed"` by an admin can immediately re-activate it via `PATCH /api/listings/:id` with `{ "status": "active" }`.
**The Fix:**
```js
// patchListing: restrict user-settable statuses; admins have broader access
const OWNER_ALLOWED_STATUSES = ["active", "sold", "pending"]; // not "removed"
if (req.body.status !== undefined) {
  if (!isAdmin && !OWNER_ALLOWED_STATUSES.includes(req.body.status)) {
    return res.status(403).json({ message: "You cannot set this status" });
  }
  listing.status = req.body.status;
}
```

---

**Severity:** Medium
**Category:** Security
**Location:** `backend/src/controllers/auth.controller.js` — `register()` — email validation
**The Issue:** Email is validated with only `String(email).includes("@")`. This accepts `@`, `a@`, `@b`, and countless malformed addresses. Invalid emails will be stored and can never receive password-reset emails (when that feature is added), causing silent account issues.
**The Fix:**
```js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
if (!email || !EMAIL_REGEX.test(String(email))) {
  return res.status(400).json({ message: "A valid email is required" });
}
```

---

**Severity:** Medium
**Category:** Security
**Location:** `backend/src/controllers/message.controller.js` — `quickMessage()` and `sendMessage()`
**The Issue:** There is no maximum length enforced on message text. A user can send a message with megabytes of text, which will be AES-GCM encrypted (producing an even larger ciphertext) and stored in the database. This can be used to bloat the database or exhaust memory during encryption.
**The Fix:**
```js
const MAX_MESSAGE_LENGTH = 2000;
if (text.trim().length > MAX_MESSAGE_LENGTH) {
  return res.status(400).json({ message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` });
}
```

---

**Severity:** Medium
**Category:** Security
**Location:** `backend/src/controllers/conversation.controller.js` — `startConversation()`
**The Issue:** There is no validation that `sellerId` (the `recipientId` from the request) actually owns the listing. A user can start a conversation with any arbitrary user ID paired with any listing ID, creating a fake conversation between unrelated parties.
**The Fix:**
```js
const listing = await models.Listing.findByPk(Number(listingId));
if (!listing) return res.status(404).json({ message: "Listing not found" });
if (Number(listing.sellerId) !== Number(recipientId)) {
  return res.status(400).json({ message: "Recipient is not the seller of this listing" });
}
```

---

## 🟠 BUGS & LOGIC ERRORS

---

**Severity:** High
**Category:** Bug
**Location:** `backend/src/controllers/listing.controller.js` — `buildListingLikeCountMap()`
**The Issue:** To count likes for a page of listings, the function runs `models.User.findAll({ attributes: ["likedListingIds"] })` — fetching **every single user** in the database to count likes. On a platform with 10,000 users, this executes one query loading all user records for every listing page load. This is an O(n users) operation on a hot read path.
**The Fix:**
```js
// Redesign: store likes in a dedicated junction table (UserListingLike)
// with columns (userId, listingId). Then:
const counts = await models.UserListingLike.findAll({
  where: { listingId: { [Op.in]: uniqueIds } },
  attributes: ["listingId", [sequelize.fn("COUNT", sequelize.col("userId")), "count"]],
  group: ["listingId"],
});
```

---

**Severity:** High
**Category:** Bug
**Location:** `backend/src/controllers/listing.controller.js` — `getListings()` — radius filter path
**The Issue:** When a geo-radius filter is active, the code runs `models.Listing.findAll()` **without any pagination LIMIT** — it loads every single active listing in the database into memory, then filters and paginates in JavaScript. This will cause OOM errors as the dataset grows.
**The Fix:**
```js
// Use a database-level geo bounding box to pre-filter before loading rows,
// or implement proper geo-spatial queries with MySQL's spatial extensions:
const latDelta = radiusKm / 111;
const lngDelta = radiusKm / (111 * Math.cos((originLatitude * Math.PI) / 180));
// Add lat/lng range to WHERE clause before querying with LIMIT/OFFSET
```

---

**Severity:** Medium
**Category:** Bug
**Location:** `backend/src/controllers/listing.controller.js` — `getListingById()` — view counter
**The Issue:** `listing.increment("views")` is called on every GET request with no deduplication — bots, crawlers, page refreshes, and the same user reloading all count as views. Additionally, the increment is followed by a second full DB query to re-fetch the record, adding an unnecessary round-trip on every product detail load.
**The Fix:**
```js
// Use a short-TTL cache keyed by IP+listingId to debounce view increments
// Avoid the re-fetch by using Sequelize's returning option:
await listing.increment("views");
await listing.reload(); // single reload is cleaner than findByPk again
```

---

**Severity:** Medium
**Category:** Bug
**Location:** `backend/src/config/db.js` — `connectDB()` — migration code in production startup
**The Issue:** The `ensureListingCategoryColumns()`, `ensureListingIdentityColumns()`, and `ensureUserBusinessColumns()` functions run raw `ALTER TABLE` and `UPDATE` queries **on every server startup**. This is a DDL migration executed in application code during boot. In production with multiple instances, concurrent startups create a race condition where two instances may simultaneously try to `addColumn`, causing one to throw an unhandled exception (MySQL duplicate column error).
**The Fix:**
```js
// Use a proper migration tool (Sequelize CLI migrations, Flyway, or Umzug)
// Migration state should be tracked in a migrations table with advisory locks
// Never run schema changes in application startup code
```

---

**Severity:** Medium
**Category:** Bug
**Location:** `frontend/src/pages/Login.jsx` — form initial state (line ~35)
**The Issue:** The login form's initial state is pre-filled with `{ email: "dev@123", password: "123456" }` — the dev bypass credentials. If a developer ships this to production without noticing, every user who visits the login page sees these credentials pre-filled in the form inputs.
**The Fix:**
```js
const [form, setForm] = useState({ email: "", password: "" });
```

---

**Severity:** Low
**Category:** Bug
**Location:** `backend/src/controllers/user.controller.js` — `updateProfile()`
**The Issue:** `if (phone !== undefined) req.user.phone = phone;` assigns the raw, unvalidated phone value directly. No format validation, length check, or type coercion. An attacker can store a 10MB string as a phone number field.
**The Fix:**
```js
if (phone !== undefined) {
  const normalized = String(phone || "").trim().slice(0, 20);
  req.user.phone = normalized || null;
}
```

---

## 🟡 PERFORMANCE & SCALABILITY

---

**Severity:** High
**Category:** Performance
**Location:** `backend/src/controllers/listing.controller.js` — `buildListingLikeCountMap()`
**The Issue:** (Expanded from Bug section) This is also the single worst performance problem in the application. Every listing page, every search result, and every profile page triggers a full-table scan of the `users` table to parse JSON `likedListingIds` columns. At 50,000 users this query would load ~50MB of JSON data per request. This cannot be fixed with caching alone; the data model is fundamentally wrong.
**The Fix:** Migrate `likedListingIds` from a JSON column on `User` to a dedicated `user_listing_likes(userId, listingId)` junction table with indexed columns. This makes like counts an indexed COUNT query in milliseconds at any scale.

---

**Severity:** High
**Category:** Performance
**Location:** `backend/src/controllers/listing.controller.js` — multiple hydration passes
**The Issue:** For a single listing detail view, the code performs: (1) `findListingByIdentifier`, (2) `listing.increment("views")`, (3) `models.Listing.findByPk` (re-fetch after increment), (4) `buildListingLikeCountMap` (scans all users). That's 3 DB round-trips + a full table scan for a single page load.
**The Fix:** Combine the increment and re-fetch using `{ returning: true }` option; precompute like counts in the junction table approach above.

---

**Severity:** Medium
**Category:** Performance
**Location:** `backend/src/controllers/listing.controller.js` — `resolveCategoryId()`
**The Issue:** `resolveCategoryId()` performs up to 3 sequential DB queries (findByPk, exact findOne, LIKE findOne) for every listing create/update. Since categories are few and change rarely, these should be served from an in-memory cache, not hit the DB on every request.
**The Fix:**
```js
// Simple TTL cache
const categoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function resolveCategoryId(input) {
  const cacheKey = String(input).toLowerCase();
  const cached = categoryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.id;
  // ... DB lookup ...
  categoryCache.set(cacheKey, { id: result, ts: Date.now() });
  return result;
}
```

---

**Severity:** Medium
**Category:** Performance
**Location:** `backend/src/app.js` — `express.json({ limit: "10mb" })`
**The Issue:** Accepting 10MB JSON payloads globally is excessive and is an invitation for resource exhaustion attacks. The only endpoints that need large bodies are image uploads (which use multipart, not JSON). Regular API endpoints (login, message send, listing create) should have a tight limit.
**The Fix:**
```js
app.use(express.json({ limit: "50kb" })); // Tight global limit
// Increase only for specific routes that need it
app.use("/api/listings/uploads", express.json({ limit: "1mb" }));
```

---

## 🔵 PRODUCTION READINESS & RESILIENCE

---

**Severity:** High
**Category:** Readiness
**Location:** `backend/src/utils/r2Upload.js` — `uploadToR2()` fallback
**The Issue:** When R2 is not configured (`!r2Enabled`), image uploads silently return a placeholder URL `https://placehold.co/...`. In production, if R2 credentials are misconfigured, users will successfully "upload" images that are actually just placeholder images — no error is surfaced. Listings are created with fake images. This data corruption is invisible until users see broken product images.
**The Fix:**
```js
if (!r2Enabled || !r2Client) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("R2 storage is not configured. Cannot upload images in production.");
  }
  // Only use placeholder in development
  return { url: "https://placehold.co/1200x800?text=DealPost", public_id: `local-${Date.now()}` };
}
```

---

**Severity:** High
**Category:** Readiness
**Location:** `backend/src/middleware/errorHandler.js` — `errorHandler()`
**The Issue:** Error responses return `err.message` directly to the client. If any library throws an error with an internal message (e.g., Sequelize validation errors, AWS SDK errors with bucket names or keys embedded in the message), those implementation details are exposed to end users. In development mode, the full stack trace is returned.
**The Fix:**
```js
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  // Log the real error internally with a correlation ID
  const correlationId = crypto.randomUUID();
  console.error({ correlationId, err });

  // Only expose safe messages to clients
  const isOperational = err.isOperational || status < 500;
  const message = isOperational ? err.message : "An unexpected error occurred";

  res.status(status).json({ message, correlationId });
}
```

---

**Severity:** High
**Category:** Readiness
**Location:** `backend/src/app.js` — no CORS hardening for production
**The Issue:** CORS `origin` is set to `env.CLIENT_URL` which defaults to `"http://localhost:5173"` if the env var is not set. If `CLIENT_URL` is undefined in production, CORS will block all legitimate frontend requests. There is also no fallback list, no validation that the URL is an HTTPS URL in production, and no `allowedHeaders` or `methods` restriction.
**The Fix:**
```js
const allowedOrigins = [env.CLIENT_URL].filter(Boolean);
if (!allowedOrigins.length) throw new Error("CLIENT_URL must be set");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("CORS: origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));
```

---

**Severity:** Medium
**Category:** Readiness
**Location:** `backend/server.js` — no graceful shutdown
**The Issue:** There is no `SIGTERM`/`SIGINT` handler. When the process is killed (e.g., by a container orchestrator during deployment), it terminates immediately — dropping in-flight requests, leaving DB connections open, and potentially corrupting in-progress writes.
**The Fix:**
```js
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  httpServer.close(async () => {
    await sequelize.close();
    console.log("Server closed");
    process.exit(0);
  });
  // Force exit after timeout
  setTimeout(() => process.exit(1), 10_000);
});
```

---

**Severity:** Medium
**Category:** Readiness
**Location:** `backend/src/utils/encryption.js` — `encryptMessage()` plaintext fallback
**The Issue:** When `MESSAGE_ENCRYPTION_KEY` is not set, messages are stored as `"plain:" + plaintext` — unencrypted, in the database. The comment says "dev/test only" but the `requireEnv` function in `env.js` only warns, doesn't throw. In a production deploy where the key is forgotten, all messages will be stored in plaintext permanently, silently undermining the encryption feature entirely.
**The Fix:**
```js
export function encryptMessage(plaintext) {
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MESSAGE_ENCRYPTION_KEY must be configured in production");
    }
    return "plain:" + plaintext;
  }
  // ... encrypt
}
```

---

**Severity:** Low
**Category:** Readiness
**Location:** `backend/src/app.js` — no request ID / correlation ID middleware
**The Issue:** There is no request correlation ID attached to requests or logs. When debugging production errors, it is impossible to trace a single request across multiple log lines or correlate the error reported by a user with a specific server log entry.
**The Fix:**
```js
import { randomUUID } from "crypto";
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});
```

---

## ⚪ CODE QUALITY & MAINTAINABILITY

---

**Severity:** Medium
**Category:** Quality
**Location:** `frontend/src/context/` — `AuthContext.jsx`, `auth-context.js`, `useAuth.jsx`
**The Issue:** The authentication context is split across three separate files with inconsistent naming (`AuthContext.jsx` for the provider, `auth-context.js` for the context object, `useAuth.jsx` for the hook). This fragmentation violates single-responsibility cohesion and makes it hard for new developers to understand where auth state is managed.
**The Fix:** Consolidate into a single `auth.context.jsx` that exports `AuthContext`, `AuthProvider`, and `useAuth` from one file.

---

**Severity:** Medium
**Category:** Quality
**Location:** `backend/src/controllers/listing.controller.js` — overall file
**The Issue:** The listing controller is ~600+ lines and contains utility functions (`buildListingLikeCountMap`, `enrichListingsWithLikeMeta`, `normalizeListingPayload`, distance calculations, category resolution) mixed with HTTP handler code. Violates Single Responsibility. The geo/distance utilities, category resolution, and like-counting logic should each be their own service module.
**The Fix:** Extract into `services/listing.service.js`, `utils/geo.js`, and `services/like.service.js`.

---

**Severity:** Medium
**Category:** Quality
**Location:** `backend/src/config/db.js` — migration functions
**The Issue:** `ensureListingCategoryColumns()`, `ensureListingIdentityColumns()`, `ensureUserBusinessColumns()` are handwritten schema migration guards duplicating what Sequelize CLI migrations are designed to do. These functions have grown incrementally and will become unmaintainable. They also cannot be rolled back, audited, or tested independently.
**The Fix:** Migrate to proper Sequelize CLI migration files (`npx sequelize-cli migration:create`) and remove all ad-hoc `addColumn` code from application startup.

---

**Severity:** Low
**Category:** Quality
**Location:** `backend/src/controllers/auth.controller.js` — password minimum length
**The Issue:** Minimum password length is 6 characters, which is well below the NIST SP 800-63B recommendation of 8+ characters (ideally 12+). Combined with no complexity requirements and no checking against known breached password lists, accounts are highly susceptible to brute-force attacks.
**The Fix:**
```js
if (String(password).length < 8) {
  return res.status(400).json({ message: "Password must be at least 8 characters" });
}
```

---

**Severity:** Low (Nitpick)
**Category:** Quality
**Location:** `backend/src/utils/r2Upload.js` — `compressImage()` — SVG passthrough
**The Issue:** SVG files are passed through to R2 storage without any sanitization. SVGs can contain embedded JavaScript and are a vector for stored XSS when served from a CDN and rendered as `<img>` tags by browsers that execute inline SVG scripts. Listing images should not accept SVG uploads.
**The Fix:**
```js
// upload.middleware.js — exclude SVG from allowed types
if (file.mimetype.startsWith("image/") && file.mimetype !== "image/svg+xml") {
  cb(null, true);
} else {
  cb(new Error("Only JPEG, PNG, WebP, and GIF uploads are allowed"));
}
```

---

## Summary Table

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 1 | 🔴 Critical | Security | JWT_SECRET silently falls back to public default |
| 2 | 🔴 Critical | Security | Hardcoded admin credentials in committed seed script |
| 3 | 🔴 Critical | Security | `dev-local-token` bypass gated only on NODE_ENV string |
| 4 | 🔴 Critical | Security | Socket.IO connections fully unauthenticated — anyone can join any chat room |
| 5 | 🔴 Critical | Security | `frontend/.env` committed to public repo |
| 6 | 🟠 High | Security | Unbounded search inputs enable DoS via expensive LIKE scans |
| 7 | 🟠 High | Security | Google Ads snippet is a stored XSS time bomb |
| 8 | 🟠 High | Security | `morgan("dev")` in production leaks PII to logs |
| 9 | 🟠 High | Security | No rate limiting — login/register open to brute-force |
| 10 | 🟠 High | Security | Google Maps API key served publicly with no auth |
| 11 | 🟠 High | Security | Public `/api/users/:id` exposes all PII (email, phone, GST) |
| 12 | 🟠 High | Security | Users can re-activate admin-removed listings |
| 13 | 🟠 High | Bug | Full `users` table scan on every listing page load for likes |
| 14 | 🟠 High | Bug | Geo-radius search loads entire listing table into memory |
| 15 | 🟠 High | Performance | `buildListingLikeCountMap` is a full-table scan — O(n users) per request |
| 16 | 🟠 High | Readiness | R2 silently stores placeholder images when unconfigured in production |
| 17 | 🟠 High | Readiness | Error handler leaks internal error messages to clients |
| 18 | 🟠 High | Readiness | CORS defaults to localhost; no production hardening |
| 19 | 🟡 Medium | Security | Email validation accepts malformed addresses |
| 20 | 🟡 Medium | Security | No message length limit — DB bloat / memory exhaustion |
| 21 | 🟡 Medium | Security | `startConversation` doesn't verify recipient owns the listing |
| 22 | 🟡 Medium | Bug | Login form pre-filled with `dev@123` / `123456` |
| 23 | 🟡 Medium | Bug | DDL migrations in startup code create race condition with multi-instance deploys |
| 24 | 🟡 Medium | Bug | View counter increments on every request with no deduplication |
| 25 | 🟡 Medium | Readiness | No graceful shutdown on SIGTERM |
| 26 | 🟡 Medium | Readiness | Encryption silently falls back to plaintext when key is missing |
| 27 | 🟡 Medium | Quality | Auth context split across 3 files with inconsistent naming |
| 28 | 🟡 Medium | Quality | Listing controller is 600+ lines mixing utilities with HTTP handlers |
| 29 | 🔵 Low | Security | 6-char minimum password is below NIST recommendations |
| 30 | 🔵 Low | Bug | Phone field accepts unbounded unsanitized input |
| 31 | 🔵 Low | Readiness | No request correlation IDs for production debugging |
| 32 | 🔵 Low | Quality | SVG uploads not blocked — potential stored XSS via CDN |

**Verdict: Not production-ready.** Issues 1–4 alone are critical enough to result in full account takeover and message interception. The application must not be deployed publicly until at minimum the Critical and High severity items are resolved.

---

## Code Review: Part 2

---

### 🔴 SECURITY & LOOPHOLES (Continued)

---

**Severity:** Critical
**Category:** Security
**Location:** `backend/src/controllers/business.controller.js` — `getBusinesses()` + `backend/src/routes/business.routes.js`
**The Issue:** `GET /api/businesses` is a completely unauthenticated public endpoint that returns the `email`, `gstOrMsme` (tax registration number), `location`, and full business profile of **every single user who has ever posted a listing**. There is no authentication middleware, no pagination, and no `accountType` filter — it dumps the business-relevant PII of all sellers to any anonymous HTTP request. This is a serious data harvesting vulnerability, especially for GST numbers which are sensitive business identifiers.
**The Fix:**
```js
// business.routes.js — require auth, and filter what's exposed
router.get("/", optionalAuth, getBusinesses);

// business.controller.js — strip sensitive fields, add pagination, filter by accountType
export const getBusinesses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const numericLimit = Math.min(Number(limit) || 20, 50);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * numericLimit;

  const businesses = await models.User.findAndCountAll({
    where: { accountType: "business", isActive: true },
    attributes: ["id", "name", "avatar", "businessName", "location", "createdAt"],
    // Never expose: email, gstOrMsme, phone
    limit: numericLimit,
    offset,
  });

  res.json({ businesses: businesses.rows, total: businesses.count });
});
```

---

**Severity:** Critical
**Category:** Security
**Location:** `backend/src/controllers/listing.controller.js` — `sellerAttributes` array (line ~160)
**The Issue:** The `sellerAttributes` constant used in `listingIncludes()` explicitly includes `"email"` and `"phone"` as fields returned with every single listing — including on the public `GET /api/listings` and `GET /api/listings/:id` endpoints. Any unauthenticated visitor browsing listings receives the seller's email address and phone number in every API response. This is mass PII exposure via a public API.
**The Fix:**
```js
// Never include email/phone in public listing responses
const sellerAttributes = ["id", "name", "businessName", "avatar", "location", "createdAt"];

// Provide a separate seller-contact endpoint, protected by auth:
// GET /api/listings/:id/seller-contact — requires auth, returns phone/email
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/listing.controller.js` — `createListing()` — `premiumBoost` field
**The Issue:** The `premiumBoost` / `isFeatured` flag is set to `true` based entirely on a client-supplied boolean in the POST body. There is zero payment verification. Any user can set `premiumBoost: true` in their request and get their listing featured for free. This is both a business logic flaw and a fraud vector — the UI shows "₹14.99" for the boost but no payment gateway is involved on the backend whatsoever.
**The Fix:**
```js
// Remove premiumBoost from the client-controlled payload entirely.
// Set isFeatured = true ONLY after a confirmed payment webhook:
// POST /api/payments/webhook → verify signature → update listing.isFeatured

// In createListing():
// const boost = false; // Never trust client for paid features
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/listing.controller.js` — `createListing()` — `directImages` bypass
**The Issue:** The `normalizeIncomingImages(req.body?.images)` path allows passing arbitrary image URLs (from any domain) in the JSON body as `images`. This bypasses the R2 upload pipeline entirely — a user can set `images: [{ url: "https://malicious.com/tracking-pixel.gif" }]` and the listing is saved pointing to their server. This enables stored SSRF via image hotlinking, tracking pixel injection, and content that bypasses the compression/validation pipeline.
**The Fix:**
```js
// Disallow the JSON images bypass entirely. Accept ONLY file uploads through multer.
// Remove the directImages branch:
if (req.files?.length) {
  images = await Promise.all(req.files.map((f) => uploadToR2(f, "dealpost/listings")));
} else {
  images = []; // Do NOT allow client-supplied image URLs
}
```

---

**Severity:** High
**Category:** Security
**Location:** `frontend/src/api/axios.js` — no response interceptor for 401
**The Issue:** The Axios instance has only a request interceptor that attaches the Bearer token. There is no response interceptor to handle `401 Unauthorized` responses. When a JWT expires (default 7 days), the user's subsequent API calls will silently fail or throw errors that propagate to individual component `catch` blocks. There is no centralized logout-on-expiry, meaning the user stays "logged in" in the UI with a dead token, and any sensitive action appears to succeed from the UI perspective while actually failing on the server.
**The Fix:**
```js
// axios.js — add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Clear stale session and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

---

**Severity:** High
**Category:** Security
**Location:** `backend/src/controllers/listing.controller.js` — `patchListing()` — `allowedFields`
**The Issue:** `patchListing()` does not validate the *values* of patched fields — only that the field name is in the allowed list. Specifically, `status` is in `allowedFields` and the value is written directly without allowlist checking: `listing[field] = req.body[field]`. An attacker can PATCH `{ "status": "active" }`, `{ "status": "pending" }`, or inject any string Sequelize will accept.
**The Fix:**
```js
const VALID_STATUSES = ["active", "sold", "pending"];
// admin-only:
const ADMIN_STATUSES = ["active", "sold", "pending", "removed"];

if (req.body.status !== undefined) {
  const allowed = isAdmin ? ADMIN_STATUSES : VALID_STATUSES;
  if (!allowed.includes(String(req.body.status))) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  listing.status = req.body.status;
}

if (req.body.price !== undefined) {
  const p = Number(req.body.price);
  if (!Number.isFinite(p) || p <= 0 || p > 10_000_000) {
    return res.status(400).json({ message: "Invalid price" });
  }
  listing.price = p;
}
```

---

**Severity:** High
**Category:** Security
**Location:** `frontend/src/pages/ProductDetail.jsx` — "Verified" badge (line ~253)
**The Issue:** Every single listing on the platform displays a hardcoded "Verified" badge regardless of any actual verification status. There is no `isVerified` field on the `Listing` model, no verification workflow, and no conditional rendering — the badge is unconditional JSX. This is misleading to buyers and constitutes a consumer protection issue — it implies a trust signal that does not exist.
**The Fix:**
```jsx
{/* Only show Verified badge when actual verification exists */}
{listing?.isVerified && (
  <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold shadow-sm">
    Verified
  </span>
)}
```

---

**Severity:** Medium
**Category:** Security
**Location:** `backend/src/controllers/listing.controller.js` — `createListing()` / `updateListing()` — `specs` field
**The Issue:** The `specs` JSON object is accepted without any size or key-count limit. A user can submit `specs` containing thousands of keys with multi-kilobyte values. This JSON object is stored in a MySQL JSON column and returned in every listing API response — a single listing with a bloated `specs` object will inflate every page of results. There is also no validation that `specs` keys/values are strings.
**The Fix:**
```js
function sanitizeSpecs(raw) {
  const parsed = parseMaybeJson(raw, {});
  if (typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const entries = Object.entries(parsed).slice(0, 30); // max 30 spec fields
  return Object.fromEntries(
    entries.map(([k, v]) => [
      String(k).trim().slice(0, 100),
      String(v ?? "").trim().slice(0, 500),
    ])
  );
}
```

---

**Severity:** Medium
**Category:** Security
**Location:** `backend/src/controllers/conversation.controller.js` — `getMyConversations()` + `getMessages()`
**The Issue:** `getMyConversations()` calls `models.Conversation.findAll()` with no `LIMIT` — for a user with thousands of conversations (e.g., a popular seller), this loads every conversation with nested message includes into memory. `getMessages()` similarly calls `models.Message.findAll()` with no limit or pagination for a conversation — a conversation with 10,000 messages loads them all into a single response. Both are DoS vectors and memory exhaustion risks.
**The Fix:**
```js
// getMyConversations — add limit
const conversations = await models.Conversation.findAll({
  where: { [Op.or]: [{ buyerId: req.user.id }, { sellerId: req.user.id }] },
  limit: 50,
  order: [["updatedAt", "DESC"]],
  // ...
});

// getMessages — add pagination
const { page = 1 } = req.query;
const limit = 50;
const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
const messages = await models.Message.findAll({
  where: { conversationId: conversation.id },
  limit,
  offset,
  order: [["createdAt", "DESC"]], // newest first, reverse on client
});
```

---

### 🟠 BUGS & LOGIC ERRORS (Continued)

---

**Severity:** High
**Category:** Bug
**Location:** `frontend/src/pages/Messages.jsx` — polling intervals
**The Issue:** The Messages page uses two `setInterval` loops — one polling `/conversations` every 9 seconds and one polling the active conversation's messages every **4 seconds**. With Socket.IO already wired in on the backend, this polling is redundant. More critically, there is no check to prevent the poll from firing when the component is backgrounded, the page is hidden, or the user has navigated away. If socket events land while polling is in-flight, message state is overwritten with the poll response, losing optimistic updates. The 4-second message poll on a large conversation will also paginate incorrectly once server-side pagination is added.
**The Fix:**
```js
// Connect messages page to the existing Socket.IO backend instead of polling.
// The socket is already set up on the server — wire the client:
const socket = io(SOCKET_URL, { auth: { token } });
socket.on("receive_message", (msg) => {
  setMessages(prev => [...prev, msg]);
});
// Cancel the setInterval entirely for messages; keep a slower (60s) 
// background sync only for conversation list ordering.
```

---

**Severity:** High
**Category:** Bug
**Location:** `frontend/src/pages/Messages.jsx` — "Online" status (hardcoded)
**The Issue:** The chat header permanently displays a green dot and the word "Online" for every conversation participant regardless of their actual connection status. The `connectedUsers` Map in `chat.socket.js` tracks online users but this data is never queried or surfaced to the frontend. Showing false presence data damages user trust and can cause privacy concerns (users may not want others to know when they're online).
**The Fix:**
```js
// Backend: emit online status via socket events
socket.on("connection", (socket) => {
  io.emit("user_online", { userId: socket.user.id });
  socket.on("disconnect", () => io.emit("user_offline", { userId: socket.user.id }));
});

// Frontend: maintain onlineUserIds set from socket events
// Only show "Online" when the participant's ID is in the set
```

---

**Severity:** Medium
**Category:** Bug
**Location:** `backend/src/controllers/listing.controller.js` — `getListings()` — `sort` parameter
**The Issue:** The `sort` query parameter is consumed directly as a key into `sortMap` with a fallback: `sortMap[sort] || sortMap.Newest`. If `sort` is set to `"__proto__"`, `"constructor"`, or `"toString"`, the fallback logic protects the query itself, but the unsanitized `sort` value is used directly as an object property lookup. While Sequelize prevents this from becoming a query injection, it is a prototype pollution surface in the sort map lookup.
**The Fix:**
```js
const VALID_SORTS = ["Newest", "Price Low-High", "Price High-Low", "Most Popular"];
const safeSort = VALID_SORTS.includes(sort) ? sort : "Newest";
const order = sortMap[safeSort];
```

---

**Severity:** Medium
**Category:** Bug
**Location:** `frontend/src/pages/PostAd.jsx` — `previews` array with `URL.createObjectURL`
**The Issue:** The `previews` useMemo creates object URLs from files: `files.map((file) => file ? URL.createObjectURL(file) : null)`. These object URLs are **never revoked**. Every time `files` state changes (each image selection), new object URLs are created and the old ones leak memory. On a device with limited memory, repeated file selections can cause noticeable memory growth.
**The Fix:**
```js
// Use useEffect to revoke old URLs when files change
useEffect(() => {
  const urls = files.map((f) => f ? URL.createObjectURL(f) : null);
  setPreviews(urls);
  return () => {
    urls.forEach((url) => url && URL.revokeObjectURL(url));
  };
}, [files]);
// Remove the useMemo approach entirely
```

---

**Severity:** Medium
**Category:** Bug
**Location:** `backend/src/controllers/listing.controller.js` — `createListing()` — no upper price bound
**The Issue:** `price` is validated as `> 0` but has no upper bound. A user can submit a price of `9999999999999` (9 trillion), which the `DECIMAL(12,2)` column will silently truncate or throw a DB overflow error depending on MySQL configuration — neither of which is handled gracefully. The `originalPrice` field has no validation at all (no lower bound, no consistency check against `price`).
**The Fix:**
```js
const MAX_PRICE = 100_000_000; // 10 crore — adjust for your market
if (Number(price) <= 0 || Number(price) > MAX_PRICE) {
  return res.status(400).json({ message: `Price must be between ₹1 and ₹${MAX_PRICE.toLocaleString()}` });
}
if (originalPrice !== undefined && Number(originalPrice) > 0) {
  if (Number(originalPrice) <= Number(price)) {
    return res.status(400).json({ message: "Original price must be higher than current price" });
  }
}
```

---

**Severity:** Low
**Category:** Bug
**Location:** `frontend/src/pages/Messages.jsx` — Phone button (UI dead button)
**The Issue:** The `<button>` rendering the `<Phone>` icon in the chat header has no `onClick` handler and no `type="button"`. Inside a form context this would submit the form; outside it just silently does nothing. Deadweight UI that sets a false expectation of a phone call feature that doesn't exist.
**The Fix:**
```jsx
{/* Either implement or remove the Phone button — do not ship non-functional UI */}
{/* If coming soon: */}
<button type="button" onClick={() => toast("Voice calls coming soon")} ...>
```

---

### 🟡 PERFORMANCE & SCALABILITY (Continued)

---

**Severity:** High
**Category:** Performance
**Location:** `backend/src/controllers/business.controller.js` — `getBusinesses()`
**The Issue:** `getBusinesses()` calls `models.User.findAll()` with no `LIMIT` — it loads **every user who has ever posted a listing** into memory in a single query. As the platform grows, this becomes a full table scan returning potentially thousands of user records in a single API call with no pagination.
**The Fix:**
```js
const { page = 1, limit = 20 } = req.query;
const numericLimit = Math.min(Number(limit) || 20, 50);
const offset = (Math.max(Number(page) || 1, 1) - 1) * numericLimit;
const { rows, count } = await models.User.findAndCountAll({
  where: { accountType: "business", isActive: true },
  limit: numericLimit,
  offset,
  // ...
});
```

---

**Severity:** Medium
**Category:** Performance
**Location:** `frontend/src/pages/Messages.jsx` — Dual polling architecture
**The Issue:** The 4-second message poll fires regardless of network conditions, tab visibility, or whether the user is actively looking at the chat. On a device with a poor connection, every poll creates a pending request, and overlapping polls accumulate. The `setInterval` for conversation list (9s) is also never paused. This is continuous battery and bandwidth drain on mobile devices.
**The Fix:**
```js
// Use the Page Visibility API to pause polling when tab is hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearInterval(messageIntervalId);
  else messageIntervalId = setInterval(fetchMessages, 4000);
});
// Better: replace with Socket.IO as described above
```

---

**Severity:** Medium
**Category:** Performance
**Location:** `backend/src/utils/r2Upload.js` — `compressImage()` — SVG/GIF passthrough
**The Issue:** SVG and GIF files bypass the Sharp compression pipeline and are uploaded at their original size. A user could upload a 50MB animated GIF as a listing image — it passes multer's 5MB limit check... wait, actually multer's 5MB limit would catch this. However SVGs with embedded data are not bounded by the raw file size — a 100KB SVG with an embedded base64 image can expand to several MB when processed. The lack of server-side output size validation means compressed images could still exceed reasonable sizes.
**The Fix:**
```js
// After compression, validate output size
if (compressed.buffer.length > 2 * 1024 * 1024) { // 2MB post-compression limit
  throw new Error("Compressed image exceeds the 2MB size limit");
}
```

---

### 🔵 PRODUCTION READINESS & RESILIENCE (Continued)

---

**Severity:** High
**Category:** Readiness
**Location:** `backend/src/controllers/listing.controller.js` — `presignListingImageUpload()`
**The Issue:** The presigned URL endpoint (`POST /api/listings/uploads/presign`) generates R2 presigned PUT URLs valid for 900 seconds (15 minutes). The `fileName` parameter is accepted directly from the request body and used to derive the file extension — there is no validation that the extension is image-safe. A user can request a presign with `fileName: "exploit.html"` or `fileName: "malware.exe"` and receive a valid upload URL for arbitrary file types to your R2 bucket. The `contentType` check only validates the MIME type as `image/*`, but R2 doesn't enforce `ContentType` on PUT — the client can PUT any content with `Content-Type: image/jpeg` header.
**The Fix:**
```js
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const rawExtension = String(fileName || "upload").split(".").pop()?.toLowerCase() || "";
const safeExtension = ALLOWED_EXTENSIONS.has(rawExtension)
  ? rawExtension
  : resolveExtensionFromMime(contentType);

// Also add ContentLength restriction to the presign command:
const command = new PutObjectCommand({
  Bucket: env.R2_BUCKET,
  Key: key,
  ContentType: contentType,
  // Restrict upload size at the presign level
});
// Note: R2/S3 presign does not natively enforce ContentLength — 
// validate on your own server after upload by checking object size.
```

---

**Severity:** High
**Category:** Readiness
**Location:** `backend/src/app.js` — no Content Security Policy configuration on Helmet
**The Issue:** `helmet()` is used with default settings. Helmet's default CSP is either not set or very permissive depending on the version. Given the app dynamically injects Google Maps scripts and embeds OpenStreetMap iframes, a properly configured CSP is essential to prevent XSS escalation. The default Helmet setup does not configure `frame-ancestors`, `script-src`, or `connect-src`, leaving the app open to clickjacking and script injection.
**The Fix:**
```js
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://pagead2.googlesyndication.com",
        ],
        frameSrc: ["'self'", "https://www.openstreetmap.org"],
        connectSrc: ["'self'", env.CLIENT_URL, "https://nominatim.openstreetmap.org"],
        imgSrc: ["'self'", "data:", "blob:", env.R2_PUBLIC_BASE_URL, "https:"],
        frameAncestors: ["'none'"], // Prevent clickjacking
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Google Maps iframes
  })
);
```

---

**Severity:** Medium
**Category:** Readiness
**Location:** `frontend/src/pages/ProductDetail.jsx` — `activeTab === "ai"` — fake AI analysis
**The Issue:** The "AI Price Analysis" tab displays hardcoded placeholder text: *"Comparable listings are trending around [price] in this category. Pricing confidence is based on listing freshness, condition, and seller reputation."* followed by a disclaimer that real AI scoring requires enabling a backend feature. This misleads users into thinking AI analysis has been performed when it has not. Shipping fake feature content is a UX and trust problem — it should either be implemented or removed.
**The Fix:**
```jsx
{activeTab === "ai" && (
  <div className="...">
    <p>AI Price Analysis</p>
    <p className="mt-2 text-[#9f6900] flex items-center gap-2">
      <TriangleAlert size={14} /> This feature is coming soon.
    </p>
  </div>
)}
```

---

**Severity:** Medium
**Category:** Readiness
**Location:** `backend/src/utils/asyncHandler.js` (implied) — unhandled promise rejection scope
**The Issue:** (Verified indirectly) The entire backend uses `asyncHandler` wrappers, but there is no global `unhandledRejection` or `uncaughtException` handler in `server.js`. A promise rejection outside of a controller (e.g., in a background job, a socket handler, or the DB startup migration code) will crash the Node.js process silently with no structured logging and no restart trigger.
**The Fix:**
```js
// server.js
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Optionally: send to error tracking (Sentry, Datadog, etc.)
  // Do NOT process.exit() here — let the process continue for non-fatal rejections
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1); // This IS fatal — exit and let the process manager restart
});
```

---

### ⚪ CODE QUALITY & MAINTAINABILITY (Continued)

---

**Severity:** Medium
**Category:** Quality
**Location:** `frontend/src/pages/PostAd.jsx` — Nominatim fallback API called directly from browser
**The Issue:** The Nominatim OpenStreetMap geocoding API is called directly from the browser: `fetch("https://nominatim.openstreetmap.org/search?...")`. Nominatim's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) explicitly requires a valid `User-Agent` header and prohibits heavy usage from browser clients without attribution. The `User-Agent` is set by the browser and not customizable in `fetch()` from a browser context. This usage also means the user's IP address is exposed to the OSM servers, and any API policy changes will break geocoding fallback with no server-side control.
**The Fix:**
```js
// Proxy Nominatim through your own backend instead of calling it from the browser
// GET /api/geocode?q=Chennai → backend calls Nominatim with proper User-Agent
// This also lets you add caching, rate limiting, and switch providers later
```

---

**Severity:** Medium
**Category:** Quality
**Location:** `frontend/src/pages/ProductDetail.jsx` — `fetchLikedStatus` separate effect
**The Issue:** Liked status is fetched in a separate `useEffect` that fires after `listing` is loaded, creating a double-waterfall: first fetch the listing, then fetch the liked status. The initial listing fetch already returns `isLiked` (it's included in `enrichListingWithLikeMeta`), making the second effect entirely redundant. The component ignores the `isLiked` from the listing response and then re-fetches it unnecessarily.
**The Fix:**
```js
// Remove the fetchLikedStatus useEffect entirely.
// The listing response from GET /api/listings/:id already includes isLiked.
// Simply read it during the initial fetch:
setIsLiked(Boolean(entry?.isLiked)); // already done correctly — just remove the 2nd effect
```

---

**Severity:** Low
**Category:** Quality
**Location:** `frontend/src/pages/PostAd.jsx` — `onSubmit` function (200+ lines inline)
**The Issue:** The form submit handler is a 200+ line `async` function inline in the component body, mixing: business profile update, file compression, parallel image uploads (with presign+PUT+fallback logic), payload assembly, and listing creation. Any error in this chain is caught by a single catch block with a generic toast. Extracting this into a dedicated service function would make it testable, composable, and significantly easier to debug.
**The Fix:**
```js
// Extract to src/services/listing.service.js:
export async function submitListingForm(formData, files, options) { ... }
// Component becomes:
const onSubmit = async (e) => {
  e.preventDefault();
  try {
    setSubmitting(true);
    const listing = await submitListingForm(form, files, { isBusinessFlow });
    toast.success("Listing published");
    navigate(`/listing/${listing.id}`);
  } catch (err) {
    toast.error(err.message || "Unable to publish ad");
  } finally {
    setSubmitting(false);
  }
};
```

---

**Severity:** Low (Nitpick)
**Category:** Quality
**Location:** `backend/src/controllers/listing.controller.js` — `normalizeListingPayload()`
**The Issue:** The function adds `_id: listing.id` to every normalized listing payload to satisfy a frontend that expects `_id`. This is a MongoDB-era naming convention leaking into a MySQL-backed API — the proper fix is to normalize the frontend to use `id`, not to perpetuate the `_id` alias in every single API response.
**The Fix:**
```js
// Update all frontend references from listing._id to listing.id
// Remove _id: listing.id from normalizeListingPayload()
// This reduces payload size and removes a confusing dual-ID pattern
```

---

**Severity:** Low (Nitpick)
**Category:** Quality
**Location:** `frontend/src/utils/messageNotifications.js` — `readSeenMap()` / `markConversationSeen()`
**The Issue:** The "unread message" notification system is implemented entirely via `localStorage` with no server-side read-receipt tracking. If the user logs in from a second device or browser, all conversations appear unread — there is no cross-device synchronization. The `markConversationSeen` function also writes a new `localStorage` entry on every message poll (every 4 seconds), causing unnecessary storage churn.
**The Fix:** Add a server-side `readAt` timestamp to the `Message` or `Conversation` model and persist read receipts via `PATCH /api/conversations/:id/read`. Use `localStorage` only as a client-side cache with a TTL.

---

## Complete Issue Registry — Part 2

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 33 | 🔴 Critical | Security | `GET /api/businesses` unauthenticated, returns all seller emails + GST numbers |
| 34 | 🔴 Critical | Security | Seller `email` + `phone` included in every public listing response |
| 35 | 🟠 High | Security | `premiumBoost` flag set by client with no payment verification — free fraud |
| 36 | 🟠 High | Security | No 401 response interceptor — expired tokens leave users in broken authenticated state |
| 37 | 🟠 High | Security | `directImages` bypass allows arbitrary external URLs to be stored as listing images (SSRF/tracking) |
| 38 | 🟠 High | Security | `patchListing` does not validate field values — any string accepted for `status`, `price`, etc. |
| 39 | 🟠 High | Security | "Verified" badge hardcoded on all listings — false trust signal, consumer protection issue |
| 40 | 🟠 High | Readiness | Presigned upload endpoint allows arbitrary file extension (`.html`, `.exe`) to be uploaded to R2 |
| 41 | 🟠 High | Readiness | Helmet configured with defaults — no CSP, no `frame-ancestors`, no clickjacking protection |
| 42 | 🟡 Medium | Security | `specs` JSON has no key count or value size limit — DB bloat / response size bomb |
| 43 | 🟡 Medium | Security | `getMyConversations` and `getMessages` have no pagination — memory exhaustion DoS |
| 44 | 🟡 Medium | Bug | Messages page uses polling instead of the already-wired Socket.IO — state races and redundancy |
| 45 | 🟡 Medium | Bug | "Online" presence status is hardcoded — always shows green regardless of actual status |
| 46 | 🟡 Medium | Bug | `sort` query param used as direct object key without allowlist — prototype pollution surface |
| 47 | 🟡 Medium | Bug | No upper price bound — prices above DECIMAL(12,2) capacity cause silent truncation or DB errors |
| 48 | 🟡 Medium | Bug | `URL.createObjectURL` in PostAd is never revoked — memory leak per image selection |
| 49 | 🟡 Medium | Readiness | No `unhandledRejection` / `uncaughtException` handlers — background rejections silently crash the process |
| 50 | 🟡 Medium | Readiness | "AI Price Analysis" tab renders hardcoded fake data — misleads users |
| 51 | 🟡 Medium | Quality | Nominatim called directly from browser — violates OSM usage policy, exposes user IPs |
| 52 | 🟡 Medium | Performance | `getBusinesses()` has no LIMIT — loads all sellers in one query |
| 53 | 🟡 Medium | Performance | 4-second message poll fires even when tab is hidden — continuous battery/bandwidth drain |
| 54 | 🔵 Low | Bug | Phone button in chat header is non-functional with no `onClick` |
| 55 | 🔵 Low | Quality | `_id` alias perpetuated in all listing payloads — MongoDB naming in a MySQL API |
| 56 | 🔵 Low | Quality | `ProductDetail` fetches `isLiked` twice — second effect is redundant |
| 57 | 🔵 Low | Quality | `onSubmit` in PostAd is 200+ lines inline — untestable, unmaintainable |
| 58 | 🔵 Low | Quality | `messageNotifications.js` is client-only — no cross-device read receipt sync |

---

## Final Verdict

Across both parts of this review, **58 issues** were identified: **5 Critical, 16 High, 22 Medium, 15 Low/Nitpick**.

The three most dangerous attack chains that could be executed *right now* against a live deployment:

1. **Full unauthenticated data harvest**: `GET /api/businesses` + `GET /api/listings` return every seller's email, phone, and GST number to any anonymous HTTP client. A script could enumerate and exfiltrate all user PII in minutes.

2. **Socket takeover**: Anyone can connect to the Socket.IO server without a token, enumerate conversation IDs (which are sequential integers), join every room, and read all real-time messages from all users across the platform — completely bypassing the AES-GCM encryption since decrypted plaintext is what flows over sockets.

3. **Admin account trivial compromise**: The seed script hardcodes `admin@123` / `123456` in a public repo and re-sets the admin password on every run. Combined with no rate limiting on login, this account can be brute-forced in seconds, or simply logged into directly with the known credentials.

**This application must not go to production until at minimum issues #1–12 and #33–41 are fully resolved.**

