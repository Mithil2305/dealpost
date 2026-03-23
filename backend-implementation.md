# DealPost — Complete Frontend Analysis & Backend Implementation Guide

## 🔍 Frontend Analysis Summary

**Tech Stack:** React 19 + Vite + TailwindCSS + Axios + React Router v6 + React Hot Toast

### Pages (Routes)

| Route          | Page           | Access               |
| -------------- | -------------- | -------------------- |
| `/`            | Home           | Public               |
| `/login`       | Login          | Guest only           |
| `/signup`      | Signup         | Guest only           |
| `/listing/:id` | ProductDetail  | Public               |
| `/explore`     | Explore        | Public               |
| `/categories`  | Categories     | Public               |
| `/post-ad`     | PostAd         | Protected            |
| `/my-ads`      | MyAds          | Protected            |
| `/profile`     | Profile        | Protected            |
| `/messages`    | Messages       | Protected            |
| `/admin`       | AdminDashboard | Admin/Developer only |

### Components

`Navbar`, `Footer`, `ProductCard`, `AdminSidebar`, `ConversationItem`

### Auth System

- `AuthContext.jsx` — provides `token` + `user` via context
- `useAuth.jsx` — consumer hook
- Roles: `user`, `admin`, `developer`
- JWT token stored in context (likely localStorage)

### API Layer

- `src/api/axios.js` — Axios instance with base URL + auth header
- `src/utils/api.js` — API call helpers per resource

---

## 🏗️ Complete Backend Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                  # MongoDB/PostgreSQL connection
│   │   ├── cloudinary.js          # Image upload config
│   │   └── env.js                 # Env variable validation
│   │
│   ├── models/
│   │   ├── User.js                # User schema
│   │   ├── Listing.js             # Ad/listing schema
│   │   ├── Message.js             # Chat message schema
│   │   ├── Conversation.js        # Conversation (thread) schema
│   │   └── Category.js            # Category schema
│   │
│   ├── controllers/
│   │   ├── auth.controller.js     # register, login, me
│   │   ├── listing.controller.js  # CRUD for ads
│   │   ├── message.controller.js  # send/get messages
│   │   ├── conversation.controller.js
│   │   ├── user.controller.js     # profile, update
│   │   ├── category.controller.js
│   │   └── admin.controller.js    # dashboard stats, moderate
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── listing.routes.js
│   │   ├── message.routes.js
│   │   ├── conversation.routes.js
│   │   ├── user.routes.js
│   │   ├── category.routes.js
│   │   └── admin.routes.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js     # verifyToken
│   │   ├── role.middleware.js     # requireAdmin, requireDeveloper
│   │   ├── upload.middleware.js   # multer config
│   │   └── errorHandler.js       # global error handler
│   │
│   ├── utils/
│   │   ├── jwt.js                 # signToken, verifyToken helpers
│   │   ├── cloudinaryUpload.js    # upload buffer to cloudinary
│   │   └── paginate.js            # pagination helper
│   │
│   └── app.js                     # Express app setup
│
├── server.js                      # Entry point (HTTP + Socket.IO)
├── .env
├── .env.example
└── package.json
```

---

## 📦 package.json

```json
{
	"name": "dealpost-backend",
	"version": "1.0.0",
	"main": "server.js",
	"scripts": {
		"dev": "nodemon server.js",
		"start": "node server.js"
	},
	"dependencies": {
		"express": "^4.18.2",
		"mongoose": "^8.0.0",
		"bcryptjs": "^2.4.3",
		"jsonwebtoken": "^9.0.0",
		"dotenv": "^16.0.0",
		"cors": "^2.8.5",
		"multer": "^1.4.5-lts.1",
		"cloudinary": "^2.0.0",
		"socket.io": "^4.6.1",
		"express-validator": "^7.0.1",
		"morgan": "^1.10.0",
		"helmet": "^7.0.0"
	},
	"devDependencies": {
		"nodemon": "^3.0.0"
	}
}
```

---

## 📄 Key File Implementations

### `server.js`

```js
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { registerSocketHandlers } from "./src/sockets/chat.socket.js";

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
	const httpServer = http.createServer(app);

	const io = new Server(httpServer, {
		cors: { origin: process.env.CLIENT_URL, credentials: true },
	});

	registerSocketHandlers(io);

	httpServer.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
});
```

### `src/app.js`

```js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import messageRoutes from "./routes/message.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

export default app;
```

---

### `src/config/db.js`

```js
import mongoose from "mongoose";

export default async function connectDB() {
	await mongoose.connect(process.env.MONGO_URI);
	console.log("MongoDB connected");
}
```

---

### `src/models/User.js`

```js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true },
		password: { type: String, required: true, minlength: 6 },
		phone: { type: String },
		avatar: { type: String, default: "" },
		location: { type: String },
		role: {
			type: String,
			enum: ["user", "admin", "developer"],
			default: "user",
		},
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 12);
	next();
});

