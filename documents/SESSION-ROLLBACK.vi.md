# Chuyển phiên bản và rollback phiên đăng nhập

Không hỗ trợ chạy đồng thời tab phiên bản cũ và mới. Trước mỗi lần new → old hoặc old → new:

1. Thông báo gián đoạn; đóng tất cả tab ứng dụng khác trên cùng origin.
2. Trong tab quản trị chuyển phiên bản, chạy cleanup auth, kiểm tra kết quả `cleared`, rồi tải lại phiên bản đích ngay. Không tiếp tục dùng bộ nhớ của tab cũ.
3. Đăng nhập mới. Không tự đăng nhập từ legacy mirrors; không giữ token qua lần chuyển phiên bản.

Khi đang chạy mã R11:

```js
const { invalidateAuthForRollback } = await import('/assets/js/api/sessionStorage.js');
const result = invalidateAuthForRollback(localStorage);
if (result.status !== 'cleared') throw new Error('Auth cleanup incomplete; stop version switch');
location.reload();
```

Trước re-upgrade từ bản cũ không có helper, thực hiện cùng allowlist trong browser console của chính origin ứng dụng:

```js
for (const key of ['auth-session-record','auth-api-identity','api-identity','user',
  'token','refresh_token','expires_at','refresh_expires_at']) localStorage.removeItem(key);
location.reload();
```

Nếu storage từ chối thao tác, dừng chuyển phiên bản và xử lý quyền storage. Không dùng `localStorage.clear()`: giữ `api-base-url`, ngôn ngữ, giao diện và dữ liệu không thuộc auth. Cleanup không chứng minh backend đã revoke token và không xóa được bộ nhớ tab khác.

Regression `session-rollback.test.mjs` chạy lifecycle new → simulated legacy writes → new cho logout/rotation/user replacement/partial mirrors/canonical invalid/ended, kiểm tra allowlist và không tự đăng nhập. Đây là unit tier với legacy writes mô phỏng, không phải browser chạy release cũ.

Chính sách owner: người dùng chọn phương án **2** trong hội thoại sau gói tích hợp `frontend-r12-r11-integration-addendum-20261011.zip`: **chặn đăng nhập khi trình duyệt thiếu khả năng cần thiết**. Quyết định này thay trạng thái pending R11.

Yêu cầu đăng nhập: Web Locks để tuần tự hóa thao tác ghi và localStorage đọc/ghi/xóa được. Kiểm tra trước khi gửi mật khẩu; từ chối nhận token nếu thao tác lưu phiên không được chấp nhận. Không fallback đăng nhập chỉ trong tab. Lúc khởi động, môi trường thiếu khả năng này không khôi phục phiên hay ghi/xóa record của tab khác. Nếu storage hỏng sau khi phiên đã hoạt động, cơ chế từ chối refresh/cảnh báo hiện có vẫn áp dụng; quyết định này không cam kết tránh được mọi lỗi storage phát sinh sau kiểm tra.

Thông báo yêu cầu trình duyệt cập nhật, cho phép dữ liệu trang web và HTTPS. Không kiểm tra chuỗi User-Agent hay áp đặt tên/phiên bản trình duyệt tùy ý. Bằng chứng kiểm thử an toàn của reduced-mode cũ vẫn là lịch sử, không phải chính sách hỗ trợ hiện hành.
