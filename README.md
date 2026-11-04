# NewWash Aff (demo)

Giao diện quản lý affiliate cho cửa hàng giặt ủi. Font mặc định là Manrope; dữ liệu cộng tác viên và đơn được lưu trong PostgreSQL trên Neon.

Trang `/dashboard/affiliates` dùng số liệu minh họa cho KPI và biểu đồ. Các trang cộng tác viên và đơn đặt vẫn đọc dữ liệu thật từ Neon.

## Luồng demo

1. Chạy `npm install`, đặt `DATABASE_URL` trong `.env.local`, rồi chạy `node --env-file=.env.local scripts/migrate-db.mjs` và `npm run dev` (chỉ mở trên 127.0.0.1).
2. Cộng tác viên gửi hồ sơ tại `/affiliate/apply`. Admin mở `/dashboard/affiliates/partners` để duyệt hoặc từ chối. Sau khi duyệt, admin có thể sao chép link hoặc tải QR.
3. Tại `/dashboard/affiliates/embed`, lưu URL website cửa hàng và đặt script popup trên website đó. Link và QR của cộng tác viên mở URL này với `?aff=MA_AFF&nw_popup=1`; popup tự mở.
4. Admin quản lý tên, giá/kg, khối lượng tối thiểu, thời gian giao, ghi chú và trạng thái dịch vụ tại `/dashboard/affiliates/services`. Popup dùng Wizard Expandable của Cult UI để đi qua bốn bước; danh sách dịch vụ và phụ phí giặt riêng đồ trắng được đọc từ Neon. Popup chuyển thông tin đặt lịch cho API của chính website cửa hàng. Website tạo đơn và trả `{ "orderId": "..." }` cho popup.
5. Backend website gửi `order.created` và sau đó `order.completed` về API affiliate. Hệ thống affiliate ghi nhận người giới thiệu theo mã QR; trạng thái hoàn thành chỉ do website xác nhận.
6. Mở `/embed-example.html` để xem website mẫu dùng chính `embed.js`.

## Dữ liệu realtime

`npm run dev` khởi động Next.js ở cổng 3001 và WebSocket ở cổng 3002. Trigger PostgreSQL phát thông báo sau khi cộng tác viên, đơn hàng, dịch vụ hoặc cấu hình website thay đổi. WebSocket chỉ gửi tên bảng thay đổi, không gửi thông tin khách hàng; dashboard và popup tải lại dữ liệu qua API. Đăng ký aff, duyệt hồ sơ, sự kiện đơn từ website và webhook KiotViet đều được cập nhật trên các tab admin đang mở. Kết nối tự nối lại khi đứt và đồng bộ lại khi tab được mở lại.

Chạy `node --env-file=.env.local scripts/migrate-db.mjs` để cài trigger. Kênh `LISTEN` cần kết nối PostgreSQL trực tiếp; mặc định server realtime bỏ hậu tố `-pooler` trong `DATABASE_URL` của Neon. Có thể đặt `REALTIME_DATABASE_URL` nếu dùng URL trực tiếp riêng.

Khi triển khai, chạy `npm start` trên Node server thường trú và cấu hình reverse proxy cho WebSocket `/realtime` và `/services` tới `REALTIME_HOST:REALTIME_PORT` với HTTP Upgrade. Đặt `APP_ORIGIN` là origin chính xác của dashboard và `NEXT_PUBLIC_REALTIME_URL=wss://ten-mien-cua-ban/realtime`. Không đặt URL database hoặc khóa phiên ở biến `NEXT_PUBLIC_`. Triển khai chỉ có serverless request handlers sẽ không giữ được kết nối WebSocket/`LISTEN` này.

Ví dụ nhúng vào website riêng (thay tên miền bằng địa chỉ triển khai của bạn):

```html
<script async src="https://your-aff-platform.example/embed.js" data-order-endpoint="/api/newwash/orders"></script>
```

