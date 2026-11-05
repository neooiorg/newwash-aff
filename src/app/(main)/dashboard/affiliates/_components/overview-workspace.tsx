import { AffiliateAnalyticsDashboard } from "@/components/affiliate/affiliate-analytics-dashboard";

import { AffiliatePageHeader } from "./affiliate-page-header";

export function OverviewWorkspace({ initialAffiliateId = "" }: { initialAffiliateId?: string }) {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Thống kê affiliate"
        description="Theo dõi lượt nhấp, đơn hàng, doanh thu và hoa hồng của toàn hệ thống hoặc từng cộng tác viên."
      />
      <AffiliateAnalyticsDashboard mode="admin" initialAffiliateId={initialAffiliateId} />
    </div>
  );
}
