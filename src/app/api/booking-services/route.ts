import { listBookingServices } from "@/lib/affiliates/services";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ services: await listBookingServices(true) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Không tải được dịch vụ đặt đơn." }, { status: 503 });
  }
}
