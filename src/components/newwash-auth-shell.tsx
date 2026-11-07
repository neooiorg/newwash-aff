import Image from "next/image";

import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export function NewWashAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh gap-2 p-2 lg:grid-cols-2">
      <div className="relative order-1 flex min-h-[calc(100dvh-1rem)] items-center justify-center px-6 py-16 lg:px-10">
        {children}
        <p className="text-muted-foreground absolute bottom-5 text-xs">{APP_CONFIG.copyright}</p>
      </div>

      <section className="relative order-2 hidden min-h-[calc(100dvh-1rem)] rounded-3xl bg-yellow-400 text-zinc-950 lg:flex">
        <div className="absolute top-10 flex flex-col gap-2 px-10">
          <Image
            src="/newwash-logo.svg"
            alt="Newwash"
            width={160}
            height={60}
            className="h-auto w-36"
            unoptimized
            priority
          />
          <h2 className="text-2xl font-medium">{APP_CONFIG.name}</h2>
          <p className="text-sm text-zinc-800">Quản lý cộng tác viên và đơn giặt ủi trong một nơi.</p>
        </div>

        <div className="absolute bottom-10 flex w-full gap-3 px-10">
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="font-medium">Mã QR riêng</h3>
            <p className="text-sm text-zinc-800">
              Duyệt hồ sơ và cấp mã giới thiệu để cộng tác viên chia sẻ với khách hàng.
            </p>
          </div>
          <Separator orientation="vertical" className="h-auto! bg-zinc-900/30" />
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="font-medium">Đặt đơn trên website</h3>
            <p className="text-sm text-zinc-800">Nhúng biểu mẫu đặt đơn trực tiếp vào trang của cửa hàng.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
