import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function GoogleAuthCompletePage() {
  const session = await auth();

  if (session?.user.role === "admin") redirect("/dashboard/affiliates");
  if (session?.user.role === "affiliate") redirect("/affiliate/portal");
  redirect("/auth/admin?error=AccessDenied");
}
