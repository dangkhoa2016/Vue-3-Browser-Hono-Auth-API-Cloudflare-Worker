# Contributing / Đóng góp

## English

Read the [contribution guide](../CONTRIBUTING.md) for the complete local workflow and verification commands. Use Node.js 24 and the lockfile under `tests/`. The application runs directly in the browser; npm dependencies are for verification.

Keep pull requests focused on one outcome. Describe the previous and resulting behavior, add meaningful coverage for behavior changes, and update the relevant documentation. Read [HISTORY.md](../HISTORY.md) before interpreting curated dates or proposing history changes.

Use descriptive commit subjects and bullet bodies. State which checks actually ran and their results. Required CI checks are **Static and unit**, **History integrity** and **Chromium**; human review remains separate. Use the [PR template](pull_request_template.md) to record compatibility and verification limits.

Runtime CDN pins and verification dependencies must stay coordinated. A Dependabot update in `tests/` may require changes to the matching CDN pin; run the existing pin check and review derived evidence as described in the contribution guide.

Follow the [code of conduct](CODE_OF_CONDUCT.md). Use [support](SUPPORT.md) for questions and [private security reporting](SECURITY.md) for vulnerabilities.

## Tiếng Việt

Đọc [hướng dẫn đóng góp](../CONTRIBUTING.vi.md) để biết quy trình local và các lệnh kiểm chứng đầy đủ. Dùng Node.js 24 và lockfile trong `tests/`. Ứng dụng chạy trực tiếp trong trình duyệt; dependency npm phục vụ kiểm chứng.

Mỗi pull request tập trung vào một mục tiêu. Mô tả hành vi trước/sau, bổ sung kiểm thử có ý nghĩa khi đổi hành vi và cập nhật tài liệu liên quan. Đọc [HISTORY.vi.md](../HISTORY.vi.md) trước khi diễn giải ngày trong lịch sử đã biên tập hoặc đề xuất rewrite.

Commit có tiêu đề rõ và phần mô tả bằng bullet. Ghi đúng kiểm tra đã chạy cùng kết quả. CI yêu cầu **Static and unit**, **History integrity**, **Chromium**; review thủ công là bước riêng. Dùng [mẫu PR](pull_request_template.md) để ghi ảnh hưởng tương thích và giới hạn kiểm chứng.

Phiên bản CDN runtime và dependency kiểm chứng cần đồng bộ. PR Dependabot trong `tests/` có thể cần cập nhật CDN pin tương ứng; chạy kiểm tra pin hiện có và review bằng chứng sinh tự động theo hướng dẫn đóng góp.

Tuân theo [quy tắc ứng xử](CODE_OF_CONDUCT.md). Xem [hỗ trợ](SUPPORT.md) cho câu hỏi và [báo bảo mật riêng](SECURITY.md) cho lỗ hổng.
