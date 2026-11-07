import { redirect } from "next/navigation";

import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";
import { getPool } from "@/lib/affiliates/db";

import { AffiliateLinkWorkspace } from "./_components/affiliate-link-workspace";

export const metadata = { title: "Link & QR của tôi | NewWash Aff" };

export default async function Page() {
  const affiliateId = await getApprovedAffiliateSessionId();
  if (!affiliateId) redirect("/auth/admin?mode=affiliate");
  const [affiliateResult, settingsResult] = await Promise.all([
    getPool().query<{ code: string }>(
      "SELECT coalesce(code, '') AS code FROM newwash_affiliates WHERE id = $1 AND status = 'approved'",
      [affiliateId],
    ),
    getPool().query<{ storefront_url: string }>("SELECT storefront_url FROM newwash_settings WHERE id = 1"),
  ]);
  return (
    <AffiliateLinkWorkspace
      code={affiliateResult.rows[0]?.code ?? ""}
      storefrontUrl={settingsResult.rows[0]?.storefront_url ?? ""}
    />
  );
}
