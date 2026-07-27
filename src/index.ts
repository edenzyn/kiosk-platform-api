import { createServer } from "node:http";
import { App } from "./app";
import { env } from "./config/env";

function bootstrap(): void {
  const app = new App();
  const server = createServer(app.instance);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

bootstrap();
