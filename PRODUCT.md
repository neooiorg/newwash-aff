# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Chủ cửa hàng giặt ủi quản lý cộng tác viên affiliate. Cộng tác viên chia sẻ mã hoặc QR để giới thiệu khách đặt đơn.

## Product Purpose

NewWash Aff duyệt cộng tác viên và cấp QR riêng cho từng người. Mọi QR dẫn về cùng website cửa hàng, mang mã aff tương ứng. Website sở hữu đơn hàng và gửi sự kiện tạo đơn, hoàn thành về hệ thống affiliate để ghi nhận người giới thiệu.

## Capabilities and Constraints

- Giai đoạn hiện tại là giao diện và luồng mẫu, với cộng tác viên và đơn được lưu trong PostgreSQL trên Neon.
- Mỗi cộng tác viên được duyệt có mã và QR dẫn đến website cửa hàng kèm mã giới thiệu; popup tự mở khi truy cập từ QR.
- Website bất kỳ của cửa hàng có thể nhúng nút popup đặt đơn qua một script.
- Website tạo và hoàn thành đơn. Backend website gửi sự kiện có mã đơn riêng để hệ thống aff lưu quy thuộc; KiotViet Retail chỉ là dữ liệu tham chiếu tùy chọn.
- Admin có phiên đăng nhập để xem và xét duyệt. Quy tắc hoa hồng chưa được xác định; kết nối KiotViet thật đang chờ khóa Retail của cửa hàng.
- Dữ liệu cộng tác viên, đơn hàng và cấu hình website cập nhật realtime trên các trang admin qua WebSocket; thông báo thay đổi từ PostgreSQL không chứa thông tin khách hàng.

## Brand Commitments

- Tên làm việc: NewWash Aff, suy ra từ tên workspace; có thể đổi sau.
- Font giao diện: Manrope.

## Product Principles

- Duyệt hồ sơ và chia sẻ mã giới thiệu nhanh.
- Giúp cửa hàng nhận biết đơn đến từ cộng tác viên nào.
- Chỉ ghi nhận đơn hoàn thành khi website cửa hàng gửi sự kiện hoàn thành cho đúng mã đơn.
