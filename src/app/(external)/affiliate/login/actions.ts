"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  AFFILIATE_COOKIE,
  affiliateCookieOptions,
  affiliateLoginAllowed,
  clearAffiliateLoginFailures,
  makeAffiliateSession,
  recordAffiliateLoginFailure,
  verifyAffiliateLogin,
} from "@/lib/affiliate-auth";

import { createHash } from "node:crypto";

export async function loginAffiliate(_previous: string, formData: FormData): Promise<string> {
  const code = String(formData.get("code") ?? "").trim();
  const accessKey = String(formData.get("accessKey") ?? "").trim();
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local";
  const identifierHash = createHash("sha256").update(`${ip}|${code.toUpperCase()}`).digest("hex");
  if (!(await affiliateLoginAllowed(identifierHash))) {
    return "Đã thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.";
  }
  const affiliateId = await verifyAffiliateLogin(code, accessKey);
  if (!affiliateId) {
    await recordAffiliateLoginFailure(identifierHash);
    return "Mã affiliate hoặc mã truy cập không đúng, hoặc hồ sơ chưa được duyệt.";
  }
  await clearAffiliateLoginFailures(identifierHash);
  (await cookies()).set(AFFILIATE_COOKIE, makeAffiliateSession(affiliateId), affiliateCookieOptions);
  redirect("/affiliate/portal");
}

export async function logoutAffiliate() {
  (await cookies()).delete(AFFILIATE_COOKIE);
  redirect("/affiliate/login");
}
