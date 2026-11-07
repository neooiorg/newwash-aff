import { z } from "zod";

import { adminUnavailable, isAdminRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";
import type { ReferralOrder } from "@/lib/affiliates/types";

export const runtime = "nodejs";

const updateOrderInput = z.object({
  id: z.string().uuid(),
  orderAmount: z.number().int().positive().max(1_000_000_000).nullable(),
  status: z.enum(["Mới", "Đang xử lý", "Hoàn tất giao", "Đã hủy"]),
});

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
        o.completed_at,
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

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  const parsed = updateOrderInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Thông tin cập nhật chưa hợp lệ." }, { status: 400 });
  if (parsed.data.status === "Hoàn tất giao" && !parsed.data.orderAmount) {
    return Response.json({ error: "Vui lòng nhập số tiền thực tế trước khi hoàn tất giao." }, { status: 400 });
  }

  try {
    const result = await getPool().query<OrderRow>(
      `WITH updated AS (
         UPDATE newwash_orders
         SET order_amount = $2,
             status = $3,
             completed_at = CASE
               WHEN $3 = 'Hoàn tất giao' THEN COALESCE(completed_at, now())
               ELSE NULL
             END
         WHERE id = $1
         RETURNING *
       )
       SELECT u.id, u.customer, u.phone, u.service, u.address, u.status, u.created_at,
         u.completed_at,
         u.external_order_id, u.source, u.order_amount::double precision AS order_amount, u.booking_details,
         COALESCE(a.code, '') AS partner_code
       FROM updated u LEFT JOIN newwash_affiliates a ON a.id = u.affiliate_id`,
      [parsed.data.id, parsed.data.orderAmount, parsed.data.status],
    );
    const order = result.rows[0];
    if (!order) return Response.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
    return Response.json({ order: toOrder(order) });
  } catch {
    return Response.json({ error: "Không cập nhật được đơn hàng." }, { status: 503 });
  }
}
