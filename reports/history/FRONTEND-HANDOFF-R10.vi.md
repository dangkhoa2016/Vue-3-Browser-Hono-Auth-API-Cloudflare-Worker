# Frontend Handoff — frontend-remediation-r10

> Cập nhật sau **mỗi task** và trước khi chuyển session. Nguồn chân lý là source + log, không phải
> summary cũ. Mọi status phân biệt rõ *static concern* và *confirmed probe*.
>
> **Mục 0R10–5R10 là bản ghi của R10. Mục 0R–6R là bản ghi của R9, mục 0R10.7–0R10.9 của R10, và
> mục 0–6 là bản ghi của R7.** Chúng được giữ nguyên, không sửa: một handoff đã bị viết lại không còn là
> bản ghi của những gì đã xảy ra.

## 0R10. Trạng thái hiện tại (R10)

| Trường | Giá trị |
| --- | --- |
| Plan | `frontend-remediation-r10` (read-only, `/content/FRONTEND-REMEDIATION-FRESH-SESSION-R10.vi.md`) |
| Review | `/content/OPENCODE-FRONTEND-ROUND11-R9-ARTIFACT-AND-SESSION-REVIEW.vi.md` (FR11-01…06) |
| Status | `IMPLEMENTED_UNVERIFIED` cho cả 6 finding FR11; còn packaging + re-verify |
| Repo root (làm việc) | `/content/frontend-r10-work/r10-clone` |
| Reports root | `/content/frontend-r10-work/r10-clone/reports/` |
| Evidence root | `/content/frontend-r10-work/r10-clone/reports/evidence/` |
| Branch | `remediation/r10-recovered` |
| Base HEAD | `a1db43b7e432795c41c727324d87c66f63c22cbb` — 98 commits, **không sửa** |
| Baseline (R5, read-only) | `761712b57968810153ea9cade1cbb11a7becce437` — **không sửa** |
| Source digest | `68b2baab505fb9ae3b3001bcfcefd86afe46abba74ec3c6bba5ad5cbabe9946f` (285 files) — tự tính lại, khớp giá trị intake |

Repo gốc `/content/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker` **không bị sửa** trong R10.

## 0R10.1. Mất session worktree giữa chừng P8, và cách phục hồi

Đây là sự kiện quan trọng nhất của R10 và nó được ghi lại thay vì bị làm nhẹ.

Toàn bộ thay đổi P1–P8 của R10 nằm trong `/content/frontend-r10-work/`, **chưa commit**, khi thư mục
đó biến mất khỏi filesystem. Mất cùng lúc: toàn bộ cây làm việc, mọi file test do R10 tạo ra, các
section handoff, các dòng matrix, sidecar, và **236 file evidence cùng mọi run R10**.

Nguyên nhân không nằm trong R10: `/content/frontend-r10-work/` không còn tồn tại khi kiểm tra kế
tiếp. Không có thao tác nào của R10 xóa nó.

Hai bài học đã được áp dụng ngay, và cả hai đều là thay đổi quy trình chứ không phải code:

1. **Có checkpoint trước khi làm tiếp.** Recovery commit đầu tiên (`1c56023`) được tạo *trước khi*
   viết lại bất kỳ dòng nào. Từ đó mỗi phần đã xong đều commit: `081c18d` (thay đổi production),
   `2ece0a6` (wrapper + served digest), `6f21c86` (test).
2. **Không dựa vào một bản sao.** Bản `.good` trong `/tmp/opencode` còn sống sót 5 file production
   post-edit; phần còn lại được viết lại từ contract, không phải từ trí nhớ.

### Cơ sở khôi phục: lịch sử không bị mất, mình đã tự tạo một lịch sử khác

Lần khôi phục đầu dựng repo mới từ `r9-review-package/source/` (314 files, `MANIFEST.sha256` 536/536
khớp, `MODES.txt` 535 dòng với 7 dòng `rwxr-xr-x`) rồi commit nó thành chuỗi SHA **mới** — HEAD
`b8bfc76`, tổng cộng 99 commit, trong đó `cd9d8cd` và `0218583` là hai commit mình tự tạo. Nội dung thì
đúng: digest khớp `68b2baab…` và 314 blob khớp từng cái với `source/`.

Nhưng chuỗi đó **không chứa `a1db43b`**, mà 44 trong 45 run lịch sử ghi `repo.head = a1db43b7…` trong
manifest của nó. Validator resolve từng manifest trong object store, nên các run đó thành *không kiểm
chứng được*. (Run thứ 45, `browser-r8a-browser-baseline-…`, không có trường `repo.head` nên không dính.)

Điều đáng ghi không phải là dữ liệu thiếu. **Package có sẵn lịch sử**: `git/branch-history.bundle` chứa
`a1db43b7…` trên `refs/heads/remediation/round6-wip` (`git/bundle-verify.txt` đã ghi sẵn output),
`git/head-commit.txt` ghi `a1db43b` với tree `55033e41…`, và `README-RESTORE.vi.md` bước 4 ghi rõ là
`git clone git/branch-history.bundle` và **không** dùng `checkout -b`. `cd9d8cd` không xuất hiện ở đâu
trong 98 commit của package. Nói cách khác: lịch sử luôn ở đó và đã được ghi ra giấy; lần khôi phục
đầu chỉ đơn giản là không theo hướng dẫn.

Cây cuối cùng lấy từ `/tmp/opencode/r9-clone` (HEAD `a1db43b`, 98 commit, clean) cộng
`git/uncommitted-work-complete.diff` của package — 34 file, 22 thêm + 12 sửa, khớp `README-RESTORE` —
và kiểm lại bằng `git hash-object` trên từng file: **cả 314 blob khớp `source/`**, trong khi toàn bộ 45
run lịch sử trở lại kiểm chứng được.

Bài học: khôi phục *cây* mà bỏ *lịch sử* không phải tai nạn dữ liệu, nó là một lựa chọn — và nó tạo ra một
tập bằng chứng **trông đầy đủ nhưng không kiểm chứng được**. Bài học thứ hai, đắt hơn: đọc
`README-RESTORE.vi.md` trước khi khôi phục, vì nó đã ghi sẵn câu trả lời.

## 0R10.2. Sáu finding FR11

| Finding | Severity | Một câu |
| --- | --- | --- |
| FR11-01 | P1 | Bốn call site tự quyết nơi reports/evidence nằm ở đâu; giờ dùng chung một resolver |
| FR11-02 | P1 | Validator tin hai digest khai báo khớp nhau; giờ tự tính lại từ `files` |
| FR11-03 | P1 | Fake API chỉ kiểm tra claim của wrapper so với chính biến đã tạo ra nó; giờ báo digest của cây thật |
| FR11-04 | P2 | `existsSync(node_modules)` trả về true cho một cây rỗng; giờ kiểm tra phủ lockfile |
| FR11-05 | P2 | Shape `/l/font` không có chiều method; giờ có, và thu hẹp theo quan sát |
| FR11-06 | P1 | Mode hỏi bằng bitmask nên 0700 thoát; và `tar` không `-p` nên umask 077 thực sự mất bit |

