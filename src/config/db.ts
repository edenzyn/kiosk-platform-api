import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env";

export interface Database {
  pool: Pool;
  client: NodePgDatabase;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export function initDatabase(): Database {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl:
      env.DATABASE_SSL_MODE === "disable"
        ? false
        : { rejectUnauthorized: env.DATABASE_SSL_MODE === "verify-full" },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const client = drizzle(pool);

  return {
    pool,
    client,
    async ping() {
      await pool.query("select 1");
    },
    async close() {
      await pool.end();
    },
  };
}
