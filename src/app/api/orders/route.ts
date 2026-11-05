import { adminUnavailable, isAdminRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";
import type { ReferralOrder } from "@/lib/affiliates/types";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
  customer: string;
  phone: string;
  service: string;
  address: string;
  partner_code: string;
  created_at: Date;
  status: ReferralOrder["status"];
  kiotviet_order_code: string | null;
  kiotviet_invoice_code: string | null;
  kiotviet_status: string | null;
  completed_at: Date | null;
  external_order_id: string | null;
  source: "legacy" | "website";
  order_amount: number | null;
  booking_details: ReferralOrder["bookingDetails"];
};

function toOrder(row: OrderRow): ReferralOrder {
  return {
    id: `NW-${row.id.slice(0, 8).toUpperCase()}`,
    databaseId: row.id,
    customer: row.customer,
    phone: row.phone,
    service: row.service,
    address: row.address,
    partnerCode: row.partner_code,
    createdAt: row.created_at.toISOString().slice(0, 10),
    status: row.status,
    kiotvietOrderCode: row.kiotviet_order_code,
    kiotvietInvoiceCode: row.kiotviet_invoice_code,
    kiotvietStatus: row.kiotviet_status,
    completedAt: row.completed_at?.toISOString() ?? null,
    externalOrderId: row.external_order_id,
    source: row.source,
    orderAmount: row.order_amount,
    bookingDetails: row.booking_details ?? {},
  };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  try {
    const result = await getPool().query<OrderRow>(
      `SELECT o.id, o.customer, o.phone, o.service, o.address, o.status, o.created_at,
        o.kiotviet_order_code, o.kiotviet_invoice_code, o.kiotviet_status, o.completed_at,
        o.external_order_id, o.source, o.order_amount::double precision AS order_amount, o.booking_details,
        COALESCE(a.code, '') AS partner_code
       FROM newwash_orders o LEFT JOIN newwash_affiliates a ON a.id = o.affiliate_id
       ORDER BY o.created_at DESC, o.id DESC LIMIT 500`,
    );
    return Response.json({ orders: result.rows.map(toOrder) });
  } catch {
    return Response.json({ error: "Không đọc được đơn từ database." }, { status: 503 });
  }
}
