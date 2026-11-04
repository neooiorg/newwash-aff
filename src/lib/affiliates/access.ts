import "server-only";

import { hasAdminSession } from "@/lib/admin-auth";

export async function isAdminRequest(request: Request): Promise<boolean> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  return hasAdminSession();
}

export function adminUnavailable() {
  return Response.json({ error: "Cần đăng nhập tài khoản admin." }, { status: 401 });
}
