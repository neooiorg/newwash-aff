import type { Metadata } from "next";

import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview } from "./_components/performance-overview";
import { SubscriberOverview } from "./_components/subscriber-overview";

export const metadata: Metadata = {
  title: "Tổng quan template | NewWash Aff",
  description: "Trang tổng quan mẫu của admin template, dùng để tham khảo giao diện và các widget.",
  alternates: {
    canonical: "/dashboard/default",
  },
};

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tổng quan template</h1>
        <p className="text-muted-foreground text-sm">Các chỉ số bên dưới là dữ liệu mẫu của template.</p>
      </div>
      <MetricCards />
      <PerformanceOverview />
      <SubscriberOverview />
    </div>
  );
}
