export function requireAdmin(req, res, next) {
	const role = String(req.user?.role || "").toLowerCase();
	if (role === "admin" || role === "developer") {
		next();
		return;
	}

	res.status(403).json({ message: "Forbidden: admin only" });
}
