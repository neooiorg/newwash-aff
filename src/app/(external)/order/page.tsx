import { redirect } from "next/navigation";

import { getPool } from "@/lib/affiliates/db";
import { referralUrl } from "@/lib/affiliates/links";

import { OrderForm } from "./_components/order-form";

export const metadata = { title: "Đặt đơn giặt ủi | NewWash" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ aff?: string | string[]; embed?: string; preview?: string; host?: string | string[] }>;
}) {
  const params = await searchParams;
  const affiliateCode =
    typeof params.aff === "string"
      ? params.aff
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 20)
      : "";
  if (params.embed !== "1" && affiliateCode) {
    let storefrontUrl = "";
    try {
      const result = await getPool().query<{ storefront_url: string }>(
        "SELECT storefront_url FROM newwash_settings WHERE id = 1",
      );
      storefrontUrl = result.rows[0]?.storefront_url ?? "";
    } catch {
      /* Website chưa được cấu hình. */
    }
    if (storefrontUrl) redirect(referralUrl(storefrontUrl, "", affiliateCode));
  }
  return (
    <OrderForm
      affiliateCode={affiliateCode}
      embedded={params.embed === "1"}
      preview={params.preview === "1"}
      hostOrigin={typeof params.host === "string" ? params.host : ""}
    />
  );
}
