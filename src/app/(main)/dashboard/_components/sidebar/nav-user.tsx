"use client";

import Link from "next/link";

import { CircleUser, EllipsisVertical, LogOut } from "lucide-react";

import { logoutAffiliate } from "@/app/(external)/affiliate/login/actions";
import { logoutAdmin } from "@/app/(main)/auth/admin/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export function NavUser({
  user,
  mode = "admin",
}: {
  readonly user: { readonly name: string; readonly email: string };
  readonly mode?: "admin" | "affiliate";
}) {
  const { isMobile } = useSidebar();
  const accountHref = mode === "affiliate" ? "/affiliate/portal" : "/dashboard/account";
  const accountLabel = mode === "affiliate" ? "Tổng quan của tôi" : "Tài khoản admin";
  const logoutAction = mode === "affiliate" ? logoutAffiliate : logoutAdmin;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">NW</AvatarFallback>
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
            <DropdownMenuItem asChild>
              <Link href={accountHref}>
                <CircleUser /> {accountLabel}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOut /> Đăng xuất
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
