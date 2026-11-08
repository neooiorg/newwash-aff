import { z } from "zod";

import { createAffiliateAccessKey, hashAffiliateAccessKey } from "@/lib/affiliate-auth";
import { adminUnavailable, isAdminRequest, isSameOriginRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";
import type { Partner } from "@/lib/affiliates/types";

export const runtime = "nodejs";

const applicationInput = z.object({
  name: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(5).max(100),
  channel: z.string().trim().max(50).default("Trực tiếp"),
  password: z.string().min(8).max(64),
});

const decisionInput = z.object({
  id: z.uuid(),
  decision: z.enum(["approved", "rejected", "locked"]),
});

type PartnerRow = {
  id: string;
  name: string;
  contact: string;
  code: string | null;
  channel: string;
  status: Partner["status"];
  created_at: Date;
};

function toPartner(row: PartnerRow): Partner {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    code: row.code,
    channel: row.channel,
    status: row.status,
    createdAt: row.created_at.toISOString().slice(0, 10),
  };
}

function codeBase(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12) || "AFF"
  );
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  try {
    const result = await getPool().query<PartnerRow>(
      "SELECT id, name, contact, channel, code, status, created_at FROM newwash_affiliates ORDER BY created_at DESC, id DESC",
    );
    return Response.json({ partners: result.rows.map(toPartner) });
  } catch {
    return Response.json({ error: "Không đọc được hồ sơ cộng tác viên từ database." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Origin không hợp lệ." }, { status: 403 });
  const input = applicationInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Thông tin đăng ký không hợp lệ." }, { status: 400 });

  try {
    const existing = await getPool().query(
      `SELECT 1 FROM newwash_affiliates
       WHERE lower(contact) = lower($1) AND status IN ('pending', 'approved') LIMIT 1`,
      [input.data.contact],
    );
    if (existing.rowCount) {
      return Response.json(
        { error: "Thông tin liên hệ này đã có hồ sơ đang xét duyệt hoặc đã được duyệt." },
        { status: 409 },
      );
    }
    const result = await getPool().query<{ id: string }>(
      `INSERT INTO newwash_affiliates (name, contact, channel, status, access_secret_hash)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING id`,
      [
        input.data.name,
        input.data.contact,
        input.data.channel || "Trực tiếp",
        hashAffiliateAccessKey(input.data.password),
      ],
    );
    return Response.json({ application: { id: result.rows[0].id, status: "pending" } }, { status: 201 });
  } catch {
    return Response.json({ error: "Không lưu được hồ sơ đăng ký." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  const input = decisionInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Quyết định xét duyệt không hợp lệ." }, { status: 400 });

  const pool = getPool();
  try {
    if (input.data.decision === "locked") {
      const result = await pool.query<PartnerRow>(
        `UPDATE newwash_affiliates SET status = 'locked'
         WHERE id = $1 AND status = 'approved'
         RETURNING id, name, contact, channel, code, status, created_at`,
        [input.data.id],
      );
      if (!result.rows[0])
        return Response.json({ error: "Chỉ có thể khóa tài khoản đang hoạt động." }, { status: 409 });
      return Response.json({ partner: toPartner(result.rows[0]) });
    }

    if (input.data.decision === "rejected") {
      const result = await pool.query<PartnerRow>(
        `UPDATE newwash_affiliates SET status = 'rejected', code = NULL
         WHERE id = $1 AND status = 'pending'
         RETURNING id, name, contact, channel, code, status, created_at`,
        [input.data.id],
      );
      if (!result.rows[0]) return Response.json({ error: "Hồ sơ không còn chờ duyệt." }, { status: 409 });
      return Response.json({ partner: toPartner(result.rows[0]) });
    }

    const application = await pool.query<{ name: string; access_secret_hash: string | null }>(
      "SELECT name, access_secret_hash FROM newwash_affiliates WHERE id = $1 AND status = 'pending'",
      [input.data.id],
    );
    if (!application.rows[0]) return Response.json({ error: "Hồ sơ không còn chờ duyệt." }, { status: 409 });
    const base = codeBase(application.rows[0].name);
    const accessKey = application.rows[0].access_secret_hash ? "" : createAffiliateAccessKey();
    const accessSecretHash = application.rows[0].access_secret_hash ?? hashAffiliateAccessKey(accessKey);
    for (let suffix = 1; suffix < 100; suffix++) {
      const code = suffix === 1 ? base : `${base.slice(0, 20 - String(suffix).length)}${suffix}`;
      try {
        const result = await pool.query<PartnerRow>(
          `UPDATE newwash_affiliates SET status = 'approved', code = $2, access_secret_hash = $3
           WHERE id = $1 AND status = 'pending'
           RETURNING id, name, contact, channel, code, status, created_at`,
          [input.data.id, code, accessSecretHash],
        );
        if (!result.rows[0]) return Response.json({ error: "Hồ sơ không còn chờ duyệt." }, { status: 409 });
        return Response.json({ partner: toPartner(result.rows[0]), ...(accessKey ? { accessKey } : {}) });
      } catch (error) {
        if ((error as { code?: string }).code === "23505") continue;
        throw error;
      }
    }
    return Response.json({ error: "Không tạo được mã affiliate duy nhất." }, { status: 409 });
  } catch {
    return Response.json({ error: "Không cập nhật được trạng thái xét duyệt." }, { status: 503 });
  }
}