Chi tiết đầy đủ (kể cả những gì **không** được chứng minh) nằm ở cột `limitation` của từng dòng trong
`FRONTEND-FINDING-MATRIX.tsv`. Không tóm tắt finding ở đây, vì cột limitation là nơi duy nhất ghi
được điều mà finding không đạt.

## 0R10.3. Gates của R10

| Gate | Run | Kết quả |
| --- | --- | --- |
| static | `r10-final-static-20260929T025612Z-1` | exit 0 — 28 rows, 215 evidence, 49 claim, mọi claim đều có bằng chứng |
| unit | `r10-final-unit-20260929T025619Z-1` | 368/368 |
| loopback | `r10-final-loopback-20260929T025710Z-1` | 8/8 |
| browser | `browser-r10-browser-20260929T025733Z-1` | 42/42, `source_drift: none` |

Bốn run này chạy qua `tools/run-frontend-gate.sh` / `run-browser-gate.sh`, không phải qua `npm` trần.
Không có run R10 nào được trích dẫn mà run ID cũ từng thất bại; các run đỏ của R8/R9 vẫn nằm trong
evidence và vẫn bị validator ghi là history, không dùng làm bằng chứng cho một gate xanh.

## 0R10.4. Hai điều phải nói về môi trường, vì chúng giới hạn những gì suite chứng minh được

**Suite không hermetic, và điều đó là bug thật — không phải hạn chế máy.** `run-frontend-gate.sh` export
`FRONTEND_REPORTS_DIR` và `FRONTEND_EVIDENCE_DIR` (nó phải làm vậy: nó chạy producer rồi kiểm tra thứ
đã ghi). Fixture của `validate-reports.test.mjs` kế thừa `process.env`, nên một loạt case đỏ dưới gate và
xanh dưới `npm` trần, trên cùng một mã: 348 test, 313 pass dưới gate, 348 pass ngoài gate. Một suite
chỉ xanh khi không có gì được cấu hình thì không chứng minh được điều gì. Fixture giờ tự nói rõ môi
trường nó dùng.

Hai con số trên lấy từ lần chạy tại thời điểm đó, và log của nó không còn trên đĩa — số đo trước fix
không được giữ lại. Con số **368/368** mới là thứ evidence hiện tại chứng minh, và nó đúng ở cả ba môi
trường: không cấu hình, dưới môi trường gate, và dưới một layout lạ. Ở layout lạ đúng một case đỏ, và
case đó báo evidence root không tồn tại — tức là layout đó sai thật, không phải suite sai.

**Đo umask ở case FR11-06 chạy dưới quyền root.** Root khôi phục mode đã lưu bất kể umask, nên ở máy này
`tar -xzpf` và `tar -xzf` cho cùng kết quả ở cả ba umask. Suite **không** giả vờ thấy chênh lệch ở
umask 077: nó assert sự trùng khớp đó, và ghi rõ rằng kết quả 0700 là đo từ lần chạy unprivileged của
reviewer chứ không tái hiện được ở đây. Người chạy suite bằng user không phải root sẽ có bản assertion
mạnh hơn. `setfacl` không có ở máy này nên **default-ACL hoàn toàn không có test** — umask không nói
gì về default ACL, và giới hạn này được ghi trong limitation của FR11-06.

## 0R10.5. Những mutation đã bị bắt, để báo cáo không tự chứng minh

Một test mới chỉ có giá trị nếu nó đỏ khi fix bị gỡ. Đã kiểm:

| Mutation | Kết quả |
| --- | --- |
| Bỏ `-p` khỏi `SNAPSHOT_EXTRACT_ARGS` | 2 case đỏ |
| Fake API báo claim của wrapper làm `actualStaticDigest` | 5/5 đỏ |
| Resolve đường dẫn tương đối theo cwd (đúng bug FR11-01) | 2 case đỏ |

## 0R10.6. Chưa làm, và không nên coi là đã làm

- **Packaging và re-verify (Task10)**: chưa chạy. §0R10.1 nói rõ vì sao checkpoint phải có trước.
- **Bẫy packaging đã tìm ra và đã sửa: `.log` evidence không được commit.** `.gitignore:20` loại `*.log`,
  nên 50 file log trong `reports/evidence/` đều không có trong git, trong khi 137 `.meta`/manifest thì có.
  Validator cần log để đọc outcome và sẽ báo `run <id> has no <id>.log …, so its counts cannot be checked`
  cho **từng claim** — nghĩa là sidecar 49 claim sẽ không kiểm chứng lại được trên cây mới, dù nó vẫn
  *trông* đầy đủ. Đã sửa bằng cách `git add -f` toàn bộ 50 log, và kiểm lại trên **clone sạch**:
  `reports validate: 28 finding rows, 215 evidence files, 49 run claim(s) bound to their evidence, every
  claim backed`, exit 0. Đây là điều kiện có sẵn của repo, không do R10 gây ra, và nó áp dụng cho 45 run
  lịch sử y hệt 4 run mới — nên ai đóng gói mà chỉ lấy `git archive` thì sẽ đóng gói một bộ bằng chứng
  không kiểm chứng được.
- **Real-app và loopback specs cần prepared backend**: `READY` đã sẵn sàng nhưng reduced-mode approval
  vẫn pending. FR11-03 vì thế mới chỉ chứng minh được mock path và identity của cây bên dưới nó.
- **Default ACL**: không có test, xem §0R10.4.
- **Hai browser flake lịch sử** (`session-seed-smoke` ở P5, `session-invariants` ở P7) không tái hiện
  được và **không có nguyên nhân nào được xác lập**. Run xanh ở R10 là 42/42 trên một lần chạy; nó không
  phải bằng chứng rằng flake đã hết, và không được ghi là đã hết.


## 0. Trạng thái hiện tại (R9)

| Trường | Giá trị |
| --- | --- |
| Plan | `frontend-remediation-r9` (read-only, `/content/FRONTEND-REMEDIATION-FRESH-SESSION-R9.vi.md`) |
| Review | `/content/OPENCODE-FRONTEND-ROUND10-R8-ARTIFACT-AND-SESSION-REVIEW.vi.md` |
| Status | `IMPLEMENTED_UNVERIFIED` cho cả 8 finding R10; final gates xanh trên cây đã ổn định; còn packaging |
| Repo root (làm việc) | `/content/frontend-r9-work` |
| Reports root | `/content/frontend-r9-work/reports/` |
| Evidence root | `/content/frontend-r9-work/reports/evidence/` |
| Branch | `remediation/round6-wip` |
| Base HEAD | `a1db43b7e432795c41c727324d87c66f63c22cbb` (chưa commit — xem §2) |
| Baseline (R5, read-only) | `761712b57968810153ea9ade1cbb11a7becce437` — **không sửa** |
| Input artifact | `/content/sample_data/frontend-remediation-r8-review-package.zip`, SHA256 `9830aac7c017a97e37f19291d20a845f0a600eb63bd24b810fed7809ededa32e` |