Script tạo nút đặt lịch nổi trên mọi domain được nhúng. Khi vào từ QR (`aff` và `nw_popup=1`), popup tự mở và mang theo mã aff. API `data-order-endpoint` chạy trên chính domain cửa hàng, nhận JSON gồm `customer` (tùy chọn), `phone`, `service`, `address` (địa chỉ nhận), `partnerCode`, `serviceCode`, `category`, `quantityKg`, `washWhitesSeparately`, `pickupDate`, `pickupTime`, `deliveryDate`, `deliveryTime`, `deliveryAddress`, `notes`, `coupon`, `estimatedTotal`. Ngày dạng `YYYY-MM-DD`, giờ dạng `HH:mm`. `estimatedTotal` chỉ là tạm tính ở giao diện; website phải tự xác nhận dịch vụ, mức giá và mã giảm giá. Sau khi website tạo đơn, trả JSON `{ "orderId": "MA_DON_WEBSITE" }`. Website chịu trách nhiệm lưu và xử lý đơn.

Backend website gửi hai sự kiện đến `POST https://your-aff-platform.example/api/integrations/storefront/orders` với header `Authorization: Bearer <AFFILIATE_STOREFRONT_SECRET>` và `Content-Type: application/json`. Khóa chỉ đặt trên backend website, không đưa vào script hoặc trình duyệt.

```json
{"event":"order.created","orderId":"WEB-123","affiliateCode":"MINHANH24","customer":"Nguyễn An","phone":"0901234567","service":"Giặt sấy tiêu chuẩn","address":"1 Đường A","amount":150000}
```

```json
{"event":"order.completed","orderId":"WEB-123","amount":150000}
```

`order.created` cần mã aff đã được duyệt; gửi lại cùng `orderId` và mã aff sẽ không tạo trùng. `amount` là số tiền VND nguyên, có thể cập nhật bằng số thực thu khi gửi `order.completed`. Doanh thu tổng quan chỉ tính đơn website đã hoàn tất và có giá trị này. `order.completed` chỉ gửi khi đơn thực sự hoàn tất trên website. Hai sự kiện phải dùng cùng `orderId`. Những đơn demo cũ được đánh dấu riêng và không tính vào chỉ số đơn từ website.

KiotViet Retail là nguồn đối chiếu tùy chọn, không quyết định trạng thái ghi nhận aff. Khi có `KIOTVIET_RETAILER`, `KIOTVIET_CLIENT_ID`, `KIOTVIET_CLIENT_SECRET`, admin có thể liên kết mã KiotViet để xem trạng thái tham chiếu. Webhook `order.update` và `invoice.update` có thể đăng ký tới `https://your-aff-platform.example/api/webhooks/kiotviet` với cùng secret Base64 trong `KIOTVIET_WEBHOOK_SECRET`.

Ứng dụng lưu dữ liệu trên Neon. API đọc danh sách và xét duyệt yêu cầu phiên admin; biểu mẫu đăng ký và đặt đơn là công khai. Luồng này chưa có thanh toán hoặc quy tắc hoa hồng. Khi triển khai công khai, cần thêm cơ chế chống spam cho biểu mẫu. Không đưa `.env.local` lên Git.

---

# Next.js Admin Template with TypeScript & Shadcn UI

**Studio Admin** - Includes multiple dashboards, authentication layouts, customizable theme presets, and more.

<img src="https://github.com/arhamkhnz/next-shadcn-admin-dashboard/blob/main/media/dashboard.png?version=5" alt="Dashboard Screenshot">

Most admin templates I found, free or paid, felt cluttered, outdated, or too rigid. I built this as a cleaner alternative with features often missing in others, such as theme toggling and layout controls, while keeping the design modern, minimal, and flexible.

