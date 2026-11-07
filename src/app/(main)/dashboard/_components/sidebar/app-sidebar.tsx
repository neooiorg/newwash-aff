"use client";

import Image from "next/image";
import Link from "next/link";

import { ChartBar, WalletCards } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

const affiliateSidebarItems = [
  {
    id: 1,
    label: "NewWash Aff",
    items: [
      { id: "affiliate-portal", title: "Tổng quan của tôi", url: "/affiliate/portal", icon: ChartBar },
      { id: "affiliate-withdrawals", title: "Ví", url: "/affiliate/portal/withdrawals", icon: WalletCards },
    ],
  },
];

export function AppSidebar({
  mode = "admin",
  user = rootUser,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  mode?: "admin" | "affiliate";
  user?: { name: string; email: string };
}) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;
  const homeHref = mode === "affiliate" ? "/affiliate/portal" : "/dashboard/affiliates";

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link prefetch={false} href={homeHref} aria-label={`${APP_CONFIG.name} · Tổng quan`}>
                <span className="rounded-md bg-white px-1 group-data-[collapsible=icon]:hidden">
                  <Image
                    src="/newwash-logo.svg"
                    alt="Newwash"
                    width={160}
                    height={60}
                    className="h-auto w-36"
                    unoptimized
                    priority
                  />
                </span>
                <Image
                  src="/newwash-mark.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="hidden size-8 group-data-[collapsible=icon]:block"
                  unoptimized
                />
                <span className="sr-only">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mode === "affiliate" ? affiliateSidebarItems : sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} mode={mode} />
      </SidebarFooter>
    </Sidebar>
  );
}
