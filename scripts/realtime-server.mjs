import pg from "pg";
import { WebSocket, WebSocketServer } from "ws";

import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.REALTIME_PORT || 3002);
const appPort = Number(process.env.PORT || 3001);
const sessionSecret = process.env.ADMIN_SESSION_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const allowedOrigin = process.env.APP_ORIGIN;

if (!sessionSecret || !databaseUrl) {
  console.error("Realtime needs ADMIN_SESSION_SECRET and DATABASE_URL.");
  process.exit(1);
}

function directListenerUrl(connectionString) {
  if (process.env.REALTIME_DATABASE_URL) return process.env.REALTIME_DATABASE_URL;
  const url = new URL(connectionString);
  if (url.hostname.endsWith(".neon.tech")) url.hostname = url.hostname.replace("-pooler.", ".");
  return url.toString();
}

const listenerDatabaseUrl = directListenerUrl(databaseUrl);

function validSession(cookieHeader) {
  try {
    const value = cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("newwash_admin="))
      ?.slice("newwash_admin=".length);
    if (!value) return false;
    const [expires, signature] = decodeURIComponent(value).split(".");
    if (!/^\d{10}$/.test(expires || "") || !/^[0-9a-f]{64}$/.test(signature || "")) return false;
    if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
    const expected = createHmac("sha256", sessionSecret).update(expires).digest();
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function cookieValue(cookieHeader, name) {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function validAffiliateSession(cookieHeader) {
  try {
    const value = cookieValue(cookieHeader, "newwash_affiliate");
    if (!value) return null;
    const [affiliateId, expires, signature] = decodeURIComponent(value).split(".");
    if (!/^[0-9a-f-]{36}$/i.test(affiliateId || "") || !/^\d{10}$/.test(expires || "")) return null;
    if (!/^[0-9a-f]{64}$/.test(signature || "") || Number(expires) <= Math.floor(Date.now() / 1000)) return null;
    const expected = createHmac("sha256", process.env.AFFILIATE_SESSION_SECRET || sessionSecret)
      .update(`${affiliateId}.${expires}`)
      .digest();
    return timingSafeEqual(expected, Buffer.from(signature, "hex")) ? affiliateId : null;
  } catch {
    return null;
  }
}

function validTicket(request, expectedScope) {
  try {
    const ticket = new URL(request.url, "http://realtime.local").searchParams.get("ticket");
    if (!ticket) return null;
    const [scope, subject, expires, signature] = ticket.split(".");
    if (scope !== expectedScope || !subject || !/^\d{10}$/.test(expires || "")) return null;
    if (!/^[0-9a-f]{64}$/.test(signature || "") || Number(expires) <= Math.floor(Date.now() / 1000)) return null;
    const expected = createHmac("sha256", sessionSecret).update(`${scope}.${subject}.${expires}`).digest();
    return timingSafeEqual(expected, Buffer.from(signature, "hex")) ? subject : null;
  } catch {
    return null;
  }
}

function validOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host?.split(":")[0];
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return allowedOrigin
      ? parsed.origin === allowedOrigin
      : parsed.hostname === host && Number(parsed.port) === appPort;
  } catch {
    return false;
  }
}

const server = createServer((_, response) => {
  response.writeHead(404).end();
});
const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024, perMessageDeflate: false });

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url, "http://realtime.local").pathname;
  const scope =
    pathname === "/services"
      ? "services"
      : pathname === "/realtime"
        ? "admin"
        : pathname === "/affiliate-realtime"
          ? "affiliate"
          : "";
  const ticketSubject = scope === "admin" || scope === "affiliate" ? validTicket(request, scope) : null;
  const affiliateId = scope === "affiliate" ? ticketSubject || validAffiliateSession(request.headers.cookie) : null;
  if (
    !scope ||
    !validOrigin(request) ||
    (scope === "admin" && ticketSubject !== "admin" && !validSession(request.headers.cookie)) ||
    (scope === "affiliate" && !affiliateId)
  ) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, (client) => {
    client.scope = scope;
    if (scope === "affiliate") client.affiliateId = affiliateId;
    sockets.emit("connection", client);
  });
});

sockets.on("connection", (client) => {
  client.isAlive = true;
  client.on("pong", () => {
    client.isAlive = true;
  });
  client.on("error", () => {
    // Socket errors are isolated to the affected browser connection.
  });
  client.send(JSON.stringify({ type: "ready" }));
});

const heartbeat = setInterval(() => {
  for (const client of sockets.clients) {
    if (!client.isAlive) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    if (client.readyState === WebSocket.OPEN) client.ping();
  }
}, 30_000);

let listener;
let retryTimer;
let listenerHeartbeat;
let retryMs = 100;
let stopping = false;

async function connectDatabase() {
  if (stopping) return;
  const client = new pg.Client({
    connectionString: listenerDatabaseUrl,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  listener = client;
  const reconnect = () => {
    if (listener !== client || stopping) return;
    clearInterval(listenerHeartbeat);
    listenerHeartbeat = undefined;
    listener = undefined;
    client.end().catch(() => {
      // Reconnect continues even if the stale connection cannot close cleanly.
    });
    retryTimer = setTimeout(connectDatabase, retryMs);
    retryMs = Math.min(retryMs * 2, 5_000);
  };
  client.on("error", (error) => {
    console.error("Realtime database connection:", error.message);
    reconnect();
  });
  client.on("end", reconnect);
  client.on("notification", (notification) => {
    if (notification.channel !== "newwash_changes") return;
    try {
      const change = JSON.parse(notification.payload);
      if (
        ![
          "newwash_affiliates",
          "newwash_orders",
          "newwash_settings",
          "newwash_services",
          "newwash_affiliate_clicks",
          "newwash_withdrawals",
          "newwash_notifications",
        ].includes(change.table)
      )
        return;
      const message = JSON.stringify({ type: "invalidate", table: change.table });
      for (const socket of sockets.clients) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        const publicChange = ["newwash_services", "newwash_settings"].includes(change.table);
        const ownChange = socket.scope === "affiliate" && socket.affiliateId === change.affiliateId;
        if (socket.scope === "admin" || publicChange || ownChange) socket.send(message);
      }
    } catch {
      /* Ignore malformed notifications. */
    }
  });
  try {
    await client.connect();
    await client.query("LISTEN newwash_changes");
    clearInterval(listenerHeartbeat);
    listenerHeartbeat = setInterval(() => {
      if (listener !== client || stopping) return;
      client.query("SELECT 1").catch(reconnect);
    }, 30_000);
    retryMs = 100;
    console.log("Realtime database listener connected.");
    for (const socket of sockets.clients)
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ready" }));
  } catch (error) {
    console.error("Realtime database listener:", error instanceof Error ? error.message : error);
    reconnect();
  }
}

server.listen(port, process.env.REALTIME_HOST || "0.0.0.0", () => {
  console.log(`Realtime WebSocket listening on port ${port}.`);
  void connectDatabase();
});

function stop() {
  stopping = true;
  clearInterval(heartbeat);
  clearInterval(listenerHeartbeat);
  clearTimeout(retryTimer);
  for (const socket of sockets.clients) socket.close(1001, "Server stopping");
  listener?.end().catch(() => {
    // Shutdown is best effort because the database may already be unavailable.
  });
  server.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
