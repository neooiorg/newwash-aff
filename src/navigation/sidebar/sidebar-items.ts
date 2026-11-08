import {
  ChartBar,
  Code2,
  HandCoins,
  type LucideIcon,
  Package,
  ReceiptText,
  Settings2,
  UserRoundCog,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "updated" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 5,
    label: "NewWash Aff",
    items: [
      { id: "affiliate-overview", title: "Tổng quan", url: "/dashboard/affiliates", icon: ChartBar },
      { id: "affiliate-partners", title: "Cộng tác viên", url: "/dashboard/affiliates/partners", icon: Users },
      { id: "admin-members", title: "Thành viên", url: "/dashboard/affiliates/members", icon: UserRoundCog },
      { id: "affiliate-orders", title: "Đơn hàng", url: "/dashboard/affiliates/orders", icon: ReceiptText },
      {
        id: "affiliate-payouts",
        title: "Yêu cầu rút tiền",
        url: "/dashboard/affiliates/payouts",
        icon: HandCoins,
      },
      {
        id: "affiliate-settings",
        title: "Cài đặt",
        icon: Settings2,
        subItems: [
          { id: "affiliate-embed", title: "Nhúng đặt đơn", url: "/dashboard/affiliates/embed", icon: Code2 },
          {
            id: "affiliate-services",
            title: "Quản lý dịch vụ",
            url: "/dashboard/affiliates/services",
            icon: Package,
          },
        ],
      },
    ],
  },
];
