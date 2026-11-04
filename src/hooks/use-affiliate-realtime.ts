"use client";

import { useEffect, useRef } from "react";

type Table = "newwash_affiliates" | "newwash_orders" | "newwash_settings" | "newwash_services";

export function useAffiliateRealtime(tables: readonly Table[], onChange: () => void) {
  const callback = useRef(onChange);
  callback.current = onChange;
  const tableKey = tables.join(",");

  useEffect(() => {
    const watched = new Set(tableKey.split(","));
    const configuredUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
    const url =
      configuredUrl || `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:3002/realtime`;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    let delay = 1000;

    function refresh() {
      clearTimeout(debounce);
      debounce = setTimeout(() => callback.current(), 100);
    }

    function connect() {
      if (!active) return;
      socket = new WebSocket(url);
      socket.addEventListener("open", () => {
        delay = 1000;
        refresh();
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
        if (!active) return;
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30_000);
      });
      socket.addEventListener("error", () => socket?.close());
    }

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    connect();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(retry);
      clearTimeout(debounce);
      socket?.close();
    };
  }, [tableKey]);
}
