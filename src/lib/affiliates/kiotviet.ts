import "server-only";

type KiotVietDocument = {
  id?: number;
  code: string;
  orderCode?: string;
  status: number;
  statusValue?: string;
};

let tokenCache: { token: string; expiresAt: number } | undefined;

export function hasKiotVietConfig() {
  return Boolean(process.env.KIOTVIET_RETAILER && process.env.KIOTVIET_CLIENT_ID && process.env.KIOTVIET_CLIENT_SECRET);
}

async function accessToken(timeoutMs: number) {
  if (!hasKiotVietConfig()) throw new Error("Chưa cấu hình KiotViet Retail trong .env.local.");
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const body = new URLSearchParams({
    scopes: "PublicApi.Access",
    grant_type: "client_credentials",
    client_id: process.env.KIOTVIET_CLIENT_ID!,
    client_secret: process.env.KIOTVIET_CLIENT_SECRET!,
  });
  const response = await fetch("https://id.kiotviet.vn/connect/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`KiotViet không cấp token (${response.status}).`);
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("KiotViet không trả về access token.");
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return tokenCache.token;
}

async function getDocument(path: "orders" | "invoices", code: string, timeoutMs = 8000): Promise<KiotVietDocument> {
  const token = await accessToken(timeoutMs);
  const response = await fetch(`https://public.kiotapi.com/${path}/code/${encodeURIComponent(code)}`, {
    headers: { Retailer: process.env.KIOTVIET_RETAILER!, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok)
    throw new Error(
      `KiotViet không tìm thấy ${path === "orders" ? "đơn đặt hàng" : "hóa đơn"} ${code} (${response.status}).`,
    );
  const payload = (await response.json()) as KiotVietDocument | { data: KiotVietDocument };
  const document = "data" in payload ? payload.data : payload;
  if (!document || document.code.toUpperCase() !== code.toUpperCase() || !Number.isFinite(document.status)) {
    throw new Error("Dữ liệu KiotViet trả về không hợp lệ.");
  }
  return document;
}

export function getKiotVietOrder(code: string) {
  return getDocument("orders", code);
}

export function getKiotVietInvoice(code: string, timeoutMs?: number) {
  return getDocument("invoices", code, timeoutMs);
}
