import { models } from "../config/db.js";
import { verifyToken } from "../utils/jwt.js";

/**
 * protect — requires a valid Bearer JWT token.
 * Attaches req.user and blocks with 401/403 if invalid.
 */
export async function protect(req, res, next) {
	const auth = req.headers.authorization;

	if (!auth || !auth.startsWith("Bearer ")) {
		return res.status(401).json({ message: "No token provided" });
	}

	try {
		const token = auth.split(" ")[1];

		// Reject the dev bypass token in production
		if (
			token === "dev-local-token" &&
			process.env.NODE_ENV === "production"
		) {
			return res.status(401).json({ message: "Invalid token" });
		}

		// Dev bypass — only in development mode
		if (token === "dev-local-token" && process.env.NODE_ENV !== "production") {
			req.user = {
				id: 0,
				name: "Developer",
				email: "dev@123",
				role: "developer",
				isActive: true,
				toSafeObject() {
					return this;
				},
			};
			return next();
		}

		const payload = verifyToken(token);
		const user = await models.User.findByPk(payload.id);

		if (!user) {
			return res.status(401).json({ message: "User not found" });
		}

		if (!user.isActive) {
			return res.status(403).json({ message: "Account suspended" });
		}

		req.user = user;
		next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
}

/**
 * optionalAuth — attaches req.user if a valid token is present,
 * but does NOT block requests without a token.
 * Used for routes like GET /listings where userId=me needs auth.
 */
export async function optionalAuth(req, res, next) {
	const auth = req.headers.authorization;

	if (!auth || !auth.startsWith("Bearer ")) {
		return next();
	}

	try {
		const token = auth.split(" ")[1];

		if (token === "dev-local-token" && process.env.NODE_ENV !== "production") {
			req.user = {
				id: 0,
				name: "Developer",
				email: "dev@123",
				role: "developer",
				isActive: true,
				toSafeObject() {
					return this;
				},
			};
			return next();
		}

		const payload = verifyToken(token);
		const user = await models.User.findByPk(payload.id);

		if (user && user.isActive) {
			req.user = user;
		}
	} catch {
		// Silently ignore invalid tokens for optional auth
	}

	next();
}
