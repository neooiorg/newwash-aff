import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.string().trim().min(2).max(160);

type VietMapResult = {
  ref_id?: unknown;
  display?: unknown;
  name?: unknown;
  address?: unknown;
};

export async function GET(request: Request) {
  const key = process.env.VIETMAP_API_KEY;
  if (!key) return Response.json({ error: "Chưa cấu hình VietMap." }, { status: 503 });

  const query = querySchema.safeParse(new URL(request.url).searchParams.get("q"));
  if (!query.success) return Response.json({ suggestions: [] });

  const params = new URLSearchParams({
    apikey: key,
    text: query.data,
    display_type: "5",
  });

  try {
    const response = await fetch(`https://maps.vietmap.vn/api/autocomplete/v4?${params}`, {
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: "VietMap tạm thời chưa phản hồi." }, { status: 502 });

    const data: unknown = await response.json();
    const suggestions = Array.isArray(data)
      ? (data as VietMapResult[]).flatMap((item) => {
          if (typeof item.ref_id !== "string" || typeof item.display !== "string") return [];
          return [
            {
              id: item.ref_id,
              display: item.display,
              name: typeof item.name === "string" ? item.name : item.display,
              address: typeof item.address === "string" ? item.address : "",
            },
          ];
        })
      : [];
    return Response.json({ suggestions });
  } catch {
    return Response.json({ error: "Không thể gợi ý địa chỉ lúc này." }, { status: 502 });
  }
}
