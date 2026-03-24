# Audit Quản Trị Và Advanced Audit

> 🌐 Language / Ngôn ngữ: [English](ADMIN_AUDIT_AND_ADVANCED_AUDIT.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này mô tả cụm tính năng audit dưới hai lớp: trang thao tác audit log chuẩn và khu vực advanced audit cho analytics, compliance, và archival action.

## 1. File Chính

- `vue/pages/AdminAuditLogs.vue`
- `vue/composables/useAdminAuditLogsPage.js`
- `assets/js/stores/auditStore.js`
- `vue/pages/AdminAdvancedAudit.vue`
- `assets/js/stores/advancedAuditStore.js`
- `vue/components/AdvancedAuditAnalyticsTab.vue`
- `vue/components/AdvancedAuditComplianceTab.vue`
- `vue/components/AdvancedAuditArchivalTab.vue`

## 2. Phạm Vi Audit Logs Chuẩn

Trang audit chuẩn là màn hình cho operator duyệt audit log.

Trách nhiệm chính:

- tìm kiếm và lọc log
- phân trang và đổi kích thước trang
- export kết quả đã lọc
- xem chi tiết payload từng log
- hiển thị số liệu tổng quát cho total, success, và issue

Phần orchestration cấp page nằm chủ yếu trong `useAdminAuditLogsPage.js`, còn `auditStore.js` sở hữu việc lấy dữ liệu, filter parameter, state phân trang, và export.

## 3. Điểm Nóng Khi Review Audit Chuẩn

### Lớp Page/Composable

- nhiều filter field được map vào store state
- đồng bộ page-size với settings chung
- hành vi scroll bảng và phân trang
- modal chi tiết log và flow copy clipboard

### Lớp Store

- hành vi filter ở mock mode so với real API mode
- chuẩn hóa phân trang
- fetch audit stats so với fetch danh sách log
- khác biệt export giữa mock mode và real mode

Rủi ro lệch phổ biến nhất ở đây là logic filter trong mock có thể khác với semantics filter của backend.

## 4. Phạm Vi Advanced Audit

Trang advanced audit là bề mặt điều khiển theo tab cho các workflow phân tích và retention sâu hơn.

Tab hiện có:

- analytics
- compliance
- archival

Trang sử dụng `useDeepLinkedTabs()` để operator có thể chia sẻ link trực tiếp đến một tab cụ thể.

## 5. Mô Hình State Của Advanced Audit

`advancedAuditStore.js` sở hữu nhiều action kiểu command và các bucket kết quả được cache:

- `analytics`
- `compliance`
- `archival`
- các hàm fetch analytics chuyên biệt
- command archival và restore
- command quản lý compliance
- command quản lý archive và retention

Store này nặng về command hơn nhiều store khác trong dự án.

## 6. Vì Sao Khu Vực Này Cần Tài Liệu Riêng

Cụm audit này quan trọng vì nó trộn nhiều loại độ phức tạp:

- filter và export phục vụ operator
- orchestration view theo tab
- management action có side effect trực tiếp
- hành vi vừa mock vừa real API
- nhiều backend contract surface cùng thuộc miền audit

Rất dễ khi review chỉ nhìn template mà bỏ sót rủi ro ở lớp store và orchestration bên dưới.

## 7. Checklist Review

1. Tên filter và parameter export còn khớp với kỳ vọng của backend không?
2. Hành vi filter ở mock mode có đủ gần với real mode để review tin cậy không?
3. Tab advanced audit có vẫn lazy-load và giữ được trạng thái tab có thể link trực tiếp không?
4. Command action đã được tách rõ khỏi passive data fetch chưa?
5. Error, loading, và toast flow có nhất quán giữa audit và advanced audit action không?

## 8. Ý Tưởng Tối Ưu

1. Tách phần serialize audit filter thành helper dùng chung cho fetch và export.
2. Tách `advancedAuditStore.js` theo miền: analytics, compliance, archival, retention.
3. Cân nhắc composable riêng cho các advanced-audit command để page tập trung vào orchestration tab.
4. Giữ payload normalization theo tab gần với tab render nó.

## 9. Tài Liệu Liên Quan

1. [Luồng Xác Thực Và Phiên Làm Việc](AUTH_AND_SESSION_FLOW_vi.md)
2. [Truy Cập Dữ Liệu Và Mock API](DATA_ACCESS_AND_MOCK_API_vi.md)
3. [Hướng Dẫn Review Dự Án](PROJECT_REVIEW_GUIDE_vi.md)

---

[Đọc tài liệu này bằng tiếng Anh](ADMIN_AUDIT_AND_ADVANCED_AUDIT.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)