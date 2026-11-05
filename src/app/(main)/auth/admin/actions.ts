"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, adminCookieOptions, makeAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export async function loginAdmin(_previous: string, formData: FormData): Promise<string> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(email, password)) return "Email hoặc mật khẩu không đúng.";
  (await cookies()).set(ADMIN_COOKIE, makeAdminSession(), adminCookieOptions);
  redirect("/dashboard/affiliates");
}

export async function logoutAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/auth/admin");
}
