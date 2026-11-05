import { z } from "zod";

import { adminUnavailable, isAdminRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";
import { listBookingServices } from "@/lib/affiliates/services";

import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const serviceInput = z
  .object({
    category: z.enum(["laundry", "other"]),
    label: z.string().trim().min(2).max(100),
    english: z.string().trim().max(100),
    duration: z.string().trim().min(1).max(40),
    durationHours: z.number().int().min(1).max(720),
    pricePerKg: z.number().int().min(0).max(100_000_000).nullable(),
    minKg: z.number().int().min(0).max(1000),
    note: z.string().trim().max(300),
    iconKey: z.string().trim().min(1).max(50),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(100_000),
  })
  .refine((item) => item.pricePerKg === null || item.minKg >= 1, {
    message: "Dịch vụ tính theo kg cần tối thiểu 1 kg.",
    path: ["minKg"],
  });

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  try {
    const [services, settings] = await Promise.all([
      listBookingServices(),
      getPool().query<{ white_wash_fee: number }>("SELECT white_wash_fee FROM newwash_settings WHERE id = 1"),
    ]);
    return Response.json({ services, whiteWashFee: settings.rows[0]?.white_wash_fee ?? 0 });
  } catch {
    return Response.json({ error: "Không tải được cấu hình dịch vụ." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  const parsed = serviceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Thông tin dịch vụ không hợp lệ." }, { status: 400 });
  const item = parsed.data;
  try {
    const code = `svc-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    await getPool().query(
      `INSERT INTO newwash_services
       (code, category, label, english, duration_label, duration_hours, price_per_kg, min_kg, note, icon_key,
        active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        code,
        item.category,
        item.label,
        item.english,
        item.duration,
        item.durationHours,
        item.pricePerKg,
        item.minKg,
        item.note,
        item.iconKey,
        item.active,
        item.sortOrder,
      ],
    );
    return Response.json({ code }, { status: 201 });
  } catch {
    return Response.json({ error: "Không tạo được dịch vụ." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  const body: unknown = await request.json().catch(() => null);
  const parsed = serviceInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Thông tin dịch vụ không hợp lệ." }, { status: 400 });
  const item = parsed.data;
  const id = z
    .string()
    .uuid()
    .safeParse(body && typeof body === "object" && "id" in body ? body.id : undefined);
  if (!id.success) return Response.json({ error: "Không tìm thấy dịch vụ." }, { status: 400 });
  try {
    const result = await getPool().query(
      `UPDATE newwash_services SET category = $2, label = $3, english = $4, duration_label = $5,
       duration_hours = $6, price_per_kg = $7, min_kg = $8, note = $9, icon_key = $10, active = $11,
       sort_order = $12, updated_at = now() WHERE id = $1`,
      [
        id.data,
        item.category,
        item.label,
        item.english,
        item.duration,
        item.durationHours,
        item.pricePerKg,
        item.minKg,
        item.note,
        item.iconKey,
        item.active,
        item.sortOrder,
      ],
    );
    if (!result.rowCount) return Response.json({ error: "Không tìm thấy dịch vụ." }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không lưu được dịch vụ." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  const parsed = z
    .object({ whiteWashFee: z.number().int().min(0).max(100_000_000) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Phụ phí không hợp lệ." }, { status: 400 });
  try {
    await getPool().query("UPDATE newwash_settings SET white_wash_fee = $1, updated_at = now() WHERE id = 1", [
      parsed.data.whiteWashFee,
    ]);
    return Response.json({ whiteWashFee: parsed.data.whiteWashFee });
  } catch {
    return Response.json({ error: "Không lưu được phụ phí." }, { status: 503 });
  }
}
