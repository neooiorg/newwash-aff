import { NewWashAuthShell } from "@/components/newwash-auth-shell";

import { ApplicationForm } from "./_components/application-form";

export const metadata = { title: "Đăng ký cộng tác viên | NewWash" };

export default function Page() {
  return (
    <NewWashAuthShell>
      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-medium">Đăng ký cộng tác viên</h1>
          <p className="text-muted-foreground text-sm">Tạo tài khoản và gửi thông tin để NewWash xét duyệt.</p>
        </div>
        <ApplicationForm />
      </div>
    </NewWashAuthShell>
  );
}
