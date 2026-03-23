export function notFoundHandler(req, res) {
	res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
	const status = err.status || 500;
	const message = err.message || "Internal server error";

	if (process.env.NODE_ENV !== "test") {
		console.error(err);
	}

	res.status(status).json({
		message,
		...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
	});
}
