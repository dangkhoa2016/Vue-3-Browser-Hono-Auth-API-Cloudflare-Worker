# Security reporting / Báo cáo bảo mật

## English

Report suspected vulnerabilities privately to **i.am@dangkhoa.dev**. If GitHub private vulnerability reporting is available for this repository, you may also use that channel. Do not post exploit details in public issues or pull requests.

Include the affected commit, route, browser/version, backend revision and relevant configuration assumptions. Describe impact and a minimal reproduction using fake accounts and data. Do not send live passwords, JWTs, refresh tokens, cookies, localStorage dumps or unredacted HAR files. The maintainer may request a safer reproduction.

Security maintenance focuses on current `main`. Historical evidence, package versions and local tests do not certify a production deployment. The [runtime and verification guide](../documents/VERIFICATION_AND_RELEASES.md) explains the supported contract. Backend vulnerabilities belong with the [backend security policy](https://github.com/dangkhoa2016/Hono-Auth-API-Cloudflare-Worker/blob/main/.github/SECURITY.md); describe cross-repository impact when relevant.

Coordinate disclosure timing through the private channel. Assessment depends on maintainer availability; this policy does not promise a response deadline or bounty payment.

## Tiếng Việt

Báo lỗ hổng nghi ngờ riêng qua **i.am@dangkhoa.dev**. Nếu repository có chức năng báo lỗ hổng riêng tư trên GitHub, bạn cũng có thể dùng kênh đó. Không đăng chi tiết khai thác trong issue hoặc pull request công khai.

Gửi commit, route, trình duyệt/phiên bản, revision backend và giả định cấu hình liên quan. Mô tả tác động và cách tái hiện tối thiểu bằng tài khoản, dữ liệu giả. Không gửi mật khẩu thật, JWT, refresh token, cookie, bản sao localStorage hoặc HAR chưa che dữ liệu riêng tư. Maintainer có thể yêu cầu cách tái hiện an toàn hơn.

Bảo trì bảo mật tập trung vào `main` hiện tại. Bằng chứng lịch sử, version package và kiểm thử local không chứng nhận deployment production. [Hướng dẫn runtime và kiểm chứng](../documents/VERIFICATION_AND_RELEASES.md) mô tả contract được hỗ trợ. Lỗ hổng backend theo [chính sách bảo mật backend](https://github.com/dangkhoa2016/Hono-Auth-API-Cloudflare-Worker/blob/main/.github/SECURITY.md); nêu ảnh hưởng giữa hai repository nếu có.

Thống nhất thời điểm công bố qua kênh riêng. Việc đánh giá tùy thời gian maintainer; chính sách không cam kết thời hạn phản hồi hoặc tiền thưởng.
