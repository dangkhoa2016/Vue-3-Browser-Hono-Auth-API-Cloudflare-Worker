# Frontend Execution Log — frontend-remediation-r10

> Phần R10 nằm ở trên; các phần bên dưới là bản ghi của R9 và R7, giữ nguyên không sửa.

## R10 — Intake lại sau mất worktree, FR11-01..06, gates

### Sự kiện: mất toàn bộ P1–P8 chưa commit

`/content/frontend-r10-work/` — chứa mọi thay đổi R10 cùng 236 file evidence và mọi run ID của R10 —
không còn tồn tại khi kiểm tra kế tiếp. Không có thao tác nào của R10 xóa thư mục. Vì chưa có commit nào,
toàn bộ công việc P1–P8 mất; đây là lý do R10 bắt đầu bằng một lần khôi phục thay vì bằng một finding.

### Khôi phục: hai nguồn độc lập, và chỉ một cái giữ được lịch sử

| Bước | Kết quả |
| --- | --- |
| Xác minh package | `MANIFEST.sha256` **536/536** khớp; `MODES.txt` **535** dòng, **7** dòng `rwxr-xr-x` |
| Cân bằng content digest | `68b2baab…` (285 files) — khớp giá trị intake |
| Tìm base thật | `/tmp/opencode/r9-clone` = HEAD `a1db43b7…`, 98 commits, clean |
| Áp dirty layer | `git/uncommitted-work-complete.diff` → 34 staged files, `git diff --cached --stat` = `source/` **34 files changed** |
| Byte-identity | kiểm bằng `git hash-object` từng file: **cả 314 blob khớp `source/`** |

Lần dựng repo đầu tiên lấy nội dung từ `source/` (314 files) rồi commit thành chuỗi SHA mới: HEAD
`b8bfc76`, 99 commit, trong đó `cd9d8cd` và `0218583` là commit tự tạo. Digest khớp, nhưng chuỗi đó không
chứa `a1db43b` — mà 44 trong 45 run lịch sử ghi `repo.head = a1db43b7…` trong manifest, và validator
resolve từng manifest trong object store. Các run đó thành *không kiểm chứng được*.

Không phải dữ liệu thiếu: `git/branch-history.bundle` của package chứa `a1db43b7…` trên
`refs/heads/remediation/round6-wip` (`git/bundle-verify.txt` ghi sẵn output), `git/head-commit.txt` ghi
`a1db43b`, và `README-RESTORE.vi.md` bước 4 bảo `git clone git/branch-history.bundle`, **không** dùng
`checkout -b`. `cd9d8cd` không có trong 98 commit của package. Lịch sử luôn ở đó; lần khôi phục đầu không
theo hướng dẫn.

Bản dựng cũ giữ ở `/content/frontend-r10-work/r10-clone-old` (HEAD `b8bfc76`) chỉ để đối chiếu, không
dùng làm gốc. Cây cuối cùng lấy từ `/tmp/opencode/r9-clone` + diff của package, và kiểm lại bằng
`git hash-object` từng file: **cả 314 blob khớp `source/`**.

`.good` trong `/tmp/opencode` còn sống 5 file production post-edit (P3, P5, P6, P7 và P2 resolver);
`fake-api.good.mjs` thực ra là bản **trước** P4 (không có `actualStaticDigest`) nên không dùng. Phần
còn lại — toàn bộ file test và mọi dòng report — viết lại từ contract trong review, không từ trí nhớ.

### Commit

| Commit | Nội dung |
| --- | --- |
| `1c56023` | Khôi phục R9 dirty state lên đúng lịch sử của nó |
| `081c18d` | Thay đổi production FR11-01..06 |
| `2ece0a6` | Nối hai wrapper vào resolver, thêm served digest |
| `6f21c86` | Test cho mode contract, resolver, served digest |

### Bug phát hiện khi chạy gate: fixture không hermetic

Cổng static export `FRONTEND_REPORTS_DIR`/`FRONTEND_EVIDENCE_DIR` (buộc phải vậy: nó chạy producer rồi
kiểm tra thứ vừa ghi). Fixture `validate-reports.test.mjs` kế thừa `process.env` → **35 case đỏ dưới
gate, xanh dưới `npm` trần, trên cùng một mã** (348 test: 313 pass dưới gate, 348 pass ngoài gate).
Sửa bằng cách fixture tự khai báo môi trường. Sau đó: **368/368** plain, 368/368 dưới môi trường gate,
và dưới layout lạ chỉ còn đúng một case đỏ — case báo evidence root không tồn tại, tức layout đó sai thật.

