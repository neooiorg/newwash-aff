import Image from "next/image";
import { redirect } from "next/navigation";

import { AffiliateAnalyticsDashboard } from "@/components/affiliate/affiliate-analytics-dashboard";
import { Button } from "@/components/ui/button";
import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";
import { getPool } from "@/lib/affiliates/db";

import { logoutAffiliate } from "../login/actions";

export const metadata = { title: "Thống kê của tôi | NewWash Aff" };

export default async function Page() {
  const affiliateId = await getApprovedAffiliateSessionId();
  if (!affiliateId) redirect("/affiliate/login");
  const result = await getPool().query<{ name: string; code: string }>(
    "SELECT name, coalesce(code, '') AS code FROM newwash_affiliates WHERE id = $1 AND status = 'approved'",
    [affiliateId],
  );
  const affiliate = result.rows[0];
  if (!affiliate) redirect("/affiliate/login");

  return (
    <main className="bg-muted/20 min-h-dvh">
      <header className="bg-background border-b">
        <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/newwash-logo.svg" alt="NewWash" width={132} height={48} className="h-auto w-28" unoptimized />
            <div className="bg-border hidden h-6 w-px sm:block" />
            <div className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-sm font-medium">{affiliate.name}</span>
              <span className="text-muted-foreground text-xs">{affiliate.code}</span>
            </div>
          </div>
          <form action={logoutAffiliate}>
            <Button type="submit" variant="outline" size="sm">
              Đăng xuất
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Hiệu suất của bạn</h1>
            <p className="text-muted-foreground text-sm">
              Lượt nhấp, đơn hàng và hoa hồng được cập nhật theo thời gian thực.
            </p>
          </div>
        </div>
        <AffiliateAnalyticsDashboard mode="affiliate" />
      </div>
    </main>
  );
}
