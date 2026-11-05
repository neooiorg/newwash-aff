import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-auth";
import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";

import { createHmac } from "node:crypto";

export const dynamic = "force-dynamic";

function signTicket(scope: "admin" | "affiliate", subject: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const expires = String(Math.floor(Date.now() / 1000) + 5 * 60);
  const payload = `${scope}.${subject}.${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "admin") {
    if (!(await hasAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ ticket: signTicket("admin", "admin") });
  }
  if (scope === "affiliate") {
    const affiliateId = await getApprovedAffiliateSessionId();
    if (!affiliateId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ ticket: signTicket("affiliate", affiliateId) });
  }
  return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
}
