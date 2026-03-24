# Truy Cập Dữ Liệu Và Mock API

> 🌐 Language / Ngôn ngữ: [English](DATA_ACCESS_AND_MOCK_API.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này mô tả lớp vận chuyển API dùng chung, cấu hình endpoint runtime, hành vi retry, và mock backend được frontend sử dụng.

## 1. File Chính

- `assets/js/api/httpClient.js`
- `assets/js/api/endpoints.js`
- `assets/js/api.js`
- `assets/js/api/mockSetup.js`
- `assets/js/api/mockData.js`
- `assets/js/stores/mainStore.js`

## 2. Lớp Vận Chuyển API Thật

Ứng dụng sử dụng một Axios instance dùng chung: `apiClient`.

Trách nhiệm chính:

- Chuẩn hóa và lưu runtime base URL
- Chuẩn hóa request timeout
- Chèn `Accept-Language`
- Chèn bearer token khi có
- Refresh access token khi cần
- Retry các lỗi không phải client error bằng backoff

Client này không chỉ là utility vận chuyển. Nó còn sở hữu một phần hành vi session của app, nên thay đổi ở đây có thể ảnh hưởng đến đa số page cùng lúc.

## 3. Cấu Hình Runtime

`assets/js/stores/mainStore.js` lưu system preference trong browser storage, gồm:

- `mockApi`
- `apiBaseUrl`
- `apiRequestTimeoutMs`
- `adminPageSize`
- `adminSearchDebounceMs`
- `timeFormat`

`httpClient.js` đọc lại base URL từ storage ở mỗi relative request để thay đổi trong Settings có hiệu lực ngay mà không cần tạo lại client.

## 4. Quy Tắc Retry

### Retry Được Phép Cho

- Lỗi mạng
- Lỗi phía server không bị xếp vào nhóm client error

### Retry Bị Bỏ Qua Cho

- Auth endpoint bị client error
- Các `4xx` client error thông thường
- Request đã dùng hết số lần retry cho phép

Điều này giúp lỗi login và validation không bị nhìn nhầm là lỗi tạm thời trong khi thực tế là lỗi người dùng hoặc sai contract.

## 5. Vai Trò Của Mock API

`assets/js/api/mockSetup.js` là backend demo local cho app. Nó đăng ký các handler Axios Mock Adapter cho nhiều feature, gồm:

- login
- refresh token
- registration
- cập nhật profile
- realtime monitoring
- các màn hình admin
- các surface KV admin

File này lớn vì nó chứa đăng ký endpoint, mock state, tạo hình response, và một số validation đặc thù theo feature.

Riêng với realtime monitoring, mock mode hiện bao phủ cả nhóm endpoint snapshot ban đầu lẫn các endpoint vận hành mới như:

- recent events
- alert rules và thao tác toggle rule
- alert channels
- action test alert
- dữ liệu performance dashboard
- clear dashboard cache
- tạo incident

Độ đồng bộ này quan trọng vì trang admin realtime monitoring hiện phụ thuộc vào các request bổ sung theo từng feature, không chỉ snapshot dashboard ban đầu.

## 6. Vì Sao Mock Setup Quan Trọng

### Lợi Ích

- Có thể phát triển frontend mà không cần backend sống.
- UI flow có thể demo ổn định.
- Các trang profile, auth, và admin có thể được chạy end-to-end trong browser.

### Rủi Ro

- Mock response có thể lệch với contract backend thật.
- Logic đặc thù theo feature dễ bị dồn vào cùng một file.
- Review khó hơn vì transport và feature emulation bị trộn vào nhau.

## 7. Checklist Review

1. Nếu payload endpoint đổi, đã cập nhật cả giả định client thật và response mock chưa?
2. Nếu route trở thành dạng có tham số, endpoint builder và URL matcher của mock có được cập nhật cùng nhau không?
3. Thay đổi có giữ validation endpoint runtime và timeout normalization không?
4. Có đường lỗi mới nào bị retry nhầm trong khi đáng ra phải fail nhanh không?
5. Nếu mock response thêm field được suy ra, field đó trong real API mode có thật sự tồn tại không?
6. Có thay đổi nào tiếp tục đẩy thêm feature logic vào `mockSetup.js` trong khi nên tách helper riêng không?

## 8. Ý Tưởng Tối Ưu

1. Tách `mockSetup.js` thành các registrar theo feature như auth, profile, monitoring, và KV admin.
2. Dùng chung helper normalize payload giữa mock mode và store nếu hợp lý.
3. Thêm checklist contract nhỏ cho mỗi endpoint tồn tại cả ở real và mock mode.
4. Giữ `httpClient.js` tập trung vào transport bằng cách chuyển helper không liên quan ra ngoài dần dần.
5. Giữ endpoint builder có tham số và regex pattern của mock đủ gần nhau để dễ phát hiện lệch route surface khi review.

## 9. Tài Liệu Nên Đọc Kèm

1. [Luồng Xác Thực Và Phiên Làm Việc](AUTH_AND_SESSION_FLOW_vi.md)
2. [Cài Đặt, I18n, Và Công Cụ Chất Lượng](SETTINGS_I18N_AND_QUALITY_vi.md)
3. [Giám Sát Thời Gian Thực Và Dashboard](REALTIME_MONITORING_AND_DASHBOARD_vi.md)

---

[Đọc tài liệu này bằng tiếng Anh](DATA_ACCESS_AND_MOCK_API.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)