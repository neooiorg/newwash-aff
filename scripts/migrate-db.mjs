import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const dbDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db");
const migrations = [
  "001_affiliates.sql",
  "002_affiliate_approval.sql",
  "003_storefront_kiotviet.sql",
  "004_storefront_orders.sql",
  "005_realtime.sql",
  "006_booking_services.sql",
  "007_order_amount.sql",
  "008_service_icons.sql",
  "009_embed_button_position.sql",
  "010_direct_booking_details.sql",
];
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });

try {
  await client.connect();
  await client.query("BEGIN");
  for (const migration of migrations) {
    await client.query(await readFile(path.join(dbDirectory, migration), "utf8"));
  }
  await client.query("COMMIT");
  console.log("NewWash affiliate schema is ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Database migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