userSchema.methods.comparePassword = function (plain) {
	return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeObject = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

export default mongoose.model("User", userSchema);
```

### `src/models/Listing.js`

```js
import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, trim: true },
		description: { type: String, required: true },
		price: { type: Number, required: true },
		category: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Category",
			required: true,
		},
		images: [{ type: String }], // Cloudinary URLs
		location: { type: String, required: true },
		condition: {
			type: String,
			enum: ["new", "like-new", "good", "fair", "poor"],
			default: "good",
		},
		seller: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		status: {
			type: String,
			enum: ["active", "sold", "pending", "removed"],
			default: "active",
		},
		views: { type: Number, default: 0 },
		isFeatured: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ category: 1, status: 1 });

export default mongoose.model("Listing", listingSchema);
```

### `src/models/Conversation.js`

```js
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
	{
		participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
		listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
		lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
		unreadCount: { type: Map, of: Number, default: {} },
	},
	{ timestamps: true },
);

export default mongoose.model("Conversation", conversationSchema);
```

### `src/models/Message.js`

```js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
	{
		conversation: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Conversation",
			required: true,
		},
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		text: { type: String, required: true },
		read: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export default mongoose.model("Message", messageSchema);
```

### `src/models/Category.js`

```js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
	{
		name: { type: String, required: true, unique: true },
		slug: { type: String, required: true, unique: true },
		icon: { type: String },
		color: { type: String },
	},
	{ timestamps: true },
);

export default mongoose.model("Category", categorySchema);
```

---

### `src/middleware/auth.middleware.js`

```js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
	const auth = req.headers.authorization;
	if (!auth?.startsWith("Bearer "))
		return res.status(401).json({ message: "No token provided" });

	try {
		const payload = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
		req.user = await User.findById(payload.id).select("-password");
		if (!req.user) return res.status(401).json({ message: "User not found" });
		next();
	} catch {
		res.status(401).json({ message: "Invalid token" });
	}
}
```

### `src/middleware/role.middleware.js`

```js
export function requireAdmin(req, res, next) {
	const role = req.user?.role?.toLowerCase();
	if (role === "admin" || role === "developer") return next();
	res.status(403).json({ message: "Forbidden: admin only" });
}
```

### `src/middleware/upload.middleware.js`

```js
import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter: (_, file, cb) => {
		if (file.mimetype.startsWith("image/")) cb(null, true);
		else cb(new Error("Only images are allowed"));
	},
});
```

---

### `src/controllers/auth.controller.js`

```js
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

// POST /api/auth/register
export async function register(req, res) {
	const { name, email, password, phone, location } = req.body;
	const exists = await User.findOne({ email });
	if (exists) return res.status(400).json({ message: "Email already in use" });

	const user = await User.create({ name, email, password, phone, location });
	const token = signToken(user._id);
	res.status(201).json({ token, user: user.toSafeObject() });
}

// POST /api/auth/login
export async function login(req, res) {
	const { email, password } = req.body;
	const user = await User.findOne({ email });
	if (!user || !(await user.comparePassword(password)))
		return res.status(401).json({ message: "Invalid credentials" });

	if (!user.isActive)
		return res.status(403).json({ message: "Account suspended" });

	const token = signToken(user._id);
	res.json({ token, user: user.toSafeObject() });
}

// GET /api/auth/me  [protected]
export async function getMe(req, res) {
	res.json({ user: req.user.toSafeObject() });
}
```

### `src/controllers/listing.controller.js`

```js
import Listing from "../models/Listing.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

// GET /api/listings  — public, search + filter + paginate
export async function getListings(req, res) {
	const {
		q,
		category,
		location,
		minPrice,
		maxPrice,
		condition,
		page = 1,
		limit = 20,
	} = req.query;
	const filter = { status: "active" };

	if (q) filter.$text = { $search: q };
	if (category) filter.category = category;
	if (location) filter.location = new RegExp(location, "i");
	if (condition) filter.condition = condition;
	if (minPrice || maxPrice) {
		filter.price = {};
		if (minPrice) filter.price.$gte = Number(minPrice);
		if (maxPrice) filter.price.$lte = Number(maxPrice);
	}

	const skip = (Number(page) - 1) * Number(limit);
	const [listings, total] = await Promise.all([
		Listing.find(filter)
			.populate("seller", "name avatar")
			.populate("category", "name slug")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit)),
		Listing.countDocuments(filter),
	]);

	res.json({
		listings,
		total,
		page: Number(page),
		pages: Math.ceil(total / limit),
	});
}

// GET /api/listings/:id
export async function getListingById(req, res) {
	const listing = await Listing.findByIdAndUpdate(
		req.params.id,
		{ $inc: { views: 1 } },
		{ new: true },
	)
		.populate("seller", "name avatar phone location")
		.populate("category");

	if (!listing) return res.status(404).json({ message: "Listing not found" });
	res.json({ listing });
}

