import "server-only";

import { cookies } from "next/headers";

import { getPool } from "@/lib/affiliates/db";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const AFFILIATE_COOKIE = "newwash_affiliate";
const SESSION_AGE = 60 * 60 * 24 * 30;

function secret() {
  return process.env.AFFILIATE_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "";
}

function sign(value: string) {
  const key = secret();
  return key ? createHmac("sha256", key).update(value).digest("hex") : "";
}

export function makeAffiliateSession(affiliateId: string) {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_AGE);
  const payload = `${affiliateId}.${expires}`;
  const signature = sign(payload);
  if (!signature) throw new Error("AFFILIATE_SESSION_SECRET is missing");
  return `${payload}.${signature}`;
}

export function parseAffiliateSession(value: string | undefined): string | null {
  if (!value) return null;
  const [affiliateId, expires, received] = value.split(".");
  if (!zUuid(affiliateId) || !/^\d{10}$/.test(expires || "") || !/^[0-9a-f]{64}$/.test(received || "")) return null;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return null;
  const expected = sign(`${affiliateId}.${expires}`);
  if (!expected) return null;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex")) ? affiliateId : null;
}

function zUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function getAffiliateSessionId() {
  return parseAffiliateSession((await cookies()).get(AFFILIATE_COOKIE)?.value);
}

export async function getApprovedAffiliateSessionId() {
  const affiliateId = await getAffiliateSessionId();
  if (!affiliateId) return null;
  const result = await getPool().query<{ id: string }>(
    "SELECT id FROM newwash_affiliates WHERE id = $1 AND status = 'approved'",
    [affiliateId],
  );
  return result.rows[0]?.id ?? null;
}

export function createAffiliateAccessKey() {
  return randomBytes(6).toString("hex").toUpperCase();
}

export function hashAffiliateAccessKey(accessKey: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(accessKey, salt, 64).toString("hex")}`;
}

function verifyAccessKey(accessKey: string, stored: string | null) {
  if (!stored) return false;
  const [salt, expected] = stored.split(":");
  if (!salt || !/^[0-9a-f]{128}$/.test(expected || "")) return false;
  return timingSafeEqual(scryptSync(accessKey, salt, 64), Buffer.from(expected, "hex"));
}

export async function verifyAffiliateLogin(account: string, password: string) {
  const result = await getPool().query<{ id: string; access_secret_hash: string | null }>(
    `SELECT id, access_secret_hash FROM newwash_affiliates
     WHERE status = 'approved' AND lower(contact) = lower($1)
     LIMIT 1`,
    [account.trim()],
  );
  const affiliate = result.rows[0];
  return affiliate && verifyAccessKey(password.trim(), affiliate.access_secret_hash) ? affiliate.id : null;
}

export async function affiliateLoginAllowed(identifierHash: string) {
  const result = await getPool().query<{ blocked: boolean }>(
    "SELECT coalesce(locked_until > now(), false) AS blocked FROM newwash_affiliate_login_attempts WHERE identifier_hash = $1",
    [identifierHash],
  );
  return !result.rows[0]?.blocked;
}

export async function recordAffiliateLoginFailure(identifierHash: string) {
  await getPool().query(
    `INSERT INTO newwash_affiliate_login_attempts (identifier_hash, attempts)
     VALUES ($1, 1)
     ON CONFLICT (identifier_hash) DO UPDATE SET
       attempts = CASE
         WHEN newwash_affiliate_login_attempts.window_started_at < now() - interval '15 minutes' THEN 1
         ELSE newwash_affiliate_login_attempts.attempts + 1
       END,
       window_started_at = CASE
         WHEN newwash_affiliate_login_attempts.window_started_at < now() - interval '15 minutes' THEN now()
         ELSE newwash_affiliate_login_attempts.window_started_at
       END,
       locked_until = CASE
         WHEN (CASE
           WHEN newwash_affiliate_login_attempts.window_started_at < now() - interval '15 minutes' THEN 1
           ELSE newwash_affiliate_login_attempts.attempts + 1
         END) >= 5 THEN now() + interval '15 minutes'
         ELSE NULL
       END`,
    [identifierHash],
  );
}

export async function clearAffiliateLoginFailures(identifierHash: string) {
  await getPool().query("DELETE FROM newwash_affiliate_login_attempts WHERE identifier_hash = $1", [identifierHash]);
}

export const affiliateCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_AGE,
};
