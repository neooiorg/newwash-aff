import { z } from "zod";

import { getAffiliateSessionId } from "@/lib/affiliate-auth";
import { isAdminRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";

export const runtime = "nodejs";

const querySchema = z.object({
  preset: z.enum(["yesterday", "7d", "30d", "custom"]).default("30d"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  affiliateId: z.string().uuid().optional(),
});

type AffiliateOption = { id: string; name: string; code: string; commission_rate_bps: number };
type SummaryRow = {
  clicks: number;
  orders: number;
  completed: number;
  revenue: string;
  commission: string;
  buyers: number;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(input: z.infer<typeof querySchema>) {
  const bangkokDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = new Date(`${bangkokDate}T00:00:00Z`);
  if (input.preset === "custom" && input.from && input.to && input.from <= input.to) {
    return { from: input.from, to: input.to };
  }
  const days = input.preset === "yesterday" ? 1 : input.preset === "7d" ? 7 : 30;
  const to = new Date(today);
  if (input.preset === "yesterday") to.setUTCDate(to.getUTCDate() - 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days + 1);
  return { from: isoDate(from), to: isoDate(to) };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!input.success) return Response.json({ error: "Khoảng thời gian không hợp lệ." }, { status: 400 });

  const admin = await isAdminRequest(request);
  const sessionAffiliateId = admin ? null : await getAffiliateSessionId();
  if (!admin && !sessionAffiliateId) return Response.json({ error: "Cần đăng nhập cộng tác viên." }, { status: 401 });

  const pool = getPool();
  const range = rangeFor(input.data);
  const targetAffiliateId = admin ? (input.data.affiliateId ?? null) : sessionAffiliateId;
  try {
    const affiliateResult = await pool.query<AffiliateOption>(
      `SELECT id, name, coalesce(code, '') AS code, commission_rate_bps
       FROM newwash_affiliates WHERE status = 'approved' ORDER BY name`,
    );
    const selected = targetAffiliateId
      ? affiliateResult.rows.find((affiliate) => affiliate.id === targetAffiliateId)
      : null;
    if (targetAffiliateId && !selected)
      return Response.json({ error: "Cộng tác viên không tồn tại." }, { status: 404 });

    const params = [range.from, range.to, targetAffiliateId];
    const filter = "$3::uuid IS NULL OR affiliate_id = $3::uuid";
    const [summaryResult, seriesResult, serviceResult] = await Promise.all([
      pool.query<SummaryRow>(
        `SELECT
          (SELECT count(*)::int FROM newwash_affiliate_clicks
           WHERE (clicked_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date AND (${filter})) AS clicks,
          (SELECT count(*)::int FROM newwash_orders
           WHERE source = 'website' AND (created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date AND (${filter})) AS orders,
          (SELECT count(*)::int FROM newwash_orders
           WHERE source = 'website' AND status = 'Hoàn tất'
             AND (created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date AND (${filter})) AS completed,
          (SELECT coalesce(sum(order_amount), 0)::text FROM newwash_orders
           WHERE source = 'website' AND status = 'Hoàn tất'
             AND (created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date AND (${filter})) AS revenue,
          (SELECT coalesce(sum(o.order_amount * a.commission_rate_bps / 10000.0), 0)::text
           FROM newwash_orders o JOIN newwash_affiliates a ON a.id = o.affiliate_id
           WHERE o.source = 'website' AND o.status = 'Hoàn tất'
             AND (o.created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date
             AND ($3::uuid IS NULL OR o.affiliate_id = $3::uuid)) AS commission,
          (SELECT count(DISTINCT phone)::int FROM newwash_orders
           WHERE source = 'website' AND (created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date
             AND (${filter})) AS buyers`,
        params,
      ),
      pool.query<{
        date: string;
        clicks: number;
        orders: number;
        completed: number;
        revenue: string;
      }>(
        `WITH dates AS (
           SELECT generate_series($1::date, $2::date, interval '1 day')::date AS day
         ), clicks AS (
           SELECT (clicked_at AT TIME ZONE 'Asia/Bangkok')::date AS day, count(*)::int AS clicks
           FROM newwash_affiliate_clicks
           WHERE (clicked_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date AND (${filter})
           GROUP BY 1
         ), orders AS (
           SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date AS day, count(*)::int AS orders,
             count(*) FILTER (WHERE status = 'Hoàn tất')::int AS completed,
             coalesce(sum(order_amount) FILTER (WHERE status = 'Hoàn tất'), 0)::text AS revenue
           FROM newwash_orders
           WHERE source = 'website' AND (created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date
             AND (${filter})
           GROUP BY 1
         )
         SELECT to_char(d.day, 'YYYY-MM-DD') AS date, coalesce(c.clicks, 0)::int AS clicks,
           coalesce(o.orders, 0)::int AS orders, coalesce(o.completed, 0)::int AS completed,
           coalesce(o.revenue, '0') AS revenue
         FROM dates d LEFT JOIN clicks c ON c.day = d.day LEFT JOIN orders o ON o.day = d.day ORDER BY d.day`,
        params,
      ),
      pool.query<{
        service: string;
        orders: number;
        completed: number;
        revenue: string;
        commission: string;
      }>(
        `SELECT o.service, count(*)::int AS orders,
          count(*) FILTER (WHERE o.status = 'Hoàn tất')::int AS completed,
          coalesce(sum(o.order_amount) FILTER (WHERE o.status = 'Hoàn tất'), 0)::text AS revenue,
          coalesce(sum(o.order_amount * a.commission_rate_bps / 10000.0)
            FILTER (WHERE o.status = 'Hoàn tất'), 0)::text AS commission
         FROM newwash_orders o JOIN newwash_affiliates a ON a.id = o.affiliate_id
         WHERE o.source = 'website' AND (o.created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date
           AND ($3::uuid IS NULL OR o.affiliate_id = $3::uuid)
         GROUP BY o.service
         ORDER BY coalesce(sum(o.order_amount) FILTER (WHERE o.status = 'Hoàn tất'), 0) DESC, count(*) DESC
         LIMIT 10`,
        params,
      ),
    ]);
    const summary = summaryResult.rows[0] ?? {
      clicks: 0,
      orders: 0,
      completed: 0,
      revenue: "0",
      commission: "0",
      buyers: 0,
    };
    return Response.json({
      scope: admin ? "admin" : "affiliate",
      range,
      selectedAffiliate: selected
        ? {
            id: selected.id,
            name: selected.name,
            code: selected.code,
            commissionRate: selected.commission_rate_bps / 100,
          }
        : null,
      affiliates: admin
        ? affiliateResult.rows.map((affiliate) => ({ id: affiliate.id, name: affiliate.name, code: affiliate.code }))
        : [],
      metrics: {
        clicks: summary.clicks,
        orders: summary.orders,
        completed: summary.completed,
        revenue: Number(summary.revenue),
        commission: Number(summary.commission),
        buyers: summary.buyers,
        conversionRate: summary.clicks ? (summary.orders / summary.clicks) * 100 : 0,
      },
      series: seriesResult.rows.map((row) => ({ ...row, revenue: Number(row.revenue) })),
      services: serviceResult.rows.map((row) => ({
        ...row,
        revenue: Number(row.revenue),
        commission: Number(row.commission),
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Affiliate analytics query failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Không đọc được thống kê affiliate." }, { status: 503 });
  }
}
