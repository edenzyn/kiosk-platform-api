import { instrument } from "@socket.io/admin-ui";
import { createAdapter } from "@socket.io/redis-adapter";
import bcrypt from "bcrypt";
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

const SOCKET_ADMIN_UI_ORIGIN = "https://admin.socket.io";

function attachSocketAdminUi(server: Server): boolean {
  if (!env.SOCKET_ADMIN_USERNAME || !env.SOCKET_ADMIN_PASSWORD) {
    return false;
  }

  instrument(server, {
    auth: {
      type: "basic",
      username: env.SOCKET_ADMIN_USERNAME,
      password: bcrypt.hashSync(env.SOCKET_ADMIN_PASSWORD, 10),
    },
    mode: env.NODE_ENV === "production" ? "production" : "development",
  });
  logger.log(
    `Socket admin UI enabled - connect from ${SOCKET_ADMIN_UI_ORIGIN}`,
  );

  return true;
}

export function initSocket(): SocketConnection {
  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();

  for (const client of [pubClient, subClient]) {
    client.on("error", (err) => {
      logger.error("Socket Redis connection error", err);
    });
  }

  let isAdminUiEnabled = false;

  const server = new Server({
    transports: ["websocket"],
    adapter: createAdapter(pubClient, subClient),
    allowRequest: (request, callback) => {
      const { origin } = request.headers;
      callback(
        null,
        isAllowedOrigin(origin) ||
          (isAdminUiEnabled && origin === SOCKET_ADMIN_UI_ORIGIN),
      );
    },
  });
  isAdminUiEnabled = attachSocketAdminUi(server);

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
