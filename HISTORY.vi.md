# Lịch sử Git đã biên tập

[English](HISTORY.md)

Nhánh này trình bày lịch sử theo trách nhiệm của từng thay đổi, được biên tập ngày **25/10/2026**. Đây không phải bản ghi thời gian nguyên vẹn về lúc từng dòng code được viết.

## Nội dung được tổ chức lại

- Gộp các sửa chữa vào thay đổi liên quan, gồm chính sách phiên trình duyệt và hợp đồng backend.
- Gộp chỉnh sửa/xóa tài khoản thành một commit hoàn chỉnh: hộp thoại xác nhận tồn tại ngay khi trang bắt đầu dùng nó.
- Dùng endpoint đăng ký đúng ngay từ commit tạo bảng endpoint.
- Message mô tả đúng phạm vi migration composable/page; bỏ trạng thái chính sách trình duyệt pending đã hết hiệu lực.
- Tách báo cáo sinh tự động thành commit archive riêng, đứng trước harness sử dụng chúng.

Nhánh trước khi biên tập được giữ tại [`archive/frontend-before-professionalization-20261025`](https://github.com/dangkhoa2016/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker/tree/archive/frontend-before-professionalization-20261025). [Bảng ánh xạ](documents/history/COMMIT-MAP.tsv) ghi rõ commit được giữ/gộp. Commit archive bổ sung là phần được tách từ checkpoint kiểm chứng cũ, không phải tính năng sản phẩm mới.

## Ý nghĩa ngày tháng

Các commit được giữ lại bảo toàn tên, email, **author date, committer date và múi giờ**. Commit archive tách ra kế thừa metadata của checkpoint gốc. Công việc mới về kiểm chứng, CI và tài liệu được ghi nhận theo ngày bảo trì thực tế.

Vì giữ nguyên ngày nên parent chain có thể đi lùi. Một số commit tái dựng có cùng timestamp hoặc chứa quyết định được chấp thuận sau đó nhưng đã gộp vào commit sở hữu ban đầu. Hãy đọc chúng như snapshot đã biên tập và dùng bảng ánh xạ để truy nguồn; không suy ra mọi nội dung đã tồn tại tại ngày hiển thị.

Trình tự lớn gồm UI/đa ngôn ngữ, xác thực, quản trị/audit, tách component, tăng cường session/contract và công cụ staging. Khoảng trống ngày commit không chứng minh có hay không có phát triển ở nơi khác.

## Bằng chứng và kiểm chứng

Log, manifest, snapshot và kết quả lịch sử giữ nguyên bytes. Bảng so sánh source cũ được lưu tại `reports/evidence/historical-source-comparisons.json`.

`reports/HISTORY-CHECKPOINTS.json` ghim checksum của bundle Git chứa bảy checkpoint được báo cáo tham chiếu. Chạy `npm --prefix tests run setup:verification` để kiểm checksum, danh sách refs và pack Git, rồi khôi phục riêng `refs/history-audit/*`. Lệnh không fetch mạng hoặc cập nhật HEAD, main, nhánh và remote-tracking refs.

`FRONTEND-SOURCE-COMPARISONS.json` hiện tại là **dữ liệu suy ra khi so manifest cũ với source hôm nay**, không biến test cũ thành nghiệm thu mới. Sau khi đổi source, chạy rõ ràng `npm --prefix tests run reports:refresh`, review diff rồi chạy các gate. Validator không tự sửa bảng so sánh.

Bundle và raw evidence được loại khỏi source snapshot để tránh hash tự tham chiếu; catalog và công cụ xác minh vẫn thuộc source. Một snapshot chỉ có source không phải bộ audit đầy đủ: muốn chạy validator cần bundle đã ghim và thư mục bằng chứng gốc.

## Ranh giới công bố

Message của commit gốc đã được biên tập nên lịch sử này có root khác main trước đây. Merge thông thường sẽ giữ cả hai lịch sử, không phải cách công bố bản rewrite này.

Ngày **25/10/2026**, owner đã đồng ý thay main sau khi hoàn thiện và kiểm chứng trang chủ kỹ thuật. Main trước đó, chính xác tại `240165f756afd156f150f4722e309c1beeabb7ad`, được giữ ở [`archive/frontend-main-before-cutover-20261025`](https://github.com/dangkhoa2016/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker/tree/archive/frontend-main-before-cutover-20261025). Việc công bố dùng lease ghim SHA cũ và điều chỉnh bảo vệ nhánh có kiểm soát, sau đó khôi phục và kiểm tra lại bảo vệ. Các thay đổi tiếp theo trên lịch sử được duy trì dùng PR bình thường.

## Duy trì về sau

Dùng feature branch và pull request được review. Dependency xuất hiện cùng consumer, message khớp diff và test đi cùng thay đổi hành vi. Commit `fix` rõ ràng sau phát hành là bình thường; không rewrite main đã công bố chỉ để xóa chữ đó.