// POST /api/listings  [protected]
export async function createListing(req, res) {
	const { title, description, price, category, location, condition } = req.body;

	let images = [];
	if (req.files?.length) {
		images = await Promise.all(
			req.files.map((f) => uploadToCloudinary(f.buffer, "dealpost/listings")),
		);
	}

	const listing = await Listing.create({
		title,
		description,
		price,
		category,
		location,
		condition,
		images,
		seller: req.user._id,
	});

	res.status(201).json({ listing });
}

// PUT /api/listings/:id  [protected, owner only]
export async function updateListing(req, res) {
	const listing = await Listing.findById(req.params.id);
	if (!listing) return res.status(404).json({ message: "Not found" });
	if (String(listing.seller) !== String(req.user._id))
		return res.status(403).json({ message: "Forbidden" });

	Object.assign(listing, req.body);
	await listing.save();
	res.json({ listing });
}

// DELETE /api/listings/:id  [protected, owner or admin]
export async function deleteListing(req, res) {
	const listing = await Listing.findById(req.params.id);
	if (!listing) return res.status(404).json({ message: "Not found" });

	const isOwner = String(listing.seller) === String(req.user._id);
	const isAdmin = ["admin", "developer"].includes(req.user.role);
	if (!isOwner && !isAdmin)
		return res.status(403).json({ message: "Forbidden" });

	await listing.deleteOne();
	res.json({ message: "Listing deleted" });
}

// GET /api/listings/my  [protected]
export async function getMyListings(req, res) {
	const listings = await Listing.find({ seller: req.user._id })
		.populate("category")
		.sort("-createdAt");
	res.json({ listings });
}
```

### `src/controllers/conversation.controller.js`

```js
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

// GET /api/conversations  [protected]
export async function getMyConversations(req, res) {
	const conversations = await Conversation.find({ participants: req.user._id })
		.populate("participants", "name avatar")
		.populate("lastMessage")
		.populate("listing", "title images")
		.sort("-updatedAt");
	res.json({ conversations });
}

// POST /api/conversations  [protected] — start or get existing
export async function startConversation(req, res) {
	const { recipientId, listingId } = req.body;
	let conv = await Conversation.findOne({
		participants: { $all: [req.user._id, recipientId] },
		listing: listingId,
	});

	if (!conv) {
		conv = await Conversation.create({
			participants: [req.user._id, recipientId],
			listing: listingId,
		});
	}
	res.json({ conversation: conv });
}

// GET /api/conversations/:id/messages  [protected]
export async function getMessages(req, res) {
	const messages = await Message.find({ conversation: req.params.id })
		.populate("sender", "name avatar")
		.sort("createdAt");
	res.json({ messages });
}

// POST /api/conversations/:id/messages  [protected]
export async function sendMessage(req, res) {
	const { text } = req.body;
	const msg = await Message.create({
		conversation: req.params.id,
		sender: req.user._id,
		text,
	});
	await Conversation.findByIdAndUpdate(req.params.id, { lastMessage: msg._id });
	const populated = await msg.populate("sender", "name avatar");
	res.status(201).json({ message: populated });
}
```

### `src/controllers/user.controller.js`

```js
import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

// GET /api/users/:id
export async function getUserProfile(req, res) {
	const user = await User.findById(req.params.id).select("-password");
	if (!user) return res.status(404).json({ message: "User not found" });
	res.json({ user });
}

// PUT /api/users/me  [protected]
export async function updateProfile(req, res) {
	const { name, phone, location } = req.body;
	const update = { name, phone, location };

	if (req.file) {
		update.avatar = await uploadToCloudinary(
			req.file.buffer,
			"dealpost/avatars",
		);
	}

	const user = await User.findByIdAndUpdate(req.user._id, update, {
		new: true,
	}).select("-password");
	res.json({ user });
}

// PUT /api/users/me/password  [protected]
export async function changePassword(req, res) {
	const { currentPassword, newPassword } = req.body;
	const user = await User.findById(req.user._id);
	if (!(await user.comparePassword(currentPassword)))
		return res.status(400).json({ message: "Current password is incorrect" });

	user.password = newPassword;
	await user.save();
	res.json({ message: "Password updated" });
}
```

### `src/controllers/admin.controller.js`

```js
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Message from "../models/Message.js";

// GET /api/admin/stats
export async function getDashboardStats(req, res) {
	const [totalUsers, totalListings, activeListings, totalMessages] =
		await Promise.all([
			User.countDocuments(),
			Listing.countDocuments(),
			Listing.countDocuments({ status: "active" }),
			Message.countDocuments(),
		]);
	res.json({ totalUsers, totalListings, activeListings, totalMessages });
}

// GET /api/admin/users
export async function getAllUsers(req, res) {
	const { page = 1, limit = 20 } = req.query;
	const skip = (page - 1) * limit;
	const [users, total] = await Promise.all([
		User.find()
			.select("-password")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit)),
		User.countDocuments(),
	]);
	res.json({ users, total });
}

// PATCH /api/admin/users/:id/status
export async function toggleUserStatus(req, res) {
	const user = await User.findById(req.params.id);
	if (!user) return res.status(404).json({ message: "User not found" });
	user.isActive = !user.isActive;
	await user.save();
	res.json({ user: user.toSafeObject() });
}

