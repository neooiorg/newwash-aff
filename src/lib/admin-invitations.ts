import { createHash, randomBytes } from "node:crypto";

export const ADMIN_INVITE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createAdminInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAdminInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isAdminInviteToken(token: string) {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}
