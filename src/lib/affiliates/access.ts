import "server-only";

import { hasAdminSession } from "@/lib/admin-auth";

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  if (!isSameOriginRequest(request)) return false;
  return hasAdminSession();
}

export function adminUnavailable() {
  return Response.json({ error: "Cần đăng nhập tài khoản admin." }, { status: 401 });
}