Repo gốc `/content/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker` **không bị sửa**. Toàn bộ R9 làm trong
clone riêng `/content/frontend-r9-work`, vì Task11/12 của plan yêu cầu quyền staging/selective commit
mà câu trả lời R8 đã từ chối.

## 1. Provenance (R9-A)

| Kiểm chứng | Kết quả |
| --- | --- |
| ZIP SHA256 | `9830aac7…d32f1` — tự tính lại, khớp giá trị khai trong review |
| Inventory | 1136 members; 0 absolute, 0 traversal, 0 symlink, 0 special, 0 duplicate |
| `MANIFEST.sha256` | xác nhận đủ 822 payload file |
| Bundle Git | `git fsck` sạch; HEAD `a1db43b7…`, tree `55033e41…`, 98 commits |
| Extract | phải giữ mode từ ZIP metadata; `ZipFile.extractall()` làm mất executable bit |
| Dirty inventory | 12 tracked modifications + 13 untracked code/tool files + `reports/`, khớp §1 của plan R9 |

## 2. Findings FR10 và trạng thái closure

Review R10 nêu 8 finding. Enum giữ nguyên `frontend-finding-matrix/1`.

| ID | Trạng thái | Bằng chứng |
| --- | --- | --- |
| FR10-01 testMatch gõ sai, mất seed smoke | `IMPLEMENTED_UNVERIFIED` | `r9-t7-browser-20260928T102357Z-1` browser 41/41, gồm 2 case seed-smoke ở vị trí 37–38 |
| FR10-02 validator không ràng buộc claim với run/source | `IMPLEMENTED_UNVERIFIED` | `r9-final-unit-20260928T103916Z-1` unit 346/346 + static tự validate 42 claim |
| FR10-03 collector vô hiệu hóa teardown | `IMPLEMENTED_UNVERIFIED` | `r9-t4-browser-20260928T085504Z-1` browser 38/38, gồm cả teardown path |
| FR10-04 monkeypatch không phục hồi | `IMPLEMENTED_UNVERIFIED` | `r9-t4-browser-20260928T085504Z-1` browser 38/38; cả suite chạy sau khi patch |
| FR10-05 long path sai, symlink vượt exclusion | `IMPLEMENTED_UNVERIFIED` | `r9-t5-unit-20260928T092645Z-1` unit 331/331, 28 case identity |
| FR10-06 late grant chạy trước timeout | `IMPLEMENTED_UNVERIFIED` | `r9-t6-unit-20260928T091342Z-1` unit 317/317 |
| FR10-07 browser wrapper chưa tự chứa | `IMPLEMENTED_UNVERIFIED` | `r9-t7-browser-20260928T102357Z-1` browser 41/41 qua wrapper đã sửa |
| FR10-08 closure browser policy rộng hơn test | `IMPLEMENTED_UNVERIFIED` | `r9-t7-browser-20260928T102357Z-1` browser 41/41; policy gap tìm ra bởi chính run đỏ kia |

Cả tám row để ở `IMPLEMENTED_UNVERIFIED` chứ không `VERIFIED`, và đây là lựa chọn có chủ ý: finding
được sửa và test xanh chỉ chứng minh hành vi quan sát được, không chứng minh tính đúng đắn tuyệt đối của
mọi trường hợp chưa xét. Nâng lên `VERIFIED` cần một tiêu chí khác hơn "đã có test xanh", và tiêu chí đó
là việc của một vòng review kế tiếp chứ không phải của tôi tự gán cho chính mình.

`FA8-05`/`FA8-06`/`FA8-07`/`R7-OBS-01` vẫn `OPEN` từ R8, chưa ai động tới ở R9.

Theo review §FR10-08, `FR9-03`/`FA8-03`/`FA8-04` chỉ nên đọc là **partial ở cấp acceptance**, không phải
đã đóng hẳn: policy test xanh không chứng minh "mọi context/page đều guarded". Việc tách phần đã verify
khỏi phần còn gap là Task10.

## 3. Bằng chứng gate (R9)

| Gate | Kết quả | Run |
| --- | --- | --- |
| static | pass, validator xanh trên chính báo cáo này, 193 evidence files, 45 claim | `r9-final-static-20260928T104016Z-1` |
| unit | **346/346** pass, 0 skip | `r9-final-unit-20260928T103916Z-1` |
| loopback | 8/8 pass | `r9-final-loopback-20260928T104011Z-1` |
| browser | **41/41** pass, 13.8m, qua wrapper FR10-07 | `r9-t7-browser-20260928T102357Z-1` |

Mỗi số ở §3 nằm trên đúng một dòng với đúng một run, để validator đối chiếu được với log của chính run
được trích chứ không phải với log nào khác trong thư mục:

- unit 346/346 từ `r9-final-unit-20260928T103916Z-1`
- browser 41/41 từ `r9-t7-browser-20260928T102357Z-1`
- loopback 8/8 từ `r9-final-loopback-20260928T104011Z-1`

Cả bốn run có `source_drift: none`. Ba run unit/loopback/static **cuối** dùng cùng một content digest
`1e3650ac80b0ac0819c9a9fd4db5970b0535843bbc7b38d0bb0b76d87fe44b6d`. Run browser dùng
`3e0ff8fa2d1bd353c07f1fb415461d068c49534a268a3d6e3d8ab16647ae2bbb`, và **khác đúng một file**:
`reports/FRONTEND-FINDING-MATRIX.tsv`, vì hai cell evidence của nó được viết sau khi browser đã chạy xong.
Không có file code nào khác khác nhau — tôi đã đối chiếu hai `.source-before.manifest.json` và in ra danh
sách file lệch, không phải tự suy ra từ mắt thường. Hai digest đó được đọc từ manifest của chính từng run
và được validator kiểm lại, nên viết chúng ở đây không phải là gõ tay một con số.

