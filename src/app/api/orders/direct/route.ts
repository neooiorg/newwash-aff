import { z } from "zod";

import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeValue = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const directOrderInput = z.object({
  requestId: z.string().uuid(),
  affiliateCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,20}$/)
    .optional()
    .or(z.literal("")),
  customer: z.string().trim().max(80).optional().default(""),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/),
  service: z.string().trim().min(1).max(100),
  serviceCode: z.string().trim().min(1).max(40),
  category: z.enum(["laundry", "other"]),
  quantityKg: z.number().int().min(0).max(500),
  pickupAddress: z.string().trim().min(1).max(240),
  deliveryAddress: z.string().trim().min(1).max(240),
  pickupDate: dateValue,
  pickupTime: timeValue,
  deliveryDate: dateValue,
  deliveryTime: timeValue,
  notes: z.string().trim().max(1000),
  coupon: z.string().trim().max(50),
  estimatedTotal: z.number().int().nonnegative().max(1_000_000_000).nullable(),
  hostOrigin: z.string().trim().max(300).optional().default(""),
});

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
    return Response.json({ error: "Dữ liệu đặt đơn quá lớn." }, { status: 413 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Dữ liệu đặt đơn không hợp lệ." }, { status: 415 });
  }

  const parsed = directOrderInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Thông tin đặt đơn chưa hợp lệ." }, { status: 400 });

  const input = parsed.data;
  const externalOrderId = `FORM-${input.requestId}`;
  try {
    let affiliateId: string | null = null;
    if (input.affiliateCode) {
      const affiliate = await getPool().query<{ id: string }>(
        "SELECT id FROM newwash_affiliates WHERE code = $1 AND status = 'approved'",
        [input.affiliateCode],
      );
      affiliateId = affiliate.rows[0]?.id ?? null;
      if (!affiliateId)
        return Response.json({ error: "Mã affiliate không hợp lệ hoặc chưa được duyệt." }, { status: 409 });
    }

    const details = {
      serviceCode: input.serviceCode,
      category: input.category,
      quantityKg: input.quantityKg,
      pickupDate: input.pickupDate,
      pickupTime: input.pickupTime,
      deliveryDate: input.deliveryDate,
      deliveryTime: input.deliveryTime,
      deliveryAddress: input.deliveryAddress,
      notes: input.notes,
      coupon: input.coupon,
      hostOrigin: input.hostOrigin,
      estimatedTotal: input.estimatedTotal,
    };
    const inserted = await getPool().query<{ id: string }>(
      `INSERT INTO newwash_orders
         (external_order_id, source, customer, phone, service, address, affiliate_id, order_amount, booking_details)
       VALUES ($1, 'website', $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (external_order_id) WHERE external_order_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        externalOrderId,
        input.customer || "Khách hàng",
        input.phone,
        input.service,
        input.pickupAddress,
        affiliateId,
        null,
        JSON.stringify(details),
      ],
    );
    const existing = inserted.rows[0]
      ? inserted.rows[0]
      : (
          await getPool().query<{ id: string }>(
            "SELECT id FROM newwash_orders WHERE external_order_id = $1 AND source = 'website'",
            [externalOrderId],
          )
        ).rows[0];
    if (!existing) return Response.json({ error: "Không tạo được đơn đặt." }, { status: 503 });

    return Response.json(
      { orderId: `NW-${existing.id.slice(0, 8).toUpperCase()}`, duplicate: !inserted.rows[0] },
      { status: inserted.rows[0] ? 201 : 200 },
    );
  } catch {
    return Response.json({ error: "Hệ thống chưa nhận được đơn. Vui lòng thử lại." }, { status: 503 });
  }
}
