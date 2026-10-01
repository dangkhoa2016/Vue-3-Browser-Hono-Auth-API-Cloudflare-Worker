# Frontend R11 — source freeze và bàn giao

Overall **PARTIAL**: chưa có owner approval cho reduced-mode support, chưa có prepared-backend READY; nguyên nhân cancellation R7 vẫn UNRESOLVED. Local gates không thay thế các acceptance đó.

| Trường | Giá trị hiện hành |
| --- | --- |
| Input ZIP SHA256 | `155c9c06b94dafa327350ecc4a9e584a5a35bbdb336d62ad5db9729c62c24403` |
| Input HEAD | `d523d07d423d415ccb341049a1d007ad2b84d3eb`,108commit |
| Baseline bất biến | `761712b57968810153ea9ade1cbb11a7becce437`,88commit |
| Nhánh bàn giao | `remediation/r11-final`, yêu cầu88+5=93commit |
| Final HEAD/tree/clean state | Package `git/final-pin.json` và external attestation pin giá trị sau freeze; không đặt final SHA tự tham chiếu trong chính tree. |
| Source identity | Gate digest `add591bd2ab02152504e1f17753ce41708bf4f3f8a7963913213c13391b0966f`; chỉ handoff/matrix/execution đổi sau gate. Current digest và changed paths được tính trong SOURCE-COMPARISONS; REPORT_ONLY không miễn thay đổi maps/tools/tests. |
| Review | Full108/108 input commits, R11 contributions, fresh whole-branch review,871 SHA/path/hunk contributions trước final report assembly; external FINAL-HUNK-MAP bổ sung assembly cuối. |
| Delivery | Source freeze trước packaging. Đọc external postpackage attestation có đúng outer ZIP SHA để xác nhận N10; báo cáo trong source không tự chứng nhận ZIP sinh sau nó. |

Repo gốc và ZIP đầu vào không đổi. Source/history checkpoint được backup bundle và clone/fsck trước rewrite. Lịch sử R9/R10 ở reports/history/; từng raw run giữ nguyên HEAD/digest/exit của nó.

| Task | Trạng thái và giới hạn |
| --- | --- |
| N1–N4 | Local verified: restore đúng pin; strict manifest/bounded snapshot bytes/modes; cache graph/version/metadata/bin/entrypoint với atomic publication; exact0644/0755 dưới nonroot/defaultACL/umask022/077/002. Không claim full installed-JS byte integrity. |
| N5 | Local verified: resource/method/type và direct-response redirect guard, Tailwind3.4.17, per-test teardown, narrow close cancellation. Sáu canary bị bắt là raw exit1, không gọi suite PASS. HTTP scope, không WebSockets; Google Fonts vẫn floating upstream exact-query. |
| N6 | Local verified: native/SFC shared context, A/B endpoint and late side effects, actualJSON/CSV export và stale decode/caller toast fences. Prepared backend PENDING thiếu READY. |
| N7 | Local session/rollback/deadline verified theo named tests; owner reduced-mode support BLOCKED, historical R7 cancellation UNRESOLVED. |
| N8 | Current33 finding rows, immutable raw claims/comparisons; validator consistency không có nghĩa mọi acceptance đóng.38historical snapshot thiếu vẫn log-only. |
| N9 | Full review/map và G1–G4 own-revision boundaries hoàn tất. Final G5 tạo từ validated checkpoint cùng tree; exactSHA/diff/tree/count proof nằm ở external pin. |
| N10 | Fresh final clone và exact ZIP restore/gates phải có external attestation; xem package README và sidecar kèm ZIP. |

Local source gates sau báo cáo/maps và sửa cuối: **unit460/460, browser56/56, loopback10/10, static0**; không cancelled/unexpected skipped.

- unit: `r11-source-freeze-unit-20261001T144346Z-1`
- static: `r11-source-freeze-static-20261001T144346Z-1`
- loopback: `r11-source-freeze-loopback-20261001T144346Z-1`
- browser: `browser-r11-source-freeze-browser-20261001T144404Z-1`

Named acceptance→test→tier→run: FRONTEND-SESSION-ACCEPTANCE.tsv. G1–G4 unit244/253/253/311,loopback10each,install0,no source drift. StaticG1/G2 kế thừa lỗi file-size được sửa ở extraction sau đó; rawexit1 giữ nguyên, G3/G4static0. Không claim đã chạy browser ở G1–G4.

Review cuối tái hiện RED: redirect vượt guard, export stale sau Blob.text, invalid/backward monotonic clock và async fence race. Các lỗi browser teardown cũng được giữ:53pass3fail,55pass1fail và các targeted failures. Test mới chứng minh response-disposed chỉ được chấp nhận khi context đang đóng; cùng lỗi lúc context mở và network error khác vẫn fail. Không retry đến xanh hoặc xóa log đỏ.

Rollback: documents/SESSION-ROLLBACK.vi.md, close-all-tabs và allowlist auth keys; không hứa mixed old/new compatibility. Không push/deploy/backend mutation. Bước tiếp theo của người nhận: xác minh outer SHA và external attestation, restore theo RESTORE, chỉ chạy integration khi có READY/approval hợp lệ.
