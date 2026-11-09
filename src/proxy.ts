import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/dashboard/account" ||
    pathname === "/dashboard/affiliates" ||
    pathname.startsWith("/dashboard/affiliates/")
  ) {
    return NextResponse.next();
  }

  const destination =
    pathname.startsWith("/auth/v1") || pathname.startsWith("/auth/v2") ? "/auth/admin" : "/dashboard/affiliates";
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/mail/:path*", "/auth/v1/:path*", "/auth/v2/:path*"],
};
