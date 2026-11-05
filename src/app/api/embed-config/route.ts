import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await getPool().query<{ embed_offset_x: number; embed_offset_y: number }>(
      "SELECT embed_offset_x, embed_offset_y FROM newwash_settings WHERE id = 1",
    );
    return Response.json(
      {
        buttonOffsetX: result.rows[0]?.embed_offset_x ?? 24,
        buttonOffsetY: result.rows[0]?.embed_offset_y ?? 24,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { buttonOffsetX: 24, buttonOffsetY: 24 },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } },
    );
  }
}
