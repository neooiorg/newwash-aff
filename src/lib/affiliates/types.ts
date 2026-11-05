export interface Partner {
  id: string;
  name: string;
  contact: string;
  code: string | null;
  channel: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export interface ReferralOrder {
  id: string;
  databaseId: string;
  customer: string;
  phone: string;
  service: string;
  address: string;
  partnerCode: string;
  createdAt: string;
  status: "Mới" | "Đang xử lý" | "Hoàn tất";
  kiotvietOrderCode: string | null;
  kiotvietInvoiceCode: string | null;
  kiotvietStatus: string | null;
  completedAt: string | null;
  externalOrderId: string | null;
  source: "legacy" | "website";
  orderAmount: number | null;
  bookingDetails: {
    serviceCode?: string;
    category?: "laundry" | "other";
    quantityKg?: number;
    washWhitesSeparately?: boolean;
    pickupDate?: string;
    pickupTime?: string;
    deliveryDate?: string;
    deliveryTime?: string;
    deliveryAddress?: string;
    notes?: string;
    coupon?: string;
    hostOrigin?: string;
  };
}

export interface AffiliateOverviewPeriod {
  revenue: number;
  orders: number;
  completed: number;
  completionRate: number;
}

export interface AffiliateOverview {
  current: AffiliateOverviewPeriod;
  previous: AffiliateOverviewPeriod;
  months: Array<{
    key: string;
    month: string;
    orders: number;
    completed: number;
    revenue: number;
  }>;
  affiliates: Array<{ name: string; code: string; orders: number }>;
  approvedAffiliates: number;
  pendingAffiliates: number;
  updatedAt: string;
}

export interface AffiliateAnalytics {
  scope: "admin" | "affiliate";
  range: { from: string; to: string };
  selectedAffiliate: {
    id: string;
    name: string;
    code: string;
    commissionRate: number;
  } | null;
  affiliates: Array<{ id: string; name: string; code: string }>;
  metrics: {
    clicks: number;
    orders: number;
    completed: number;
    revenue: number;
    commission: number;
    buyers: number;
    conversionRate: number;
  };
  series: Array<{
    date: string;
    clicks: number;
    orders: number;
    completed: number;
    revenue: number;
  }>;
  services: Array<{
    service: string;
    orders: number;
    completed: number;
    revenue: number;
    commission: number;
  }>;
  updatedAt: string;
}
