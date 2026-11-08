import type { CSSProperties, ReactNode } from "react";

import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "react-email";

type NewWashEmailProps = {
  preview: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  actionHref: string;
  actionLabel: string;
  footer: string;
};

const colors = {
  background: "#fafafa",
  border: "#e5e5e5",
  foreground: "#171717",
  muted: "#737373",
  yellow: "#facc15",
  yellowSoft: "#fef9c3",
};

export function NewWashEmail({
  preview,
  eyebrow,
  title,
  children,
  actionHref,
  actionLabel,
  footer,
}: NewWashEmailProps) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={brandBarStyle}>
            <Text style={brandStyle}>NewWash Aff</Text>
          </Section>
          <Section style={contentStyle}>
            <Text style={eyebrowStyle}>{eyebrow}</Text>
            <Heading style={headingStyle}>{title}</Heading>
            <Section style={messageStyle}>{children}</Section>
            <Button href={actionHref} style={buttonStyle}>
              {actionLabel}
            </Button>
            <Text style={helperStyle}>
              Nếu nút không hoạt động, hãy sao chép đường dẫn này vào trình duyệt:
              <br />
              <span style={linkStyle}>{actionHref}</span>
            </Text>
            <Hr style={dividerStyle} />
            <Text style={footerStyle}>{footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function AdminInviteEmail({ name, acceptUrl }: { name?: string | null; acceptUrl: string }) {
  return (
    <NewWashEmail
      preview="Bạn được mời tham gia đội ngũ quản trị NewWash Aff"
      eyebrow="LỜI MỜI QUẢN TRỊ"
      title="Tham gia đội ngũ NewWash Aff"
      actionHref={acceptUrl}
      actionLabel="Xác nhận lời mời"
      footer="Lời mời có hiệu lực trong 7 ngày. Sau khi xác nhận, hãy đăng nhập bằng đúng tài khoản Google nhận email này."
    >
      <Text style={paragraphStyle}>Xin chào {name?.trim() || "bạn"},</Text>
      <Text style={paragraphStyle}>
        Bạn được mời vào trang quản trị NewWash Aff để cùng theo dõi cộng tác viên, đơn hàng và vận hành hệ thống.
      </Text>
    </NewWashEmail>
  );
}

export function AffiliateApprovedEmail({ name, code, portalUrl }: { name: string; code: string; portalUrl: string }) {
  return (
    <NewWashEmail
      preview={`Hồ sơ affiliate ${code} đã được duyệt`}
      eyebrow="HỒ SƠ ĐÃ ĐƯỢC DUYỆT"
      title="Chào mừng bạn đến với NewWash Aff"
      actionHref={portalUrl}
      actionLabel="Mở trang affiliate"
      footer="Bạn có thể đăng nhập bằng tài khoản và mật khẩu đã đăng ký, hoặc dùng đúng email Google của hồ sơ."
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
  backgroundColor: colors.background,
  color: colors.foreground,
  fontFamily: "Manrope, Arial, sans-serif",
  margin: 0,
  padding: "32px 12px",
};

const containerStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${colors.border}`,
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
};

const brandBarStyle: CSSProperties = { backgroundColor: colors.yellow, padding: "24px 32px" };
const brandStyle: CSSProperties = { fontSize: "20px", fontWeight: 800, margin: 0 };
const contentStyle: CSSProperties = { padding: "36px 32px 28px" };
const eyebrowStyle: CSSProperties = {
  color: colors.muted,
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1.2px",
  margin: 0,
};
const headingStyle: CSSProperties = { fontSize: "28px", lineHeight: "36px", margin: "10px 0 20px" };
const messageStyle: CSSProperties = { color: colors.muted };
const paragraphStyle: CSSProperties = { fontSize: "15px", lineHeight: "24px", margin: "0 0 14px" };
const buttonStyle: CSSProperties = {
  backgroundColor: colors.foreground,
  borderRadius: "10px",
  color: "#ffffff",
  display: "block",
  fontSize: "15px",
  fontWeight: 700,
  margin: "26px 0 20px",
  padding: "14px 22px",
  textAlign: "center",
  textDecoration: "none",
};
const helperStyle: CSSProperties = { color: colors.muted, fontSize: "12px", lineHeight: "18px", margin: 0 };
const linkStyle: CSSProperties = { color: colors.foreground, wordBreak: "break-all" };
const dividerStyle: CSSProperties = { borderColor: colors.border, margin: "28px 0 20px" };
const footerStyle: CSSProperties = { color: colors.muted, fontSize: "12px", lineHeight: "18px", margin: 0 };
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
