import { z } from "zod";

import { auth } from "@/auth";
import { ADMIN_INVITE_MAX_AGE_MS, createAdminInviteToken, hashAdminInviteToken } from "@/lib/admin-invitations";
import { adminUnavailable, isAdminRequest, isSameOriginRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";
import { sendAdminInviteEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

const inviteInput = z.object({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().max(80).optional(),
});

const memberActionInput = z.object({
  id: z.uuid(),
  action: z.enum(["revoke", "restore"]),
});

type AdminMemberRow = {
  id: string;
  email: string;
  name: string | null;
  status: "invited" | "active" | "revoked";
  invited_at: Date;
  accepted_at: Date | null;
};

function toMember(row: AdminMemberRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    invitedAt: row.invited_at.toISOString(),
    acceptedAt: row.accepted_at?.toISOString() ?? null,
    isPrimary: false,
  };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();

  try {
    const result = await getPool().query<AdminMemberRow>(
      `SELECT id, email, name, status, invited_at, accepted_at
       FROM newwash_admin_members
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END, invited_at DESC`,
    );
    const primaryEmail = (process.env.GOOGLE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@newwash.local")
      .trim()
      .toLowerCase();
    const session = await auth();
    const primary = {
      id: "primary-admin",
      email: primaryEmail,
      name:
        session?.user.email?.toLowerCase() === primaryEmail ? (session.user.name ?? "NewWash Admin") : "NewWash Admin",
      status: "active" as const,
      invitedAt: null,
      acceptedAt: null,
      isPrimary: true,
    };
    return Response.json({ members: [primary, ...result.rows.map(toMember)] });
  } catch {
    return Response.json({ error: "Không đọc được danh sách thành viên quản trị." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  if (!isSameOriginRequest(request)) return Response.json({ error: "Origin không hợp lệ." }, { status: 403 });

  const input = inviteInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Email mời không hợp lệ." }, { status: 400 });

  const primaryEmail = (process.env.GOOGLE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@newwash.local")
    .trim()
    .toLowerCase();
  if (input.data.email === primaryEmail) {
    return Response.json({ error: "Email này đã là quản trị viên chính." }, { status: 409 });
  }

  const pool = getPool();
  const existing = await pool.query<{ status: AdminMemberRow["status"] }>(
    "SELECT status FROM newwash_admin_members WHERE lower(email) = $1 LIMIT 1",
    [input.data.email],
  );
  if (existing.rows[0]?.status === "active") {
    return Response.json({ error: "Email này đã là thành viên quản trị." }, { status: 409 });
  }

  const token = createAdminInviteToken();
  const tokenHash = hashAdminInviteToken(token);
  const expiresAt = new Date(Date.now() + ADMIN_INVITE_MAX_AGE_MS);

  try {
    const result = await pool.query<AdminMemberRow>(
      `INSERT INTO newwash_admin_members
         (email, name, status, invite_token_hash, invite_expires_at, invited_at, updated_at)
       VALUES ($1, $2, 'invited', $3, $4, now(), now())
       ON CONFLICT ((lower(email))) DO UPDATE SET
         name = EXCLUDED.name,
         status = 'invited',
         invite_token_hash = EXCLUDED.invite_token_hash,
         invite_expires_at = EXCLUDED.invite_expires_at,
         invited_at = now(),
         accepted_at = NULL,
         updated_at = now()
       RETURNING id, email, name, status, invited_at, accepted_at`,
      [input.data.email, input.data.name || null, tokenHash, expiresAt],
    );
    const email = await sendAdminInviteEmail({ email: input.data.email, name: input.data.name, token });
    return Response.json(
      {
        member: toMember(result.rows[0]),
        emailSent: email.sent,
        ...(!email.sent ? { emailWarning: email.error } : {}),
      },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Không tạo được lời mời quản trị." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  if (!isSameOriginRequest(request)) return Response.json({ error: "Origin không hợp lệ." }, { status: 403 });

  const input = memberActionInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Thao tác thành viên không hợp lệ." }, { status: 400 });

  try {
    const result = await getPool().query<AdminMemberRow>(
      input.data.action === "revoke"
        ? `UPDATE newwash_admin_members
           SET status = 'revoked', invite_token_hash = NULL, invite_expires_at = NULL, updated_at = now()
           WHERE id = $1 AND status <> 'revoked'
           RETURNING id, email, name, status, invited_at, accepted_at`
        : `UPDATE newwash_admin_members
           SET status = 'active', updated_at = now()
           WHERE id = $1 AND status = 'revoked' AND accepted_at IS NOT NULL
           RETURNING id, email, name, status, invited_at, accepted_at`,
      [input.data.id],
    );

    const member = result.rows[0];
    if (!member) {
      return Response.json(
        {
          error:
            input.data.action === "restore"
              ? "Tài khoản chưa từng xác nhận lời mời. Hãy gửi lại lời mời thay vì kích hoạt trực tiếp."
              : "Không tìm thấy thành viên có thể vô hiệu hóa.",
        },
        { status: 409 },
      );
    }

    return Response.json({ member: toMember(member) });
  } catch {
    return Response.json({ error: "Không cập nhật được trạng thái thành viên." }, { status: 503 });
  }
}
