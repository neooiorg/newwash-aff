"use client";

import { Ellipsis } from "lucide-react";
import { Bar, BarChart, type BarShapeProps, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { AffiliateAnalytics } from "@/lib/affiliates/types";

const conversionConfig = {
  completion: {
    color: "var(--foreground)",
    label: "Hoàn tất",
  },
  conversion: {
    color: "var(--color-yellow-400)",
    label: "Chuyển đổi",
  },
} satisfies ChartConfig;

const activityConfig = {
  clicks: {
    color: "var(--color-yellow-400)",
    label: "Lượt nhấp",
  },
} satisfies ChartConfig;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${value}T00:00:00+07:00`),
  );
}

function rate(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function ActivityBarShape(props: BarShapeProps) {
  const { height, payload, width, x, y } = props;
  const clicks = Number((payload as { clicks?: number } | undefined)?.clicks ?? 0);
  const barHeightValue = Number(height);
  const barWidthValue = Number(width);
  const xValue = Number(x);
  const yValue = Number(y);
  const baselineY = yValue + barHeightValue - 2;
  const visibleHeight = Math.max(0, barHeightValue - 4);
  const fillOpacity = clicks > 0 ? 0.9 : 0.25;

  return (
    <g>
      <rect
        fill="var(--color-clicks)"
        fillOpacity={fillOpacity}
        height={2}
        rx={1}
        width={barWidthValue}
        x={xValue}
        y={baselineY}
      />
      {clicks > 0 && visibleHeight > 0 ? (
        <rect
          fill="var(--color-clicks)"
          fillOpacity={fillOpacity}
          height={visibleHeight}
          rx={2}
          width={barWidthValue}
          x={xValue}
          y={yValue}
        />
      ) : null}
    </g>
  );
}

function ConversionQuality({ data }: { data: AffiliateAnalytics }) {
  const chartData = data.series.map((item) => ({
    completion: rate(item.completed, item.orders),
    conversion: rate(item.orders, item.clicks),
    date: item.date,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal">Chất lượng chuyển đổi</CardTitle>
        <CardAction>
          <Ellipsis className="size-4" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={conversionConfig} className="h-68 w-full">
          <ComposedChart data={chartData} margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={36}
              tickFormatter={formatDate}
              tickLine={false}
              tickMargin={14}
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              tickMargin={10}
              width={48}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent className="w-40" labelFormatter={(value) => formatDate(String(value))} />}
            />
            <Line
              dataKey="completion"
              dot={false}
              stroke="var(--color-completion)"
              strokeDasharray="4 4"
              strokeOpacity={0.65}
              strokeWidth={1.75}
              type="linear"
            />
            <Line
              activeDot={{ r: 4 }}
              dataKey="conversion"
              dot={false}
              stroke="var(--color-conversion)"
              strokeWidth={2.5}
              type="linear"
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ data }: { data: AffiliateAnalytics }) {
  const recentSeries = data.series.slice(-14);
  const latest = recentSeries.at(-1);
  const details = [
    { label: "Lượt nhấp", value: data.metrics.clicks },
    { label: "Đơn hàng", value: data.metrics.orders },
    { label: "Hoàn tất", value: data.metrics.completed },
    { label: "Khách đặt", value: data.metrics.buyers },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal">Hoạt động gần đây</CardTitle>
        <CardAction>
          <Ellipsis className="size-4" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl leading-none tracking-tight tabular-nums">{latest?.clicks ?? 0}</span>
            <span className="text-sm text-muted-foreground">lượt nhấp hôm nay</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            <span>Live</span>
          </div>
        </div>
        <ChartContainer config={activityConfig} className="h-36 w-full">
          <BarChart data={recentSeries} margin={{ bottom: 0, left: 0, right: 0, top: 0 }} barCategoryGap={3}>
            <XAxis dataKey="date" hide />
            <YAxis allowDecimals={false} hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel={false} labelFormatter={(value) => formatDate(String(value))} />}
            />
            <Bar dataKey="clicks" fill="var(--color-clicks)" shape={ActivityBarShape} />
          </BarChart>
        </ChartContainer>
        <div className="grid grid-cols-2">
          {details.map((item) => (
            <div
              className="flex items-center justify-between gap-3 border-border/50 p-4 first:border-r [&:nth-child(-n+2)]:border-b [&:nth-child(3)]:border-r"
              key={item.label}
            >
              <span className="truncate text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium tabular-nums">{item.value.toLocaleString("vi-VN")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AffiliateAnalyticsInsights({ data }: { data: AffiliateAnalytics }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <ConversionQuality data={data} />
      </div>
      <div className="xl:col-span-5">
        <RecentActivity data={data} />
      </div>
    </div>
  );
}
