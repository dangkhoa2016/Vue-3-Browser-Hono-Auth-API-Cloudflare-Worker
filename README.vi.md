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
- [Pinia](https://pinia.vuejs.org/) (nếu có dùng)
- [Axios](https://axios-http.com/) (nếu có dùng)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)

## Hướng dẫn chạy thử
1. Cài đặt các phụ thuộc cần thiết (nếu có package manager).
2. Mở `index.html` bằng Live Server hoặc máy chủ tĩnh để xem demo.
3. Cấu hình endpoint API và xác thực nếu cần.

## Công cụ i18n (hỗ trợ EN/VI)
Sử dụng CLI trong `tools/` để kiểm tra tính nhất quán locale và key dịch thuật đang dùng trong source.

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

## Đóng góp
Đây là dự án mẫu cho admin, bạn có thể fork và phát triển thêm các tính năng hoặc cải tiến cấu trúc dự án.
