"use client";

import Link from "next/link";

import { BellRing, CircleUser, EllipsisVertical, Link2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { logoutAdmin } from "@/app/(main)/auth/admin/actions";
import { logoutAffiliate } from "@/app/(main)/auth/admin/affiliate-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { useDeviceNotifications } from "@/hooks/use-device-notifications";
import { playDeviceNotificationChime, unlockDeviceNotificationAudio } from "@/lib/device-notification-audio";

export function NavUser({
  user,
  mode = "admin",
}: {
  readonly user: { readonly name: string; readonly email: string; readonly image?: string | null };
  readonly mode?: "admin" | "affiliate";
}) {
  const { isMobile } = useSidebar();
  const accountHref = mode === "affiliate" ? "/affiliate/portal" : "/dashboard/account";
  const accountLabel = mode === "affiliate" ? "Tổng quan của tôi" : "Tài khoản admin";
  const logoutAction = mode === "affiliate" ? logoutAffiliate : logoutAdmin;
  const { enabled: deviceNotificationsEnabled, setEnabled: setDeviceNotificationsEnabled } = useDeviceNotifications();
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  async function updateDeviceNotifications(checked: boolean) {
    if (checked) await unlockDeviceNotificationAudio();
    const result = await setDeviceNotificationsEnabled(checked);
    if (checked && !result.enabled) {
      toast.error("Chưa thể bật thông báo", {
        description: "Hãy cho phép thông báo trong cài đặt trình duyệt rồi thử lại.",
      });
      return;
    }
    if (result.enabled) void playDeviceNotificationChime();
    toast.success(result.enabled ? "Đã bật thông báo trên thiết bị này" : "Đã tắt thông báo trên thiết bị này");
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                {user.image ? <AvatarImage src={user.image} alt={user.name} referrerPolicy="no-referrer" /> : null}
                <AvatarFallback className="rounded-lg">{initials || "NW"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end">
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={accountHref}>
                  <CircleUser /> {accountLabel}
                </Link>
              </DropdownMenuItem>
              {mode === "affiliate" ? (
                <DropdownMenuItem asChild>
                  <Link href="/affiliate/portal/link">
                    <Link2 /> Link & QR của tôi
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                <BellRing />
                <span className="flex-1">Thông báo trên thiết bị này</span>
                <Switch
                  checked={deviceNotificationsEnabled}
                  onCheckedChange={(checked) => void updateDeviceNotifications(checked)}
                  aria-label="Thông báo trên thiết bị này"
                />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full">
                    <LogOut /> Đăng xuất
                  </button>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
