"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { AffiliateAnalytics } from "@/lib/affiliates/types";

type Preset = "yesterday" | "7d" | "30d" | "custom";
type TrendMetric = "revenue" | "orders" | "clicks";

const chartConfig = {
  revenue: { label: "Doanh thu", color: "var(--chart-4)" },
  orders: { label: "Đơn hàng", color: "var(--chart-3)" },
  clicks: { label: "Lượt nhấp", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function compact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${value}T00:00:00+07:00`),
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
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("revenue");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestController = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setRefreshing(true);
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
        setRefreshing(false);
      });
  }, [affiliateId, customFrom, customTo, mode, preset]);

  useEffect(() => {
    if (preset !== "custom" || (customFrom && customTo)) refresh();
  }, [customFrom, customTo, preset, refresh]);
  const realtimeStatus = useAffiliateRealtime(
    ["newwash_affiliate_clicks", "newwash_orders", "newwash_affiliates"],
    refresh,
    mode,
  );

  const metrics = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Lượt nhấp", value: data.metrics.clicks.toLocaleString("vi-VN") },
      { label: "Đơn hàng", value: data.metrics.orders.toLocaleString("vi-VN") },
      { label: "Đơn hoàn tất", value: data.metrics.completed.toLocaleString("vi-VN") },
      { label: "Doanh thu", value: formatVnd(data.metrics.revenue) },
      { label: "Hoa hồng ước tính", value: formatVnd(data.metrics.commission) },
      { label: "Khách đặt", value: data.metrics.buyers.toLocaleString("vi-VN") },
    ];
  }, [data]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="bg-card flex flex-col gap-3 rounded-xl border p-3 md:flex-row md:items-end md:justify-between md:p-4">
        <div className="min-w-0 overflow-x-auto pb-1">
          <ToggleGroup
            type="single"
            variant="outline"
            value={preset}
            onValueChange={(value) => value && setPreset(value as Preset)}
            aria-label="Khoảng thời gian thống kê"
          >
            <ToggleGroupItem value="yesterday">Hôm qua</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 ngày</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 ngày</ToggleGroupItem>
            <ToggleGroupItem value="custom">Tùy chỉnh</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {mode === "admin" && (
          <Select value={affiliateId || "all"} onValueChange={(value) => setAffiliateId(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full md:w-64" aria-label="Chọn cộng tác viên">
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

      {preset === "custom" && (
        <FieldGroup className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${mode}-analytics-from`}>Từ ngày</FieldLabel>
            <Input
              id={`${mode}-analytics-from`}
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${mode}-analytics-to`}>Đến ngày</FieldLabel>
            <Input
              id={`${mode}-analytics-to`}
              type="date"
              min={customFrom}
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </Field>
        </FieldGroup>
      )}

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Chưa tải được thống kê</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : data ? (
        <>
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Các chỉ số chính</CardTitle>
                  <CardDescription>
                    {data.selectedAffiliate
                      ? `${data.selectedAffiliate.name} · ${data.selectedAffiliate.code}`
                      : "Toàn hệ thống"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={realtimeStatus === "offline" ? "outline" : "secondary"}>
                    {refreshing
                      ? "Đang cập nhật"
                      : realtimeStatus === "live"
                        ? "Realtime"
                        : realtimeStatus === "connecting"
                          ? "Đang kết nối"
                          : "Mất kết nối · đang thử lại"}
                  </Badge>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {data.range.from} — {data.range.to}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-border grid grid-cols-2 gap-px p-0 xl:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="bg-card flex min-h-24 flex-col justify-center gap-1 px-5 py-4">
                  <span className="text-muted-foreground text-sm">{metric.label}</span>
                  <strong className="text-2xl font-semibold tracking-tight tabular-nums">{metric.value}</strong>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle>Xu hướng hiệu suất</CardTitle>
                  <CardDescription>
                    Tỷ lệ chuyển đổi {data.metrics.conversionRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
                    %
                  </CardDescription>
                </div>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={trendMetric}
                  onValueChange={(value) => value && setTrendMetric(value as TrendMetric)}
                  aria-label="Chỉ số trên biểu đồ"
                >
                  <ToggleGroupItem value="revenue">Doanh thu</ToggleGroupItem>
                  <ToggleGroupItem value="orders">Đơn</ToggleGroupItem>
                  <ToggleGroupItem value="clicks">Nhấp</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <AreaChart accessibilityLayer data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    minTickGap={24}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    width={52}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    allowDecimals={false}
                    tickFormatter={trendMetric === "revenue" ? compact : undefined}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent labelFormatter={(value) => shortDate(String(value))} />}
                  />
                  <Area
                    type="monotone"
                    dataKey={trendMetric}
                    stroke={`var(--color-${trendMetric})`}
                    fill={`var(--color-${trendMetric})`}
                    fillOpacity={0.12}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất dịch vụ</CardTitle>
              <CardDescription>Đơn, doanh thu và hoa hồng ước tính theo từng dịch vụ</CardDescription>
            </CardHeader>
            <CardContent>
              {data.services.length ? (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dịch vụ</TableHead>
                        <TableHead className="text-right">Đơn</TableHead>
                        <TableHead className="text-right">Hoàn tất</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">Hoa hồng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.services.map((service) => (
                        <TableRow key={service.service}>
                          <TableCell className="font-medium">{service.service}</TableCell>
                          <TableCell className="text-right tabular-nums">{service.orders}</TableCell>
                          <TableCell className="text-right tabular-nums">{service.completed}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatVnd(service.revenue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatVnd(service.commission)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty className="min-h-40">
                  <EmptyHeader>
                    <EmptyTitle>Chưa có đơn trong giai đoạn này</EmptyTitle>
                    <EmptyDescription>
                      Lượt nhấp sẽ vẫn xuất hiện trên biểu đồ ngay khi khách mở link affiliate.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
