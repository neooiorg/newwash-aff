import { redirect } from "next/navigation";

export default async function Page() {
  redirect("/auth/admin?mode=affiliate");
}
