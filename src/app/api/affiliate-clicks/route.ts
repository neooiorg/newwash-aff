import { z } from "zod";

import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

const inputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,20}$/),
  eventId: z.string().uuid(),
  landingUrl: z.string().trim().max(1000).default(""),
});

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4_000) {
    return Response.json({ error: "Dữ liệu lượt nhấp quá lớn." }, { status: 413, headers: corsHeaders });
  }
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Lượt nhấp không hợp lệ." }, { status: 400, headers: corsHeaders });

  try {
    const result = await getPool().query(
      `INSERT INTO newwash_affiliate_clicks (event_id, affiliate_id, landing_url)
       SELECT $1, id, $3 FROM newwash_affiliates WHERE code = $2 AND status = 'approved'
       ON CONFLICT (event_id) DO NOTHING`,
      [input.data.eventId, input.data.code, input.data.landingUrl],
    );
    return new Response(null, { status: result.rowCount ? 201 : 204, headers: corsHeaders });
  } catch {
    return Response.json({ error: "Chưa ghi nhận được lượt nhấp." }, { status: 503, headers: corsHeaders });
  }
}
