import { z } from "zod";

import { adminUnavailable, isAdminRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

const settingsInput = z.object({ storefrontUrl: z.string().trim().max(500) });

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  try {
    const result = await getPool().query<{ storefront_url: string }>(
      "SELECT storefront_url FROM newwash_settings WHERE id = 1",
    );
    return Response.json({ storefrontUrl: result.rows[0]?.storefront_url ?? "" });
  } catch {
    return Response.json({ error: "Không tải được cấu hình website." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  const parsed = settingsInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Địa chỉ website không hợp lệ." }, { status: 400 });
  let storefrontUrl = "";
  if (parsed.data.storefrontUrl) {
    try {
      const url = new URL(parsed.data.storefrontUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid URL");
      url.hash = "";
      url.searchParams.delete("aff");
      url.searchParams.delete("nw_popup");
      storefrontUrl = url.toString();
    } catch {
      return Response.json(
        { error: "Nhập URL đầy đủ bắt đầu bằng https:// (hoặc http:// khi chạy thử)." },
        { status: 400 },
      );
    }
  }
  try {
    await getPool().query("UPDATE newwash_settings SET storefront_url = $1, updated_at = now() WHERE id = 1", [
      storefrontUrl,
    ]);
    return Response.json({ storefrontUrl });
  } catch {
    return Response.json({ error: "Không lưu được cấu hình website." }, { status: 503 });
  }
}
