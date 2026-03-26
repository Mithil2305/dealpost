import { randomUUID } from "crypto";

export function notFoundHandler(req, res) {
	res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
	const status = err.status || err.statusCode || 500;
	const correlationId = req.id || randomUUID();
	const isOperational = Boolean(err.isOperational || status < 500);
	const message = isOperational
		? err.message || "Request could not be processed"
		: "An unexpected error occurred";

	if (process.env.NODE_ENV !== "test") {
		console.error({ correlationId, err });
	}

	res.status(status).json({
		message,
		correlationId,
		...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
	});
}
