# Hướng Dẫn Review Dự Án

> 🌐 Language / Ngôn ngữ: [English](PROJECT_REVIEW_GUIDE.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này là điểm bắt đầu để review `vue-hono-auth-api-cloudflare-worker`. Mục tiêu là chỉ ra những khu vực quan trọng nhất khi cần xem xét hành vi, giảm độ phức tạp, hoặc lập kế hoạch tối ưu về sau.

## 1. Hình Dạng Dự Án

- Mô hình runtime: ứng dụng Vue 3 chạy trực tiếp trên trình duyệt bằng `vue3-sfc-loader`; không có bước build cho runtime UI.
- Mô hình state: Pinia store đặt trong `assets/js/stores/`.
- Routing: hash router trong `assets/js/router.js`.
- Trình tự khởi động: `assets/js/init.js` mount loader nhẹ trước, sau đó mới mount ứng dụng chính.
- Truy cập API: Axios client dùng chung trong `assets/js/api/httpClient.js` với base URL runtime, header ngôn ngữ, retry, và refresh token.
- Mock mode: `assets/js/api/mockSetup.js` có thể giả lập phần lớn luồng backend để làm việc UI cục bộ.

## 2. Ưu Tiên Review

### Các Khu Vực Có Giá Trị Review Cao Nhất

1. Runtime app và lazy module loading
2. Auth, refresh token, và bảo vệ route
3. Data access và độ đồng bộ của mock API
4. Giám sát thời gian thực và dashboard tổng hợp
5. Luồng chỉnh sửa KV config cho super-admin
6. Cài đặt, i18n, và các script kiểm tra chất lượng

### Các Điểm Nóng Có Nhiều Logic

- `assets/js/api/mockSetup.js`
- `vue/composables/useKvAdminConfigsPage.js`
- `vue/composables/useSettingsPage.js`
- `vue/pages/AdminAuditLogs.vue`
- `vue/pages/AdminRealtimeMonitoring.vue`
- `vue/pages/AdminDashboard.vue`
- `assets/js/stores/realtimeMonitoringStore.js`

Những file này rất phù hợp để tách nhỏ thêm theo feature hoặc service helper trong các đợt tối ưu sau.

## 3. Bản Đồ Tài Liệu

- [Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)
- [Runtime Ứng Dụng Và Cơ Chế Tải](APP_RUNTIME_AND_LOADING_vi.md)
- [Luồng Xác Thực Và Phiên Làm Việc](AUTH_AND_SESSION_FLOW_vi.md)
- [Audit Quản Trị Và Advanced Audit](ADMIN_AUDIT_AND_ADVANCED_AUDIT_vi.md)
- [Truy Cập Dữ Liệu Và Mock API](DATA_ACCESS_AND_MOCK_API_vi.md)
- [Giám Sát Thời Gian Thực Và Dashboard](REALTIME_MONITORING_AND_DASHBOARD_vi.md)
- [Luồng KV Admin Configs](KV_ADMIN_CONFIGS_WORKFLOW_vi.md)
- [Cài Đặt, I18n, Và Công Cụ Chất Lượng](SETTINGS_I18N_AND_QUALITY_vi.md)
- [Ranh Giới Kiến Trúc Frontend](FRONTEND_ARCHITECTURE_BOUNDARIES_vi.md)

## 4. Bản Đồ Tính Năng

| Tính năng | Route/page chính | State/composable chính | Lý do quan trọng |
| --- | --- | --- | --- |
| Khởi động ứng dụng | `index.html`, `vue/Loader.vue` | `assets/js/init.js`, `assets/js/appServices.js` | Mọi lazy loading, cache, và singleton đều bắt đầu ở đây |
| Xác thực | `vue/components/LoginModal.vue`, các page protected | `assets/js/stores/authStore.js`, `vue/composables/useAuthGate.js` | Ảnh hưởng đến mọi request được bảo vệ và flow phục hồi user |
| Vận hành audit | `vue/pages/AdminAuditLogs.vue`, `vue/pages/AdminAdvancedAudit.vue` | `assets/js/stores/auditStore.js`, `assets/js/stores/advancedAuditStore.js`, `vue/composables/useAdminAuditLogsPage.js` | Bao gồm review log, export, analytics, compliance, và archival action |
| Vận chuyển API | tất cả page | `assets/js/api/httpClient.js` | Chèn locale, auth header, retry, và refresh logic |
| Mock backend | tất cả page ở mock mode | `assets/js/api/mockSetup.js` | Nguồn demo behavior lớn và dễ bị lệch so với backend thật |
| Dashboard | `vue/pages/AdminDashboard.vue` | nhiều admin store | Tổng hợp health, stats, audit, incidents, và monitoring |
| Realtime monitoring | `vue/pages/AdminRealtimeMonitoring.vue` | `assets/js/stores/realtimeMonitoringStore.js`, `vue/composables/useAdminRealtimeMonitoringPage.js` | Kết hợp normalize snapshot với recent events, alert rules/channels, performance, cache, và các thao tác incident |
| KV config admin | `vue/pages/KvAdminConfigs.vue` | `vue/composables/useKvAdminConfigsPage.js`, `assets/js/stores/kvAdminConfigsStore.js` | Surface super-admin có CRUD và bulk edit |
| Settings | `vue/pages/Settings.vue` | `vue/composables/useSettingsPage.js`, `assets/js/stores/mainStore.js` | Điều khiển endpoint API runtime, pagination, debounce, theme, language |
| I18n | tất cả page | `assets/js/i18n.js`, locale files, `tools/i18n.js` | Mối quan tâm xuyên suốt cả runtime và bảo trì |

## 5. Checklist Review

Sử dụng checklist này trước khi approve một thay đổi không nhỏ:

1. Thay đổi có giữ nguyên giả định startup browser-only và lazy loading không?
2. Có tôn trọng route meta và auth gate cho protected screen không?
3. Nếu contract API đổi, mock mode còn đủ đồng bộ để test frontend không?
4. Nếu thay đổi liên quan filter, pagination, hoặc tab, deep link và keep-alive còn đúng không?
5. Nếu đổi i18n key, locale liên quan và tool check đã được cập nhật chưa?
6. Nếu file đã lớn, có tách logic ra thay vì thêm tiếp vào page không?

## 6. Mục Tiêu Tối Ưu

### Ứng Viên Refactor Tốt

- Tách `mockSetup.js` theo nhóm feature thay vì giữ một file đăng ký rất lớn.
- Đưa orchestration lặp lại của admin page vào composable đặc thù hơn cho từng feature.
- Tạo helper normalize nhỏ cho payload dashboard và monitoring.
- Giảm bớt style constant ở page nếu chúng che mất phần behavior khi review.

### Các Điểm Nên Giữ Ổn Định

- Thứ tự setup module cache trong `init.js`
- Lazy wrapper và auth guard trong `router.js`
- Ngữ nghĩa refresh và reauthentication trong `authStore.js`
- Thứ tự interceptor trong `httpClient.js`

## 7. Thứ Tự Nên Đọc

1. Bắt đầu với [Runtime Ứng Dụng Và Cơ Chế Tải](APP_RUNTIME_AND_LOADING_vi.md)
2. Đọc tiếp [Luồng Xác Thực Và Phiên Làm Việc](AUTH_AND_SESSION_FLOW_vi.md)
3. Sau đó đọc [Truy Cập Dữ Liệu Và Mock API](DATA_ACCESS_AND_MOCK_API_vi.md)
4. Đọc [Audit Quản Trị Và Advanced Audit](ADMIN_AUDIT_AND_ADVANCED_AUDIT_vi.md) khi thay đổi liên quan miền audit
5. Rồi mới xem tài liệu theo từng feature được sửa

---

[Đọc tài liệu này bằng tiếng Anh](PROJECT_REVIEW_GUIDE.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)