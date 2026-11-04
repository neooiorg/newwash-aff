import "server-only";

import { Pool } from "pg";

declare global {
  // biome-ignore lint/style/noVar: Global cache persists across hot reloads.
  var newwashPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  if (!globalThis.newwashPool) {
    globalThis.newwashPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }
  return globalThis.newwashPool;
}