// GET /api/admin/listings
export async function getAllListings(req, res) {
	const { page = 1, limit = 20, status } = req.query;
	const filter = status ? { status } : {};
	const skip = (page - 1) * limit;
	const [listings, total] = await Promise.all([
		Listing.find(filter)
			.populate("seller", "name email")
			.populate("category")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit)),
		Listing.countDocuments(filter),
	]);
	res.json({ listings, total });
}

// PATCH /api/admin/listings/:id/status
export async function updateListingStatus(req, res) {
	const { status } = req.body;
	const listing = await Listing.findByIdAndUpdate(
		req.params.id,
		{ status },
		{ new: true },
	);
	res.json({ listing });
}
```

---

### `src/routes/auth.routes.js`

```js
import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
export default router;
```

### `src/routes/listing.routes.js`

```js
import { Router } from "express";
import {
	getListings,
	getListingById,
	createListing,
	updateListing,
	deleteListing,
	getMyListings,
} from "../controllers/listing.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();
router.get("/", getListings);
router.get("/my", protect, getMyListings);
router.get("/:id", getListingById);
router.post("/", protect, upload.array("images", 6), createListing);
router.put("/:id", protect, upload.array("images", 6), updateListing);
router.delete("/:id", protect, deleteListing);
export default router;
```

### `src/routes/admin.routes.js`

```js
import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import {
	getDashboardStats,
	getAllUsers,
	toggleUserStatus,
	getAllListings,
	updateListingStatus,
} from "../controllers/admin.controller.js";

const router = Router();
router.use(protect, requireAdmin);
router.get("/stats", getDashboardStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", toggleUserStatus);
router.get("/listings", getAllListings);
router.patch("/listings/:id/status", updateListingStatus);
export default router;
```

---

### `src/utils/jwt.js`

```js
import jwt from "jsonwebtoken";

export const signToken = (id) =>
	jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN || "7d",
	});

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
```

### `src/utils/cloudinaryUpload.js`

```js
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export function uploadToCloudinary(buffer, folder) {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{ folder },
			(err, result) => {
				if (err) return reject(err);
				resolve(result.secure_url);
			},
		);
		Readable.from(buffer).pipe(stream);
	});
}
```

### `src/config/cloudinary.js`

```js
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});
export default cloudinary;
```

---

### Socket.IO — `src/sockets/chat.socket.js`

```js
export function registerSocketHandlers(io) {
	io.on("connection", (socket) => {
		socket.on("join_conversation", (convId) => socket.join(convId));

		socket.on("send_message", async ({ conversationId, message }) => {
			// Broadcast to all in room except sender
			socket.to(conversationId).emit("receive_message", message);
		});

		socket.on("typing", ({ conversationId, userName }) => {
			socket.to(conversationId).emit("user_typing", { userName });
		});

		socket.on("disconnect", () => {});
	});
}
```

---

### `.env.example`

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dealpost
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🔗 Complete API Reference

| Method | Endpoint                          | Auth           | Description                               |
| ------ | --------------------------------- | -------------- | ----------------------------------------- |
| POST   | `/api/auth/register`              | —              | Register new user                         |
| POST   | `/api/auth/login`                 | —              | Login, returns JWT                        |
| GET    | `/api/auth/me`                    | ✅             | Get current user                          |
| GET    | `/api/listings`                   | —              | Get all listings (search/filter/paginate) |
| GET    | `/api/listings/my`                | ✅             | Get my listings                           |
| GET    | `/api/listings/:id`               | —              | Get single listing                        |
| POST   | `/api/listings`                   | ✅             | Create listing + upload images            |
| PUT    | `/api/listings/:id`               | ✅ Owner       | Update listing                            |
| DELETE | `/api/listings/:id`               | ✅ Owner/Admin | Delete listing                            |
| GET    | `/api/users/:id`                  | —              | Get public profile                        |
| PUT    | `/api/users/me`                   | ✅             | Update own profile                        |
| PUT    | `/api/users/me/password`          | ✅             | Change password                           |
| GET    | `/api/categories`                 | —              | List all categories                       |
| GET    | `/api/conversations`              | ✅             | Get my conversations                      |
| POST   | `/api/conversations`              | ✅             | Start or get existing conversation        |
| GET    | `/api/conversations/:id/messages` | ✅             | Get messages in conversation              |
| POST   | `/api/conversations/:id/messages` | ✅             | Send a message                            |
| GET    | `/api/admin/stats`                | ✅ Admin       | Dashboard stats                           |
| GET    | `/api/admin/users`                | ✅ Admin       | All users                                 |
| PATCH  | `/api/admin/users/:id/status`     | ✅ Admin       | Ban/unban user                            |
| GET    | `/api/admin/listings`             | ✅ Admin       | All listings                              |
| PATCH  | `/api/admin/listings/:id/status`  | ✅ Admin       | Moderate listing                          |

---

## 🗺️ Frontend ↔ Backend Axios Config

Update `frontend/src/api/axios.js` to point to your backend:

```js
import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
	withCredentials: true,
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

