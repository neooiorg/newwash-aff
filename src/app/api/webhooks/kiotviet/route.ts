import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { getPool } from "@/lib/affiliates/db";
import { getKiotVietInvoice, hasKiotVietConfig } from "@/lib/affiliates/kiotviet";

export const runtime = "nodejs";

const webhookPayload = z.object({
  Notifications: z
    .array(
      z.object({
        Action: z.string(),
        Data: z.array(
          z.object({ Code: z.string(), Status: z.number(), StatusValue: z.string().optional() }).passthrough(),
        ),
      }),
    )
    .max(100),
});

function validSignature(body: string, received: string, secret: string) {
  const signature = received.replace(/^sha256=/i, "").trim();
  const supplied = /^[0-9a-f]{64}$/i.test(signature) ? Buffer.from(signature, "hex") : Buffer.from(signature, "base64");
  if (supplied.length !== 32) return false;
  const key = Buffer.from(secret, "base64");
  if (key.length < 8) return false;
  return [key, Buffer.from(secret, "utf8")].some((candidate) => {
    const expected = createHmac("sha256", candidate).update(body).digest();
    return timingSafeEqual(supplied, expected);
  });
}

export async function POST(request: Request) {
  const secret = process.env.KIOTVIET_WEBHOOK_SECRET;
  if (!secret || !hasKiotVietConfig()) return Response.json({ error: "Webhook chưa được cấu hình." }, { status: 503 });
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-hub-signature") ?? "", secret)) {
    return Response.json({ error: "Chữ ký không hợp lệ." }, { status: 401 });
  }
  const parsed = webhookPayload.safeParse(
    await Promise.resolve()
      .then(() => JSON.parse(body))
      .catch(() => null),
  );
  if (!parsed.success) return Response.json({ error: "Dữ liệu webhook không hợp lệ." }, { status: 400 });

  try {
    let updated = 0;
    for (const notification of parsed.data.Notifications) {
      for (const item of notification.Data) {
        if (notification.Action === "order.update") {
          const result = await getPool().query(
            `UPDATE newwash_orders SET
              kiotviet_status = $2
             WHERE kiotviet_order_code = $1`,
            [item.Code, `Đặt hàng: ${item.StatusValue || item.Status}`],
          );
          updated += result.rowCount ?? 0;
        }
        if (notification.Action === "invoice.update") {
          const invoice = await getKiotVietInvoice(item.Code, 1800);
          if (!invoice.orderCode) continue;
          const result = await getPool().query(
            `UPDATE newwash_orders SET
              kiotviet_invoice_code = $2,
              kiotviet_status = $3
             WHERE kiotviet_order_code = $1`,
            [invoice.orderCode, invoice.code, `Hóa đơn: ${invoice.statusValue || invoice.status}`],
          );
          updated += result.rowCount ?? 0;
        }
      }
    }
    return Response.json({ updated });
  } catch {
    return Response.json({ error: "Chưa xử lý được webhook KiotViet." }, { status: 503 });
  }
}
