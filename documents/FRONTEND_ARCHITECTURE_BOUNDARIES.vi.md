# Ranh Giới Kiến Trúc Frontend

> 🌐 Language / Ngôn ngữ: [English](FRONTEND_ARCHITECTURE_BOUNDARIES.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX.vi.md)

## 1) Trách nhiệm theo tầng

- **Pages (`vue/pages/`)**
  - Ghép các section và kết nối store/composable với UI.
  - Chỉ xử lý orchestration ở mức route.
  - Hạn chế nhúng logic API mức thấp nếu đã có store/composable phù hợp.

- **Components (`vue/components/`)**
  - Khối UI tái sử dụng và tương tác cục bộ.
  - Cung cấp contract props/events rõ ràng (kebab-case trong template).
  - Tránh coupling trực tiếp nhiều store khác miền, trừ khi là component đặc thù feature.

- **Composables (`vue/composables/`)**
  - Chứa view logic tái sử dụng (auth-gate, debounce, modal state, i18n fallback, UI class map).
  - Không giả định theo route cụ thể nếu chưa thể hiện rõ qua tên hàm/options.

- **Stores (`assets/js/stores/`)**
  - Quản lý business state, điều phối I/O API và actions cập nhật state.
  - Đặt tên state theo ý nghĩa (`isLoading`, `errorMessage`, `isReady`, ...).

- **Routing (`assets/js/router.js`)**
  - Khai báo route, auth guards, metadata (`requiresAuth`, `superAdminOnly`, `keepAlive`).
  - Không chứa business logic của từng page.

- **Bootstrap (`assets/js/init.js`)**
  - Luồng khởi tạo app và wiring cho dynamic module loader.
  - Tránh nhúng feature logic ngoài phạm vi khởi tạo và đăng ký plugin toàn cục.

## 2) Chiến lược cache Keep-Alive

- Dùng route meta `keepAlive: true` cho các view nặng cần giữ state.
- Danh sách include của keep-alive được suy ra từ metadata route trong `vue/App.vue`.
- Mặc định: route render bình thường; chỉ các route được chọn mới được cache.

Nên cache:
- Trang admin dạng danh sách nặng, có filter/pagination.
- Dashboard cần giữ ngữ cảnh thao tác của người vận hành.

Không nên cache:
- Form một lần (one-shot) có rủi ro state cũ.
- Trang bắt buộc luôn fetch dữ liệu mới mỗi lần điều hướng.

## 3) Guard kích thước file Vue

- Page: mục tiêu <= 600 dòng.
- Component: mục tiêu <= 450 dòng.

Guard tự động:
- Script local/CI: `node tools/vue-file-size-check.cjs`
- Workflow CI: `.github/workflows/vue-quality-check.yml`

Lưu ý:
- Giới hạn chỉ là guardrail, không thay thế đánh giá chất lượng kiến trúc.
- Nếu file vượt ngưỡng, ưu tiên tách theo section/composable và vẫn giữ nguyên behavior.

## 4) Quy tắc contract (liên tục Phase 3/4)

- Dùng utility i18n fallback tập trung (`useI18nFallback`) khi cần fallback text.
- Tránh fallback inline trong template kiểu `$t(...) || '...'`.
- Giữ tên props/events ở template theo kebab-case.
- Giữ naming state mang tính ngữ nghĩa (`isLoading`, `errorMessage`, `isReady`, ...).

## 5) Checklist modernization an toàn

Trước khi merge thay đổi modernization:

1. Không làm thay đổi behavior/UX hiện tại.
2. i18n checks phải pass: `node tools/i18n.js check`.
3. Vue file-size guard phải pass: `node tools/vue-file-size-check.cjs`.
4. File đã sửa vẫn tuân thủ contract và route behavior hiện có.
5. Có migration note ngắn trong phần mô tả PR.

---

[Đọc tài liệu này bằng tiếng Anh](FRONTEND_ARCHITECTURE_BOUNDARIES.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)