Log của lần chạy trước fix không còn trên đĩa nên không có số đo trước-fix nào được trích lại từ nó.

### Vòng gate cuối

Cả bốn gate đi qua wrapper, không phải `npm` trần:

| # | Lệnh | Exit | Kết quả |
| --- | --- | --- | --- |
| 1 | `run-frontend-gate.sh --label r10-final-static --cwd tests -- npm run test:static` | 0 | 28 rows, 215 evidence, 49 claim |
| 2 | `run-frontend-gate.sh --label r10-final-unit --cwd tests -- npm run test:unit` | 0 | **368/368** |
| 3 | `run-frontend-gate.sh --label r10-final-loopback --cwd tests -- npm run test:loopback` | 0 | **8/8** |
| 4 | `run-browser-gate.sh --label r10-browser` | 0 | **42/42**, `source_drift: none` |

Run browser dùng digest `8679021d…` và ghi nó ra
`reports/evidence/browser-r10-browser-served.json` cùng install key đã verify.

Hai lần chạy sai trước đó, cả hai đã xóa sạch artifact:
- Thiếu `--cwd tests` → exit 254, `Could not read package.json`. Đây chính là bug của FR11-01 ở dạng lệnh.
- `npm ci --ignore-scripts` bỏ mất asset của Playwright; khắc phục bằng `npx playwright install chromium` + `install-deps`.

### Sidecar

`--all` **từ chối** (exit 3) vì 45 run lịch sử ghi head `a1db43b` còn cây hiện tại là `6f21c86` — đúng
tinh thần "không declare một cây mà cây này không đỡ nổi". Chạy lại với `--allow-problems` cho ra đúng
**45 cũ + 4 mới = 49**, không mất run nào. `source.head` ghi `6f21c86`; các run lịch sử vẫn giữ head của
chính nó trong từng claim. Validator xác nhận `every claim backed`.

### Mutation (test mới chỉ có giá trị nếu đỏ khi fix bị gỡ)

| Mutation | Kết quả |
| --- | --- |
| Bỏ `-p` khỏi `SNAPSHOT_EXTRACT_ARGS` | 2 case đỏ |
| `actualStaticDigest` = claim của wrapper | 5/5 đỏ |
| Resolve theo cwd | 2 case đỏ |

### Chưa làm

Task10 packaging/re-verify chưa chạy. Real-app và loopback spec cần prepared backend `READY` nhưng
reduced-mode approval còn pending. Default-ACL không có test (`setfacl` không có ở máy này). Hai browser
flake lịch sử không tái hiện được và **không có nguyên nhân nào được xác lập** — run xanh 42/42 là một
lần chạy sạch, không phải bằng chứng flake đã hết.

**Bẫy `.log` (đã sửa).** `.gitignore:20` loại `*.log`, nên 50 log evidence không vào git trong khi 137
`.meta`/manifest thì có. Validator đọc outcome từ log và báo lỗi cho *từng* claim thiếu log, nên sidecar
49 claim sẽ không kiểm chứng lại được trên cây mới — nó vẫn *trông* đầy đủ. Đã `git add -f` cả 50 log,
rồi `git clone` sạch và validate: 28 rows, 215 evidence, 49 claim bound, exit 0. Bài học cho Task10: đừng
đóng gói bằng `git archive` rồi tin là bằng chứng còn nguyên.

---

# Frontend Execution Log — frontend-remediation-r9

Cwd `/content/frontend-r9-work`, branch `remediation/round6-wip`, `head=a1db43b7e432795c41c727324d87c66f63c22cbb`.
node v20.19.0, npm 10.8.2, Playwright 1.56.1, git 2.43.0, Linux x86_64. **Chưa commit** — xem handoff §2.

`head` ở trên là identity *Git*, không phải identity *nội dung*. Nội dung mỗi run thật nằm trong
`source_digest` của chính `.meta` của run đó, và mọi run R9 đều ghi `source_drift: none`.

