import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { logger } from "../shared/utils/core/logger";
import { isAllowedOrigin } from "./cors";
import { env } from "./env";

export interface SocketConnection {
  server: Server;
  attach(httpServer: HttpServer): void;
  disconnectClients(): void;
  close(): Promise<void>;
}

export function initSocket(): SocketConnection {
  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();

  for (const client of [pubClient, subClient]) {
    client.on("error", (err) => {
      logger.error("Socket Redis connection error", err);
    });
  }

  const server = new Server({
    transports: ["websocket"],
    adapter: createAdapter(pubClient, subClient),
    allowRequest: (request, callback) => {
      callback(null, isAllowedOrigin(request.headers.origin));
    },
  });

  return {
    server,
    attach(httpServer) {
      server.attach(httpServer);
    },
    disconnectClients() {
      server.disconnectSockets(true);
      for (const namespace of server._nsps.values()) {
        namespace.disconnectSockets(true);
      }
    },
    async close() {
      await Promise.all([pubClient.quit(), subClient.quit()]);
    },
  };
}
