# Công cụ quản lý i18n - Hướng dẫn đầy đủ

> 🌍 **Ngôn ngữ:** [English](I18N_TOOLS_EN.md) | [Tiếng Việt](I18N_TOOLS_VI.md)

Bộ công cụ quản lý i18n locales cho dự án Hono Auth API.

---

## 📦 Các file đã tạo

### Công cụ chính
1. **`i18n-audit.js`** (14 KB)
   - Engine kiểm tra chính
   - Tải tất cả locale files
   - So sánh keys và phát hiện lỗi
   - Xuất báo cáo JSON/CSV
   - Giao diện CLI

2. **`i18n.js`** (4.5 KB)
   - CLI wrapper thân thiện với người dùng
   - Điều hướng các lệnh kiểm tra
   - Hệ thống trợ giúp
   - Các lệnh tương lai (keys, count)

3. **`i18n-quick.sh`** (2.2 KB)
   - Script bash hỗ trợ
   - Truy cập nhanh các lệnh thường dùng
   - Các phím tắt tiện lợi
   - Tích hợp CI/CD
_VI.md`** (file này) - Tài liệu đầy đủ (Tiếng Việt)
- **`I18N_TOOLS_EN.md`** - Tài liệu đầy đủ (English)
### Tài liệu
- **`I18N_TOOLS.md`** (file này) - Tài liệu đầy đủ

---

## 🎯 Mục đích

- ✅ **Kiểm tra tính nhất quán** giữa các file locale (en, vi, ko, ja, de)
- 📊 **So sánh key** và phát hiện sự thiếu hụt hoặc dư thừa
- 🔍 **Phát hiện lỗi** như:
  - Key bị thiếu trong một số ngôn ngữ
  - Kiểu dữ liệu không khớp (string vs number)
  - Dấu ba chấm không nhất quán (`...`)
  - Chữ hoa/thường không nhất quán
- 📁 **Xuất báo cáo** sang JSON hoặc CSV

---

## 🚀 Bắt đầu nhanh

### Các lệnh cơ bản

**Node.js:**
```bash
# Chạy kiểm tra
node tools/i18n.js audit

# Hiển thị keys đã sắp xếp
node tools/i18n.js audit --sort

# Xuất kết quả (JSON + CSV)
node tools/i18n.js audit --export --csv

# Hiển thị trợ giúp
node tools/i18n.js help
```

**Bash:**
```bash
# Chạy kiểm tra
bash tools/i18n-quick.sh audit

# Hiển thị keys đã sắp xếp
bash tools/i18n-quick.sh audit-sort

# Xuất kết quả
bash tools/i18n-quick.sh export

# Kiểm tra (thoát khi có lỗi)
bash tools/i18n-quick.sh check

# Hiển thị trợ giúp
bash tools/i18n-quick.sh help
```

### Kết quả mong đợi

```
╔════════════════════════════════════════════════════════════╗
║        BÁO CÁO KIỂM TRA & SO SÁNH i18n                    ║
╚════════════════════════════════════════════════════════════╝

📊 Tóm tắt:
  Locale tham chiếu: de
  Tổng số Keys: 103

📚 Tổng quan Locales:
  ✓ DE: 103 keys
  ✗ EN: 112 keys (9 thừa)
  ✓ JA: 103 keys
  ✓ KO: 103 keys
  ✗ VI: 112 keys (9 thừa)

⚠️  Keys thừa:
  en (9 thừa):
    - home.badge
    - home.cta.documentation
    ... và 7 keys khác
```

---

## 📊 Ký hiệu trong kết quả

| Ký hiệu | Ý nghĩa |
|---------|---------|
| ✓ | Key có trong locale |
| ✗ | Key thiếu trong locale |
| ✅ | Tất cả kiểm tra đều đạt |
| ❌ | Có key thiếu hoặc lỗi |
| ⚠️ | Tìm thấy key thừa |
| 🔴 | Kiểu dữ liệu không khớp |
| ⏭️ | Dấu ba chấm (...) không nhất quán |
| 🔤 | Chữ hoa/thường không nhất quán |

---

## 🔍 Những gì được kiểm tra

### Tính đầy đủ
- ✓ Tất cả locales có cùng số lượng keys
- ✓ Không có key nào bị thiếu trong bất kỳ locale nào
- ✓ Không có key thừa trong bất kỳ locale nào

### Tính nhất quán
- ✓ Kiểu dữ liệu khớp nhau (string = string, object = object)
- ✓ Cách dùng dấu ba chấm (`...`) nhất quán
- ✓ Chữ hoa/thường nhất quán

### Cú pháp
- ✓ Module JavaScript hợp lệ
- ✓ Export đúng cách
- ✓ Không có lỗi phân tích cú pháp

---

## 📁 Định dạng kết quả

### Báo cáo JSON

```json
{
  "referenceLocale": "en",
  "totalKeys": 103,
  "byLocale": {
    "en": {
      "total": 103,
      "keys": ["about.advanced...", "about.features...", ...]
    }
  },
  "missing": {
    "vi": ["key1", "key2", ...]
  },
  "extra": {
    "de": ["key3", "key4", ...]
  },
  "mismatchType": {},
  "inconsistentEllipsis": [
    {
      "key": "loader.initializing",
      "en": "Initializing...",
      "de": "Initialisierung"
    }
  ],
  "inconsistentCase": [
    {
      "key": "home.badge",
      "ref": "en: Production-ready...",
      "loc": "vi: production-ready..."
    }
  ]
}
```

### Báo cáo CSV

```csv
Key,de (Keys),en (Keys),ja (Keys),ko (Keys),vi (Keys)
about.advanced.admin_roles.body,✓,✓,✓,✓,✓
about.advanced.admin_roles.title,✓,✓,✓,✓,✓
about.advanced.audit_system.body,✓,✓,✓,✓,✓
...
```

**Các file xuất ra:**
```
tools/
├── i18n-audit-result.json  # Báo cáo chi tiết
└── i18n-audit-result.csv   # Bảng so sánh
```

---

## 💡 Ví dụ sử dụng

### Tình huống 1: Phát hiện key bị thiếu

```bash
$ node tools/i18n.js audit

