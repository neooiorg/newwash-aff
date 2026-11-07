"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Banknote, CalendarIcon, CheckCircle2, HandCoins, MousePointerClick, ShoppingBag, Users } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { AffiliateAnalytics } from "@/lib/affiliates/types";

import { AsciiStatValue } from "./ascii-stat-value";

type Preset = "yesterday" | "7d" | "30d" | "custom";
type TrendMetric = "revenue" | "orders" | "clicks";

const chartConfig = {
  revenue: { label: "Doanh thu", color: "var(--chart-4)" },
  orders: { label: "Đơn hàng", color: "var(--chart-3)" },
  clicks: { label: "Lượt nhấp", color: "var(--chart-2)" },
} satisfies ChartConfig;

const metricIcons = {
  clicks: MousePointerClick,
  orders: ShoppingBag,
  completed: CheckCircle2,
  revenue: Banknote,
  commission: HandCoins,
  buyers: Users,
};

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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-88 rounded-xl xl:col-span-8" />
        <Skeleton className="h-88 rounded-xl xl:col-span-4" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
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
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("revenue");
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
    return [
      { key: "clicks", label: "Lượt nhấp", value: data.metrics.clicks.toLocaleString("vi-VN") },
      { key: "orders", label: "Đơn hàng", value: data.metrics.orders.toLocaleString("vi-VN") },
      { key: "completed", label: "Đơn hoàn tất", value: data.metrics.completed.toLocaleString("vi-VN") },
      { key: "revenue", label: "Doanh thu", value: formatVnd(data.metrics.revenue) },
      { key: "commission", label: "Hoa hồng ước tính", value: formatVnd(data.metrics.commission) },
      { key: "buyers", label: "Khách đặt", value: data.metrics.buyers.toLocaleString("vi-VN") },
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

      {loading && !data ? <AnalyticsSkeleton /> : null}

      {data ? (
        <>
          <section aria-label="Các chỉ số chính" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metricIcons[metric.key];
              return (
                <Card key={metric.key} size="sm">
                  <CardHeader>
                    <CardDescription>{metric.label}</CardDescription>
                    <CardAction>
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl leading-none font-medium tracking-tight tabular-nums">
                      {metric.key === "clicks" || metric.key === "orders" ? (
                        <AsciiStatValue value={metric.value} />
                      ) : (
                        metric.value
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <div className="grid items-stretch gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-8">
              <CardHeader>
                <CardTitle>Xu hướng hiệu suất</CardTitle>
                <CardDescription>
                  {data.selectedAffiliate
                    ? `${data.selectedAffiliate.name} · ${data.selectedAffiliate.code}`
                    : "Toàn hệ thống affiliate"}
                </CardDescription>
                <CardAction className="col-span-2 col-start-1 row-start-3 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={trendMetric}
                    onValueChange={(value) => value && setTrendMetric(value as TrendMetric)}
                    aria-label="Chỉ số trên biểu đồ"
                  >
                    <ToggleGroupItem value="revenue">Doanh thu</ToggleGroupItem>
                    <ToggleGroupItem value="orders">Đơn</ToggleGroupItem>
                    <ToggleGroupItem value="clicks">Nhấp</ToggleGroupItem>
                  </ToggleGroup>
                </CardAction>
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
                      cursor={false}
                      content={<ChartTooltipContent labelFormatter={(value) => shortDate(String(value))} />}
                    />
                    <Area
                      type="linear"
                      dataKey={trendMetric}
                      stroke={`var(--color-${trendMetric})`}
                      fill={`var(--color-${trendMetric})`}
                      fillOpacity={0.12}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="xl:col-span-4">
              <CardHeader>
                <CardTitle>Phễu chuyển đổi</CardTitle>
                <CardDescription>Từ lượt nhấp đến đơn hoàn tất</CardDescription>
                <CardAction>
                  <Badge variant="outline">
                    {data.metrics.conversionRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Lượt nhấp</span>
                    <span className="font-medium tabular-nums">{data.metrics.clicks.toLocaleString("vi-VN")}</span>
                  </div>
                  <Progress value={data.metrics.clicks > 0 ? 100 : 0} />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Đơn phát sinh</span>
                    <span className="font-medium tabular-nums">
                      {data.metrics.orders.toLocaleString("vi-VN")} ·{" "}
                      {percent(data.metrics.orders, data.metrics.clicks).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={percent(data.metrics.orders, data.metrics.clicks)} />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Đơn hoàn tất</span>
                    <span className="font-medium tabular-nums">
                      {data.metrics.completed.toLocaleString("vi-VN")} ·{" "}
                      {percent(data.metrics.completed, data.metrics.clicks).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={percent(data.metrics.completed, data.metrics.clicks)} />
                </div>
                <div className="border-border/60 flex items-end justify-between gap-4 border-t pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Giá trị mỗi đơn hoàn tất</span>
                    <span className="text-xl font-medium tracking-tight tabular-nums">
                      {formatVnd(data.metrics.completed > 0 ? data.metrics.revenue / data.metrics.completed : 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="gap-2">
            <CardHeader>
              <CardTitle>Hiệu suất dịch vụ</CardTitle>
              <CardDescription>Đơn, doanh thu và hoa hồng ước tính theo từng dịch vụ</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {data.services.length ? (
                <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
                  <TableHeader className="[&_tr]:border-border/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Dịch vụ</TableHead>
                      <TableHead className="text-right font-normal">Đơn</TableHead>
                      <TableHead className="text-right font-normal">Hoàn tất</TableHead>
                      <TableHead className="text-right font-normal">Doanh thu</TableHead>
                      <TableHead className="text-right font-normal">Hoa hồng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr]:border-border/50">
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
              ) : (
                <Empty className="min-h-52">
                  <EmptyHeader>
                    <EmptyTitle>Chưa có đơn trong giai đoạn này</EmptyTitle>
                    <EmptyDescription>
                      Lượt nhấp sẽ xuất hiện ngay khi khách mở liên kết có mã affiliate.
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
