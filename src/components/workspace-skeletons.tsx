import { AsciiPanelSkeleton } from "@/components/ascii-feedback";

export function TableWorkspaceSkeleton({ label = "Đang tải dữ liệu", seed = 1 }: { label?: string; seed?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={label}>
      <AsciiPanelSkeleton className="h-12 w-full" height={32} rows={2} seed={seed} />
      <AsciiPanelSkeleton className="h-64 w-full" height={224} rows={13} seed={seed + 1} />
      <AsciiPanelSkeleton className="h-10 w-full" height={24} rows={2} seed={seed + 2} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6" role="status" aria-label="Đang tải chi tiết đơn hàng">
      <AsciiPanelSkeleton className="h-20 w-full" height={56} rows={4} seed={41} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <AsciiPanelSkeleton className="h-112 w-full" height={416} rows={22} seed={42} />
        <div className="flex flex-col gap-4">
          <AsciiPanelSkeleton className="h-52 w-full" height={176} rows={10} seed={43} />
          <AsciiPanelSkeleton className="h-52 w-full" height={176} rows={10} seed={44} />
        </div>
      </div>
      <span className="sr-only">Đang tải chi tiết đơn hàng</span>
    </div>
  );
}

export function WalletWorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6" role="status" aria-label="Đang tải dữ liệu ví">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Đang tải số dư ví">
        {Array.from({ length: 4 }, (_, index) => (
          <AsciiPanelSkeleton
            key={`wallet-balance-${index + 1}`}
            className="h-36 w-full"
            height={112}
            rows={7}
            seed={index + 31}
          />
        ))}
      </section>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <AsciiPanelSkeleton className="h-112 w-full xl:col-span-4" height={416} rows={22} seed={35} />
        <AsciiPanelSkeleton className="h-112 w-full xl:col-span-8" height={416} rows={22} seed={36} />
      </div>
      <span className="sr-only">Đang tải dữ liệu ví</span>
    </div>
  );
}