❌ Keys bị thiếu:

  vi (thiếu 2 keys):
    - home.badge
    - home.cta.documentation

# Cần thêm 2 key này vào vi.js
```

### Tình huống 2: Dấu ba chấm không nhất quán

```bash
$ node tools/i18n.js audit

⏭️  Dấu ba chấm (...) không nhất quán:

  Key: loader.initializing
    en: "Initializing..."
    de: "Initialisierung"

# Cần thêm "..." cho DE
```

### Tình huống 3: Chữ hoa/thường không nhất quán

```bash
$ node tools/i18n.js audit

🔤 Chữ hoa/thường không nhất quán:

  about.testing_items.system_integration
    en: System integration tests
    vi: hệ thống tích hợp

# Cần chuẩn hóa chữ hoa/thường
```

### Tình huống 4: Xuất file để team review

```bash
$ node tools/i18n.js audit --export --csv
# Mở CSV trong Excel/Google Sheets để team review
```

---

## 🔧 Tích hợp

### Pre-commit Hook

```bash
#!/bin/bash
node tools/i18n-audit.js
if [ $? -ne 0 ]; then
  echo "❌ Kiểm tra i18n thất bại. Vui lòng sửa lỗi trước khi commit."
  exit 1
fi
```

Lưu vào `.git/hooks/pre-commit` và cấp quyền thực thi:
```bash
chmod +x .git/hooks/pre-commit
```

### CI/CD Pipeline

**GitHub Actions:**
```yaml
- name: Kiểm tra tính nhất quán i18n
  run: node tools/i18n-audit.js
  working-directory: vue-hono-auth-api-cloudflare-worker
```

**GitLab CI:**
```yaml
i18n-check:
  script:
    - cd vue-hono-auth-api-cloudflare-worker
    - node tools/i18n-audit.js
```

### NPM Scripts

Thêm vào `package.json`:
```json
{
  "scripts": {
    "i18n:audit": "node tools/i18n-audit.js",
    "i18n:sort": "node tools/i18n.js audit --sort",
    "i18n:export": "node tools/i18n.js audit --export --csv"
  }
}
```

---

## 📚 Các thực hành tốt nhất

### 1. Kiểm tra thường xuyên

Chạy audit trước khi merge PR:
```bash
node tools/i18n.js audit
```

Mã thoát:
- `0` = Tất cả OK
- `1` = Có vấn đề cần sửa

### 2. Xem lại các keys

Xem danh sách key để phát hiện vấn đề:
```bash
node tools/i18n.js audit --sort
```

### 3. Giữ tính nhất quán

**Quy tắc dấu ba chấm:**
- Nếu key có ý nghĩa "đang làm gì...", luôn thêm `...`
- Ví dụ: `"Loading..."`, `"Initializing..."`, `"Finalizing..."`

**Chữ hoa/thường:**
- Luôn viết thường (lowercase) trừ khi là danh từ riêng
- Ví dụ: `"error details"` không phải `"Error Details"`

**Định dạng:**
- Luôn dùng ký hiệu chấm (`.`) cho nested keys
- Ví dụ: `message.home.title`, `message.errors.not_found`

### 4. Khi thêm keys mới

```bash
# 1. Thêm vào en.js (locale tham chiếu)
# 2. Dịch sang các locale khác (vi, ko, ja, de)
# 3. Chạy audit để xác nhận
node tools/i18n.js audit
# Phải đạt tất cả các kiểm tra
```

### 5. Xuất file để review

Khi cần review lớn:
```bash
node tools/i18n.js audit --export --csv
# Mở tools/i18n-audit-result.csv trong Excel/Sheets
```

---

## 🛠️ Xử lý sự cố

### "No locale files found" (Không tìm thấy file locale)

Kiểm tra đường dẫn `assets/js/locales/` tồn tại và có file `.js`:
```bash
ls -la assets/js/locales/
# Phải hiện: de.js, en.js, ja.js, ko.js, vi.js
```

### "Error loading en.js: Unexpected token..." (Lỗi tải en.js)

File locale có syntax error. Kiểm tra:
- Dấu ngoặc nhọn `{}` cân bằng
- Dấu phẩy `,` đúng vị trí
- Dấu nháy `'` hoặc `"` cân bằng