## Task1 — Intake, restore, baseline

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `sha256sum /content/sample_data/frontend-remediation-r8-review-package.zip` | 0 | `9830aac7…d32f1` |
| 2 | inventory ZIP (1136 members) | 0 | 0 absolute / traversal / symlink / special / duplicate |
| 3 | `sha256sum -c MANIFEST.sha256` | 0 | 822 payload files |
| 4 | `git bundle verify` + `git fsck --full` | 0 | HEAD `a1db43b`, tree `55033e4`, 98 commits |
| 5 | extract preserving ZIP modes (không dùng `ZipFile.extractall`) | 0 | `extractall` làm mất executable bit |
| 6 | overlay 12 tracked modifications + 13 untracked + `reports/` | 0 | khớp inventory §1 của plan R9 |
| 7 | `git diff --check` | 0 | sạch |
| 8 | `npm --prefix tests ci --ignore-scripts` | 0 | |
| 9 | `npm --prefix tests run test:static` | 0 | baseline R8 |
| 10 | `npm --prefix tests run test:unit` | 0 | baseline R8: 270 tests / 269 pass / 1 skip |
| 11 | `npm --prefix tests run test:loopback` | 0 | 8/8 |
| 12 | `npx playwright test --list` | 0 | **36 tests / 4 files** — thiếu seed smoke, xem Task2 |

Cột "Exit" ở #9–#12 là exit của producer khi chạy trực tiếp để lấy baseline, không phải qua gate wrapper.

## Task2 — FR10-01: discovery không được bỏ suite

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `node --test tests/regression/browser-discovery.test.mjs` | 0 | 6/6 |
| 2 | mutation: đổi matcher về `session-seed-smock` | 1 | test đỏ đúng kỳ vọng, chứng minh test bắt được typo |
| 3 | khôi phục matcher | 0 | |
| 4 | `npx playwright test --list` | 0 | **38 tests / 5 files**, gồm 2 case `session-seed-smoke` |
| 5 | `npx playwright test --list session-seed-smoke` | 0 | 2 tests, không phải 0 |

## Task3 — FR10-02: validator ràng buộc claim với run/source/tier

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `node --test tests/regression/validate-reports.test.mjs` | 1 | RED: probe fixture của review trả `problems=[]` |
| 2 | `node --test tests/regression/source-identity.test.mjs` | 0 | 15/15 |
| 3 | validator + suite sau khi viết lại | 0 | 39/39, gồm fixture thật của review trong `tools/../` |
| 4 | `node tools/validate-reports.mjs --mode draft` | 1 | 8 problem: FR10-01…08 chưa có row |
| 5 | thêm 8 row FR10 vào matrix | 1 | 1 problem: row FR10-07 trỏ file chưa tồn tại — validator đúng |
| 6 | sửa row FR10-07 trỏ `tools/run-browser-gate.sh` | 0 | 22 rows, 0 problem |
| 7 | `node tools/frontend-run-claims.mjs --all` | 0 | 32 run khai báo, 3 artefact bị bỏ qua (không có manifest) |
| 8 | copy `evidence/r8/` của R8 package vào `reports/evidence/` | 0 | 113 file, để citation mang sang R9 resolve được |
| 9 | `node --test tests/regression/*.test.mjs` | 0 | 290/290, 0 skip (skip của R8 nay chạy thật) |

`--allow-problems` **không** được dùng ở bất kỳ bước nào. Ba artefact bị bỏ qua là
`baseline-browser-20260928T011842Z` (lần chạy tay trước khi có identity wrapper), được báo ra tường minh
thay vì khai báo bằng số bịa.

## FR10-01 runtime — browser trên một source identity

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `tools/run-frontend-gate.sh --label r9-browser -- npm run test:browser` | 0 | **38/38**, 12.9m, drift `none` |

Chạy qua `run-frontend-gate.sh`, **không** qua `tools/run-browser-gate.sh`: wrapper đó `rm -rf` một
scratch root dùng chung và luôn ghi `.install-ok` cho install nó không kiểm — đúng FR10-07, và review
cấm chạy nó trên máy reviewer. Sửa wrapper là Task7.

