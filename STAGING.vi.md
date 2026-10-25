# Frontend staging

Ứng dụng vẫn chạy trực tiếp trên browser, không cần build Vue. Script dưới đây chỉ đóng gói `index.html`, `assets/`, `vue/` và cấu hình API thật; không upload `.git`, secrets, tests hoặc báo cáo.

```bash
STAGING_API_URL=https://YOUR-STAGING-API.workers.dev node tools/prepare-staging.mjs
wrangler deploy --config wrangler.staging.jsonc
```

Wrangler cần token Cloudflare có quyền deploy Workers và Account ID của tài khoản đích (qua `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Có thể dùng Wrangler đã cài trong repo backend bên cạnh.

Worker frontend staging có tên `vue-hono-auth-staging`. Thư mục `.staging-dist/` là kết quả sinh tự động và được Git bỏ qua. Script đặt API URL staging và tắt mock trong localStorage mỗi lần mở trang staging. Thêm origin frontend staging vào `CORS_ORIGIN` của backend.

Thư viện JavaScript/CSS vẫn tải từ các CDN được ghim phiên bản trong dự án. Backend và frontend staging cần được kiểm tra cùng nhau sau deploy.
