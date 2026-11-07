import { z } from "zod";

import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";
import { adminUnavailable, isAdminRequest, isSameOriginRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

const requestInput = z.object({
  amount: z.number().int().min(10_000).max(1_000_000_000),
  bankName: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().min(4).max(40),
  accountHolder: z.string().trim().min(2).max(100),
});

const decisionInput = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "paid", "rejected"]),
  note: z.string().trim().max(500).default(""),
});

type WithdrawalRow = {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_code: string;
  amount: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_note: string;
  requested_at: Date;
  reviewed_at: Date | null;
  paid_at: Date | null;
};

function toWithdrawal(row: WithdrawalRow) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    affiliateName: row.affiliate_name,
    affiliateCode: row.affiliate_code,
    amount: Number(row.amount),
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountHolder: row.account_holder,
    status: row.status,
    adminNote: row.admin_note,
    requestedAt: row.requested_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    paidAt: row.paid_at?.toISOString() ?? null,
  };
}

async function balanceFor(affiliateId: string) {
  const result = await getPool().query<{
    earned: string;
    reserved: string;
    paid: string;
  }>(
    `SELECT
      coalesce((
        SELECT sum(o.affiliate_commission_amount)
        FROM newwash_orders o
        JOIN newwash_affiliates a ON a.id = o.affiliate_id
        WHERE o.affiliate_id = $1 AND o.source = 'website' AND o.status = 'Hoàn tất giao'
      ), 0)::text AS earned,
      coalesce((
        SELECT sum(amount) FROM newwash_withdrawals
        WHERE affiliate_id = $1 AND status IN ('pending', 'approved', 'paid')
      ), 0)::text AS reserved,
      coalesce((
        SELECT sum(amount) FROM newwash_withdrawals
        WHERE affiliate_id = $1 AND status = 'paid'
      ), 0)::text AS paid`,
    [affiliateId],
  );
  const row = result.rows[0] ?? { earned: "0", reserved: "0", paid: "0" };
  const earned = Math.floor(Number(row.earned));
  const reserved = Number(row.reserved);
  const paid = Number(row.paid);
  return { earned, available: Math.max(0, earned - reserved), processing: Math.max(0, reserved - paid), paid };
}

export async function GET(request: Request) {
  const admin = await isAdminRequest(request);
  const affiliateId = admin ? null : await getApprovedAffiliateSessionId();
  if (!admin && !affiliateId) return Response.json({ error: "Cần đăng nhập cộng tác viên." }, { status: 401 });
  try {
    const result = await getPool().query<WithdrawalRow>(
      `SELECT w.id, w.affiliate_id, a.name AS affiliate_name, coalesce(a.code, '') AS affiliate_code,
        w.amount, w.bank_name, w.account_number, w.account_holder, w.status, w.admin_note,
        w.requested_at, w.reviewed_at, w.paid_at
       FROM newwash_withdrawals w
       JOIN newwash_affiliates a ON a.id = w.affiliate_id
       WHERE $1::uuid IS NULL OR w.affiliate_id = $1::uuid
       ORDER BY CASE w.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         w.requested_at DESC`,
      [affiliateId],
    );
    return Response.json({
      withdrawals: result.rows.map(toWithdrawal),
      balance: affiliateId ? await balanceFor(affiliateId) : null,
    });
  } catch {
    return Response.json({ error: "Không tải được yêu cầu rút tiền." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Origin không hợp lệ." }, { status: 403 });
  const affiliateId = await getApprovedAffiliateSessionId();
  if (!affiliateId) return Response.json({ error: "Cần đăng nhập cộng tác viên." }, { status: 401 });
  const parsed = requestInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Thông tin rút tiền chưa hợp lệ." }, { status: 400 });

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM newwash_affiliates WHERE id = $1 AND status = 'approved' FOR UPDATE", [
      affiliateId,
    ]);
    const balance = await balanceFor(affiliateId);
    if (parsed.data.amount > balance.available) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Số tiền yêu cầu vượt quá hoa hồng khả dụng." }, { status: 409 });
    }
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO newwash_withdrawals
        (affiliate_id, amount, bank_name, account_number, account_holder)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        affiliateId,
        parsed.data.amount,
        parsed.data.bankName,
        parsed.data.accountNumber,
        parsed.data.accountHolder.toUpperCase(),
      ],
    );
    await client.query("COMMIT");
    return Response.json({ id: inserted.rows[0].id }, { status: 201 });
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    return Response.json({ error: "Không tạo được yêu cầu rút tiền." }, { status: 503 });
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();
  const parsed = decisionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Quyết định xử lý không hợp lệ." }, { status: 400 });
  try {
    const allowedPrevious = parsed.data.status === "paid" ? ["approved"] : ["pending", "approved"];
    const result = await getPool().query(
      `UPDATE newwash_withdrawals SET status = $2, admin_note = $3, reviewed_at = now(),
        paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE paid_at END
       WHERE id = $1 AND status = ANY($4::text[])`,
      [parsed.data.id, parsed.data.status, parsed.data.note, allowedPrevious],
    );
    if (!result.rowCount)
      return Response.json({ error: "Yêu cầu không còn ở trạng thái có thể xử lý." }, { status: 409 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không cập nhật được yêu cầu rút tiền." }, { status: 503 });
  }
}
