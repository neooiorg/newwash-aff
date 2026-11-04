import { z } from "zod";

import { adminUnavailable, isAdminRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";
import { getKiotVietInvoice, getKiotVietOrder, hasKiotVietConfig } from "@/lib/affiliates/kiotviet";

export const runtime = "nodejs";

const linkInput = z.object({
  id: z.uuid(),
  orderCode: z.string().trim().min(1).max(50),
  invoiceCode: z.string().trim().max(50).default(""),
});

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  return Response.json({ configured: hasKiotVietConfig() });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  if (!hasKiotVietConfig()) {
    return Response.json(
      { error: "Chưa có Retailer, Client ID và Client Secret của KiotViet Retail." },
      { status: 503 },
    );
  }
  const input = linkInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Mã đối chiếu KiotViet không hợp lệ." }, { status: 400 });

  try {
    const local = await getPool().query<{ id: string }>("SELECT id FROM newwash_orders WHERE id = $1", [input.data.id]);
    if (!local.rows[0]) return Response.json({ error: "Không tìm thấy đơn đặt từ popup." }, { status: 404 });

    const order = await getKiotVietOrder(input.data.orderCode);
    const invoice = input.data.invoiceCode ? await getKiotVietInvoice(input.data.invoiceCode) : null;
    if (invoice && invoice.orderCode?.toUpperCase() !== order.code.toUpperCase()) {
      return Response.json({ error: "Hóa đơn KiotViet không thuộc đơn đặt hàng đã chọn." }, { status: 400 });
    }

    const kiotvietStatus = invoice
      ? `Hóa đơn: ${invoice.statusValue || invoice.status}`
      : `Đặt hàng: ${order.statusValue || order.status}`;
    const result = await getPool().query<{
      status: string;
      kiotviet_order_code: string;
      kiotviet_invoice_code: string | null;
      kiotviet_status: string;
      completed_at: Date | null;
    }>(
      `UPDATE newwash_orders SET
        kiotviet_order_code = $2,
        kiotviet_invoice_code = $3,
        kiotviet_status = $4
       WHERE id = $1
       RETURNING status, kiotviet_order_code, kiotviet_invoice_code, kiotviet_status, completed_at`,
      [input.data.id, order.code, invoice?.code ?? null, kiotvietStatus],
    );
    const row = result.rows[0];
    return Response.json({
      order: {
        databaseId: input.data.id,
        status: row.status,
        kiotvietOrderCode: row.kiotviet_order_code,
        kiotvietInvoiceCode: row.kiotviet_invoice_code,
        kiotvietStatus: row.kiotviet_status,
        completedAt: row.completed_at?.toISOString() ?? null,
      },
    });
  } catch (cause) {
    const error = cause as { code?: string; message?: string };
    if (error.code === "23505")
      return Response.json({ error: "Mã đơn KiotViet đã liên kết với đơn khác." }, { status: 409 });
    return Response.json({ error: error.message || "Không đồng bộ được KiotViet." }, { status: 502 });
  }
}
