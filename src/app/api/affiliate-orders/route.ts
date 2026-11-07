import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";
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
  completed_at: Date | null;
  external_order_id: string | null;
  source: ReferralOrder["source"];
  order_amount: number | null;
  affiliate_commission_amount: number | null;
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
    completedAt: row.completed_at?.toISOString() ?? null,
    externalOrderId: row.external_order_id,
    source: row.source,
    orderAmount: row.order_amount,
    affiliateCommissionAmount: row.affiliate_commission_amount,
    bookingDetails: row.booking_details ?? {},
  };
}

export async function GET() {
  const affiliateId = await getApprovedAffiliateSessionId();
  if (!affiliateId) return Response.json({ error: "Cần đăng nhập cộng tác viên." }, { status: 401 });

  try {
    const result = await getPool().query<OrderRow>(
      `SELECT o.id, o.customer, o.phone, o.service, o.address, o.status, o.created_at, o.completed_at,
        o.external_order_id, o.source, o.order_amount::double precision AS order_amount,
        o.affiliate_commission_amount::double precision AS affiliate_commission_amount,
        o.booking_details, coalesce(a.code, '') AS partner_code
       FROM newwash_orders o
       JOIN newwash_affiliates a ON a.id = o.affiliate_id
       WHERE o.affiliate_id = $1
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 500`,
      [affiliateId],
    );
    return Response.json({ orders: result.rows.map(toOrder) });
  } catch {
    return Response.json({ error: "Không tải được đơn hàng affiliate." }, { status: 503 });
  }
}
