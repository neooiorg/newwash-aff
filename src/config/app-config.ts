import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "NewWash Aff",
  url: "http://localhost:3000",
  repository: "https://github.com/arhamkhnz/next-shadcn-admin-dashboard",
  version: packageJson.version,
  copyright: `© ${currentYear}, NewWash Aff.`,
  meta: {
    title: "NewWash Aff — Quản lý cộng tác viên giặt ủi",
    description: "Tạo mã giới thiệu, chia sẻ QR và nhúng biểu mẫu đặt đơn cho cửa hàng giặt ủi.",
  },
};
