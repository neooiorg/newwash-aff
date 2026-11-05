import { OverviewWorkspace } from "./_components/overview-workspace";

export const metadata = { title: "Tổng quan affiliate | NewWash Aff" };

export default async function Page({ searchParams }: { searchParams: Promise<{ affiliate?: string }> }) {
  const { affiliate } = await searchParams;
  return <OverviewWorkspace initialAffiliateId={affiliate ?? ""} />;
}
