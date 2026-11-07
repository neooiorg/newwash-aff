"use client";

import { Ellipsis } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, type LabelProps, Line, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AffiliateAnalytics } from "@/lib/affiliates/types";

const conversionConfig = {
  completion: {
    color: "var(--muted-foreground)",
    label: "Hoàn tất",
  },
  conversion: {
    color: "var(--chart-3)",
    label: "Chuyển đổi",
  },
} satisfies ChartConfig;

const activityConfig = {
  clicks: {
    color: "var(--chart-3)",
    label: "Lượt nhấp",
  },
} satisfies ChartConfig;

const distributionConfig = {
  value: {
    color: "var(--chart-1)",
    label: "Giá trị",
  },
} satisfies ChartConfig;

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${value}T00:00:00+07:00`),
  );
}

function rate(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
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
            <Bar dataKey="clicks" fill="var(--color-clicks)" fillOpacity={0.55} radius={[3, 3, 0, 0]} />
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

function HighlightDays({ data }: { data: AffiliateAnalytics }) {
  const rows = [...data.series]
    .filter((item) => item.clicks || item.orders || item.revenue)
    .sort((left, right) => right.revenue - left.revenue || right.orders - left.orders || right.clicks - left.clicks)
    .slice(0, 5);

  return (
    <Card className="h-full gap-2">
      <CardHeader>
        <CardTitle className="font-normal">Ngày nổi bật</CardTitle>
        <CardAction>
          <Ellipsis className="size-4" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader className="[&_tr]:border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 font-normal">Ngày</TableHead>
              <TableHead className="h-8 w-24 text-right font-normal">Lượt nhấp</TableHead>
              <TableHead className="h-8 w-20 text-right font-normal">Đơn</TableHead>
              <TableHead className="h-8 w-32 text-right font-normal">Doanh thu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-border/50">
            {rows.map((row) => (
              <TableRow className="hover:bg-transparent" key={row.date}>
                <TableCell className="py-4 font-medium">{formatDate(row.date)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.clicks.toLocaleString("vi-VN")}</TableCell>
                <TableCell className="text-right tabular-nums">{row.orders.toLocaleString("vi-VN")}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type DistributionMetric = "commission" | "orders" | "revenue";

function renderValueLabel(props: LabelProps) {
  const { height, value, y } = props;

  return (
    <text
      className="fill-foreground"
      dominantBaseline="middle"
      dx={-6}
      fontSize={14}
      textAnchor="end"
      x="100%"
      y={Number(y) + Number(height) / 2}
    >
      {value}
    </text>
  );
}

function DistributionChart({ data, metric }: { data: AffiliateAnalytics; metric: DistributionMetric }) {
  const chartData = [...data.services]
    .sort((left, right) => right[metric] - left[metric])
    .slice(0, 5)
    .map((service) => ({
      label: metric === "orders" ? service.orders.toLocaleString("vi-VN") : formatVnd(service[metric]),
      service: service.service,
      value: service[metric],
    }));

  return (
    <ChartContainer config={distributionConfig} className="h-64 w-full">
      <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 0, right: 64 }}>
        <CartesianGrid horizontal={false} vertical={false} />
        <YAxis dataKey="service" hide tickLine={false} type="category" />
        <XAxis dataKey="value" hide type="number" />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Bar barSize={40} dataKey="value" fill="var(--color-value)" fillOpacity={0.5} radius={8}>
          <LabelList className="fill-foreground" dataKey="service" fontSize={14} offset={12} position="insideLeft" />
          <LabelList content={renderValueLabel} dataKey="label" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function ServiceDistribution({ data }: { data: AffiliateAnalytics }) {
  return (
    <Card className="h-full gap-2">
      <CardHeader>
        <CardTitle className="font-normal">Phân bổ theo dịch vụ</CardTitle>
        <CardAction>
          <Ellipsis className="size-4" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Tabs defaultValue="revenue" className="flex flex-col gap-3">
          <TabsList className="w-full justify-start border-b px-2.5" variant="line">
            <TabsTrigger className="flex-none font-normal" value="revenue">
              Doanh thu
            </TabsTrigger>
            <TabsTrigger className="flex-none font-normal" value="orders">
              Đơn hàng
            </TabsTrigger>
            <TabsTrigger className="flex-none font-normal" value="commission">
              Hoa hồng
            </TabsTrigger>
          </TabsList>
          {(["revenue", "orders", "commission"] as const).map((metric) => (
            <TabsContent className="px-4" key={metric} value={metric}>
              <DistributionChart data={data} metric={metric} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function AffiliateAnalyticsInsights({ data }: { data: AffiliateAnalytics }) {
  return (
    <>
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <ConversionQuality data={data} />
        </div>
        <div className="xl:col-span-5">
          <RecentActivity data={data} />
        </div>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <HighlightDays data={data} />
        </div>
        <div className="xl:col-span-5 xl:col-start-8">
          <ServiceDistribution data={data} />
        </div>
      </div>
    </>
  );
}