export default api;
```

And add to `frontend/.env`:

````
VITE_API_URL=http://localhost:5000/api

## 🔍 Additional Frontend Analysis (From Source Code)

From reading all pages, here are critical discoveries that refine the backend needs:

**Admin Dashboard** calls `/admin/reports` — needs a `Report` model and routes.
**AdminDashboard** calls `/admin/users/:id/ban` (POST) and `/admin/listings/:id` (DELETE).
**Messages page** uses mock data but the real API is wired in `ProductDetail` calling `POST /messages` with `{ listingId, sellerId, text }`.
**MyAds** calls `PATCH /listings/:id` with `{ status }` to mark as sold/active.
**PostAd** sends `premiumBoost` flag in FormData.
**Listing** model needs a `specs` field (object) shown in ProductDetail's specifications tab.
**AuthContext** exposes `login()`, `signup()`, `logout()`, `user`, `token`.

---

## 📁 Updated/Additional Files

### `src/models/Report.js` ← Missing model discovered from AdminDashboard

```js
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  listing:  { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  seller:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:   { type: String, required: true },
  status:   { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
````

### `src/models/Listing.js` — Full updated version with all fields

```js
import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, trim: true },
		description: { type: String, required: true },
		subtitle: { type: String }, // e.g. "Matte Black" shown on ProductDetail
		price: { type: Number, required: true },
		originalPrice: { type: Number }, // for strikethrough pricing
		category: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Category",
			required: true,
		},
		images: [{ url: String, public_id: String }], // Cloudinary objects
		location: { name: String, coordinates: { lat: Number, lng: Number } },
		condition: {
			type: String,
			enum: ["New", "Like New", "Good", "Fair", "Poor"],
			default: "Good",
		},
		seller: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		status: {
			type: String,
			enum: ["active", "sold", "pending", "removed"],
			default: "active",
		},
		views: { type: Number, default: 0 },
		isFeatured: { type: Boolean, default: false },
		premiumBoost: { type: Boolean, default: false }, // from PostAd form
		specs: { type: mongoose.Schema.Types.Mixed, default: {} }, // shown in specifications tab
	},
	{ timestamps: true },
);

listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ seller: 1 });

export default mongoose.model("Listing", listingSchema);
```

---

### Complete Updated `src/controllers/listing.controller.js`

```js
import Listing from "../models/Listing.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

// GET /api/listings — public: search, filter, sort, paginate
export async function getListings(req, res) {
	const {
		q,
		category,
		location,
		minPrice,
		maxPrice,
		condition,
		sort,
		userId,
		page = 1,
		limit = 20,
	} = req.query;

	const filter = { status: "active" };

	// My Ads special route: userId=me returns current user's listings
	if (userId === "me" && req.user) {
		filter.seller = req.user._id;
		delete filter.status; // show all statuses for owner
	}

	if (q) filter.$text = { $search: q };
	if (category) filter["category.name"] = new RegExp(category, "i");
	if (location) filter["location.name"] = new RegExp(location, "i");
	if (condition) filter.condition = condition;
	if (minPrice || maxPrice) {
		filter.price = {};
		if (minPrice) filter.price.$gte = Number(minPrice);
		if (maxPrice) filter.price.$lte = Number(maxPrice);
	}

	// Sort mapping
	const sortMap = {
		Newest: { createdAt: -1 },
		"Price Low-High": { price: 1 },
		"Price High-Low": { price: -1 },
		"Most Popular": { views: -1 },
	};
	const sortQuery = sortMap[sort] || { createdAt: -1 };

	const skip = (Number(page) - 1) * Number(limit);
	const [listings, total] = await Promise.all([
		Listing.find(filter)
			.populate("seller", "name avatar phone")
			.populate("category", "name slug")
			.sort(sortQuery)
			.skip(skip)
			.limit(Number(limit)),
		Listing.countDocuments(filter),
	]);

	res.json({
		listings,
		total,
		page: Number(page),
		pages: Math.ceil(total / limit),
	});
}

// GET /api/listings/my  [protected]
export async function getMyListings(req, res) {
	const listings = await Listing.find({ seller: req.user._id })
		.populate("category", "name slug")
		.sort("-createdAt");
	res.json({ listings });
}

// GET /api/listings/:id
export async function getListingById(req, res) {
	const listing = await Listing.findByIdAndUpdate(
		req.params.id,
		{ $inc: { views: 1 } },
		{ new: true },
	)
		.populate("seller", "name avatar phone location createdAt")
		.populate("category", "name slug");

	if (!listing) return res.status(404).json({ message: "Listing not found" });
	res.json({ listing });
}

// POST /api/listings  [protected, multipart/form-data]
export async function createListing(req, res) {
	const {
		title,
		description,
		subtitle,
		price,
		originalPrice,
		category,
		location,
		condition,
		premiumBoost,
		specs,
	} = req.body;

	let images = [];
	if (req.files?.length) {
		const uploads = await Promise.all(
			req.files.map((f) => uploadToCloudinary(f.buffer, "dealpost/listings")),
		);
		images = uploads.map((result) => ({
			url: result.url,
			public_id: result.public_id,
		}));
	}

	const listing = await Listing.create({
		title,
		description,
		subtitle,
		price,
		originalPrice,
		category,
		location: { name: location },
		condition,
		premiumBoost: premiumBoost === "true",
		specs: specs ? JSON.parse(specs) : {},
		images,
		seller: req.user._id,
		isFeatured: premiumBoost === "true",
	});

	const populated = await listing.populate(["seller", "category"]);
	res.status(201).json({ listing: populated });
}

// PATCH /api/listings/:id  [protected] — used by MyAds for status update
export async function patchListing(req, res) {
	const listing = await Listing.findById(req.params.id);
	if (!listing) return res.status(404).json({ message: "Not found" });

	const isOwner = String(listing.seller) === String(req.user._id);
	const isAdmin = ["admin", "developer"].includes(req.user.role);
	if (!isOwner && !isAdmin)
		return res.status(403).json({ message: "Forbidden" });

	const allowedFields = [
		"status",
		"title",
		"description",
		"price",
		"condition",
	];
	allowedFields.forEach((field) => {
		if (req.body[field] !== undefined) listing[field] = req.body[field];
	});

	await listing.save();
	res.json({ listing });
}

// PUT /api/listings/:id  [protected, owner only — full update]
export async function updateListing(req, res) {
	const listing = await Listing.findById(req.params.id);
	if (!listing) return res.status(404).json({ message: "Not found" });
	if (String(listing.seller) !== String(req.user._id))
		return res.status(403).json({ message: "Forbidden" });

	Object.assign(listing, req.body);

	if (req.files?.length) {
		const uploads = await Promise.all(
			req.files.map((f) => uploadToCloudinary(f.buffer, "dealpost/listings")),
		);
		listing.images = uploads.map((r) => ({
			url: r.url,
			public_id: r.public_id,
		}));
	}

	await listing.save();
	res.json({ listing });
}

// DELETE /api/listings/:id  [protected, owner or admin]
export async function deleteListing(req, res) {
	const listing = await Listing.findById(req.params.id);
	if (!listing) return res.status(404).json({ message: "Not found" });

	const isOwner = String(listing.seller) === String(req.user._id);
	const isAdmin = ["admin", "developer"].includes(req.user.role);
	if (!isOwner && !isAdmin)
		return res.status(403).json({ message: "Forbidden" });

	await listing.deleteOne();
	res.json({ message: "Listing deleted" });
}
```

---

### `src/controllers/admin.controller.js` — Full version with reports + ban

```js
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";

// GET /api/admin/stats
export async function getDashboardStats(req, res) {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [usersTotal, usersThisMonth, activeAds, adsToday, pendingReports] =
		await Promise.all([
			User.countDocuments(),
			User.countDocuments({ createdAt: { $gte: startOfMonth } }),
			Listing.countDocuments({ status: "active" }),
			Listing.countDocuments({
				createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
			}),
			Report.countDocuments({ status: "pending" }),
		]);

	const growthPct =
		usersThisMonth > 0 ? `+${usersThisMonth} this month` : "0 this month";

	res.json({
		stats: {
			usersTotal,
			usersGrowth: growthPct,
			activeAds,
			activeAdsToday: `${adsToday} listed today`,
			pendingReports,
		},
	});
}

// GET /api/admin/reports
export async function getReports(req, res) {
	const { page = 1, limit = 20, status } = req.query;
	const filter = status ? { status } : { status: "pending" };
	const skip = (page - 1) * limit;

	const [reports, total] = await Promise.all([
		Report.find(filter)
			.populate("listing", "title images")
			.populate("seller", "name email")
			.populate("reporter", "name")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit)),
		Report.countDocuments(filter),
	]);

	res.json({ reports, total });
}

// POST /api/admin/reports — create a report (any authenticated user)
export async function createReport(req, res) {
	const { listingId, reason } = req.body;
	const listing = await Listing.findById(listingId);
	if (!listing) return res.status(404).json({ message: "Listing not found" });

	const report = await Report.create({
		listing: listingId,
		seller: listing.seller,
		reporter: req.user._id,
		reason,
	});

	res.status(201).json({ report });
}

// GET /api/admin/users
export async function getAllUsers(req, res) {
	const { page = 1, limit = 20, search } = req.query;
	const filter = search
		? {
				$or: [
					{ name: new RegExp(search, "i") },
					{ email: new RegExp(search, "i") },
				],
			}
		: {};
	const skip = (page - 1) * limit;

	const [users, total] = await Promise.all([
		User.find(filter)
			.select("-password")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit)),
		User.countDocuments(filter),
	]);
	res.json({ users, total });
}

// PATCH /api/admin/users/:id/status — toggle ban/unban
export async function toggleUserStatus(req, res) {
	const user = await User.findById(req.params.id);
	if (!user) return res.status(404).json({ message: "User not found" });
	user.isActive = !user.isActive;
	await user.save();
	res.json({ user: user.toSafeObject() });
}

// POST /api/admin/users/:id/ban — hard ban (sets isActive false)
export async function banUser(req, res) {
	const user = await User.findByIdAndUpdate(
		req.params.id,
		{ isActive: false },
		{ new: true },
	).select("-password");
	if (!user) return res.status(404).json({ message: "User not found" });
	res.json({ message: "User banned", user });
}

// GET /api/admin/listings
export async function getAllListings(req, res) {
	const { page = 1, limit = 20, status } = req.query;
	const filter = status ? { status } : {};
	const skip = (page - 1) * limit;

	const [listings, total] = await Promise.all([
		Listing.find(filter)
			.populate("seller", "name email")
			.populate("category", "name")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit)),
		Listing.countDocuments(filter),
	]);
	res.json({ listings, total });
}

// PATCH /api/admin/listings/:id/status
export async function updateListingStatus(req, res) {
	const { status } = req.body;
	const listing = await Listing.findByIdAndUpdate(
		req.params.id,
		{ status },
		{ new: true },
	);
	if (!listing) return res.status(404).json({ message: "Not found" });
	res.json({ listing });
}

// DELETE /api/admin/listings/:id
export async function adminDeleteListing(req, res) {
	const listing = await Listing.findByIdAndDelete(req.params.id);
	if (!listing) return res.status(404).json({ message: "Not found" });

	// Also dismiss related reports
	await Report.updateMany({ listing: req.params.id }, { status: "dismissed" });

	res.json({ message: "Listing removed and reports dismissed" });
}
```

---

### `src/routes/admin.routes.js` — Full with all discovered endpoints

```js
import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import {
	getDashboardStats,
	getReports,
	createReport,
	getAllUsers,
	toggleUserStatus,
	banUser,
	getAllListings,
	updateListingStatus,
	adminDeleteListing,
} from "../controllers/admin.controller.js";

const router = Router();

// Stats & Reports (admin only)
router.use(protect);
router.post("/reports", createReport); // any logged-in user can report

router.use(requireAdmin); // below requires admin
router.get("/stats", getDashboardStats);
router.get("/reports", getReports);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", toggleUserStatus);
router.post("/users/:id/ban", banUser);
router.get("/listings", getAllListings);
router.patch("/listings/:id/status", updateListingStatus);
router.delete("/listings/:id", adminDeleteListing);

export default router;
```

### `src/routes/listing.routes.js` — Full with PATCH added

```js
import { Router } from "express";
import {
	getListings,
	getListingById,
	createListing,
	updateListing,
	patchListing,
	deleteListing,
	getMyListings,
} from "../controllers/listing.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/", optionalAuth, getListings); // optionalAuth for userId=me support
router.get("/my", protect, getMyListings);
router.get("/:id", getListingById);
router.post("/", protect, upload.array("images", 6), createListing);
router.put("/:id", protect, upload.array("images", 6), updateListing);
router.patch("/:id", protect, patchListing); // status-only updates from MyAds
router.delete("/:id", protect, deleteListing);

export default router;
```

---

### `src/middleware/auth.middleware.js` — Add `optionalAuth`

```js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
	const auth = req.headers.authorization;
	if (!auth?.startsWith("Bearer "))
		return res.status(401).json({ message: "No token provided" });

	try {
		const payload = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
		req.user = await User.findById(payload.id).select("-password");
		if (!req.user) return res.status(401).json({ message: "User not found" });
		if (!req.user.isActive)
			return res.status(403).json({ message: "Account suspended" });
		next();
	} catch {
		res.status(401).json({ message: "Invalid or expired token" });
	}
}

// Attach user if token present, but don't block if absent
export async function optionalAuth(req, res, next) {
	const auth = req.headers.authorization;
	if (auth?.startsWith("Bearer ")) {
		try {
			const payload = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
			req.user = await User.findById(payload.id).select("-password");
		} catch {
			// ignore — just proceed without user
		}
	}
	next();
}
```

---

### `src/utils/cloudinaryUpload.js` — Returns both url + public_id

```js
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export function uploadToCloudinary(buffer, folder) {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{ folder, resource_type: "image" },
			(err, result) => {
				if (err) return reject(err);
				resolve({ url: result.secure_url, public_id: result.public_id });
			},
		);
		Readable.from(buffer).pipe(stream);
	});
}
```

---

### `src/context/AuthContext.jsx` — What the backend must match

From the Login/Signup pages we know the exact shape the frontend expects:

```js
// AuthContext must call these API endpoints:
// login()  → POST /api/auth/login  with { email, password }
//            expects { token, user }
// signup() → POST /api/auth/register  with { name, email, password }
//            expects { token, user }
// logout() → clears token + user from state + localStorage

// The user object shape expected by the frontend:
{
  _id: "...",
  name: "...",
  email: "...",
  avatar: "...",       // used in Profile page
  role: "user"|"admin"|"developer",
  phone: "...",        // used in Profile > Personal Info
  location: "...",     // used in Profile page
  createdAt: "...",    // used in Profile (joinDate calculation)
  isActive: true
}
```

---

## 📊 Complete API Reference (Updated)

| Method | Endpoint                          | Auth           | Description                                |
| ------ | --------------------------------- | -------------- | ------------------------------------------ |
| POST   | `/api/auth/register`              | —              | Register → `{ token, user }`               |
| POST   | `/api/auth/login`                 | —              | Login → `{ token, user }`                  |
| GET    | `/api/auth/me`                    | ✅             | Current user                               |
| GET    | `/api/listings`                   | Optional       | List + search + filter + sort              |
| GET    | `/api/listings/my`                | ✅             | Owner's listings                           |
| GET    | `/api/listings/:id`               | —              | Single listing (increments views)          |
| POST   | `/api/listings`                   | ✅             | Create (multipart/form-data with images[]) |
| PUT    | `/api/listings/:id`               | ✅ Owner       | Full update                                |
| PATCH  | `/api/listings/:id`               | ✅ Owner       | Partial update (status change)             |
| DELETE | `/api/listings/:id`               | ✅ Owner/Admin | Delete                                     |
| GET    | `/api/users/:id`                  | —              | Public profile                             |
| PUT    | `/api/users/me`                   | ✅             | Update profile + avatar                    |
| PUT    | `/api/users/me/password`          | ✅             | Change password                            |
| GET    | `/api/categories`                 | —              | List all categories                        |
| POST   | `/api/categories`                 | ✅ Admin       | Create category                            |
| GET    | `/api/conversations`              | ✅             | My conversations                           |
| POST   | `/api/conversations`              | ✅             | Start/get conversation                     |
| GET    | `/api/conversations/:id/messages` | ✅             | Messages in thread                         |
| POST   | `/api/conversations/:id/messages` | ✅             | Send message                               |
| POST   | `/api/messages`                   | ✅             | Quick message from ProductDetail           |
| GET    | `/api/admin/stats`                | ✅ Admin       | Dashboard stats                            |
| GET    | `/api/admin/reports`              | ✅ Admin       | Flagged listings                           |
| POST   | `/api/admin/reports`              | ✅             | Report a listing                           |
| GET    | `/api/admin/users`                | ✅ Admin       | All users                                  |
| PATCH  | `/api/admin/users/:id/status`     | ✅ Admin       | Toggle ban                                 |
| POST   | `/api/admin/users/:id/ban`        | ✅ Admin       | Hard ban user                              |
| GET    | `/api/admin/listings`             | ✅ Admin       | All listings                               |
| PATCH  | `/api/admin/listings/:id/status`  | ✅ Admin       | Moderate                                   |
| DELETE | `/api/admin/listings/:id`         | ✅ Admin       | Remove listing                             |

---

## 🚀 Setup & Run Guide

```bash
# 1. Clone & install
cd backend && npm install

# 2. Create .env from example
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, CLOUDINARY_* values

# 3. Seed categories (optional helper)
node scripts/seedCategories.js

# 4. Run dev server
npm run dev
# → Server on http://localhost:5000

# 5. Frontend — update VITE_API_URL
echo "VITE_API_URL=http://localhost:5000/api" >> frontend/.env
cd frontend && npm install && npm run dev
```

### `scripts/seedCategories.js`

```js
import dotenv from "dotenv";
dotenv.config();
import connectDB from "../src/config/db.js";
import Category from "../src/models/Category.js";

const categories = [
	{ name: "Electronics", slug: "electronics" },
	{ name: "Fashion & Beauty", slug: "fashion-beauty" },
	{ name: "Vehicles", slug: "vehicles" },
	{ name: "Property", slug: "property" },
	{ name: "Sports", slug: "sports" },
	{ name: "Food & Drinks", slug: "food-drinks" },
	{ name: "Health & Wellness", slug: "health-wellness" },
	{ name: "Pet Supplies", slug: "pets" },
	{ name: "Services", slug: "services" },
	{ name: "Home & Lifestyle", slug: "lifestyle" },
];

await connectDB();
await Category.deleteMany({});
await Category.insertMany(categories);
console.log("✅ Categories seeded");
process.exit(0);
```

---

## 🧩 Socket.IO Integration in Frontend

The Messages page currently uses mock data. To wire up real-time messaging, add this to your React context or Messages component:

```js
// frontend/src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket(token) {
	const socketRef = useRef(null);

	useEffect(() => {
		socketRef.current = io(import.meta.env.VITE_API_URL.replace("/api", ""), {
			auth: { token },
		});
		return () => socketRef.current.disconnect();
	}, [token]);

	return socketRef;
}
// Usage in Messages.jsx:
// const socket = useSocket(token);
// socket.current.emit('join_conversation', conversationId);
// socket.current.on('receive_message', (msg) => setMessages(prev => [...prev, msg]));
```