## Gate R9

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `tools/run-frontend-gate.sh --label r9-static -- npm run test:static` | 1 | run đầu: reports chưa có row FR10 |
| 2 | `tools/run-frontend-gate.sh --label r9-unit -- npm run test:unit` | 0 | 290/290 |
| 3 | `tools/run-frontend-gate.sh --label r9-loopback -- npm run test:loopback` | 0 | 8/8 |
| 4 | `tools/run-frontend-gate.sh --label r9-static -- npm run test:static` | 0 | 12/12 CDN pin, validator xanh |
| 5 | `tools/frontend-run-claims.mjs --all` | 0 | sidecar sinh lại sau khi handoff thay đổi |
| 6 | `node tools/validate-reports.mjs --mode draft` | 0 | 22 rows, 133 evidence files, 32 run claims |

Run `r9-static-20260928T081737Z-1` exit 1 được giữ lại, không xóa. Sidecar khai báo nó, validator báo
warning, và không report nào trích dẫn nó làm bằng chứng cho một gate xanh. Đó là điểm của việc giữ.

## Task4 — FR10-03/04/08 browser fixture

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `node --test tests/regression/harness-boundaries.test.mjs` | 0 | collector chạy thuần và idempotent; luôn được đánh giá ở teardown |
| 2 | `npx playwright test -g "egress boundary"` | 0 | `expectBlocked` so URL/method/reason/count; record không còn bị splice |
| 3 | `tools/run-frontend-gate.sh --label r9-t4-browser -- npm run test:browser` | 0 | **38/38** |

## Task5 — FR10-05 source identity

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `node --test tests/regression/source-identity.test.mjs` | 0 | 15/15 → 28/28 sau khi thêm long/multibyte/round-trip/symlink |
| 2 | 4 mutation lần lượt | 1 | 4, 4, 3, 2 test đỏ — mỗi fix đều có test bắt được |
| 3 | `tools/run-frontend-gate.sh --label r9-t5-unit --cwd tests -- npm run test:unit` | 1 | run đầu exit 254: thiếu `--cwd tests`. Giữ lại làm lịch sử |
| 4 | `tools/run-frontend-gate.sh --label r9-t5-unit --cwd tests -- npm run test:unit` | 0 | **331/331**, drift `none` |

## Task6 — FR10-06 grant deadline

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `node --test tests/regression/harness-boundaries.test.mjs` | 0 | manual-clock cases, không sleep trong assertion |
| 2 | `tools/run-frontend-gate.sh --label r9-t6-unit --cwd tests -- npm run test:unit` | 0 | **317/317** |

## Task7 — FR10-07 browser wrapper

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `node --test tests/regression/browser-gate-isolation.test.mjs` | 0 | 13/13: concurrency, impostor dir, symlink, CLI parity, stale stamp |
| 2 | hai wrapper chạy song song | 0 | hai `mkdtemp` khác nhau, không xóa lẫn nhau |
| 3 | `tools/run-browser-gate.sh` (lần 1) | 1 | **35 pass / 6 fail**, 13.9m. Xem dưới |
| 4 | `node --test tests/regression/harness-boundaries.test.mjs` | 0 | 48/48 sau khi thêm shape rule `/l/font` |
| 5 | `npx playwright test served-source-identity backend-contract-mock` | 0 | 12/12 backend xanh; served-spec lộ lỗi trailing slash |
| 6 | `npx playwright test served-source-identity` | 0 | 3/3 |
| 7 | mutation: server trỏ sang cây khác | 1 | 2/3 đỏ, thông điệp nêu cả hai root — canary thật sự bắt được |
| 8 | `tools/run-browser-gate.sh` (lần 2) | 0 | **41/41**, 13.8m, `r9-t7-browser-20260928T102357Z-1` |

Lần chạy đầu thất bại **không phải** do wrapper: 3 test bị guard chặn URL thật
`https://fonts.gstatic.com/l/font?…`, và 3 test served-source hỏng vì `readyEndpoint()` gọi cổng static
thay vì cổng API. Cả hai là lỗi thật, tìm ra nhờ chạy thật chứ không phải nhờ đọc code. Đáng ghi riêng:
lỗi font **thất bại không ổn định** — có request thì đỏ, không có thì xanh, tuỳ font cache. Một test
chỉ xanh theo may mắn thì không phải test xanh.

