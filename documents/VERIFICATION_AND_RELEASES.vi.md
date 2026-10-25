# Kiểm chứng, hỗ trợ và phát hành

> 🌐 Language / Ngôn ngữ: [English](VERIFICATION_AND_RELEASES.md) | **Tiếng Việt**

## Runtime được hỗ trợ

UI chạy Vue trực tiếp trong trình duyệt, dùng tài nguyên CDN được ghim và không có bước build ứng dụng. Cần kết nối mạng tới các tài nguyên đó, JavaScript, Web Locks, localStorage hoạt động và HTTPS hoặc localhost cho xác thực. Ứng dụng từ chối môi trường không đủ khả năng phiên trước khi gửi credentials. Repository chưa chứng nhận ma trận phiên bản trình duyệt/thiết bị cụ thể.

Workflow kiểm chứng phát hành chính dùng Node.js 24 và Ubuntu 24.04. Workflow phụ có thể dùng runtime khác; xem YAML tương ứng. Xác minh đồng thời thay đổi runner và browser harness. CLI local dùng Node.js 24; `tests/package-lock.json` ghim dependency. Tài khoản mock không phải credentials của dịch vụ đã triển khai.

## Tương thích API

Theo contract phiên/API backend được triển khai trong `assets/js/api/backendContract.js`: payload access/refresh chuẩn, thu hồi phiên và capability rõ ràng cho export/monitoring tùy chọn. So sánh ENV nhận layer map và metadata lồng kiểu cũ được hỗ trợ. Capability chưa xác nhận phải bị vô hiệu hóa. Chỉ hiển thị metadata cấu hình đã che, không hiển thị secret thô.

Integration với backend chuẩn bị sẵn là opt-in, yêu cầu đầu vào trong `tests/browser/playwright.integration.config.mjs`. PASS browser mock không phải PASS backend thật; thiếu đầu vào phải ghi nhận chưa kiểm chứng. Smoke đăng nhập staging không thay thế toàn bộ integration capability.

## Các bước tái lập

Từ checkout sạch:

```bash
npm --prefix tests ci --ignore-scripts --no-audit --no-fund
npm --prefix tests run setup:verification
npm --prefix tests run test:static
npm --prefix tests run test:unit
npm --prefix tests run test:history
npm --prefix tests exec -- playwright install chromium
npm --prefix tests run test:browser
```

Hook static/unit kiểm tra và khôi phục checkpoint lịch sử offline, không tự cập nhật báo cáo so sánh dẫn xuất. Xem [HISTORY.vi.md](../HISTORY.vi.md) trước khi sửa bằng chứng lịch sử.

Lệnh browser trực tiếp có một probe danh tính nguồn được phục vụ chỉ chạy khi có digest. Cung cấp digest hiện tại để chạy cả probe:

```bash
(
  set -e
  manifest_dir="$(mktemp -d)"
  FRONTEND_SERVED_DIGEST="$(node tools/frontend-source-identity.mjs --repo . --print-digest --quiet --out "$manifest_dir/source.json")"
  export FRONTEND_SERVED_DIGEST
  npm --prefix tests run test:browser
)
```

Subshell dừng nếu tạo thư mục hoặc digest thất bại; phép gán tách khỏi `export` để giữ exit status. Đường dẫn output phải mới; công cụ từ chối ghi đè manifest có sẵn. CI cung cấp digest, dùng context mới cho từng case và lưu log đầy đủ. `History integrity` kiểm tra import local tường minh, route loader literal và script SFC ngoài qua các snapshot. Đây là heuristic, không phải parser JavaScript đầy đủ; cần review import cùng dòng, re-export và comment giống import. Không coi đó là bằng chứng mọi commit lịch sử từng chạy đúng hay mọi dependency động đều được bao phủ.

## Staging và production

Dùng [STAGING.vi.md](../STAGING.vi.md) để đóng gói và deploy chỉ public assets. Ghi commit nguồn và version Cloudflare cùng kết quả nghiệm thu. Kiểm chứng health, CORS, login, refresh, logout, ranh giới quyền và quản trị tài khoản với backend đã chọn; access cũ phải bị từ chối sau logout.

Tách D1/KV và secret staging khỏi production. Nếu staging cô lập dùng tài khoản seed, tắt rate limit hoặc email, ghi rõ ngoại lệ; không suy ra cấu hình production từ đó. Production cần cấu hình và nghiệm thu riêng, tài khoản thật, rate limit/logging phù hợp và email provider được thiết lập có chủ đích.

Rollback là deploy artifact frontend đã kiểm chứng trước đó và làm [quy trình chuyển phiên](SESSION-ROLLBACK.vi.md). Rollback frontend không tự hoàn tác schema backend hoặc thu hồi credentials đã cấp.

## Kiểm soát merge

Yêu cầu các status check `Static and unit`, `History integrity`, `Chromium`, giới hạn nguồn GitHub Actions khi khả dụng. Bảo vệ main khỏi force push/xóa và publish trực tiếp; dùng PR, review lại khi code thay đổi sau duyệt. Chủ repository không tự duyệt PR của mình; bắt buộc peer approval cần người review thứ hai. Review tự động không thay thế phê duyệt con người.

Đây là chính sách đề xuất. Cấu hình repository và kết quả hosted CI thực tế cần được ghi nhận riêng; tài liệu không chứng minh chúng đã bật.
