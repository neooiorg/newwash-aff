"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { AffiliateOverview } from "@/lib/affiliates/types";

import { AffiliatePageHeader } from "./affiliate-page-header";
import { OverviewCharts } from "./overview-charts";
import { OverviewKpis } from "./overview-kpis";

export function OverviewWorkspace() {
  const [overview, setOverview] = useState<AffiliateOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch("/api/affiliate-overview", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được tổng quan affiliate.");
        setOverview(data);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được tổng quan affiliate."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_orders", "newwash_affiliates"], refresh);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Tổng quan affiliate"
        description="Doanh thu, đơn đặt và hiệu suất cộng tác viên lấy trực tiếp từ hệ thống."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Dữ liệu thực · Realtime</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/affiliates/orders">
                Xem đơn <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Chưa tải được dữ liệu</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Đang tải tổng quan">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : overview ? (
        <>
          <OverviewKpis current={overview.current} previous={overview.previous} />
          <OverviewCharts months={overview.months} affiliates={overview.affiliates} />
        </>
      ) : null}
    </div>
  );
}