**Thứ tự ghi, nói thẳng:** các số ở §3 được đọc từ các run trên, rồi mục này được viết vào. Vì vậy
`reports/*.md` nằm **ngoài** digest mà chính các run ấy ghi. Đây là hệ quả tất yếu của một báo cáo tự
tham chiếu, không phải lỗi: cái được tuyên bố là "các số này đến từ source digest X", và nó đúng — X nằm
trong `.meta` của run và trong manifest của chính nó. Muốn digest bao phủ cả văn bản báo cáo thì phải
đóng băng văn bản trước khi chạy, mà văn bản lại chứa tên run: vòng lặp không có điểm dừng. Task12 chạy
lại một vòng sau khi văn bản đã ổn định.

Run browser `r9-t7-browser-20260928T102357Z-1` chạy **trước** khi hai cell evidence cuối của matrix được
viết, nên digest toàn cây của nó lệch digest cuối ở đúng một file văn bản. Không có mã nào lệch: cùng một
cây, cùng một byte, khác ở chỗ báo cáo về chính nó. Đây là hệ quả tất yếu đã nêu ở trên, và lần này nó được
đo thay vì được giải thích — vì có thể đo được thì không cần nói suông.

Có một vòng browser đỏ trước đó, `r9-t7-browser-20260928T095049Z-1`, thoát 1 với 35 pass / 6 fail. Nó
được giữ trong evidence vì nó là thứ tìm ra lỗ hổng egress policy ghi ở FR10-08, và nó không đứng làm bằng
chứng cho bất cứ row nào.

## 4. Thay đổi chính (R9)

- **FR10-01** `tests/browser/playwright.config.mjs`: `session-seed-smock` → `session-seed-smoke`;
  thêm `tests/regression/browser-discovery.test.mjs` so inventory bắt buộc với collection thật của
  Playwright thay vì hardcode 36. Mutation tái tạo lại typo làm test đỏ đúng kỳ vọng.
- **FR10-02** `tools/validate-reports.mjs`: claim được bind vào **một run** — run id resolve đúng
  `.meta`/`.log`/`.source-before.manifest.json` của run đó, đối chiếu exit code của producer, tier đọc từ
  `argv`, source digest đối chiếu với cả `.meta` lẫn manifest, và SHA commit kiểm bằng object database.
  `R7-OBS-01` và FR10-01…08 vào required set. Mọi document resolve theo `reports` override.
- **FR10-02 (mới)** `reports/FRONTEND-RUN-CLAIMS.json` + `tools/frontend-run-claims.mjs`: sidecar được
  **sinh ra từ artefact của chính các run**, không gõ tay. Mọi giá trị — tier, command, exit, digest,
  counts — đọc từ `.meta`/`.log`, và parser log được import từ chính validator để hai bên không lệch nhau.
- **FR10-02 (mới)** `reports/FRONTEND-RUN-CLAIMS.json` bị loại khỏi source identity, cùng lý do với
  `reports/evidence`: nó được viết *sau* các run nó mô tả, nên để nó vào manifest sẽ biến digest thành
  hàm của việc báo cáo thay vì hàm của code.
- **FR10-05** `tools/frontend-source-identity.mjs`: `splitUstarPath()` chỉ tách tại byte `/` thật, yêu cầu
  `name <= 100` và `prefix <= 155`, cả hai field không rỗng; path không thể chứa thì **throw** thay vì bị
  bóp méo — không PAX, và giới hạn đó được ghi vào matrix thay vì giấu. Manifest dùng `lstatSync`:
  symlink là `kind: 'symlink'`, `mode: '120000'`, hash của chuỗi target, kèm `targetExcluded`.
  Symlink trỏ ngoài repository bị từ chối; symlink trỏ vào vùng exclude không bị dereference. Snapshot ghi
  symlink bằng ustar type `2` với body là target path. 28 case gồm một ustar reader độc lập và đối chiếu
  GNU tar; bốn mutation lần lượt làm 4, 4, 3, 2 test đỏ.
- **FR10-06** `acquireWithDeadline()` đọc lại elapsed đơn vị đo đơn điệu ngay tại grant boundary, trước
  `granted=true` và trước khi làm việc. Test dùng manual clock, không sleep trong assertion.
- **FR10-07** `tools/browser-gate-env.mjs` + `tools/run-browser-gate.sh`: per-run scratch có ownership
  marker, install cache khóa theo lockfile + platform + Node ABI + version + Playwright version + browsers
  path, stamp phân biệt `absent`/`current`/`stale` và từ chối install lạc hậu thay vì âm thầm cài lại.
  Static server được start từ snapshot và tự khai báo root + digest; 3 case
  `served-source-identity.spec.mjs` kiểm điều đó lúc chạy.
- **FR10-08** `tests/browser/helpers/browser-fixture.mjs`: `expectBlocked(...declarations)` so khớp
  URL/method/reason/count và record không còn bị splice; mọi context từ `newContext`/`newPage` đều bị
  pin `serviceWorkers: 'block'`. Thêm một shape rule cho `/l/font?…` — xem FR10-08 ở matrix để biết vì
  sao shape đó phải tồn tại và vì sao nó cố ý *không* khai báo method.

## 5. Còn lại

Task4–7 xong: FR10-03/04/08 (lifecycle, collector, monkeypatch restore, khai báo blocked,
`serviceWorkers:'block'`), FR10-05 (ustar + symlink identity), FR10-06 (monotonic elapsed ở grant
boundary), FR10-07 (wrapper tự chứa). Còn lại:

1. **Task8–10**: R8-F (FA8-05/06/07), browser contract, acceptance tách phần đã verify khỏi phần còn gap.
2. **Task11/12**: review diff, fold các nhóm, package tự chứa.
3. **Nâng `VERIFIED`**: cần một vòng review độc lập, không phải tự gán khi test xanh.

**`tools/run-browser-gate.sh` giờ đã an toàn để chạy** — khác với cảnh báo ở bản handoff trước. Nó
dùng `mkdtemp` cho từng run, chỉ xóa thư mục có marker do chính nó tạo, dùng install cache có khóa theo
lockfile/Node/Playwright, và tự chọn hai port trống. Run browser ở §3 đã đi qua chính wrapper này, và một
lần chạy song song hai wrapper cho hai thư mục khác nhau mà không xóa lẫn nhau. Chi tiết cơ chế nằm ở
`tools/browser-gate-env.mjs` và 13 case trong `tests/regression/browser-gate-isolation.test.mjs`.

## 6. Bài học đã trả trong R9

- Validator R8 có thể bị làm cho *trông* đúng: review probe của R10 trả `problems=[]` cho một handoff
  ghi `unit 3/3` từ run ghi `0 passed, 3 failed`, chỉ vì thư mục còn một log khác ghi `3 passed`. Bài
  học: "kiểm tra bằng chứng" phải là *kiểm tra bằng chứng này*, không phải "tìm thấy số ở đâu đó".
- Một sidecar có cấu trúc vẫn là một claim nếu ai đó gõ tay vào nó. `tools/frontend-run-claims.mjs` tồn
  tại vì lý do đó: nếu sidecar phải được sinh từ artefact thì không có chỗ để gõ sai số.