## Vòng gate cuối

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `tools/run-frontend-gate.sh --label r9-final-unit --cwd tests -- npm run test:unit` | 0 | **346/346**, 0 skip |
| 2 | `tools/run-frontend-gate.sh --label r9-final-loopback --cwd tests -- npm run test:loopback` | 0 | **8/8** |
| 3 | `tools/run-frontend-gate.sh --label r9-final-static --cwd tests -- npm run test:static` | 0 | validator xanh: 22 rows, 193 evidence, 45 claim |
| 4 | `node tools/frontend-run-claims.mjs --all` | 0 | sidecar sinh lại sau khi matrix trỏ run mới |
| 5 | `node tools/validate-reports.mjs` | 0 | 22 rows, 0 problem |

Ba run cuối cùng content digest `1e3650ac…`, `source_drift: none`. Run browser dùng digest
`3e0ff8fa…` và lệch **đúng một file** so với digest cuối: `reports/FRONTEND-FINDING-MATRIX.tsv`, vì hai
cell evidence của nó được viết sau khi browser đã xanh. Tôi đối chiếu hai `.source-before.manifest.json`
và in ra danh sách file lệch; không có file code nào khác nhau.

Số test unit đi 270 (R8) → 290 → 291 → 317 → 331 → **346**. Không có test nào bị xóa; mọi chênh lệch là
cộng thêm và đều truy được về một row trong `reports/FRONTEND-FINDING-MATRIX.tsv`: discovery +6,
validator +40 (42 cuối cùng), source-identity +13 (28 cuối cùng), browser-gate-isolation +13, cộng các
case harness-boundaries thêm theo từng finding.

---

# Frontend Execution Log — frontend-remediation-r7

Source identity cho mọi lệnh dưới đây (trừ khi ghi khác):
`branch=remediation/round6-wip head=a1db43b7e432795c41c727324d87c66f63c22cbb tree=55033e41514957bbd7c13289661018aa6980a91c`
Cwd `/tmp/opencode/r7/repo`, node v20.19.0, npm 10.8.2, git 2.43.0, Linux x86_64, Ubuntu 24.04.

## Task1 — Intake, restore, evidence harness

| # | Lệnh | Exit | Ghi chú |
| --- | --- | --- | --- |
| 1 | `sha256sum r6-task7-full.zip` | 0 | `bfdc3b49…7504` khớp §1 |
| 2 | python3 zipfile inventory (478 entries) | 0 | 0 absolute / traversal / backslash / symlink / duplicate; entries ở root |
| 3 | `unzip -q … -d /tmp/opencode/r7/artifact` | 0 | explicit destination; `cd r6-task7-full` sẽ hỏng (FA8-07) |
| 4 | `sha256sum -c --quiet MANIFEST.sha256` | 0 | 321 entries |
| 5 | `git clone --no-checkout --branch remediation/round6-wip <bundle> repo` | 0 | HEAD `a1db43b`, tree `55033e4`, 98 HEAD / 117 all |
| 6 | `git bundle verify …` | 0 | complete history, 11 refs |
| 7 | `git fsck --full` | 0 | sạch |
| 8 | `git checkout remediation/round6-wip` | 0 | status sạch trước patch |
| 9 | `git apply --whitespace=error-all patches/working-tree-changes.patch` | 0 | 6 modified |
| 10 | `git apply patches/new-file-browser-fixture.patch` | 0 | 1 untracked |
| 11 | so sánh byte 293 file repo vs `source-tree/` | 0 | 293/293 khớp, 0 lệch, 0 chỉ-có-ở-một-bên |
| 12 | `git diff --check` | 0 | sạch |
| 13 | pre-work backup (2 bundle + 2 patch + untracked + 293 hash) | 0 | `/tmp/opencode/r7/prework/` |
| 14 | tạo `tools/run-frontend-gate.sh` (mới) | 0 | wrapper bằng chứng |
| 15 | wrapper self-test `exit 7` | 7 | exit của producer giữ nguyên |
| 16 | wrapper self-test timeout 2s | 124 | nonzero |
| 17 | wrapper self-test `--timeout 0` | 2 | reject trước khi chạy |
| 18 | wrapper self-test success | 0 | |
| 19 | `npm --prefix tests ci --ignore-scripts --no-audit --no-fund` | 0 | 30 packages |
| 20 | `npm --prefix tests run test:static` | 0 | 11/11 CDN pin exact |
| 21 | `npm --prefix tests run test:unit` | 0 | 188 pass / 0 fail / 0 cancelled / 0 skipped, 24 suites |
| 22 | `node --test regression/*.test.mjs` (discovery đối chiếu) | 0 | lần 1: 187 pass + **1 cancelled**; lần 2: 188 pass, 0 cancelled → R7-OBS-01 |
| 23 | `npm --prefix tests run test:loopback` | 0 | 8 pass / 0 fail |
| 24 | `npx --prefix tests playwright install chromium` | 0 | binary về `~/.cache/ms-playwright` |
| 25 | `chromium.launch()` probe | fail | thiếu libatk/atk-bridge/atspi/xcomposite |
| 26 | `apt-get install -y libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libxcomposite1 libasound2t64` | 0 | **có owner cho phép**; 9 gói mới, 0 upgrade, 0 remove |
| 27 | `chromium.launch()` probe lại | 0 | `LAUNCH OK 141.0.7390.37` |
| 28 | `npm --prefix tests run test:browser` | **0** | **32/32 pass (11.0m)** |

