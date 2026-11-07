"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CalendarIcon, Ellipsis } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { AsciiLoadingReveal, AsciiPanelSkeleton } from "@/components/ascii-feedback";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { AffiliateAnalytics } from "@/lib/affiliates/types";

import { AffiliateAnalyticsInsights } from "./affiliate-analytics-insights";
import { AsciiStatCard } from "./ascii-stat-value";

type Preset = "yesterday" | "7d" | "30d" | "custom";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number, total: number) {
  return total > 0 ? Math.min(100, (value / total) * 100) : 0;
}

function dateParam(date: Date | undefined) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="grid md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <AsciiPanelSkeleton
              className="h-32 rounded-none border-r border-b p-3 ring-0 last:border-b-0"
              height={96}
              key={index}
              rows={6}
              seed={index + 1}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <AsciiPanelSkeleton className="h-88 xl:col-span-7" height={320} rows={18} seed={7} />
        <AsciiPanelSkeleton className="h-88 xl:col-span-5" height={320} rows={18} seed={8} />
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <AsciiPanelSkeleton className="h-80 xl:col-span-7" height={288} rows={16} seed={9} />
        <AsciiPanelSkeleton className="h-80 xl:col-span-5" height={288} rows={16} seed={10} />
      </div>
    </div>
  );
}

export function AffiliateAnalyticsDashboard({
  mode,
  initialAffiliateId = "",
}: {
  mode: "admin" | "affiliate";
  initialAffiliateId?: string;
}) {
  const [data, setData] = useState<AffiliateAnalytics | null>(null);
  const [preset, setPreset] = useState<Preset>("30d");
  const [affiliateId, setAffiliateId] = useState(initialAffiliateId);
  const [customRange, setCustomRange] = useState<DateRange>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestController = useRef<AbortController | null>(null);
  const customFrom = dateParam(customRange?.from);
  const customTo = dateParam(customRange?.to);

  const refresh = useCallback(() => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const params = new URLSearchParams({ preset });
    if (mode === "admin" && affiliateId) params.set("affiliateId", affiliateId);
    if (preset === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    fetch(`/api/affiliate-analytics?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không tải được thống kê affiliate.");
        if (requestController.current !== controller) return;
        setData(payload);
        setError("");
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (requestController.current === controller)
          setError(cause instanceof Error ? cause.message : "Không tải được thống kê affiliate.");
      })
      .finally(() => {
        if (requestController.current !== controller) return;
        setLoading(false);
      });
  }, [affiliateId, customFrom, customTo, mode, preset]);

  useEffect(() => {
    if (preset !== "custom" || (customFrom && customTo)) refresh();
  }, [customFrom, customTo, preset, refresh]);

  useAffiliateRealtime(["newwash_affiliate_clicks", "newwash_orders", "newwash_affiliates"], refresh, mode);

  const metrics = useMemo(() => {
    if (!data) return [];
    const completionRate = percent(data.metrics.completed, data.metrics.orders);
    const averageOrderValue = data.metrics.completed ? data.metrics.revenue / data.metrics.completed : 0;
    const commissionRate = percent(data.metrics.commission, data.metrics.revenue);
    const ordersPerBuyer = data.metrics.buyers ? data.metrics.orders / data.metrics.buyers : 0;

    return [
      {
        badge: "Live",
        detail: "Cập nhật theo thời gian thực",
        key: "clicks",
        label: "Lượt nhấp",
        value: data.metrics.clicks.toLocaleString("vi-VN"),
      },
      {
        badge: `${data.metrics.conversionRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
        detail: "Tỷ lệ từ lượt nhấp thành đơn",
        key: "orders",
        label: "Đơn hàng",
        value: data.metrics.orders.toLocaleString("vi-VN"),
      },
      {
        badge: `${completionRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
        detail: `Trên ${data.metrics.orders.toLocaleString("vi-VN")} đơn phát sinh`,
        key: "completed",
        label: "Đơn hoàn tất",
        value: data.metrics.completed.toLocaleString("vi-VN"),
      },
      {
        badge: averageOrderValue ? formatVnd(averageOrderValue) : "—",
        detail: "Giá trị trung bình mỗi đơn hoàn tất",
        key: "revenue",
        label: "Doanh thu",
        value: formatVnd(data.metrics.revenue),
      },
      {
        badge: `${commissionRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
        detail: "Tỷ lệ hoa hồng thực tế",
        key: "commission",
        label: "Hoa hồng ước tính",
        value: formatVnd(data.metrics.commission),
      },
      {
        badge: `${ordersPerBuyer.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} đơn`,
        detail: "Số đơn trung bình mỗi khách",
        key: "buyers",
        label: "Khách đặt",
        value: data.metrics.buyers.toLocaleString("vi-VN"),
      },
    ] as const;
  }, [data]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={preset}
            onValueChange={(value) => value && setPreset(value as Preset)}
            aria-label="Khoảng thời gian thống kê"
          >
            <ToggleGroupItem value="yesterday">Hôm qua</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 ngày</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 ngày</ToggleGroupItem>
            <ToggleGroupItem value="custom">Tùy chỉnh</ToggleGroupItem>
          </ToggleGroup>
          {preset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start font-normal">
                  <CalendarIcon data-icon="inline-start" />
                  {customRange?.from
                    ? customRange.to
                      ? `${dateLabel(customRange.from)} – ${dateLabel(customRange.to)}`
                      : dateLabel(customRange.from)
                    : "Chọn khoảng ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  defaultMonth={customRange?.from}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          {mode === "admin" && (
            <Select
              value={affiliateId || "all"}
              onValueChange={(value) => setAffiliateId(value === "all" ? "" : value)}
            >
              <SelectTrigger size="sm" className="w-full sm:w-64" aria-label="Chọn cộng tác viên">
                <SelectValue placeholder="Tất cả cộng tác viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Tất cả cộng tác viên</SelectItem>
                  {data?.affiliates.map((affiliate) => (
                    <SelectItem key={affiliate.id} value={affiliate.id}>
                      {affiliate.name} · {affiliate.code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Chưa tải được thống kê</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AsciiLoadingReveal loading={loading && !data} skeleton={<AnalyticsSkeleton />}>
        {data ? (
          <>
            <section
              aria-label="Các chỉ số chính"
              className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10"
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric) => (
                  <AsciiStatCard key={metric.key} value={`${metric.value}-${metric.badge}`}>
                    <Card
                      className="h-full min-h-32 rounded-none border-b border-r border-border/60 py-4 ring-0"
                      data-ascii="surface"
                    >
                      <CardHeader>
                        <CardTitle className="text-sm font-normal">{metric.label}</CardTitle>
                        <CardAction>
                          <Ellipsis className="size-4 text-muted-foreground" aria-hidden="true" />
                        </CardAction>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-2xl leading-none font-medium tracking-tight tabular-nums">
                            {metric.value}
                          </div>
                          <Badge className="max-w-36 truncate bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                            {metric.badge}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{metric.detail}</p>
                      </CardContent>
                    </Card>
                  </AsciiStatCard>
                ))}
              </div>
            </section>
            <AffiliateAnalyticsInsights data={data} />
          </>
        ) : null}
      </AsciiLoadingReveal>
    </div>
  );
}
