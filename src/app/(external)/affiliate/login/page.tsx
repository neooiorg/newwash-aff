import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";

import { AffiliateLoginForm } from "./_components/affiliate-login-form";

export const metadata = { title: "Đăng nhập cộng tác viên | NewWash Aff" };

export default async function Page() {
  if (await getApprovedAffiliateSessionId()) redirect("/affiliate/portal");
  return (
    <main className="bg-muted/30 flex min-h-dvh items-center justify-center p-4 md:p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Image
            src="/newwash-logo.svg"
            alt="NewWash"
            width={160}
            height={60}
            className="h-auto w-36"
            unoptimized
            priority
          />
          <CardTitle className="pt-3 text-2xl">Thống kê cộng tác viên</CardTitle>
          <CardDescription>
            Dành cho hồ sơ đã được duyệt. Dùng mã affiliate và mã truy cập riêng do NewWash cấp.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <AffiliateLoginForm />
          <p className="text-muted-foreground text-center text-sm">
            Chưa đăng ký?{" "}
            <Link href="/affiliate/apply" className="text-foreground font-medium underline underline-offset-4">
              Gửi hồ sơ cộng tác viên
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
