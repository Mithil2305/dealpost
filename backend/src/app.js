import cors from "cors";
import { randomUUID } from "crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import configRoutes from "./routes/config.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import messageRoutes from "./routes/message.routes.js";
import sponsoredAdRoutes from "./routes/sponsoredAd.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = String(env.CLIENT_URL || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

if (process.env.NODE_ENV === "production" && !allowedOrigins.length) {
	throw new Error("CLIENT_URL must be configured for production CORS");
}

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: { message: "Too many attempts. Try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

const apiLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false,
});

app.use(
	helmet({
		crossOriginEmbedderPolicy: false,
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				frameAncestors: ["'none'"],
				objectSrc: ["'none'"],
			},
		},
	}),
);
app.use(
	cors({
		origin(origin, callback) {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}
			callback(new Error("CORS: origin not allowed"));
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	}),
);
app.use((req, res, next) => {
	req.id = randomUUID();
	res.setHeader("X-Request-Id", req.id);
	next();
});
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
	res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/config", configRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/sponsored-ads", sponsoredAdRoutes);

// app.use(notFoundHandler);
// app.use(errorHandler);

app.use("/api", notFoundHandler);
app.use("/api", errorHandler);

export default app;
