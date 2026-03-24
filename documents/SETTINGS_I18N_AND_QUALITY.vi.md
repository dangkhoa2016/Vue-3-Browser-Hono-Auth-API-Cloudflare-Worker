# Cài Đặt, I18n, Và Công Cụ Chất Lượng

> 🌐 Language / Ngôn ngữ: [English](SETTINGS_I18N_AND_QUALITY.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này mô tả trang Settings, các browser preference được lưu, cơ chế load ngôn ngữ runtime, và những quality script nhẹ giúp dự án dễ bảo trì hơn.

## 1. File Chính

- `vue/pages/Settings.vue`
- `vue/composables/useSettingsPage.js`
- `assets/js/stores/mainStore.js`
- `assets/js/i18n.js`
- `tools/i18n.js`
- `tools/i18n-audit.js`
- `tools/i18n-usage-check.js`
- `tools/vue-file-size-check.cjs`
- `tools/vue-custom-lint.cjs`
- `tools/vue-script-setup-coverage.cjs`

## 2. Mục Đích Của Trang Settings

Trang Settings không chỉ là nơi chỉnh giao diện. Đây là bảng điều khiển browser cho hành vi runtime.

Các setting quan trọng gồm:

- theme
- language
- mock hay real API mode
- runtime API base URL
- admin page size
- request timeout
- search debounce
- time format

Những setting này ảnh hưởng đến cả trải nghiệm người dùng lẫn hành vi của feature khác.

## 3. Quyền Sở Hữu Tùy Chọn

`assets/js/stores/mainStore.js` sở hữu browser-level preference được lưu và áp dụng side effect như:

- bật tắt dark mode class trên `document`
- lưu giá trị vào `localStorage`
- cập nhật Axios runtime base URL và timeout
- ghi nhận `settingsLastUpdated`

`useSettingsPage()` thêm orchestration cấp page, quy tắc truy cập, form state, deep-linked tab, toast feedback, và việc load danh sách ngôn ngữ hỗ trợ từ server.

## 4. Mô Hình I18n Runtime

`assets/js/i18n.js` tạo hoặc tái sử dụng một i18n instance duy nhất.

Hành vi quan trọng:

- locale file được load lazy bằng dynamic import
- ngôn ngữ hiện tại được lưu trong `localStorage`
- `<html lang="...">` được cập nhật khi đổi locale
- browser language chỉ được map trong tập ngôn ngữ app hỗ trợ

Setup này giữ cho quá trình khởi động ban đầu gọn hơn, nhưng cũng có nghĩa là locale drift có thể bị che giấu nếu không dùng tooling.

## 5. Công Cụ Chất Lượng

### Kiểm Tra I18n

- `node tools/i18n.js audit`
- `node tools/i18n.js usage`
- `node tools/i18n.js check`

Những script này giúp bắt missing key, usage drift, và các vấn đề bảo trì dịch thuật khác.

### Kiểm Tra Khả Năng Bảo Trì Vue

- `node tools/vue-file-size-check.cjs`
- `node tools/vue-custom-lint.cjs`
- `node tools/vue-script-setup-coverage.cjs`

Đây là những guardrail nhẹ, không phải hệ lint hay type đầy đủ. Chúng đặc biệt hữu ích với dự án này vì nhiều Vue file đã khá lớn.

## 6. Điểm Nóng Khi Review

### Trang Settings

- hành vi tab và quyền truy cập theo role
- thay đổi API runtime ảnh hưởng đến mọi request về sau
- public mode so với authenticated admin mode
- đồng bộ preference giữa form state và store state

### I18n

- drift key giữa `en`, `vi`, `de`, `ja`, và `ko`
- cách dùng fallback text trong page và component
- key mới chỉ được thêm vào một locale file

### Công cụ chất lượng

- guardrail có thể lỗi thời nếu script và tài liệu lệch nhau
- script pass không đảm bảo kiến trúc tốt, chỉ đảm bảo mức an toàn cơ bản

## 7. Checklist Review

1. Thay đổi Settings có cập nhật đúng cả UI state và persisted state không?
2. Nếu đổi API base URL hoặc timeout, các request về sau có nhận giá trị mới ngay lập tức không?
3. Nếu thêm i18n key mới, tất cả locale đang duy trì đã được cập nhật hoặc theo dõi chưa?
4. Thay đổi có giữ cách fallback tập trung thay vì fallback inline trong template không?
5. Nếu file lại lớn thêm, có nên tách code trước khi thêm logic feature mới không?

## 8. Ý Tưởng Tối Ưu

1. Tách `useSettingsPage.js` thành các phần system preferences, appearance/language, và tab-link helper.
2. Thêm ghi chú bảo trì ngắn mỗi khi setting mới cần cập nhật thêm quality script.
3. Gộp việc thêm locale-key theo từng feature để giảm thời gian review drift.
4. Cân nhắc thể hiện trạng thái i18n drift đã biết trong tài liệu khi các locale ngoài EN/VI đang chậm hơn.

## 9. Tài Liệu Liên Quan

1. [Hướng Dẫn Review Dự Án](PROJECT_REVIEW_GUIDE_vi.md)
2. [Truy Cập Dữ Liệu Và Mock API](DATA_ACCESS_AND_MOCK_API_vi.md)
3. [Ranh Giới Kiến Trúc Frontend](FRONTEND_ARCHITECTURE_BOUNDARIES_vi.md)

---

[Đọc tài liệu này bằng tiếng Anh](SETTINGS_I18N_AND_QUALITY.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)