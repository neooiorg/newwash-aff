import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { AffiliateOverviewPeriod } from "@/lib/affiliates/types";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function OverviewKpis({
  current,
  previous,
}: {
  current: AffiliateOverviewPeriod;
  previous: AffiliateOverviewPeriod;
}) {
  const metrics = [
    {
      label: "Doanh thu tháng này",
      value: formatVnd(current.revenue),
      previous: `${formatVnd(previous.revenue)} tháng trước`,
      change: percentChange(current.revenue, previous.revenue),
      suffix: "%",
    },
    {
      label: "Đơn đặt",
      value: current.orders.toLocaleString("vi-VN"),
      previous: `${previous.orders.toLocaleString("vi-VN")} đơn tháng trước`,
      change: percentChange(current.orders, previous.orders),
      suffix: "%",
    },
    {
      label: "Đơn hoàn tất",
      value: current.completed.toLocaleString("vi-VN"),
      previous: `${previous.completed.toLocaleString("vi-VN")} đơn tháng trước`,
      change: percentChange(current.completed, previous.completed),
      suffix: "%",
    },
    {
      label: "Tỉ lệ hoàn tất",
      value: `${current.completionRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
      previous: `${previous.completionRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% tháng trước`,
      change: current.completionRate - previous.completionRate,
      suffix: " điểm",
    },
  ];

  return (
    <section aria-label="Chỉ số tháng này" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const direction = Math.sign(metric.change);
        return (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardAction>
                <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  {metric.value}
                </strong>
                <Badge variant={direction < 0 ? "destructive" : "secondary"}>
                  {direction > 0 ? (
                    <TrendingUp data-icon="inline-start" />
                  ) : direction < 0 ? (
                    <TrendingDown data-icon="inline-start" />
                  ) : (
                    <Minus data-icon="inline-start" />
                  )}
                  {metric.change.toLocaleString("vi-VN", {
                    maximumFractionDigits: 1,
                    signDisplay: direction ? "always" : "never",
                  })}
                  {metric.suffix}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{metric.previous}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
