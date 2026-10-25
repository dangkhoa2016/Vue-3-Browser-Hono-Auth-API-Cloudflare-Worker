# Luồng xác thực và phiên đăng nhập

> 🌐 Language / Ngôn ngữ: [English](AUTH_AND_SESSION_FLOW.md) | **Tiếng Việt**

[Mục lục tài liệu](DOCUMENTATION_INDEX.vi.md)

## Quyền sở hữu phiên

Đọc cùng `assets/js/stores/authStore.js`, `assets/js/api/sessionStorage.js`, `assets/js/api/sessionCoordinator.js` và `assets/js/api/httpClient.js`. Bản ghi phiên chuẩn là `auth-session-record`; các bản sao token/user kiểu cũ phục vụ tương thích, không phải nguồn trạng thái độc lập. Danh tính API và ngữ cảnh phiên ràng buộc request cùng kết quả bất đồng bộ, tránh để phản hồi của tài khoản hoặc backend cũ thay thế phiên hiện tại.

Đăng nhập yêu cầu Web Locks, localStorage đọc/ghi/xóa được và secure context (HTTPS hoặc localhost). Kiểm tra các khả năng này trước khi gửi thông tin đăng nhập; từ chối kết quả token nếu không thể lưu phiên an toàn. Khi khởi động ở môi trường không đáp ứng, ứng dụng không nhận phiên đã lưu. Không có phương án đăng nhập chỉ trong tab. Kiểm tra ban đầu không bảo đảm storage sẽ không lỗi về sau.

Coordinator tuần tự hóa thao tác ghi và xoay token giữa các tab. Bản ghi hiện tại, revision và tombstone kết thúc phiên ngăn kết quả cũ hoặc mirror legacy khôi phục phiên đã đăng xuất. Dọn dữ liệu trình duyệt và thu hồi token trên server là hai việc riêng; cần kiểm chứng cả hai khi đổi giao thức.

## Bảo vệ route và page

Route được bảo vệ khai báo `meta.requiresAuth` trong `assets/js/router.js`. Router ghi `authRequired` và `intendedRoute` vào sessionStorage rồi tiếp tục điều hướng; page đích dùng `vue/composables/useAuthGate.js` để hiển thị yêu cầu đăng nhập và mở `LoginModal.vue`. Khi đóng modal phải còn thông báo cùng nút đăng nhập, không để skeleton chạy mãi. Backend quyết định quyền truy cập thực tế.

## Cấu hình request

Storage cung cấp URL API ban đầu. Sau đó `apiClient.defaults.baseURL` của Axios đang chạy là nguồn cấu hình chính. Settings và việc nhận thay đổi từ tab khác cập nhật qua `setApiClientBaseUrl`; mỗi request không đọc lại storage để ghi đè cấu hình. Thay danh tính API làm mất hiệu lực phiên cũ.

Request interceptor áp dụng ngôn ngữ, kiểm tra ngữ cảnh auth/phiên, refresh access token gần hết hạn khi đủ điều kiện và gắn bearer token. Request không công khai bị chặn khi cần xác thực lại. Luồng public/auth có ngoại lệ riêng trong contract transport.

## Refresh và phát lại request

`refreshAccessTokenOrThrow` điều phối refresh và có thể nhận cặp token thay thế mà tab khác vừa lưu. Lần `401` đầu chỉ có thể refresh rồi phát lại một lần với phương thức an toàn (`GET`, `HEAD`, `OPTIONS`), phiên refresh còn dùng được và request vẫn thuộc API/phiên hiện tại. Loại trừ request refresh/logout. Không tự phát lại mutation bị `401`.

Retry/backoff thông thường tuân theo [chính sách transport](DATA_ACCESS_AND_MOCK_API.vi.md): loại trừ endpoint auth, request đã hủy, `429`, `503` và các `4xx` khác. Retry mutation cần contract `idempotentRetry` tường minh; không bật chỉ để che lỗi thao tác ghi.

Phân biệt kết quả refresh:

- Phiên không hợp lệ, bị thu hồi hoặc hết hạn yêu cầu xác thực lại và thông báo đăng nhập tập trung.
- Xung đột xoay token (`409`) cần đối chiếu phiên hiện tại, không đăng xuất hoặc ghi đè tab khác một cách mù quáng.
- Lỗi mạng, `429` và lỗi server là tạm thời: từ chối thao tác bị ảnh hưởng nhưng giữ phiên hiện có; không coi là thông tin đăng nhập sai.
- Loại bỏ kết quả thuộc API/phiên đã bị thay thế, kể cả refresh trả về muộn sau đăng xuất hoặc đổi tài khoản.

## Review và kiểm chứng

Kiểm tra đăng xuất trong lúc refresh, nhiều tab, đổi tài khoản/API, lỗi storage, phát lại phương thức an toàn và mutation thất bại. Auth prompt ở page phải tránh modal lặp và tải dữ liệu trùng sau đăng nhập. Các suite tập trung gồm `auth-transport`, `browser-login-policy` và `session-rollback`.

Dùng [kiểm chứng và phát hành](VERIFICATION_AND_RELEASES.vi.md) cho các lệnh kiểm tra và [rollback phiên](SESSION-ROLLBACK.vi.md) khi chuyển phiên bản. Dọn trình duyệt không chuyển schema backend và không chứng minh credentials server đã bị thu hồi.
