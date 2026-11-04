import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

const orderId = z.string().trim().min(1).max(100);
const createdEvent = z.object({
  event: z.literal("order.created"),
  orderId,
  affiliateCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,20}$/),
  customer: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().min(7).max(20),
  service: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(240),
  amount: z.number().int().nonnegative().max(1_000_000_000).optional(),
});
const completedEvent = z.object({
  event: z.literal("order.completed"),
  orderId,
  amount: z.number().int().nonnegative().max(1_000_000_000).optional(),
});
const eventInput = z.discriminatedUnion("event", [createdEvent, completedEvent]);

function authorized(request: Request) {
  const secret = process.env.AFFILIATE_STOREFRONT_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !bearer) return false;
  const expected = Buffer.from(secret);
  const supplied = Buffer.from(bearer);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function POST(request: Request) {
  if (!process.env.AFFILIATE_STOREFRONT_SECRET) {
    return Response.json({ error: "Chưa cấu hình khóa kết nối website." }, { status: 503 });
  }
  if (!authorized(request)) return Response.json({ error: "Khóa kết nối website không hợp lệ." }, { status: 401 });
  const parsed = eventInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Sự kiện đơn hàng không hợp lệ." }, { status: 400 });

  try {
    if (parsed.data.event === "order.created") {
      const event = parsed.data;
      const result = await getPool().query<{ id: string }>(
        `INSERT INTO newwash_orders
           (external_order_id, source, customer, phone, service, address, affiliate_id, order_amount)
         SELECT $1, 'website', $3, $4, $5, $6, id, $7
         FROM newwash_affiliates WHERE code = $2 AND status = 'approved'
         ON CONFLICT (external_order_id) WHERE external_order_id IS NOT NULL DO NOTHING
         RETURNING id`,
        [
          event.orderId,
          event.affiliateCode,
          event.customer || "Khách hàng",
          event.phone,
          event.service,
          event.address,
          event.amount ?? null,
        ],
      );
      if (result.rows[0]) return Response.json({ recorded: true, duplicate: false }, { status: 201 });

      const existing = await getPool().query<{ code: string }>(
        `SELECT a.code FROM newwash_orders o JOIN newwash_affiliates a ON a.id = o.affiliate_id
         WHERE o.external_order_id = $1 AND o.source = 'website'`,
        [event.orderId],
      );
      if (existing.rows[0]?.code === event.affiliateCode) {
        return Response.json({ recorded: true, duplicate: true });
      }
      return Response.json(
        { error: "Mã aff không hợp lệ hoặc mã đơn đã gắn với cộng tác viên khác." },
        { status: 409 },
      );
    }

    const result = await getPool().query(
      `UPDATE newwash_orders SET status = 'Hoàn tất', completed_at = COALESCE(completed_at, now()),
         order_amount = COALESCE($2, order_amount)
       WHERE external_order_id = $1 AND source = 'website'`,
      [parsed.data.orderId, parsed.data.amount ?? null],
    );
    if (!result.rowCount) return Response.json({ error: "Chưa ghi nhận sự kiện tạo đơn cho mã này." }, { status: 409 });
    return Response.json({ recorded: true });
  } catch {
    return Response.json({ error: "Không ghi nhận được sự kiện từ website." }, { status: 503 });
  }
}
