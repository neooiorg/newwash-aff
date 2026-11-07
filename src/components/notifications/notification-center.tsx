"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Bell, BellRing, CheckCheck, HandCoins, MousePointerClick, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import { useDeviceNotifications } from "@/hooks/use-device-notifications";
import { playDeviceNotificationChime } from "@/lib/device-notification-audio";

type NotificationScope = "admin" | "affiliate";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

function notificationIcon(type: string) {
  if (type.startsWith("withdrawal") || type === "commission_earned") return HandCoins;
  if (type === "affiliate_click") return MousePointerClick;
  return ShoppingBag;
}

function notificationTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function showDashboardToast(item: NotificationItem, openNotification: () => void) {
  const options = {
    id: item.id,
    description: item.message,
    duration: 6000,
    action: item.href
      ? {
          label: "Xem",
          onClick: openNotification,
        }
      : undefined,
  };

  if (item.type === "commission_earned" || item.type === "order_completed" || item.type === "withdrawal_status") {
    toast.success(item.title, options);
    return;
  }

  if (item.type === "affiliate_click" || item.type === "order_created") {
    toast.info(item.title, options);
    return;
  }

  toast(item.title, options);
}

export function NotificationCenter({ scope }: { scope: NotificationScope }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { enabled: deviceNotificationsEnabled } = useDeviceNotifications();
  const initialized = useRef(false);
  const knownIds = useRef(new Set<string>());

  const showDeviceNotification = useCallback(
    (item: NotificationItem) => {
      if (
        !deviceNotificationsEnabled ||
        !("Notification" in window) ||
        Notification.permission !== "granted" ||
        document.visibilityState === "visible"
      ) {
        return;
      }

      const notification = new Notification(item.title, {
        body: item.message,
        icon: "/newwash-mark.svg",
        tag: item.id,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (item.href) router.push(item.href);
      };
    },
    [deviceNotificationsEnabled, router],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?scope=${scope}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications: NotificationItem[] };
      const next = data.notifications;
      if (initialized.current) {
        const incoming = next.filter((item) => !knownIds.current.has(item.id));
        if (incoming.length) {
          if (deviceNotificationsEnabled) void playDeviceNotificationChime();
          for (const item of incoming.slice(0, 3).reverse()) {
            showDashboardToast(item, () => router.push(item.href));
            showDeviceNotification(item);
          }
        }
      } else {
        initialized.current = true;
      }
      knownIds.current = new Set(next.map((item) => item.id));
      setNotifications(next);
    } catch {
      // Realtime reconnect and visibility refresh will retry automatically.
    } finally {
      setLoading(false);
    }
  }, [deviceNotificationsEnabled, router, scope, showDeviceNotification]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_notifications"], refresh, scope);

  async function markRead(id: string) {
    setNotifications((current) =>
      current.map((item) => (item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item)),
    );
    await fetch(`/api/notifications?scope=${scope}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllRead() {
    setNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })),
    );
    await fetch(`/api/notifications?scope=${scope}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  const unread = notifications.filter((item) => !item.readAt).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Thông báo, ${unread} chưa đọc`}>
          {unread ? <BellRing /> : <Bell />}
          {unread ? (
            <Badge className="absolute -top-1 -right-1 min-w-5 justify-center px-1 text-[10px] tabular-nums">
              {unread > 99 ? "99+" : unread}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] gap-0 p-0">
        <PopoverHeader className="flex-row items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <PopoverTitle>Thông báo</PopoverTitle>
            <PopoverDescription>
              {unread ? `${unread} thông báo chưa đọc` : "Bạn đã xem tất cả thông báo"}
            </PopoverDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {unread ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void markAllRead()}
                aria-label="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck />
              </Button>
            ) : null}
          </div>
        </PopoverHeader>
        <Separator />
        <ScrollArea className="h-96 max-h-[60vh]">
          {notifications.length ? (
            <ItemGroup className="gap-1 p-2">
              {notifications.map((item) => {
                const Icon = notificationIcon(item.type);
                return (
                  <Item key={item.id} asChild variant={item.readAt ? "default" : "muted"} size="sm">
                    <Link href={item.href || "#"} onClick={() => void markRead(item.id)}>
                      <ItemMedia variant="icon">
                        <Icon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          {item.title}
                          {!item.readAt ? <Badge variant="secondary">Mới</Badge> : null}
                        </ItemTitle>
                        <ItemDescription>{item.message}</ItemDescription>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {notificationTime(item.createdAt)}
                        </span>
                      </ItemContent>
                    </Link>
                  </Item>
                );
              })}
            </ItemGroup>
          ) : (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bell />
                </EmptyMedia>
                <EmptyTitle>{loading ? "Đang tải thông báo" : "Chưa có thông báo"}</EmptyTitle>
                <EmptyDescription>Đơn hàng và yêu cầu rút tiền mới sẽ xuất hiện tại đây.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
