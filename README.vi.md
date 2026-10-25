# Vue 3 Browser - Hono Auth API - Cloudflare Worker

> 🌐 Language / Ngôn ngữ: [English](README.md) | **Tiếng Việt**

Dự án này là một ứng dụng web Vue 3 cung cấp giao diện quản trị cho xác thực và quản lý người dùng, thiết kế để hoạt động với Hono Auth API triển khai trên Cloudflare Workers.

## Mục đích
- Trình diễn cấu trúc dự án Vue 3 hiện đại cho dashboard quản trị.
- Cung cấp frontend để quản lý người dùng, vai trò, nhật ký audit, sự cố bảo mật, và giám sát thời gian thực qua API.
- Minh hoạ tích hợp với backend Cloudflare Worker và Hono Auth API.
- Hỗ trợ đa ngôn ngữ (i18n) và UI linh hoạt.

## Cấu trúc thư mục chính
- `index.html`: Tập tin HTML chính để khởi động ứng dụng.
- `assets/`: Chứa CSS, hình ảnh, dữ liệu JSON, JS helper và các thư viện phụ trợ.
- `vue/`: Chứa các thành phần Vue, trang, và các component tái sử dụng.
- `tools/`: Script và công cụ cho i18n và phát triển.

## Các thành phần nổi bật
- **App.vue**: Thành phần gốc của ứng dụng.
- **components/**: Các component như Navbar, Modal, Toast notification, v.v.
- **pages/**: Các trang chính như Home, AdminUsers, AdminAuditLogs, AdminRealtimeMonitoring, AdminSecurityIncidents, Profile, ApiExplorer, About, NotFound.
- **stores/**: Logic quản lý trạng thái cho xác thực, người dùng, audit, v.v.
- **locales/**: Đa ngôn ngữ (vi, en, ja, ko, de).

## Công nghệ sử dụng
- [Vue 3](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Axios](https://axios-http.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)

## Hướng dẫn chạy thử

Dùng Node.js 24 cho server local và công cụ kiểm chứng. Ứng dụng Vue không cần build.

```bash
# Khởi động backend Hono riêng tại localhost:8787, rồi chạy:
node tools/dev-local.mjs
```

Mở **http://localhost:4173**. Server chọn API local thật qua `/backend/` và tắt mock cho origin đó. Tài khoản do backend cấp; thông tin trong fixture không phải credential triển khai.

Để khám phá UI bằng dữ liệu mẫu, phục vụ thư mục bằng static server và chọn chế độ mock trong Settings. Trình duyệt cần Internet để tải thư viện CDN đã ghim phiên bản. Đăng nhập cần Web Locks và localStorage đọc/ghi được trong secure context HTTPS hoặc localhost.

Xem [hỗ trợ và kiểm chứng](documents/VERIFICATION_AND_RELEASES.md), [triển khai staging](STAGING.vi.md), [hướng dẫn đóng góp](CONTRIBUTING.vi.md) và [lịch sử đã biên tập](HISTORY.vi.md).

## Công cụ i18n (hỗ trợ EN/VI)
Runtime ứng dụng là browser-only. Node.js chỉ cần (tùy chọn) cho các script CLI trong `tools/` để kiểm tra chất lượng i18n, không dùng để build/chạy UI.

```bash
# Audit tính nhất quán locale
node tools/i18n.js audit

# Usage check (quét key trong source so với locale)
node tools/i18n.js usage
node tools/i18n.js usage --detail
node tools/i18n.js usage --export

# Chọn ngôn ngữ hiển thị cho CLI
node tools/i18n.js usage --lang=en
node tools/i18n.js usage --lang=vi

# Chỉ kiểm tra một locale
node tools/i18n.js usage --locale=vi

# Chạy cả hai bước kiểm tra (phù hợp CI)
node tools/i18n.js check
```

CI (tùy chọn, chỉ dành cho GitHub Actions) có sẵn tại `.github/workflows/i18n-check.yml`, chạy `node tools/i18n.js check` trên push/PR khi có thay đổi file i18n. Điều này không liên quan tới runtime local trên browser.

## Guard chất lượng

```bash
# Kiểm tra giới hạn kích thước file Vue
node tools/vue-file-size-check.cjs

# Kiểm tra custom lint cho Vue
node tools/vue-custom-lint.cjs

# Kiểm tra độ phủ script-setup (mặc định đồng bộ CI)
node tools/vue-script-setup-coverage.cjs

# Tùy chỉnh giới hạn
node tools/vue-file-size-check.cjs --page-limit=600 --component-limit=450
```

- Mặc định: pages <= 600 dòng, components <= 450 dòng.
- Workflow CI: `.github/workflows/vue-quality-check.yml` (chế độ strict, fail khi vi phạm).
- Tài liệu boundary kiến trúc: `documents/FRONTEND_ARCHITECTURE_BOUNDARIES.vi.md`.

## Kiểm chứng (harness test-only)

Ứng dụng không phụ thuộc và không có bước build. Harness kiểm chứng nằm ở **manifest riêng** trong
`tests/`, nên bản ứng dụng vẫn hoàn toàn không có dependency.

Dùng **Node.js 24** để kiểm chứng (cùng phiên bản CI); các lệnh dùng glob tường minh `regression/*.test.mjs`, nên việc
tìm suite không phụ thuộc vào cách runner discover thư mục.

```bash
# một lần, chạy từ thư mục gốc repository
npm --prefix tests ci --ignore-scripts --no-audit --no-fund
npm --prefix tests run setup:verification
npm --prefix tests exec -- playwright install chromium

# từng gate (cũng chạy riêng được)
npm --prefix tests run test:static    # size / lint / script-setup / i18n / CDN pins
npm --prefix tests run test:unit      # toàn bộ tests/regression/*.test.mjs
npm --prefix tests run test:loopback  # Axios thật với server loopback
npm --prefix tests run test:browser   # Playwright + Chromium, chỉ mock API

# toàn bộ gate trên, theo thứ tự, dừng ở lỗi đầu tiên
npm --prefix tests run test:all

# cùng discovery của unit, thêm tuỳ chọn probe CDN online
bash tools/test-browser.sh
bash tools/test-browser.sh --online
bash tools/test-browser.sh --browser    # bắt buộc chạy suite Playwright thay vì báo PENDING
```

`test:unit` là đường discovery duy nhất: `tools/test-browser.sh` gọi chính script đó, nên wrapper
không thể âm thầm chạy ít suite hơn manifest. Đối chiếu từ thư mục gốc bằng
`node --test tests/regression/*.test.mjs`.

`test:integration` (`npm --prefix tests run test:integration`) là bước riêng và phải bật thủ công: cần
backend mà owner đã cấp revision để test. Không có thì báo PENDING, không phải PASS.

## Tài liệu review

- Mục lục tài liệu: `documents/DOCUMENTATION_INDEX_vi.md`
- Hướng dẫn review tổng quan: `documents/PROJECT_REVIEW_GUIDE_vi.md`
- Runtime ứng dụng và cơ chế tải: `documents/APP_RUNTIME_AND_LOADING_vi.md`
- Luồng xác thực và phiên làm việc: `documents/AUTH_AND_SESSION_FLOW_vi.md`
- Audit quản trị và advanced audit: `documents/ADMIN_AUDIT_AND_ADVANCED_AUDIT_vi.md`
- Truy cập dữ liệu và mock API: `documents/DATA_ACCESS_AND_MOCK_API_vi.md`
- Giám sát thời gian thực và dashboard: `documents/REALTIME_MONITORING_AND_DASHBOARD_vi.md`
- Luồng KV admin configs: `documents/KV_ADMIN_CONFIGS_WORKFLOW_vi.md`
- Cài đặt, i18n, và công cụ chất lượng: `documents/SETTINGS_I18N_AND_QUALITY_vi.md`

## Đóng góp
Xem [CONTRIBUTING.vi.md](CONTRIBUTING.vi.md) về branch, kiểm thử và review. Gate GitHub Actions đầy đủ gồm static, unit/loopback, Chromium và lịch sử dependency. Checkpoint của báo cáo lịch sử được khôi phục offline từ bundle đã ghim; xem [HISTORY.vi.md](HISTORY.vi.md).

## Giấy phép và ghi công icon

Hai icon của dự án, `assets/img/favicon.ico` và `assets/img/favicon.png`, được tải từ [Application icon trên Magnific](https://www.magnific.com/icon/application_14970641), do [juicy_fish](https://www.magnific.com/author/juicy-fish) thiết kế.

Xem [LICENSE-ICONS.md](LICENSE-ICONS.md) để biết nguồn, tác giả và thông báo giấy phép của icon.
