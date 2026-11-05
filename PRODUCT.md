# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Chủ cửa hàng giặt ủi quản lý cộng tác viên affiliate. Cộng tác viên chia sẻ mã hoặc QR để giới thiệu khách đặt đơn và đăng nhập để theo dõi hiệu suất của mình.

## Product Purpose

NewWash Aff duyệt cộng tác viên, cấp QR và thông tin truy cập riêng cho từng người. Mọi QR dẫn về cùng website cửa hàng, mang mã aff tương ứng. Hệ thống ghi nhận lượt mở link; website sở hữu đơn hàng và gửi sự kiện tạo đơn, hoàn thành về hệ thống affiliate để ghi nhận người giới thiệu. Admin và cộng tác viên xem hiệu suất theo thời gian, dịch vụ và trạng thái đơn.

## Capabilities and Constraints

- Giai đoạn hiện tại là giao diện và luồng mẫu, với cộng tác viên và đơn được lưu trong PostgreSQL trên Neon.
- Mỗi cộng tác viên được duyệt có mã và QR dẫn đến website cửa hàng kèm mã giới thiệu; popup tự mở khi truy cập từ QR.
- Mỗi lượt mở link affiliate được ghi nhận tối đa một lần trong phiên trình duyệt; lỗi tracking không được chặn website hoặc popup đặt đơn.
- Website bất kỳ của cửa hàng có thể nhúng nút popup đặt đơn qua một script.
- Website tạo và hoàn thành đơn. Backend website gửi sự kiện có mã đơn riêng để hệ thống aff lưu quy thuộc; KiotViet Retail chỉ là dữ liệu tham chiếu tùy chọn.
- Admin có phiên đăng nhập để xem, xét duyệt, cấp lại mã truy cập và lọc thống kê toàn hệ thống hoặc từng cộng tác viên.
- Cộng tác viên đã được duyệt đăng nhập bằng mã affiliate và mã truy cập riêng để xem lượt nhấp, đơn hàng, doanh thu và hoa hồng ước tính của chính mình.
- Hoa hồng hiện là số ước tính theo tỷ lệ lưu trên từng cộng tác viên; quy tắc đối soát và thanh toán thực tế chưa được xác định. Kết nối KiotViet thật đang chờ khóa Retail của cửa hàng.
- Dữ liệu cộng tác viên, lượt nhấp, đơn hàng và cấu hình website cập nhật realtime qua WebSocket. Kênh cộng tác viên chỉ nhận tín hiệu thay đổi thuộc hồ sơ của chính họ; thông báo từ PostgreSQL không chứa thông tin khách hàng.

## Brand Commitments

- Tên làm việc: NewWash Aff, suy ra từ tên workspace; có thể đổi sau.
- Font giao diện: Manrope.

## Product Principles

- Duyệt hồ sơ và chia sẻ mã giới thiệu nhanh.
- Giúp cửa hàng nhận biết đơn đến từ cộng tác viên nào.
- Cho cộng tác viên tự theo dõi hiệu suất mà không lộ dữ liệu của người khác.
- Chỉ ghi nhận đơn hoàn thành khi website cửa hàng gửi sự kiện hoàn thành cho đúng mã đơn.
