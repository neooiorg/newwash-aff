import pg from "pg";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dbDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db");
const migrations = [
  "001_affiliates.sql",
  "002_affiliate_approval.sql",
  "003_storefront_settings.sql",
  "004_storefront_orders.sql",
  "005_realtime.sql",
  "006_booking_services.sql",
  "007_order_amount.sql",
  "008_service_icons.sql",
  "009_embed_button_position.sql",
  "010_direct_booking_details.sql",
  "011_affiliate_analytics.sql",
  "012_affiliate_access.sql",
  "013_remove_white_wash_fee.sql",
  "014_affiliate_withdrawals.sql",
  "015_notifications.sql",
  "016_refresh_service_catalog.sql",
  "017_order_fulfillment_workflow.sql",
  "018_remove_kiotviet.sql",
  "019_seed_demo_affiliate.sql",
  "020_order_affiliate_commission.sql",
  "021_seed_nttantts_affiliate.sql",
  "022_affiliate_lock.sql",
  "023_admin_members.sql",
  "024_notification_order_deep_links.sql",
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
  await client.query("ROLLBACK").catch(() => {
    // The connection may already be closed after a migration failure.
  });
  console.error("Database migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {
    // Closing is best effort during process shutdown.
  });
}
