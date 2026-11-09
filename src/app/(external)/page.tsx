import { redirect } from "next/navigation";

import { hasAdminSession } from "@/lib/admin-auth";
import { getApprovedAffiliateSessionId } from "@/lib/affiliate-auth";

export default async function Home() {
  if (await hasAdminSession()) redirect("/dashboard/affiliates");
  if (await getApprovedAffiliateSessionId()) redirect("/affiliate/portal");
  redirect("/auth/admin");
}
