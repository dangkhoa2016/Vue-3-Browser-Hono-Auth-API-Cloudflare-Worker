# Giám Sát Thời Gian Thực Và Dashboard

> 🌐 Language / Ngôn ngữ: [English](REALTIME_MONITORING_AND_DASHBOARD.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này mô tả cách tính năng realtime monitoring và admin dashboard lắp ráp dữ liệu, store nào sở hữu state, và những điểm nên tập trung khi review hoặc tối ưu.

## 1. File Chính

- `vue/pages/AdminRealtimeMonitoring.vue`
- `assets/js/stores/realtimeMonitoringStore.js`
- `vue/pages/AdminDashboard.vue`
- `assets/js/stores/systemStatsStore.js`
- `assets/js/stores/systemHealthStore.js`
- `assets/js/stores/auditStore.js`
- `assets/js/stores/securityIncidentStore.js`

## 2. Trách Nhiệm Của Realtime Monitoring

Realtime monitoring store sở hữu:

- trạng thái monitoring mới nhất
- overview metrics
- realtime snapshot payloads
- live dashboard payload được dùng cho các lần refresh ở cấp page
- recent events feed
- danh sách và số lượng threat
- alert status và alert history
- dữ liệu alert rule và alert channel
- timeline data
- health data
- performance summaries
- kết quả mới nhất của thao tác tạo incident
- state kết quả cho các lệnh analyze, start, stop, simulate, export, test alert, clear cache, toggle rule, tạo channel, và tạo incident

Page và composable của nó kết hợp state này thành hero actions, summary card, bảng recent events, panel alert rules/channels, maintenance controls, và UI loading/error.

## 3. Mô Hình Lấy Dữ Liệu

`fetchDashboardData()` trong `realtimeMonitoringStore` vẫn là lớp tổng hợp request nền bằng `Promise.all()`.

Nó gọi:

- monitoring status
- overview
- realtime dashboard payload
- threats
- alert status
- alert history
- timeline
- health

Sau đó store chuẩn hóa response phân mảnh thành một state model thông qua `applySnapshot()` và thêm logic merge.

Composable của trang realtime monitoring hiện chồng thêm một lớp request lên trên luồng nền đó. Khi refresh page, nó gọi:

- `refreshSnapshot()` cho payload realtime hiện tại
- `fetchRecentEvents()`
- `fetchAlertRules()`
- `fetchAlertChannels()`
- `fetchPerformanceDashboard()`

Điều này có nghĩa là page không còn phụ thuộc vào một response khổng lồ cho mọi panel vận hành. Người review nên kỳ vọng sự kết hợp giữa payload kiểu snapshot và các request bổ sung theo từng feature.

## 4. Vì Sao Quan Trọng

Tính năng này vừa quan trọng về vận hành, vừa phức tạp về cấu trúc:

- Nó kết hợp nhiều payload server vào một UI.
- Nó có action command, không chỉ đọc dữ liệu.
- Nó còn được dùng gián tiếp trong các summary của admin dashboard.
- Nó dễ bị lệch nếu shape payload không đồng nhất giữa các endpoint hoặc mock mode.

## 5. Tổng Hợp Dashboard

`vue/pages/AdminDashboard.vue` là lớp orchestration riêng kéo dữ liệu từ nhiều store:

- system stats
- system health
- audit
- security incidents
- realtime monitoring

Điều này làm dashboard hữu dụng, nhưng cũng khiến page lớn nhanh vì nó biết quá nhiều về nhiều domain feature cùng lúc.

## 6. Điểm Nóng Khi Review

### Trong store

- payload normalization cho `status`, `realtime`, và `overview`
- nguy cơ lệch state giữa `fetchDashboardData()` và luồng mới gồm `refreshSnapshot()` cộng các request bổ sung
- counter được suy ra như active threats và alerts
- action loading so với loading tổng quát
- trộn trách nhiệm giữa read-model state và command response

### Trong page

- logic hiển thị loading skeleton và format summary lặp lại
- template rất lớn
- page biết trực tiếp quá nhiều field backend
- các flow vận hành dựa trên prompt để tạo rule, channel, và incident

## 7. Checklist Review

1. Nếu response endpoint đổi, normalization có vẫn tạo ra UI shape ổn định không?
2. Action command có chỉ cập nhật đúng phần state mà nó thực sự sở hữu không?
3. Page có vẫn render an toàn dữ liệu phân mảnh nếu một response rỗng không?
4. Dashboard có vẫn chịu được việc các store load xong ở những thời điểm khác nhau không?
5. Nếu mock mode đổi, recent events, alert rules/channels, và performance metrics có còn hợp lý không?
6. Các lệnh vận hành như clear cache, toggle rule, hoặc tạo incident có refresh lại đúng phần state tối thiểu cần thiết không?

## 8. Ý Tưởng Tối Ưu

1. Tách helper normalize response khỏi `realtimeMonitoringStore.js`.
2. Tách command action khỏi read snapshot state nếu store tiếp tục tăng kích thước.
3. Tách `AdminDashboard.vue` thành nhiều section được cấp bởi composable đặc thù feature.
4. Cân nhắc helper derived-view nhỏ cho các metric sẵn sàng hiển thị thay vì format trực tiếp trong page.
5. Thay các flow maintenance dựa trên prompt bằng dialog component riêng nếu monitoring surface tiếp tục mở rộng.

## 9. Tài Liệu Liên Quan

1. [Truy Cập Dữ Liệu Và Mock API](DATA_ACCESS_AND_MOCK_API_vi.md)
2. [Hướng Dẫn Review Dự Án](PROJECT_REVIEW_GUIDE_vi.md)

---

[Đọc tài liệu này bằng tiếng Anh](REALTIME_MONITORING_AND_DASHBOARD.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)