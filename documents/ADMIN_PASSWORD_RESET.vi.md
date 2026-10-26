# Đặt lại mật khẩu người dùng

> 🌐 Language / Ngôn ngữ: [English](ADMIN_PASSWORD_RESET.md) | **Tiếng Việt**

Mở **Quản lý người dùng** (`/#/admin/users`) và chọn nút hình chìa khóa của tài khoản cần reset. Admin chỉ thấy thao tác cho User; Super Admin thấy cho User/Admin. Chính mình và tài khoản ngang/cao quyền không có thao tác này. Tự đổi mật khẩu tại Profile.

Modal hiển thị tên/email tài khoản đích và cảnh báo đăng xuất mọi thiết bị. Nhập mật khẩu mới và nhập lại để xác nhận, rồi chọn **Đặt lại mật khẩu**. Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8; giữ nguyên khoảng trắng. Đóng bằng nút hủy, nút đóng hoặc Escape sẽ xóa các ô mật khẩu.

Frontend gửi một POST tới `/api/admin/users/:id/reset-password`; backend kiểm tra quyền, đổi mật khẩu, thu hồi mọi phiên và ghi audit trong cùng giao dịch. Khi thành công, chuyển mật khẩu mới qua kênh an toàn; người dùng đăng nhập lại. Không có email tự động hoặc yêu cầu bắt buộc đổi mật khẩu ở lần đăng nhập tiếp theo.

Chế độ mock giải thích rằng cần backend thật và không giả lập đổi mật khẩu thành công. Giao diện xóa thông tin khi đổi phiên/backend hoặc rời trang, chặn nhấn gửi trùng và bỏ qua phản hồi từ phiên cũ. Request lỗi không tự động gửi lại; timeout có thể chưa rõ kết quả nên cần kiểm tra trước khi thử lại.

Backend cũ chưa có endpoint sẽ trả lỗi; phải triển khai cả hai dự án cùng phiên bản tương thích. [Hợp đồng backend](https://github.com/dangkhoa2016/Hono-Auth-API-Cloudflare-Worker/blob/main/documents/ADMIN_PASSWORD_RESET.vi.md). Mã nguồn: [modal](../vue/components/PasswordResetModal.vue), [composable](../vue/composables/useAdminPasswordReset.js).
