"use client";

import { Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { AffiliateOverview } from "@/lib/affiliates/types";

const ordersConfig = {
  orders: { label: "Đơn đặt", color: "var(--chart-3)" },
  completed: { label: "Hoàn tất", color: "var(--chart-4)" },
} satisfies ChartConfig;

const revenueConfig = {
  revenue: { label: "Doanh thu", color: "var(--chart-4)" },
} satisfies ChartConfig;

const affiliatesConfig = {
  orders: { label: "Đơn đặt", color: "var(--chart-4)" },
} satisfies ChartConfig;

function compactVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function OverviewCharts({
  months,
  affiliates,
}: {
  months: AffiliateOverview["months"];
  affiliates: AffiliateOverview["affiliates"];
}) {
  return (
    <section aria-label="Biểu đồ tổng quan" className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Đơn đặt theo tháng</CardTitle>
          <CardDescription>Đơn website đã ghi nhận và số đơn hoàn tất trong 12 tháng gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ordersConfig} className="h-72 w-full">
            <BarChart accessibilityLayer data={months} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={3}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis hide allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Xu hướng doanh thu</CardTitle>
            <CardDescription>Giá trị thực của các đơn website đã hoàn tất</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-64 w-full">
              <AreaChart accessibilityLayer data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} width={48} tickFormatter={compactVnd} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2.5}
                  fill="var(--color-revenue)"
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Đơn theo cộng tác viên</CardTitle>
            <CardDescription>5 cộng tác viên có nhiều đơn website nhất trong tháng</CardDescription>
          </CardHeader>
          <CardContent>
            {affiliates.length ? (
              <ChartContainer config={affiliatesConfig} className="h-64 w-full">
                <BarChart
                  accessibilityLayer
                  data={affiliates}
                  layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={72} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="orders" fill="var(--color-orders)" radius={[0, 5, 5, 0]} maxBarSize={22} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Empty className="h-64 border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>Chưa có đơn affiliate trong tháng</EmptyTitle>
                  <EmptyDescription>Biểu đồ sẽ cập nhật ngay khi website ghi nhận đơn qua mã affiliate.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
