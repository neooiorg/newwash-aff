import { redirect } from "next/navigation";

import { NewWashAuthShell } from "@/components/newwash-auth-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_EMAIL, hasAdminSession } from "@/lib/admin-auth";

import { AdminLoginForm } from "./_components/admin-login-form";
import { AffiliateLoginForm } from "./_components/affiliate-login-form";

export const metadata = { title: "Đăng nhập | NewWash Aff" };

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (await hasAdminSession()) redirect("/dashboard/affiliates");
  const { mode } = await searchParams;
  const defaultTab = mode === "affiliate" ? "affiliate" : "admin";
  const demoEmail = process.env.ADMIN_EMAIL ?? ADMIN_EMAIL;
  const demoPassword = process.env.ADMIN_DEMO_PASSWORD ?? "";

  return (
    <NewWashAuthShell>
      <div className="mx-auto flex w-full max-w-[380px] flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-medium">Đăng nhập hệ thống</h1>
          <p className="text-muted-foreground text-sm">Chọn tài khoản quản trị hoặc affiliate để vào nhanh.</p>
        </div>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin">Quản trị</TabsTrigger>
            <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
          </TabsList>
          <TabsContent value="admin" className="pt-4">
            <AdminLoginForm demoEmail={demoEmail} demoPassword={demoPassword} />
          </TabsContent>
          <TabsContent value="affiliate" className="pt-4">
            <AffiliateLoginForm defaultAccount="minhanh.demo@newwash.local" defaultPassword="NewWash@2026" />
          </TabsContent>
        </Tabs>
      </div>
    </NewWashAuthShell>
  );
}
