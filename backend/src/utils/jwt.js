import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(id) {
	return jwt.sign({ id }, env.JWT_SECRET, {
		expiresIn: env.JWT_EXPIRES_IN,
	});
}

export function verifyToken(token) {
	return jwt.verify(token, env.JWT_SECRET);
}
