import "server-only";

import { cookies } from "next/headers";

import { auth } from "@/auth";
import { getPool } from "@/lib/affiliates/db";

import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "newwash_admin";
export const ADMIN_EMAIL = "admin@newwash.local";
const SESSION_AGE = 60 * 60 * 24 * 7;

function signature(value: string): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function verifyAdminPassword(email: string, password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored || email.trim().toLowerCase() !== (process.env.ADMIN_EMAIL || ADMIN_EMAIL).toLowerCase()) return false;
  const [salt, expected] = stored.split(":");
  if (!salt || !expected || !/^[0-9a-f]{128}$/.test(expected)) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export function makeAdminSession(): string {
  const payload = String(Math.floor(Date.now() / 1000) + SESSION_AGE);
  const mac = signature(payload);
  if (!mac) throw new Error("ADMIN_SESSION_SECRET is missing");
  return `${payload}.${mac}`;
}

export function isValidAdminSession(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, received] = value.split(".");
  if (!payload || !received || !/^\d{10}$/.test(payload) || !/^[0-9a-f]{64}$/.test(received)) return false;
  if (Number(payload) <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(payload);
  return Boolean(expected && timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex")));
}

export async function hasAdminSession(): Promise<boolean> {
  if (isValidAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return true;
  const session = await auth();
  if (session?.user.role !== "admin" || !session.user.email) return false;

  const email = session.user.email.trim().toLowerCase();
  const primaryEmail = (process.env.GOOGLE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || ADMIN_EMAIL).trim().toLowerCase();
  if (email === primaryEmail) return true;

  const member = await getPool().query<{ id: string }>(
    "SELECT id FROM newwash_admin_members WHERE status = 'active' AND lower(email) = $1 LIMIT 1",
    [email],
  );
  return Boolean(member.rows[0]);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_AGE,
};
