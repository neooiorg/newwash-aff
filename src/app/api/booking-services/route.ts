import { getPool } from "@/lib/affiliates/db";
import { listBookingServices } from "@/lib/affiliates/services";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [services, settings] = await Promise.all([
      listBookingServices(true),
      getPool().query<{ white_wash_fee: number }>("SELECT white_wash_fee FROM newwash_settings WHERE id = 1"),
    ]);
    return Response.json(
      { services, whiteWashFee: settings.rows[0]?.white_wash_fee ?? 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Không tải được dịch vụ đặt đơn." }, { status: 503 });
  }
}