- `static` và `npm ci` không in ra "N passed". Khai báo `tests: 0, pass: 0` cho chúng là một claim khác
  hẳn (rằng nó đã chạy 0 test nên pass), nên field bị bỏ hẳn thay vì điền số 0.
- **Một test chỉ xanh theo may mắn thì không phải test xanh.** Lỗi egress `/l/font` fail *không ổn
  định*: 3 case backend-contract đỏ khi guard chặn request thật từ gstatic, rồi 12/12 xanh ở lần chạy kế
  tiếp trên **cùng một mã**, vì font cache quyết định có phát request hay không. Nếu tôi dừng ở lần xanh
  thứ hai thì finding được đóng bằng một kết quả ngẫu nhiên. Điều đã làm thay vì vậy: tìm URL thật trong
  log của lần đỏ, thêm shape rule, rồi kiểm shape rule đó bằng mutation.
- **Một field khai báo hạn chế mà code không đọc tới thì tệ hơn là không có field.** Shape rule
  `/l/font` ban đầu ghi `method: 'GET'`, nhưng `reasonFor()` chỉ nhận URL nên không enforce được method đó;
  test mới phải `if (policy.decisionFor)` mới chạy được nên nó **vacuous** — bỏ `method` đi vẫn xanh 48/48.
  Tôi gỡ field và ghi thẳng vào rule rằng policy không có chiều method, thay vì giữ một ràng buộc trông
  có vẻ đúng nhưng không có tác dụng.
- **Đừng dùng mã trùng cả hai vế.** Khối lạnh Chromium có thể tự phục vụ request, nên "server đúng" không suy
  ra từ "test xanh". Vì vậy `served-source-identity.spec.mjs` kiểm header **và** byte thật, và cảnh báo
  canary được kiểm bằng cách trỏ server sang cây khác: 2/3 case đỏ với thông điệp nêu cả hai root.

---

# Frontend Handoff — frontend-remediation-r8

> Cập nhật sau **mỗi task** và trước khi chuyển session. Nguồn chân lý là source + log, không phải
> summary cũ. Mọi status phân biệt rõ *static concern* và *confirmed probe*.
>
> **Mục 0R–2R bên dưới là bản ghi của R8.** Phần R6/R7 cũ được giữ nguyên phía dưới, không sửa: một
> handoff đã bị viết lại không còn là bản ghi của những gì đã xảy ra.

## 0R. Trạng thái hiện tại (R8)

| Trường | Giá trị |
| --- | --- |
| Plan | `frontend-remediation-r8` (read-only, `/content/FRONTEND-REMEDIATION-FRESH-SESSION-R8.vi.md`) |
| Review | `/content/OPENCODE-FRONTEND-ROUND9-ARTIFACT-AND-SESSION-REVIEW.vi.md` |
| Status | `IN_PROGRESS` — R8-A..E xong và đã verify; R8-F/G chưa bắt đầu |
| Repo root (làm việc) | `/tmp/opencode/r8/work` |
| Reports root | `/tmp/opencode/r8/work/reports/` |
| Evidence root | `/tmp/opencode/r8/work/reports/evidence/` |
| Branch | `remediation/round6-wip` |
| Base HEAD | `a1db43b7e432795c41c727324d87c66f63c22cbb` |
| Base HEAD tree | `55033e41514957bbd7c13289661018aa66...` → `55033e41514957bbd7c13289661018aa6980a91c` |
| Baseline (R5, read-only) | `761712b57968810153ea9ade1cbb11a7becce437` — **không sửa** |
| Input artifact | `/content/sample_data/r7-session-package.zip`, SHA256 `42e97ce7ba9e0763ee74e3b23fa039e691daaa31e34f474e4ea2ed3ee4585e93` |
| Backup nguyên trạng | `/tmp/opencode/r8/backup/r7-snapshot-restored` |

## 1R. Provenance (R8-A)

| Kiểm chứng | Kết quả |
| --- | --- |
| ZIP SHA256 | `42e97ce7…585e93` — khớp §1 của plan R8 |
| Inventory | 0 absolute, 0 traversal, 0 symlink, 0 duplicate |
| Clone | `git clone` explicit branch từ bundle, exit 0 |
| Overlay | 452 file áp dụng, **byte-equal** với ZIP; executable mode giữ nguyên |
| `git diff --check` | exit 0 |

## 2R. Findings R9 và trạng thái closure

Enum của matrix đã **pin** ở `frontend-finding-matrix/1`:
`OPEN | IN_PROGRESS | IMPLEMENTED_UNVERIFIED | VERIFIED | BLOCKED`. `CLOSED` không còn hợp lệ — đó là
từ mà các vòng trước dùng cho closure quá rộng, nên nó bị loại có chủ đích thay vì được chấp nhận lại.

| ID | Trạng thái | Bằng chứng |
| --- | --- | --- |
| FR9-01 deadline bị cap bởi wall clock | `VERIFIED` | `r8-unit2` 259/259; 10 case đỏ trên R7 |
| FR9-02 early-rearm non-deterministic | `VERIFIED` | manual clock, không sleep trong assertion |
| FR9-03 chỉ default context có guard/teardown | `VERIFIED` | 5 case FR9-03 + full suite 36/36, exit 0, no drift |
| FR9-04 policy origin-shaped, bỏ qua query | `VERIFIED` | `r8-unit2` 259/259 + static 12/12 + browser 36/36 |
| FR9-05 source identity theo content | `VERIFIED` | digest trước/sau giống nhau, drift `none`, có snapshot |
| FR9-06 không có validator cho report | `VERIFIED` | 16 case, 12 bản copy bị cố tình làm sai |
| FA8-01 / FA8-03 / FA8-04 | `VERIFIED` | regression xanh **và** browser half xanh trong cùng một full run |
| FA8-02 | `VERIFIED` | FR9-01/02 đã đóng lại phần timing semantics |
| FA8-05 / FA8-06 / FA8-07 / R7-OBS-01 | `OPEN` | chưa xử lý ở R8, thuộc R8-F |

**Vì sao ba dòng FA8 bị giữ lại rồi mới nâng:** closure của R7 chỉ dựa trên review probe, không có
content identity. R8 đã giữ chúng ở `IMPLEMENTED_UNVERIFIED` cho tới khi full browser run xanh, thay vì
nâng ngay vì regression xanh. Text probe gốc của R7 được giữ nguyên trong ô evidence.

## 3R. Bằng chứng gate (R8)

