# Luồng Xác Thực Và Phiên Làm Việc

> 🌐 Language / Ngôn ngữ: [English](AUTH_AND_SESSION_FLOW.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này giải thích cách login state, refresh token, route protection, và reauthentication hoạt động xuyên suốt ứng dụng.

## 1. File Chính

- `assets/js/stores/authStore.js`
- `assets/js/api/httpClient.js`
- `assets/js/router.js`
- `vue/composables/useAuthGate.js`
- `vue/components/LoginModal.vue`

## 2. Mô Hình Auth State

Auth store lưu:

- `user`
- `token`
- `refreshToken`
- `expiresAt`
- `refreshExpiresAt`
- `isRefreshing`
- `requiresReauth`
- `reauthNoticeShown`

State được lưu trong `localStorage` và phục hồi qua `authStore.init()`.

## 3. Chiến Lược Bảo Vệ Route

Route được bảo vệ sử dụng `meta.requiresAuth` trong `assets/js/router.js`.

Hành vi quan trọng:

- Router guard không hard-redirect user anonymous.
- Nó lưu `authRequired` và `intendedRoute` vào `sessionStorage`.
- Navigation vẫn được phép tiếp tục.
- Page đích tự chịu trách nhiệm hiển thị prompt cần đăng nhập và mở modal thông qua `useAuthGate()`.

Cách này cho UI nhiều quyền điều khiển hơn, nhưng cũng có nghĩa là xử lý auth ở cấp page phải giữ đồng nhất.

## 4. Luồng Refresh Token

### Pha Request

Axios client dùng chung sẽ làm các bước sau trước protected request:

1. Đồng bộ lại runtime base URL từ local storage.
2. Chèn `Accept-Language` từ i18n.
3. Đọc auth store thông qua app services.
4. Chặn non-public request nếu `requiresReauth` đã được bật.
5. Refresh access token nếu sắp hết hạn và refresh token vẫn còn hợp lệ.
6. Gắn `Authorization: Bearer ...`.

### Pha Response

Nếu server trả về `401`:

1. Client kiểm tra request đó đã retry hay chưa.
2. Nếu chưa, nó thử `authStore.refreshAccessToken()`.
3. Nếu refresh thành công, request gốc được retry một lần.
4. Nếu refresh thất bại, request bị reject và app chuyển sang trạng thái cần đăng nhập lại.

## 5. Đường Dẫn Reauthentication

Khi refresh token hết hạn hoặc refresh thất bại với client error:

1. `authStore.requireReauthentication()` xóa auth state.
2. Nó đặt `requiresReauth = true`.
3. Nó hiển thị warning toast một lần.
4. Nó cố gắng mở login modal.

Thiết kế này ngăn việc gọi lặp lại các request với token không còn hợp lệ sau khi session không thể phục hồi.

## 6. Vì Sao Khu Vực Này Nhạy Cảm

### Điểm Tốt

- Chỉ có một refresh attempt chạy tại một thời điểm.
- Non-public request bị chặn sau khi session lỗi không phục hồi được.
- Thông báo session hết hạn được tập trung hóa.

### Rủi Ro

- Logic bị tách ra giữa router, store, interceptor, và composable.
- Nếu thiếu `authStore.init()` hoặc sai service wiring, sẽ sinh ra trạng thái auth nửa vời, khó đoán.
- Page nào không dùng `useAuthGate()` có thể hành xử khác với phần còn lại của app.

## 7. Checklist Review

1. Thay đổi có giữ hành vi chỉ một refresh tại một thời điểm không?
2. Sau login, page có vẫn phục hồi và tiếp tục hướng điều hướng dự định không?
3. Public endpoint có vẫn được loại khỏi auth blocking và refresh logic không?
4. UI có tránh được toast đăng nhập lại lặp hoặc modal spam không?
5. `401`, `403`, và `REAUTH_REQUIRED` có được xử lý đồng nhất không?

## 8. Ý Tưởng Tối Ưu

1. Đưa phần phân loại auth error vào helper dùng chung nhỏ để giảm lặp logic.
2. Chuẩn hóa xử lý unauthorized cấp page quanh một contract composable duy nhất.
3. Thêm logging nhẹ quanh hành vi phục hồi `intendedRoute` để debug.
4. Cân nhắc tách token persistence khỏi toast/modal side effect nếu auth logic còn lớn thêm.

---

[Đọc tài liệu này bằng tiếng Anh](AUTH_AND_SESSION_FLOW.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)