Ghi chú môi trường: bước 26 là thay đổi system **ngoài phạm vi dự án frontend**; đã hỏi owner và được
cho phép trong session này. Không có thay đổi nào khác ngoài `/tmp/opencode/r7/` và các gói apt nêu trên.

## Baseline numbers (đã tự chạy, không phải log của vòng trước)

| Gate | Exit | Kết quả |
| --- | --- | --- |
| static | 0 | 11/11 pins |
| unit | 0 | 188 / 0 / 0 / 0, 24 suites |
| loopback | 0 | 8 pass |
| browser | 0 | 32 pass |

## Task2..10

(chưa chạy — sẽ bổ sung theo từng task)

## Task2 (FA8-01) — CLOSED

| # | Lệnh | Exit | Kết quả |
| --- | --- | --- | --- |
| 1 | `npm --prefix tests run test:unit` (gates file) | 0 | **194/194** sau 3 case refresh-commit mới + refresh-lock-pin 3/3 |
| 2 | `npm --prefix tests run test:browser` (gates file) | 0 | **33/33** — gồm FA8-01 two-tab case (roles đảo: arriving tab rotate, winner tab chờ) |
| 3 | mutation: release refresh lock trước commit | fail | node test 4/5 đỏ; browser đỏ tại assert winner 0 dispatch |

## Task3 (FA8-02) — CLOSED

| # | Lệnh | Exit | Kết quả |
| --- | --- | --- | --- |
| 1 | `npm --prefix tests run test:unit` (gates file) | 0 | **199/199** sau 4 subtest deadline mới |
| 2 | `npm --prefix tests run test:browser` (gates file) | 0 | **33/33** |

## Task4 (FA8-03/04) — CLOSED

| # | Lệnh | Exit | Kết quả |
| --- | --- | --- | --- |
| 1 | `node --test regression/harness-boundaries.test.mjs` | 0 | 21/21 policy + typed-allowance case (RED khi allowlist chỉ origin: 4 đỏ; allowance không phân kind: 7 đỏ) |
| 2 | `npx playwright test -g "egress boundary"` | 0 | 2/2 — probe FA8-03 thành Image load thật, refused + count; mutation origin-only → đỏ |
| 3 | `npm --prefix tests run test:unit` (gates file) | 0 | **220/220** |
| 4 | `npm --prefix tests run test:browser` (gates file) | 0 | **33/33** (12.1m) — đợt đầu 27 đỏ vì guard chặn font bootstrap-icons (đã thêm version-directory rule), 3 đỏ vì count kỳ vọng không khớp noise có điều kiện (đã hỗ trợ `[atLeast,atMost]`), sau đó sạch |
| 5 | `npm --prefix tests run test:unit` (gates file) | 0 | **220/220** — kèm FA8-02 follow-up (backstop 2×→min(8×,15s)) chạy 5/5 ổn định |
| 6 | `npm --prefix tests run test:browser` (gates file) | 0 | **33/33** (11.9m) sau khi đổi backstop |

## Task5..10

(chưa chạy — sẽ bổ sung theo từng task)