| Gate | Kết quả | Run |
| --- | --- | --- |
| deps install | pass | `r8a-deps-install-20260928T050917Z-1` |
| static | pass | `r8-final6-static-20260928T062245Z-1` — 12/12 CDN pinned, 1 accepted floating, validator pass |
| unit | **270/270** pass | `r8-final6-unit-20260928T062224Z-1` |
| loopback | 8/8 pass | `r8-final-loopback-20260928T060122Z-1` |
| browser baseline (R7 product + R8 tooling) | 33/33 pass | `browser-r8a-browser-baseline-20260928T052411Z-1` — digest `339ef1de…` |
| browser R8-C/D | **36/36** pass, 13.6m | `browser-r8cd-browser-20260928T054557Z-1` |

Mỗi run mới đều có `.meta` với content digest trước/sau, `source_drift`, snapshot tarball và argv.

## 4R. Thay đổi chính (R8)

- **FR9-01/02** `assets/js/api/sessionCoordinator.js`: `defaultAcquisitionScheduler` đo bằng
  `performance.now()`, nhận `monotonicNow/setTimer/clearTimer`; bỏ `Math.min(deadline*8, 15_000)`;
  early timer re-arm phần thời gian còn lại; reading null/non-finite/lùi → fence; `createSessionCoordinator`
  nhận `acquisitionScheduler` (không đụng `now` vốn dành cho expiry/conflict).
- **FR9-03** `tests/browser/fixtures.js` + `tests/browser/helpers/browser-fixture.mjs`:
  `surveilBrowser` bọc `browser.newContext/newPage`, tự cài guard và page watcher, teardown mọi
  context/page, `currentSurveillance` để test quan sát.
- **FR9-04** cùng file: resource key gồm cả query; `SHAPED_ALLOWANCES` cho `fonts.gstatic.com` derive
  từ families thật của app; thêm `vue/Loader.vue` vào derive; `tools/check-cdn-pins.cjs` ngang bàng.
- **FR9-05** `tools/frontend-source-identity.mjs` + `tools/run-frontend-gate.sh`:
  manifest `{path,mode,size,sha256}` có thứ tự cố định, một digest; drift → `INVALID_SOURCE_DRIFT` exit 3.
- **FR9-06** `tools/validate-reports.mjs` (+ wired vào `npm run test:static`): schema pin, cell alignment,
  enum, path/evidence tồn tại, VERIFIED phải có test, gate count phải có log, matrix–handoff nhất quán.

## 5R. Còn lại

1. ~~Full browser run `r8cd-browser`~~ — xong 36/36; FR9-01..06 và FA8-01..04 đều `VERIFIED`.
2. **R8-F**: Task5–8 của Phụ lục A (FA8-05 endpoint switch, FA8-06 singleton, Task7 browser contract,
   Task8 verify acceptance/migration/rollback).
3. **R8-G**: Task9/10 — review diff, fold 5 nhóm trên baseline `761712b5`, package tự chứa.

## 6R. Bài học đã trả trong R8

- Wrapper `run-browser-gate.sh` từng copy evidence về **hai lần** và bỏ `--no-snapshot`, nên log chạy được
  lại không tạo được bằng chứng. Bài học: một gate mà bằng chứng của nó không tới được nơi cần thì nó
  không phải gate.
- `adopt()` trả `{ context, guard }` thay vì chính context, làm **toàn bộ** 36 browser case đỏ với
  `context.route is not a function`. Bài học: wrapper của một API phải trả về đúng thứ API đó trả về,
  kể cả khi thêm hành vi; nếu không, lỗi nằm ở chỗ xa nhất có thể.
- Số liệu `242/242` trong ghi chú session không có log nào chứng minh. R8-E đã bắt được đúng điều đó.
  Bài học: một con số trong văn xuôi không phải một phép đo.

---

# Frontend Handoff — frontend-remediation-r7

> Cập nhật sau **mỗi task** và trước khi chuyển session. Nguồn chân lý là source + log, không phải
> summary cũ. Mọi status phân biệt rõ *static concern* và *confirmed probe*.

## 0. Trạng thái hiện tại

| Trường | Giá trị |
| --- | --- |
| Plan | `frontend-remediation-r7` (read-only, `/content/FRONTEND-REMEDIATION-FRESH-SESSION-R7.vi.md`) |
| Status | `IN_PROGRESS` |
| Repo root (làm việc) | `/tmp/opencode/r7/repo` |
| Reports root | `/tmp/opencode/r7/repo/reports/` |
| Evidence root | `/tmp/opencode/r7/repo/reports/evidence/` |
| Branch | `remediation/round6-wip` |
| Base HEAD (R6) | `a1db43b7e432795c41c727324d87c66f63c22cbb` |
| Base HEAD tree | `55033e41514957bbd7c13289661018aa6980a91c` |
| Baseline (R5, read-only) | `761712b57968810153ea9ade1cbb11a7becce437` — 88 commits, **không sửa** |
| Restore method | clone explicit branch từ `git/r6-history.bundle` + apply 2 patches |

## 1. Input artifact và restore

| Kiểm chứng | Kết quả |
| --- | --- |
| ZIP SHA256 | `bfdc3b49dc9a3ca823d181988687b85c1280b3a2c411fd35c99e9158aac87504` — **khớp** §1 |
| Archive inventory | 478 entries (156 dir + 322 file); 0 absolute, 0 traversal, 0 backslash, 0 symlink, 0 duplicate |
| Extract | `unzip -d /tmp/opencode/r7/artifact` (entries ở root → **không** `cd r6-task7-full`, xác nhận FA8-07) |
| MANIFEST.sha256 | 321 entries, `sha256sum -c --quiet` exit **0** |
| Bundle | complete history, 11 refs, `git bundle verify` exit 0, `git fsck --full` exit 0 |
| Clone | `git clone --no-checkout --branch remediation/round6-wip <bundle> repo` → exit 0 |
| HEAD/branch sau clone | `a1db43b7…` / `remediation/round6-wip` — khớp §1 |
| HEAD tree | `55033e41…` — khớp §1 |
| Commit count | HEAD 98; `--all` 117 — khớp §1 |
| Patch apply | `working-tree-changes.patch` (`--whitespace=error-all`) exit 0; `new-file-browser-fixture.patch` exit 0 |
| Dirty status sau apply | đúng 6 modified + 1 untracked, khớp §1 từng dòng |
| Snapshot equality | **293/293 file byte-equal** với `artifact/source-tree/`; 0 chỉ-có-ở-một-bên |
| Modes | không có exec-bit lệch; untracked file 644 |
| `git diff --check` | exit 0 |

**Restore là clone+patches, KHÔNG phải snapshot-restore** — không chồng hai cách (theo §Task1).

## 2. Pre-work backup (bắt buộc, không định danh source dirty bằng base tree)

Tất cả ở `/tmp/opencode/r7/prework/`:

