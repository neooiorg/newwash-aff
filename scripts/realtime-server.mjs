import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import pg from "pg";
import { WebSocket, WebSocketServer } from "ws";

const port = Number(process.env.REALTIME_PORT || 3002);
const appPort = Number(process.env.PORT || 3001);
const sessionSecret = process.env.ADMIN_SESSION_SECRET;
const pooledUrl = process.env.REALTIME_DATABASE_URL || process.env.DATABASE_URL;
const allowedOrigin = process.env.APP_ORIGIN;

if (!sessionSecret || !pooledUrl) {
  console.error("Realtime needs ADMIN_SESSION_SECRET and DATABASE_URL.");
  process.exit(1);
}

function directConnectionString(connectionString) {
  const url = new URL(connectionString);
  url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  return url.toString();
}

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
  const scope = request.url === "/services" ? "services" : request.url === "/realtime" ? "admin" : "";
  if (!scope || !validOrigin(request) || (scope === "admin" && !validSession(request.headers.cookie))) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, (client) => {
    client.scope = scope;
    if (scope === "admin") client.sessionCookie = request.headers.cookie;
    sockets.emit("connection", client);
  });
});

sockets.on("connection", (client) => {
  client.on("error", () => {});
  client.send(JSON.stringify({ type: "ready" }));
});

const heartbeat = setInterval(() => {
  for (const client of sockets.clients) {
    if (client.scope === "admin" && !validSession(client.sessionCookie)) client.close(1008, "Session expired");
    else if (client.readyState === WebSocket.OPEN) client.ping();
  }
}, 30_000);

let listener;
let retryTimer;
let retryMs = 1000;
let stopping = false;

async function connectDatabase() {
  if (stopping) return;
  const client = new pg.Client({
    connectionString: directConnectionString(pooledUrl),
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
  listener = client;
  const reconnect = () => {
    if (listener !== client || stopping) return;
    listener = undefined;
    client.end().catch(() => {});
    retryTimer = setTimeout(connectDatabase, retryMs);
    retryMs = Math.min(retryMs * 2, 30_000);
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
      if (!["newwash_affiliates", "newwash_orders", "newwash_settings", "newwash_services"].includes(change.table)) return;
      const message = JSON.stringify({ type: "invalidate", table: change.table });
      for (const socket of sockets.clients) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        if (socket.scope === "admin" || ["newwash_services", "newwash_settings"].includes(change.table))
          socket.send(message);
      }
    } catch {
      /* Ignore malformed notifications. */
    }
  });
  try {
    await client.connect();
    await client.query("LISTEN newwash_changes");
    retryMs = 1000;
    console.log("Realtime database listener connected.");
    for (const socket of sockets.clients)
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ready" }));
  } catch (error) {
    console.error("Realtime database listener:", error instanceof Error ? error.message : error);
    reconnect();
  }
}

server.listen(port, process.env.REALTIME_HOST || "127.0.0.1", () => {
  console.log(`Realtime WebSocket listening on port ${port}.`);
  void connectDatabase();
});

function stop() {
  stopping = true;
  clearInterval(heartbeat);
  clearTimeout(retryTimer);
  for (const socket of sockets.clients) socket.close(1001, "Server stopping");
  listener?.end().catch(() => {});
  server.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
