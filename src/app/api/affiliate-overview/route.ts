import { adminUnavailable, isAdminRequest } from "@/lib/affiliates/access";
import { getPool } from "@/lib/affiliates/db";
import type { AffiliateOverview, AffiliateOverviewPeriod } from "@/lib/affiliates/types";

export const runtime = "nodejs";

type MonthRow = {
  key: string;
  month: string;
  orders: number;
  completed: number;
  revenue: string;
};

type AffiliateRow = { name: string; code: string; orders: number };
type AffiliateCountRow = { approved: number; pending: number };

function period(month: AffiliateOverview["months"][number] | undefined): AffiliateOverviewPeriod {
  const orders = month?.orders ?? 0;
  const completed = month?.completed ?? 0;
  return {
    revenue: month?.revenue ?? 0,
    orders,
    completed,
    completionRate: orders ? (completed / orders) * 100 : 0,
  };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return adminUnavailable();

  try {
    const pool = getPool();
    const [monthResult, affiliateResult, countResult] = await Promise.all([
      pool.query<MonthRow>(
        `WITH months AS (
           SELECT generate_series(
             date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok') - interval '11 months',
             date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok'),
             interval '1 month'
           ) AS month_start
         )
         SELECT to_char(m.month_start, 'YYYY-MM') AS key,
           'T' || extract(month FROM m.month_start)::int AS month,
           count(o.id)::int AS orders,
           count(o.id) FILTER (WHERE o.status = 'Hoàn tất giao')::int AS completed,
           coalesce(sum(o.order_amount) FILTER (WHERE o.status = 'Hoàn tất giao'), 0)::text AS revenue
         FROM months m
         LEFT JOIN newwash_orders o ON o.source = 'website'
           AND (o.created_at AT TIME ZONE 'Asia/Bangkok') >= m.month_start
           AND (o.created_at AT TIME ZONE 'Asia/Bangkok') < m.month_start + interval '1 month'
         GROUP BY m.month_start
         ORDER BY m.month_start`,
      ),
      pool.query<AffiliateRow>(
        `SELECT a.name, coalesce(a.code, '') AS code, count(o.id)::int AS orders
         FROM newwash_affiliates a
         JOIN newwash_orders o ON o.affiliate_id = a.id AND o.source = 'website'
         WHERE (o.created_at AT TIME ZONE 'Asia/Bangkok') >= date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok')
           AND (o.created_at AT TIME ZONE 'Asia/Bangkok') < date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok') + interval '1 month'
         GROUP BY a.id, a.name, a.code
         ORDER BY orders DESC, a.name
         LIMIT 5`,
      ),
      pool.query<AffiliateCountRow>(
        `SELECT count(*) FILTER (WHERE status = 'approved')::int AS approved,
          count(*) FILTER (WHERE status = 'pending')::int AS pending
         FROM newwash_affiliates`,
      ),
    ]);

    const months = monthResult.rows.map((row) => ({
      ...row,
      revenue: Number(row.revenue),
    }));
    const counts = countResult.rows[0] ?? { approved: 0, pending: 0 };
    const overview: AffiliateOverview = {
      current: period(months.at(-1)),
      previous: period(months.at(-2)),
      months,
      affiliates: affiliateResult.rows,
      approvedAffiliates: counts.approved,
      pendingAffiliates: counts.pending,
      updatedAt: new Date().toISOString(),
    };
    return Response.json(overview);
  } catch {
    return Response.json({ error: "Không đọc được dữ liệu tổng quan từ database." }, { status: 503 });
  }
}