| File | Nội dung |
| --- | --- |
| `r7-prework-HEAD-a1db43b.bundle` | `--all` refs tại thời điểm bắt đầu |
| `r7-prework-dirty.bundle` | HEAD bundle (dự phòng) |
| `r7-prework-working-tree.patch` | 6 modified delta |
| `r7-prework-working-tree-binary.patch` | binary-safe |
| `r7-prework-untracked-browser-fixture.mjs` | file untracked |
| `r7-prework-source-hashes.sha256` | **293** hash của toàn bộ source (kể cả phần dirty) |

## 3. Baseline gates (Task1) — tự chạy, có log + exit thật

Wrapper: `tools/run-frontend-gate.sh` (mới). Giữ full stdout/stderr + metadata
`command/cwd/source identity/start/end/exit`; **exit của producer được giữ nguyên**.

Wrapper self-test (4/4 đạt, chạy thật):

| Case | Kỳ vọng | Thực tế |
| --- | --- | --- |
| producer `exit 7` | 7 | **7** |
| timeout 2s vs `sleep 30` | nonzero ≠ 0 | **124** |
| `--timeout 0` | reject trước khi chạy | **2**, producer không chạy (không có `SHOULD_NOT_RUN` trong log) |
| success | 0 | **0** |

Baseline suites (mọi lệnh qua wrapper, `reports/evidence/*.log` + `*.meta`):

| Gate | Lệnh | Exit | Kết quả |
| --- | --- | --- | --- |
| deps | `npm --prefix tests ci --ignore-scripts --no-audit --no-fund` | 0 | 30 packages; lockfile v3, 32 entries, `cebccba60a9f…` |
| static | `npm --prefix tests run test:static` | 0 | 11/11 CDN pin exact |
| unit | `npm --prefix tests run test:unit` | 0 | **188 pass / 0 fail / 0 cancelled / 0 skipped**, 24 suites |
| loopback | `npm --prefix tests run test:loopback` | 0 | 8 pass / 0 fail |
| **browser** | `npm --prefix tests run test:browser` | **0** | **32 passed (11.0m)** — xem §4 |

Versions: node `v20.19.0`, npm `10.8.2`, git `2.43.0`, Chromium `141.0.7390.37`, Ubuntu 24.04 x86_64.

## 4. Browser environment — BLOCKER ĐÃ GỠ (khác review Round8)

Review Round8 kết luận `BROWSER_REVIEWER_BLOCKED_ENV`: Chromium launch fail vì thiếu system libs.
**Trong session này blocker đã được gỡ và browser suite đã chạy thật.**

- `npx --prefix tests playwright install chromium` → binary về `~/.cache/ms-playwright` (chromium-1194,
  chromium_headless_shell-1194, ffmpeg-1011).
- Thiếu host libs: `libatk1.0-0t64`, `libatk-bridge2.0-0t64`, `libatspi2.0-0t64`, `libxcomposite1`
  (đã có: libnspr4, libnss3, libcups, libdrm, libgbm, libpango, libxkbcommon).
- **Đã hỏi và được owner cho phép** cài system libs (thay đổi ngoài phạm vi frontend, ghi ở đây):
  `apt-get install -y libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libxcomposite1 libasound2t64`
  → 9 gói mới, **0 upgrade, 0 remove** (thuần additive).
- Launch xác nhận: `LAUNCH OK version: 141.0.7390.37`, DOM read được.
- `test:browser` → **32/32 pass, exit 0**.

Hệ quả: các gate của Task 4/5/6/7 cần browser evidence **không còn bị chặn môi trường**. Con số 32 ở
đây là **OpenCode tự chạy lại**, không phải log của reviewer hay của vòng trước.

## 5. Quan sát mới phát sinh ở Task1

- **R7-OBS-01 (chưa xác định nguyên nhân, chưa tính là finding):** một lần chạy
  `node --test tests/regression/*.test.mjs` trực tiếp cho `# cancelled 1` / 187 pass, trong khi
  `npm --prefix tests run test:unit` cho 188 pass / 0 cancelled. Chạy lại thì `# cancelled 0` /
  188 pass. Tức là **có flakiness theo cách gọi**, chưa reproduce ổn định. Chưa được dùng làm
  acceptance; phải tìm test bị cancel trước khi Task10 ký số liệu.

### 5.1 FA8-01 — đã đóng (Task2)

**Sửa:** `assets/js/api/sessionCoordinator.js` — `exclusive()` giữ refresh lock trên toàn chuỗi
re-read → dispatch → commit/adopt. Adoption vẫn read-only (không ghi storage, không bump version);
conflict/winner-wait vẫn nằm **ngoài** lock; writer lock không bao giờ qua HTTP.

**Test Node** (`tests/regression/refresh-commit-order.test.mjs`, +3 case, suite 8/8):
hai tab không tiêu predecessor trước commit đầu; tab xếp hàng adopt successor; tab xếp hàng không
tiêu/không ghi đè session đã bị thay.

**Test browser thật** (`tests/browser/session-invariants.spec.mjs`): một tab đã rotate, câu trả lời về
rồi còn nằm trong lock; tab thứ hai vào giữa cửa sổ đó. Case dùng **bộ đếm dispatch per-page**
(`page.route` + `fallback()`) vì log của stand-in là chung cho mọi tab nên không trả lời được "tab nào
đã tiêu token".

**Mutation (bằng chứng test thật sự soi lỗi):** tách commit ra khỏi lock (release-before-commit) →
- Node: case 4/5 đỏ đúng assertion.
- Browser: đỏ tại `and the tab that waited never spent one at all` (`[]` vs 3 dispatch).

**Bẫy test đã gỡ (đáng ghi lại vì rất dễ lặp lại):** bản đầu giữ writer lock bằng page thứ ba để "đóng
băng" commit. Commit có deadline thật (`DEFAULT_LOCK_ACQUISITION_TIMEOUT_MS = 5000`); giữ writer lâu
hơn thì commit **đúng** là trả `unavailable`, record vẫn ở predecessor, và tab thứ hai hoàn toàn có lý
khi rotate nó. Test khi ấy đo lại chính lock của nó. Case cuối cùng **không** dùng page giữ writer:
cửa sổ là "câu trả lời đã về, write chưa land, coordination lock vẫn còn giữ".

**Gates sau khi đóng:** unit **194/194** · loopback **8/8** · static exit 0 (11/11 CDN) ·
browser **33/33** (12.1m).

**Wrapper:** bổ sung `--cwd` — trước đó wrapper ép `cwd=repo root` nên không chạy được
`npm run test:*` (script nằm ở `tests/`). Self-test mới: exit 7 → 7, `--timeout 0` → 2,
`--cwd /nonexistent` → 2, `--cwd tests` → 0 và `cwd:` ghi đúng trong metadata.

### 5.2 FA8-02 — đã đóng (Task3)

