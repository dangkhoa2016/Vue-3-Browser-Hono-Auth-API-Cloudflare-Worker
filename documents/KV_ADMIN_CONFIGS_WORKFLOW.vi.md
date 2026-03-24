# Luồng KV Admin Configs

> 🌐 Language / Ngôn ngữ: [English](KV_ADMIN_CONFIGS_WORKFLOW.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này giải thích surface KV configuration dành cho super-admin, cách row được chuẩn hóa, và những điểm nhạy cảm khi chỉnh sửa.

## 1. File Chính

- `vue/pages/KvAdminConfigs.vue`
- `vue/composables/useKvAdminConfigsPage.js`
- `assets/js/stores/kvAdminConfigsStore.js`
- `assets/js/api/httpClient.js`

## 2. Mục Đích Tính Năng

Tính năng này cung cấp UI trên browser để xem giá trị config mặc định, xem override trong KV, sửa từng key, ghi hàng loạt key, và xóa override.

Đây là surface admin giá trị cao vì nó thay đổi hành vi runtime một cách gián tiếp thông qua cấu hình thay vì qua code.

## 3. Phân Quyền Sở Hữu State

### Trách Nhiệm Của Store

`kvAdminConfigsStore` sở hữu danh sách row đã được chuẩn hóa và giữ page model đơn giản:

- `rows`
- `allowedKeys`
- `allowedCount`
- `lastUpdated`
- hành vi load và reset

Nó chuyển `configs`, `defaults`, và danh sách key hợp lệ thành row object có:

- `value`
- `defaultValue`
- `valueLabel`
- `defaultLabel`
- `source`
- `isOverride`

### Trách Nhiệm Của Composable

`useKvAdminConfigsPage()` sở hữu orchestration cấp page:

- auth gate
- search và debounce
- filter chỉ hiện override
- copy action
- modal thêm/sửa
- modal xoa
- flow nhập hàng loạt
- submit request và toast feedback

## 4. Vì Sao File Này Lớn

Composable cấp page này lớn vì nó gộp UI state, permission handling, fetch logic, serialization, parsing, điều khiển modal, và keyboard flow cho bulk edit vào cùng một chỗ.

Hiện tại cách này vẫn thực dụng, nhưng đây là ứng viên refactor rõ ràng nếu feature tiếp tục mở rộng.

## 5. Hành Vi Quan Trọng

### Kiểm Soát Truy Cập

- Tính năng yêu cầu đã đăng nhập.
- Nó tiếp tục kiểm tra role `super_admin` trước khi load dữ liệu nhạy cảm.
- Khi gặp `401` hoặc `403`, nó có thể xóa auth state và đưa user quay lại auth gate flow.

### Parse Giá Trị

Giá trị người dùng nhập vào được chuyển lại thành kiểu dữ liệu phù hợp nếu có thể:

- `true` và `false` thành boolean
- `null` thành null
- chuỗi số thành number
- text giống JSON được parse thành object hoặc array
- còn lại giữ dạng string

### Sửa Hàng Loạt

Chế độ bulk edit hỗ trợ:

- thêm dòng động
- gợi ý allowed key
- focus field tiếp theo bằng bàn phím
- validate nhiều dòng trước khi lưu

## 6. Checklist Review

1. Thay đổi có giữ rõ phân biệt giữa default value và KV override không?
2. Typed value có vẫn được parse và hiển thị đồng nhất không?
3. Session hết hạn hoặc unauthorized có vẫn fail-safe không?
4. Bulk editing có giữ keyboard workflow và hành vi validation không?
5. Nếu allowed key đổi, suggestion list và row normalization có vẫn khớp không?

## 7. Ý Tưởng Tối Ưu

1. Tách modal state và request submission thành các helper nhỏ hơn.
2. Tách value serialization và parsing thành utility riêng cho KV config.
3. Chuyển cơ chế bulk-entry sang một composable tập trung hơn.
4. Giữ store normalization thuần túy và tránh đưa thêm UI concern vào store.

## 8. Tài Liệu Liên Quan

1. [Luồng Xác Thực Và Phiên Làm Việc](AUTH_AND_SESSION_FLOW_vi.md)
2. [Truy Cập Dữ Liệu Và Mock API](DATA_ACCESS_AND_MOCK_API_vi.md)

---

[Đọc tài liệu này bằng tiếng Anh](KV_ADMIN_CONFIGS_WORKFLOW.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)