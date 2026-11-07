import { hasAdminSession } from "@/lib/admin-auth";
import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";
import { getPool } from "@/lib/affiliates/db";

export const dynamic = "force-dynamic";

type Scope = "admin" | "affiliate";

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

async function authorize(scope: Scope) {
  if (scope === "admin") return (await hasAdminSession()) ? { scope, affiliateId: null } : null;
  const affiliateId = await getApprovedAffiliateSessionId();
  return affiliateId ? { scope, affiliateId } : null;
}

function requestedScope(request: Request): Scope | null {
  const scope = new URL(request.url).searchParams.get("scope");
  return scope === "admin" || scope === "affiliate" ? scope : null;
}

export async function GET(request: Request) {
  const scope = requestedScope(request);
  if (!scope) return Response.json({ error: "Phạm vi thông báo không hợp lệ." }, { status: 400 });
  const viewer = await authorize(scope);
  if (!viewer) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = scope === "admin" ? [] : [viewer.affiliateId];
  const where = scope === "admin" ? "recipient_scope = 'admin'" : "recipient_scope = 'affiliate' AND affiliate_id = $1";
  const result = await getPool().query<{
    id: string;
    type: string;
    title: string;
    message: string;
    href: string;
    read_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, type, title, message, href, read_at, created_at
     FROM newwash_notifications
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT 50`,
    params,
  );

  const notifications = result.rows.map((item) => {
    const compactAffiliateClick = scope === "affiliate" && item.type === "affiliate_click";
    return {
      id: item.id,
      type: item.type,
      title: compactAffiliateClick ? "Có lượt nhấp mới" : item.title,
      message: compactAffiliateClick ? "Một khách vừa mở liên kết affiliate của bạn." : item.message,
      href: item.href,
      readAt: item.read_at?.toISOString() ?? null,
      createdAt: item.created_at.toISOString(),
    };
  });
  return Response.json({ notifications, unread: notifications.filter((item) => !item.readAt).length });
}

export async function PATCH(request: Request) {
  const scope = requestedScope(request);
  if (!scope) return Response.json({ error: "Phạm vi thông báo không hợp lệ." }, { status: 400 });
  const viewer = await authorize(scope);
  if (!viewer) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: unknown; all?: unknown } | null;
  if (!body || (body.all !== true && !isUuid(body.id))) {
    return Response.json({ error: "Yêu cầu cập nhật không hợp lệ." }, { status: 400 });
  }

  const conditions = [
    scope === "admin" ? "recipient_scope = 'admin'" : "recipient_scope = 'affiliate' AND affiliate_id = $1",
  ];
  const params: Array<string> = scope === "admin" ? [] : [viewer.affiliateId as string];
  if (body.all !== true) {
    params.push(body.id as string);
    conditions.push(`id = $${params.length}`);
  }
  await getPool().query(
    `UPDATE newwash_notifications SET read_at = coalesce(read_at, now()) WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Response.json({ ok: true });
}
