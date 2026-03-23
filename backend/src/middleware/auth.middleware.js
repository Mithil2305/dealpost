import { models } from "../config/db.js";
import { verifyToken } from "../utils/jwt.js";

export async function protect(req, res, next) {
	const auth = req.headers.authorization;

	if (!auth || !auth.startsWith("Bearer ")) {
		return res.status(401).json({ message: "No token provided" });
	}

	try {
		const token = auth.split(" ")[1];
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

export async function optionalAuth(req, res, next) {
	const auth = req.headers.authorization;

	if (!auth || !auth.startsWith("Bearer ")) {
		next();
		return;
	}

	try {
		const token = auth.split(" ")[1];
		const payload = verifyToken(token);
		const user = await models.User.findByPk(payload.id);

		if (user && user.isActive) {
			req.user = user;
		}
	} catch {
		// Proceed unauthenticated on optional auth failures.
	}

	next();
}
