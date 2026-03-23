import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import { registerSocketHandlers } from "./src/sockets/chat.socket.js";

async function startServer() {
  try {
    await connectDB();

    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: env.CLIENT_URL,
        credentials: true,
      },
    });

    registerSocketHandlers(io);

    httpServer.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