**Sửa:** `acquireWithDeadline()` giữ deadline bằng **hai** đo độc lập, vì mỗi cái một mình đều có thể nói dối:
wall clock quyết định deadline *đã tới chưa* (nên timer bắn sớm chỉ re-arm, không fence request vẫn còn
lý do chờ), còn ngân sách tick đếm số lần timer nổ (2× deadline, bước ≤50ms) kết thúc lần chờ dù đồng hồ
đứng yên. `granted` vẫn dừng deadline → giữ nguyên fix Task7 (không bỏ rơi work đang bay). **Không** tăng
5000ms để né lỗi.

**Test:** 4 subtest mới trong `tests/regression/session-write-order.test.mjs` — clock đứng yên rồi grant đến
muộn phải **zero work**; clock lùi dần; timer bắn sớm phải re-arm chứ không fence; lock đã grant với
network chậm hơn deadline thì work không bị bỏ. Dùng `settlesWithin()` để một promise không settle **FAIL
có thông báo** thay vì treo suite.

**RED trước khi sửa:** 3/4 subtest đỏ. **Gates sau khi đóng:** unit **199/199** · loopback **8/8** ·
static exit 0 · browser **33/33**.

**Follow-up (FA8-02, phát hiện ở Task4):** ngân sách backstop lúc đầu đóng với **2× deadline** hoá ra
flake — trên máy nhẹ tải, tick timer chạy nhanh hơn danh nghĩa nên backstop (bước ≤50ms) bắn TRƯỚC khi
deadline của subtest coarse-clock kịp tới (assert "chưa settled tại 25ms" thi thoảng đỏ; reproduces ~1/2
lần). Đã nới backstop lên `min(8× deadline, 15s)` — nằm xa hẳn deadline để không bao giờ race một clock
chỉ *thô* (vẫn tới deadline đúng lúc của nó), nhưng vẫn chặn clock thật sự đứng yên/lùi. Chạy 5/5 lần ổn
định. 5000ms vẫn không đổi.

### 5.3 FA8-03/04 — đã đóng (Task4)

**FA8-03:** ranh giới egress nay là phần của **`context` fixture dùng chung** (`tests/browser/fixtures.js`) —
mọi context có guard trước khi có page nào, và một request bị chặn sẽ **FAIL** cả test (case cố tình gây
egress phải khai qua `guard.expectBlocked(n)`). Allowlist = **đúng artifact đã pin**, lấy từ *cùng* bộ file
mà `tools/check-cdn-pins.cjs` quét (`index.html`, `vue/Loader.js`, `assets/js/init.js`, `assets/js/appServices.js`)
— ban đầu quên `index.html` (vue, vue3-sfc-loader, vue-i18n) nên guard chặn chính boot của app; có node
case chống drift giữa 2 danh sách. Artifact là CSS pin còn tham chiếu font bằng `url(...)` tương đối mà
không file nào trong repo kể tên (bootstrap-icons.woff/woff2) — rule **version-directory inherit pin**:
request nằm trong thư mục phiên bản của dependency đã pin thì được phép (vẫn exact, `@bumped`/`@latest`
chặn). CDN build chỉ cho phép theo origin KÈM reason bắt buộc; fixture origin liệt kê từng hostname
loopback thay vì "any loopback". Bỏ `guard.allow()` (escape hatch chính là lỗ hổng). Probe FA8-03 chuyển
thành case browser thật trong `harness-egress.spec.mjs` (Image load thật, refused + đếm + reason).

**FA8-04:** `allowError()` nay BẮT BUỘC khai `kind` (console/pageerror/requestfailed) — allowance console
không thể nuốt pageerror chỉ vì chứa cùng từ; requestfailed có thể thu hẹp bằng method+url; `count` khai
chính xác số lần, hoặc dãy `[atLeast, atMost]` cho noise *có điều kiện* (read bị từ chối không phải lúc nào
cũng log — sau khi đo bằng DIAG thấy tab 2 không gọi API nào sau logout); floor >0 vẫn là yêu cầu, ceiling
vẫn chặn allowance biến thành blanket. `problems()` trả object có kind/url/method/failure. Chuyển 11 call
site cũ; case endpoint-switch tách refused-read (console) khỏi abandoned chunk (requestfailed, url `/vue/`)
thay vì một regex `/…|CORS/i`. Probe FA8-04 thành case regression: pageerror chứa "CORS" vẫn bị BÁO dù có
allowance console.

**RED/mutation:** allowlist chỉ theo origin ⇒ harness-boundaries đỏ 4 case, browser spec đỏ (refusedUrls=[]);
allowance không phân kind ⇒ đỏ 7 subtest. **Gates:** unit **220/220** · loopback **8/8** · static exit 0 ·
browser **33/33** (chạy lại browser sau nới backstop FA8-02).

## 6. Status từng task

| Task | Nội dung | Status |
| --- | --- | --- |
| 1 | Intake, restore, evidence harness | **VERIFIED** (xem §1–§4) |
| 2 | FA8-01 refresh coordination qua commit | **CLOSED** (xem §5.1) |
| 3 | FA8-02 acquisition deadline | **CLOSED** (xem §5.2) |
| 4 | FA8-03/04 guard + collector toàn suite | **CLOSED** (xem §5.3) |
| 5 | FA8-06 singleton boundary | OPEN |
| 6 | FA8-05 endpoint switch xuyên transition | OPEN |
| 7 | Browser contract gaps + offline fixture | OPEN |
| 8 | Acceptance cũ, migration/rollback, support | OPEN |
| 9 | Fold 5 nhóm remediation | OPEN |
| 10 | Final verification + package | OPEN |

Chi tiết từng finding: `reports/FRONTEND-FINDING-MATRIX.tsv`.
Lệnh từng bước và exit: `reports/FRONTEND-EXECUTION-LOG.vi.md`.

## 7. Chưa quyết định / cần owner

- **Reduced-mode support approval:** vẫn **PENDING**. Không có record approve trong gói. Không giả
  đã/chưa duyệt. Safety fixes độc lập vẫn tiếp tục.
- **Backend READY:** chưa có. Chỉ chặn *integration thật*; Task7 mock/fixture vẫn làm được.

## 8. Hành động kế tiếp

Task5 (FA8-06, singleton boundary): `AdvancedAudit` graph — `assets/js/stores/advancedAuditStore.js:3-4`
dùng `assets/js/api/apiIdentity.js` / `protectedState` trực tiếp thay vì qua cached barrel, rủi ro tách
singleton graph. Cần browser case (backend-contract-mock) chứng minh audit fetch dùng cùng graph với
session, và init.js ghim đúng barrel. Sau đó: Task6 (FA8-05), Task7 (contract gaps), rồi Task8–10.
