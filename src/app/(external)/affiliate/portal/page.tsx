import { AffiliatePageHeader } from "@/app/(main)/dashboard/affiliates/_components/affiliate-page-header";
import { AffiliateAnalyticsDashboard } from "@/components/affiliate/affiliate-analytics-dashboard";

export const metadata = { title: "Tổng quan của tôi | NewWash Aff" };

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Tổng quan của tôi"
        description="Theo dõi lượt nhấp, đơn hàng, doanh thu và hoa hồng của bạn theo thời gian thực."
      />
      <AffiliateAnalyticsDashboard mode="affiliate" />
    </div>
  );
}
