"use client";

import { useEffect, useRef, useState } from "react";

type Table =
  | "newwash_affiliates"
  | "newwash_orders"
  | "newwash_settings"
  | "newwash_services"
  | "newwash_affiliate_clicks"
  | "newwash_withdrawals"
  | "newwash_notifications";

export function useAffiliateRealtime(
  tables: readonly Table[],
  onChange: () => void,
  scope: "admin" | "affiliate" = "admin",
) {
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const callback = useRef(onChange);
  callback.current = onChange;
  const tableKey = tables.join(",");

  useEffect(() => {
    const watched = new Set(tableKey.split(","));
    const configuredUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
    const defaultPath = scope === "affiliate" ? "/affiliate-realtime" : "/realtime";
    const url = configuredUrl
      ? new URL(defaultPath, configuredUrl).toString()
      : `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:3002${defaultPath}`;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    let connecting = false;
    let delay = 50;

    function refresh() {
      callback.current();
    }

    function scheduleReconnect() {
      if (!active || retry) return;
      setStatus("offline");
      retry = setTimeout(() => {
        retry = undefined;
        void connect();
      }, delay);
      delay = Math.min(delay * 2, 1_000);
    }

    async function connect(immediate = false) {
      if (!active || connecting || socket?.readyState === WebSocket.OPEN) return;
      if (immediate) {
        clearTimeout(retry);
        retry = undefined;
        delay = 50;
      }
      connecting = true;
      setStatus("connecting");
      try {
        const response = await fetch(`/api/realtime-ticket?scope=${scope}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Realtime authorization failed");
        const { ticket } = (await response.json()) as { ticket?: string };
        if (!ticket || !active) throw new Error("Realtime ticket is unavailable");
        const socketUrl = new URL(url);
        socketUrl.searchParams.set("ticket", ticket);
        socket = new WebSocket(socketUrl);
      } catch {
        connecting = false;
        scheduleReconnect();
        return;
      }
      socket.addEventListener("open", () => {
        connecting = false;
        delay = 50;
        setStatus("live");
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready" || (message.type === "invalidate" && watched.has(message.table))) refresh();
        } catch {
          /* Ignore malformed messages. */
        }
      });
      socket.addEventListener("close", () => {
        connecting = false;
        socket = undefined;
        scheduleReconnect();
      });
      socket.addEventListener("error", () => socket?.close());
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (socket?.readyState === WebSocket.OPEN) refresh();
      else void connect(true);
    }

    function onOnline() {
      void connect(true);
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    void connect();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      clearTimeout(retry);
      socket?.close();
    };
  }, [scope, tableKey]);

  return status;
}
