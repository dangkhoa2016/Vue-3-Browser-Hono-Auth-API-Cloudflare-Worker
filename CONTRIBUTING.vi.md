# Hướng dẫn đóng góp

[English](CONTRIBUTING.md)

Dùng Node.js 24 để kiểm chứng. Ứng dụng vẫn chạy trực tiếp trong trình duyệt.

## Làm việc local

1. Tạo feature branch từ nhánh được duy trì; giữ credential trong file môi trường bị Git bỏ qua.
2. Mỗi thay đổi phải hoàn chỉnh: module được import cần có trước hoặc cùng consumer. Chọn `feat(scope)`, `refactor(scope)`, `fix(scope)`, `test(scope)`, `docs(scope)` hoặc `chore(scope)` đúng tính chất.
3. Thay đổi hành vi cần regression test có ý nghĩa. PR giải thích điều kiện kích hoạt và kết quả sau thay đổi.
4. Cài dependency riêng cho kiểm thử:

   ```bash
   npm --prefix tests ci --ignore-scripts --no-audit --no-fund
   npm --prefix tests run setup:verification
   npm --prefix tests exec -- playwright install chromium
   ```

5. Khi đổi source input, chủ động sinh lại bảng so sánh từ lịch sử tới hiện tại, review diff rồi chạy:

   ```bash
   npm --prefix tests run reports:refresh
   npm --prefix tests run test:static
   npm --prefix tests run test:unit
   npm --prefix tests run test:history
   npm --prefix tests run test:browser
   ```

Unit discovery đã gồm suite Axios loopback thật. Browser test dùng peer giả, không chứng nhận một deployment Cloudflare. Xem [kiểm chứng và phát hành](documents/VERIFICATION_AND_RELEASES.md) về nghiệm thu tích hợp và nhận dạng source đang phục vụ.

## Pull request

Nêu vấn đề cụ thể, hành vi kết quả, cách kiểm chứng và giới hạn còn lại. Review code riêng với dữ liệu bằng chứng sinh tự động. Không bỏ kiểm tra hoặc đổi nhãn các run skip/fail lịch sử để lấy kết quả xanh.

Trước merge, yêu cầu **Static and unit**, **History integrity**, **Chromium** trên đúng HEAD được review. Human review khác với CI. Phạm vi staging không bao gồm production. Main đã công bố nên được bảo vệ khỏi direct/force push; hướng dẫn release nêu rule đề xuất và giới hạn của repo chỉ có một maintainer.

Đọc [HISTORY.vi.md](HISTORY.vi.md) trước khi diễn giải ngày trên nhánh curated hoặc rewrite commit cũ.
