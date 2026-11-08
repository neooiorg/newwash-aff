import { z } from "zod";

import { hashAdminInviteToken, isAdminInviteToken } from "@/lib/admin-invitations";
import { isSameOriginRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

const acceptInput = z.object({ token: z.string().trim() });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Origin không hợp lệ." }, { status: 403 });
  const input = acceptInput.safeParse(await request.json().catch(() => null));
  if (!input.success || !isAdminInviteToken(input.data.token)) {
    return Response.json({ error: "Lời mời không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await getPool().query<{ email: string }>(
      `UPDATE newwash_admin_members
       SET status = 'active', accepted_at = now(), invite_token_hash = NULL, invite_expires_at = NULL, updated_at = now()
       WHERE invite_token_hash = $1 AND status = 'invited' AND invite_expires_at > now()
       RETURNING email`,
      [hashAdminInviteToken(input.data.token)],
    );
    if (!result.rows[0]) {
      return Response.json({ error: "Lời mời đã hết hạn hoặc đã được sử dụng." }, { status: 410 });
    }
    return Response.json({ accepted: true, email: result.rows[0].email });
  } catch {
    return Response.json({ error: "Không xác nhận được lời mời." }, { status: 503 });
  }
}
