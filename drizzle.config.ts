import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env";

export default defineConfig({
  out: "../db/migrations", // migrations kept in another repo (clone this https://github.com/edenzyn/kiosk-db to this api dir's parent dir)
  schema: "./src/modules/**/*.schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