> **View demo:** [studio admin](https://studio-admin.arhamkhnz.com)

> [!NOTE]
> Looking for the Base UI version? Check out [next-shadcn-admin-dashboard-baseui](https://github.com/arhamkhnz/next-shadcn-admin-dashboard-baseui).
>
> Looking for the React Aria version? Check out [arhamkhnz/next-shadcn-admin-dashboard-aria](https://github.com/arhamkhnz/next-shadcn-admin-dashboard-aria).
>
> Looking for the TanStack Start version? Check out [tanstack-shadcn-admin-dashboard](https://github.com/arhamkhnz/tanstack-shadcn-admin-dashboard).

> [!TIP]
> If you're looking for individual blocks, please refer to [Studio Blocks](https://studio-blocks.arhamkhnz.com/).

## Features

- Built with Next.js 16, TypeScript, Tailwind CSS v4, and Shadcn UI  
- Responsive and mobile-friendly  
- Customizable theme presets (light/dark modes with color schemes like Tangerine, Brutalist, and more)  
- Flexible layouts (collapsible sidebar, variable content widths)  
- Authentication flows and screens  
- Prebuilt dashboards (Default, CRM, Finance, Analytics, Productivity) plus legacy variants  
- Role-Based Access Control (RBAC) with config-driven UI and multi-tenant support *(planned)*  

> [!NOTE]
> The default dashboard uses the **shadcn neutral** theme.  
> It also includes additional color presets inspired by [Tweakcn](https://tweakcn.com):  
>
> - Tangerine  
> - Neo Brutalism  
> - Soft Pop  
>
> You can create more presets by following the same structure as the existing ones.

> Looking for the **Next.js 15** version?  
> Check out the [`archive/next15`](https://github.com/arhamkhnz/next-shadcn-admin-dashboard/tree/archive/next15) branch.  
> This branch contains the setup prior to upgrading to Next 16 and the React Compiler.

> Looking for the **Next.js 14 + Tailwind CSS v3** version?  
> Check out the [`archive/next14-tailwindv3`](https://github.com/arhamkhnz/next-shadcn-admin-dashboard/tree/archive/next14-tailwindv3) branch.  
> It has a different color theme and is not actively maintained, but I try to keep it updated with major changes.  

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4  
- **UI Components**: Shadcn UI  
- **Validation**: Zod  
- **Forms & State Management**: React Hook Form, Zustand  
- **Tables & Data Handling**: TanStack Table  
- **Tooling & DX**: Biome, Husky  

## Screens

### Available
- Default Dashboard  
- CRM Dashboard  
- Finance Dashboard  
- Analytics Dashboard  
- Productivity Dashboard  
- E-commerce Dashboard  
- Academy Dashboard  
- Logistics Dashboard  
- Infrastructure Dashboard  
- File Manager  
- Patient Monitoring  
- Products Page  
- Chat Page  
- Email Page  
- Profile  
- Users Management  
- Roles Management  
- Kanban Board  
- Tasks Page  
- Invoice Page  
- Calendar Page  
- Authentication (4 screens)  
- Legacy: Default v1, CRM v1, Finance v1, Analytics v1

### Planned
I’ve added all the planned screens. Feel free to open an issue for requesting something specific.

## Colocation File System Architecture

This project follows a **colocation-based architecture** each feature keeps its own pages, components, and logic inside its route folder.  
Shared UI, hooks, and configuration live at the top level, making the codebase modular, scalable, and easier to maintain as the app grows.

For a full breakdown of the structure with examples, see the [Next Colocation Template](https://github.com/arhamkhnz/next-colocation-template).

## Getting Started

You can run this project locally, or deploy it instantly with Vercel.

### Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farhamkhnz%2Fnext-shadcn-admin-dashboard)

_Deploy your own copy with one click._

### Run locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/arhamkhnz/next-shadcn-admin-dashboard.git
   ```
   
2. **Navigate into the project**
   ```bash
    cd next-shadcn-admin-dashboard
   ```
   
3. **Install dependencies**
   ```bash
    npm install
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

Your app will be running at [http://localhost:3000](http://localhost:3000)

### Formatting and Linting

Format, lint, and organize imports
```bash
npx @biomejs/biome check --write
```
> For more information on available rules, fixes, and CLI options, refer to the [Biome documentation](https://biomejs.dev/).

---

> [!IMPORTANT]  
> This project is updated frequently. If you’re working from a fork or an older clone, pull the latest changes before syncing. Some updates may include breaking changes.

---

Contributions are welcome. Feel free to open issues, feature requests, or start a discussion.


**Happy Vibe Coding!**
