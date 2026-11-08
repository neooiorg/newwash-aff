import "server-only";

import { Resend } from "resend";

import { AdminInviteEmail, AffiliateApprovedEmail } from "@/components/emails/newwash-email";

type EmailResult = { sent: true; id: string | null } | { sent: false; error: string };

function appOrigin() {
  return (process.env.APP_ORIGIN || process.env.AUTH_URL || "https://newwash-aff.apps.neooi.com").replace(/\/$/, "");
}

function sender() {
  return process.env.RESEND_FROM_EMAIL || "NewWash Aff <notifications@neooi.com>";
}

function logoUrl() {
  return `${appOrigin()}/newwash-logo.png`;
}

async function sendEmail(
  payload: Parameters<Resend["emails"]["send"]>[0],
  idempotencyKey: string,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY chưa được cấu hình." };

  try {
    const { data, error } = await new Resend(apiKey).emails.send(payload, { idempotencyKey });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id ?? null };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Không gửi được email." };
  }
}

export function adminInviteUrl(token: string) {
  return `${appOrigin()}/auth/admin/invite?token=${encodeURIComponent(token)}`;
}

export async function sendAdminInviteEmail({
  email,
  name,
  token,
}: {
  email: string;
  name?: string | null;
  token: string;
}) {
  const acceptUrl = adminInviteUrl(token);
  return sendEmail(
    {
      from: sender(),
      to: email,
      subject: "Bạn được mời tham gia quản trị NewWash Aff",
      react: <AdminInviteEmail name={name} acceptUrl={acceptUrl} logoUrl={logoUrl()} />,
    },
    `admin-invite/${token.slice(0, 24)}`,
  );
}

export async function sendAffiliateApprovedEmail({
  email,
  name,
  code,
  affiliateId,
}: {
  email: string;
  name: string;
  code: string;
  affiliateId: string;
}) {
  return sendEmail(
    {
      from: sender(),
      to: email,
      subject: `Hồ sơ affiliate ${code} đã được duyệt`,
      react: (
        <AffiliateApprovedEmail
          name={name}
          code={code}
          portalUrl={`${appOrigin()}/auth/admin?mode=affiliate`}
          logoUrl={logoUrl()}
        />
      ),
    },
    `affiliate-approved/${affiliateId}`,
  );
}
