# FRONTEND-HISTORY-MAP — R11

Full-review 108/108 commit đầu vào (88 baseline +20 delta), full behavior hunks của R11 và fresh whole-branch review đã hoàn tất. Generated evidence được review provenance/digest/object và bảo toàn bytes; không claim replay những historical run thiếu snapshot. Chi tiết từng commit ở `FRONTEND-COMMIT-REVIEW.tsv`, 871 SHA/path/hunk contributions ở `FRONTEND-HUNK-MAP.tsv`; named acceptance → test → tier → run ở `FRONTEND-SESSION-ACCEPTANCE.tsv`.

Baseline read-only: `761712b57968810153ea9ade1cbb11a7becce437`. Validated checkpoint trước fold: `fc9393aa978287fdd1ee46ea921a2441f14a7c32`, tree `19be0ef636844f197beca1e8a881f865f6460a02`; backup bundle đã clone/fsck và so tree. Candidate v4 có93commit, tree equality. Báo cáo N9 này là source change sau checkpoint đó; final G5 phải freeze sau báo cáo và có gates/checkpoint/tree-equality riêng.

| Nhóm | SHA G1–G4 cố định; G5 candidate | Trách nhiệm |
| --- | --- | --- |
| G1 | `91ccfa9f7221ceecc23d5287ba69227b6b1204ce` | Fence authentication by API identity, session and caller ownership |
| G2 | `23bacaca2da89cd8561ccbd4a3e783cba0459eca` | Gate monitoring operations and wire extracted modal submissions |
| G3 | `63a8a2f4bffd0853c20d57caf7013921c3b13535` | Extract audit log presentation with explicit props and events |
| G4 | `1b7e481ccce74d53b3dc54ade80a11f674e892da` | Constrain exports and protected views to the backend contract |
| G5 | `da9f07a49a28e16ce0832905afea36fa1a2093d4` | Pin CDN resources and preserve reproducible verification evidence |

G1–G4 ở bảng trên được giữ nguyên trong final. G5 candidate v4 được thay bằng commit có báo cáo/evidence cuối; exact final SHA/tree nằm trong package `git/final-pin.json` và external postpackage attestation. Không đặt final G5 SHA vào chính tree của nó. Package `git/FINAL-HUNK-MAP.tsv` thay đúng candidate G5 SHA bằng final SHA; source TSV vẫn ghi rõ `new_candidate_sha` để audit bước dựng.

Quy tắc chia và dependencies:

- G1: auth/transport/session/caller/deadline/identity bridge, profile counters và rollback. Lockfile/test package/shared fixtures đến cùng consumer đầu tiên. Navbar/LogoutWarning/test IDs là auth UI. New monotonic-clock/async-fence regression thuộc G1.
- G2: monitoring capability/extracted sections/dialog submissions/immutable channel selection. Ba component realtime dùng bản monitoring trước, nhận phần contract ở G4. Unit/browser probes monitoring đi cùng G2.
- G3: audit extraction/props/events/filter/pagination. Composable dùng bản trước final export fence; export fence thuộc G4.
- G4: export/env/backend contract/protected reset, READY helper tại consumer đầu tiên; stale decode download/caller toast probes thuộc G4. Profile browser probe thuộc G1, monitoring probes G2, cross-feature probes G4.
- G5: CDN pins/common gates/cache/isolation/reports/evidence. Fixture dùng bản auth ở G1, nhận direct-response redirect guard/close lifecycle/held-route fallback ở G5. Redirect fake endpoint và Tailwind direct3.4.17 thuộc G5. b45bf57 auth store/tests tách G1, docs/wrapper G5; `assets/js/init.js` singleton bridge thuộc G1.

| Boundary | Own-revision install | Unit | Loopback | Static |
| --- | --- | --- | --- | --- |
| G1 | exit0 |244/244|10/10|exit1: inherited monitoring1082/audit734 dòng|
| G2 | exit0 |253/253|10/10|exit1: inherited audit734 dòng|
| G3 | exit0 |253/253|10/10|exit0|
| G4 | exit0 |311/311|10/10|exit0|

Receipts `boundary-v4-g{1..4}-{install,unit,loopback,static}` có argv/cwd/head/tree/content digest trước-sau/exit/hash; tất cả sourceDrift=false. Không chép helper từ HEAD. Raw static failures G1/G2 được giữ, không gọi all-green. Browser G1–G4 chưa được chạy: common CDN harness chỉ hoàn chỉnh ở G5, không dùng full-browser G5 để claim browser của boundary cũ.

Finalization protocol: giữ G1–G4, chạy source gates sau cập nhật report/maps, amend temporary checkpoint và backup/clone; tạo G5 từ cùng validated tree, so diff/tree/count93. Fresh clone final branch chạy canonical gates; exact ZIP restore chạy lại gates, external attestation pin outerSHA/finalHEAD/tree/digest/exits. Candidate hoặc pre-rewrite logs không thay thế các lượt đó.

Overall PARTIAL: owner reduced-mode support approval, prepared-backend READY và nguyên nhân cancellation R7 vẫn chưa giải quyết. Không push/deploy/backend mutation.
