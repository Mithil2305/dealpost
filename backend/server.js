import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDB, sequelize } from "./src/config/db.js";
import { registerSocketHandlers } from "./src/sockets/chat.socket.js";

const allowedOrigins = String(env.CLIENT_URL || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

async function startServer() {
	try {
		await connectDB();

		const httpServer = http.createServer(app);
		httpServer.keepAliveTimeout = 65_000;
		httpServer.headersTimeout = 66_000;
		const io = new Server(httpServer, {
			cors: {
				origin: allowedOrigins,
				credentials: true,
			},
		});

		registerSocketHandlers(io);

		httpServer.listen(env.PORT, () => {
			console.log(`Server running on port ${env.PORT}`);
		});

		const gracefulShutdown = async (signal) => {
			console.log(`${signal} received, shutting down gracefully...`);
			httpServer.close(async () => {
				try {
					await sequelize.close();
				} catch (err) {
					console.error("Error closing DB connection", err);
				}
				process.exit(0);
			});

			setTimeout(() => {
				process.exit(1);
			}, 10_000);
		};

		process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
		process.on("SIGINT", () => gracefulShutdown("SIGINT"));

		process.on("unhandledRejection", (reason, promise) => {
			console.error("Unhandled Rejection at:", promise, "reason:", reason);
		});

		process.on("uncaughtException", (error) => {
			console.error("Uncaught Exception:", error);
			process.exit(1);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

startServer();