**Chạy kiểm tra cú pháp:**
```bash
node -c assets/js/locales/en.js
node -c assets/js/locales/vi.js
# Lặp lại cho tất cả locales
```

### "Module not found" (Không tìm thấy module)

Đảm bảo chạy từ root directory:
```bash
cd /workspaces/devex/vue-hono-auth-api-cloudflare-worker
node tools/i18n.js audit
```

### Muốn thay đổi locale tham chiếu?

Sửa file `i18n-audit.js` dòng ~150:
```javascript
// Hiện tại: const referenceLocale = langCodes[0];
// Đổi thành:
const referenceLocale = 'en'; // Luôn dùng tiếng Anh làm tham chiếu
```

---

## 🎓 Sử dụng nâng cao

### Kiểm tra tùy chỉnh

Thêm các hàm kiểm tra mới trong `i18n-audit.js`:

```javascript
// Ví dụ: Kiểm tra placeholder bị thiếu
const missingPlaceholders = [];
for (const key of referenceKeys) {
  const refVal = String(allKeySets[referenceLocale][key]);
  const refPlaceholders = (refVal.match(/\{[^}]+\}/g) || []);
  
  for (const lang of langCodes) {
    if (lang === referenceLocale) continue;
    const keys = allKeySets[lang];
    const keySet = new Set(Object.keys(keys));
    
    if (keySet.has(key)) {
      const locVal = String(keys[key]);
      const locPlaceholders = (locVal.match(/\{[^}]+\}/g) || []);
      
      if (refPlaceholders.length !== locPlaceholders.length) {
        missingPlaceholders.push({
          key,
          lang,
          ref: refVal,
          loc: locVal
        });
      }
    }
  }
}
result.missingPlaceholders = missingPlaceholders;
```

### Xử lý hàng loạt

Xử lý nhiều dự án:
```bash
#!/bin/bash
for project in project1 project2 project3; do
  cd $project
  echo "Đang kiểm tra $project..."
  node tools/i18n-audit.js || echo "❌ $project có vấn đề"
  cd ..
done
```

---

## 💾 Cấu trúc file

```
tools/
├── i18n-audit_VI.md        # Tài liệu này (Tiếng Việt)
├── I18N_TOOLS_EN.md        # Tài liệu (English)tra chính (14 KB)
├── i18n.js                 # CLI wrapper (4.5 KB)
├── i18n-quick.sh           # Script bash hỗ trợ (2.2 KB)
├── I18N_TOOLS.md           # Tài liệu này
├── i18n-audit-result.json  # Được tạo sau khi xuất
└── i18n-audit-result.csv   # Được tạo sau khi xuất

assets/js/locales/
├── de.js                   # Tiếng Đức (locale tham chiếu)
├── en.js                   # Tiếng Anh
├── ja.js                   # Tiếng Nhật
├── ko.js                   # Tiếng Hàn
└── vi.js                   # Tiếng Việt
```

---

## ✨ Tính năng chính

- ✓ Tự động phát hiện locale tham chiếu
- ✓ Kết quả có màu sắc dễ đọc
- ✓ Nhiều định dạng xuất (JSON + CSV)
- ✓ Báo cáo lỗi chi tiết
- ✓ Mã thoát cho tự động hóa
- ✓ Không cần thư viện bên ngoài (Node.js thuần)
- ✓ Script shell hỗ trợ truy cập nhanh
- ✓ Tài liệu đầy đủ toàn diện
- ✓ Dễ dàng mở rộng với các kiểm tra mới

---

## 🎯 Các trường hợp sử dụng phổ biến

### 1. Trước khi commit
```bash
bash tools/i18n-quick.sh check
# Mã thoát 0 = OK, 1 = Có vấn đề
```

### 2. Trước khi merge PR
```bash
node tools/i18n.js audit
# Xem báo cáo trước khi merge
```

### 3. Team review
```bash
node tools/i18n.js audit --export --csv
# Gửi CSV cho team để review
```

### 4. Gỡ lỗi
```bash
node tools/i18n.js audit --sort
# Xem tất cả keys theo thứ tự alphabet
```

### 5. Tích hợp CI/CD
```yaml
# Thêm vào pipeline
- run: node tools/i18n-audit.js
```

---

## 📄 Giấy phép

MIT

---

## 📞 Hỗ trợ & Phản hồi

Để đặt câu hỏi, cải tiến, hoặc báo lỗi:
- Xem các comment trong `i18n-audit.js`
- Xem lại các ví dụ trong hướng dẫn này
- Gửi phản hồi cho team

---

**Cập nhật lần cuối:** 2026-02-03

Chúc bạn dịch thuật vui vẻ! 🌍
