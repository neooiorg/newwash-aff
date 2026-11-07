import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { getPool } from "@/lib/affiliates/db";

type NewWashRole = "admin" | "affiliate";

async function resolveGoogleIdentity(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const adminEmail = (process.env.GOOGLE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@newwash.local")
    .trim()
    .toLowerCase();

  if (normalizedEmail === adminEmail) return { role: "admin" as const, affiliateId: null };

  const result = await getPool().query<{ id: string }>(
    `SELECT id
     FROM newwash_affiliates
     WHERE status = 'approved' AND lower(contact) = $1
     LIMIT 1`,
    [normalizedEmail],
  );
  const affiliateId = result.rows[0]?.id;
  return affiliateId ? { role: "affiliate" as const, affiliateId } : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: { signIn: "/auth/admin", error: "/auth/admin" },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email || profile?.email_verified !== true) return false;
      return Boolean(await resolveGoogleIdentity(user.email));
    },
    async jwt({ token, user, account }) {
      if (account && user.email) {
        const identity = await resolveGoogleIdentity(user.email);
        token.role = identity?.role;
        token.affiliateId = identity?.affiliateId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as NewWashRole | undefined;
      session.user.affiliateId = typeof token.affiliateId === "string" ? token.affiliateId : null;
      return session;
    },
  },
});
