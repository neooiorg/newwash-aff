"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "newwash-device-notifications";
const CHANGE_EVENT = "newwash-device-notifications-change";

type DeviceNotificationResult = {
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
};

function savePreference(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent<boolean>(CHANGE_EVENT, { detail: enabled }));
}

export function useDeviceNotifications() {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    const syncPreference = () => {
      const stored = localStorage.getItem(STORAGE_KEY) === "on";
      const permissionGranted = !("Notification" in window) || Notification.permission === "granted";
      const next = stored && permissionGranted;
      setEnabledState(next);
      if (stored && !permissionGranted) localStorage.setItem(STORAGE_KEY, "off");
    };
    const syncCustomEvent = (event: Event) => {
      setEnabledState((event as CustomEvent<boolean>).detail);
    };

    syncPreference();
    window.addEventListener("storage", syncPreference);
    window.addEventListener(CHANGE_EVENT, syncCustomEvent);
    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(CHANGE_EVENT, syncCustomEvent);
    };
  }, []);

  const setEnabled = useCallback(async (next: boolean): Promise<DeviceNotificationResult> => {
    if (!next) {
      savePreference(false);
      return {
        enabled: false,
        permission: "Notification" in window ? Notification.permission : "unsupported",
      };
    }

    if (!("Notification" in window)) {
      savePreference(true);
      return { enabled: true, permission: "unsupported" };
    }

    const permission =
      Notification.permission === "granted" ? Notification.permission : await Notification.requestPermission();
    const allowed = permission === "granted";
    savePreference(allowed);
    return { enabled: allowed, permission };
  }, []);

  return { enabled, setEnabled };
}
