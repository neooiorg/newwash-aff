import type { CSSProperties, ReactNode } from "react";

import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "react-email";

type NewWashEmailProps = {
  preview: string;
  title: string;
  children: ReactNode;
  actionHref: string;
  actionLabel: string;
  footer: string;
  logoUrl: string;
};

const colors = {
  background: "#fafafa",
  border: "#e5e5e5",
  foreground: "#171717",
  muted: "#737373",
  yellow: "#facc15",
  yellowSoft: "#fffbeb",
};

export function NewWashEmail({
  preview,
  title,
  children,
  actionHref,
  actionLabel,
  footer,
  logoUrl,
}: NewWashEmailProps) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={brandStyle}>
            <Img src={logoUrl} width="168" height="63" alt="NewWash" style={logoStyle} />
          </Section>
          <Section style={contentStyle}>
            <Heading style={headingStyle}>{title}</Heading>
            <Section style={messageStyle}>{children}</Section>
            <Button href={actionHref} style={buttonStyle}>
              {actionLabel}
            </Button>
            <Section style={helperBoxStyle}>
              <Text style={helperStyle}>Nút không hoạt động? Sao chép đường dẫn dưới đây vào trình duyệt.</Text>
              <Text style={linkStyle}>{actionHref}</Text>
            </Section>
            <Hr style={dividerStyle} />
            <Text style={footerStyle}>{footer}</Text>
            <Text style={signatureStyle}>NewWash Aff · Quản lý affiliate giặt ủi</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function AdminInviteEmail({
  name,
  acceptUrl,
  logoUrl,
}: {
  name?: string | null;
  acceptUrl: string;
  logoUrl: string;
}) {
  return (
    <NewWashEmail
      preview="Bạn được mời tham gia đội ngũ quản trị NewWash Aff"
      title="Bạn được mời tham gia NewWash Aff"
      actionHref={acceptUrl}
      actionLabel="Xác nhận lời mời"
      footer="Lời mời có hiệu lực trong 7 ngày. Sau khi xác nhận, hãy đăng nhập bằng đúng tài khoản Google nhận email này."
      logoUrl={logoUrl}
    >
      <Text style={paragraphStyle}>Xin chào {name?.trim() || "bạn"},</Text>
      <Text style={paragraphStyle}>
        Bạn được mời vào trang quản trị NewWash Aff để cùng theo dõi cộng tác viên, đơn hàng và vận hành hệ thống.
      </Text>
    </NewWashEmail>
  );
}

export function AffiliateApprovedEmail({
  name,
  code,
  portalUrl,
  logoUrl,
}: {
  name: string;
  code: string;
  portalUrl: string;
  logoUrl: string;
}) {
  return (
    <NewWashEmail
      preview={`Hồ sơ affiliate ${code} đã được duyệt`}
      title="Hồ sơ affiliate đã được duyệt"
      actionHref={portalUrl}
      actionLabel="Mở trang affiliate"
      footer="Bạn có thể đăng nhập bằng tài khoản và mật khẩu đã đăng ký, hoặc dùng đúng email Google của hồ sơ."
      logoUrl={logoUrl}
    >
      <Text style={paragraphStyle}>Xin chào {name},</Text>
      <Text style={paragraphStyle}>
        Hồ sơ cộng tác viên của bạn đã được duyệt. Mã affiliate của bạn là <strong>{code}</strong>. Lượt nhấp, đơn hàng
        và hoa hồng sẽ được cập nhật theo thời gian thực trong trang affiliate.
      </Text>
      <Section style={codeStyle}>
        <Text style={codeLabelStyle}>MÃ AFFILIATE</Text>
        <Text style={codeValueStyle}>{code}</Text>
      </Section>
    </NewWashEmail>
  );
}

const bodyStyle: CSSProperties = {
  backgroundColor: "#f5f5f5",
  color: colors.foreground,
  fontFamily: "Manrope, Arial, sans-serif",
  margin: 0,
  padding: "40px 12px",
};

const containerStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${colors.border}`,
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
};

const brandStyle: CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
  padding: "22px 32px 18px",
};
const logoStyle: CSSProperties = { display: "block", height: "auto", maxWidth: "168px" };
const contentStyle: CSSProperties = { padding: "32px" };
const headingStyle: CSSProperties = { fontSize: "26px", lineHeight: "34px", margin: "0 0 18px" };
const messageStyle: CSSProperties = { color: colors.muted };
const paragraphStyle: CSSProperties = { fontSize: "15px", lineHeight: "24px", margin: "0 0 14px" };
const buttonStyle: CSSProperties = {
  backgroundColor: colors.yellow,
  borderRadius: "10px",
  color: colors.foreground,
  display: "block",
  fontSize: "15px",
  fontWeight: 700,
  margin: "26px 0 22px",
  padding: "14px 22px",
  textAlign: "center",
  textDecoration: "none",
};
const helperBoxStyle: CSSProperties = {
  backgroundColor: colors.background,
  borderRadius: "10px",
  padding: "14px 16px",
};
const helperStyle: CSSProperties = { color: colors.muted, fontSize: "12px", lineHeight: "18px", margin: "0 0 6px" };
const linkStyle: CSSProperties = {
  color: colors.foreground,
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
  wordBreak: "break-all",
};
const dividerStyle: CSSProperties = { borderColor: colors.border, margin: "28px 0 20px" };
const footerStyle: CSSProperties = { color: colors.muted, fontSize: "12px", lineHeight: "18px", margin: 0 };
const signatureStyle: CSSProperties = {
  color: colors.foreground,
  fontSize: "12px",
  fontWeight: 700,
  margin: "14px 0 0",
};
const codeStyle: CSSProperties = {
  backgroundColor: colors.yellowSoft,
  borderRadius: "12px",
  margin: "20px 0 0",
  padding: "16px 18px",
};
const codeLabelStyle: CSSProperties = {
  color: colors.muted,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "1px",
  margin: 0,
};
const codeValueStyle: CSSProperties = { fontSize: "22px", fontWeight: 800, margin: "4px 0 0" };
