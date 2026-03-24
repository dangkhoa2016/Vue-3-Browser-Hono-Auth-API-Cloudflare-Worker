# Runtime Ứng Dụng Và Cơ Chế Tải

> 🌐 Language / Ngôn ngữ: [English](APP_RUNTIME_AND_LOADING.md) | **Tiếng Việt**

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)

Tài liệu này giải thích cách runtime browser-only được khởi động, cách các module Vue SFC được tải, và những điểm nhạy cảm khi thay đổi.

## 1. File Chính

- `assets/js/init.js`
- `assets/js/router.js`
- `vue/App.vue`
- `vue/Loader.vue`
- `vue/components/AsyncLoader.vue`
- `assets/js/appServices.js`

## 2. Trình Tự Khởi Động

1. `assets/js/init.js` tạo đối tượng options dùng chung cho SFC loader.
2. File này đăng ký module cache cho `vue`, `vue-i18n`, và app service helper trước khi bắt đầu tải route.
3. Các options đó được lưu qua `setSfcOptions()` để module khác có thể đọc lại.
4. Ngôn ngữ ban đầu được tải trước khi loader UI được mount.
5. `vue/Loader.vue` được mount vào `#loader`.
6. `window.initMainApp` được expose để loader có thể kích hoạt mount app chính.
7. Trong lúc init app chính, Pinia, router, i18n, và các store singleton được nối với nhau.

## 3. Vì Sao Thứ Tự Này Quan Trọng

`assets/js/router.js` dùng top-level `await` để preload `AsyncLoader.vue`. Vì vậy `init.js` phải nạp đủ module cache cần thiết trước khi import động router.

Nếu đổi thứ tự này, app có thể lỗi sớm do thiếu module hoặc tạo singleton bị trùng lặp.

## 4. Mô Hình Runtime Loading

### Cách Load Page

- Mỗi route trỏ đến một wrapper component được tạo bởi `load(path)` trong `router.js`.
- Wrapper render `AsyncLoader.vue`.
- `AsyncLoader.vue` lazy-load page SFC thật và xử lý retry hoặc hiển thị lỗi.

### Hành Vi Cache

- Runtime module cache được xử lý bởi `vue3-sfc-loader`.
- Browser Cache Storage được dùng trong `init.js` thông qua `SFC_CACHE_NAME`.
- Cache bị bỏ qua khi chạy localhost và khi URL có `__reload`.

### Keep-Alive Cấp App

- `vue/App.vue` tạo danh sách `keepAliveRouteNames` từ metadata của route.
- Chỉ route có `meta.keepAlive` mới được cache.
- Cách này giúp tránh refetch một số admin page tốn kém trong khi vẫn để route khác ở trạng thái bình thường.

## 5. Mô Hình Singleton Dùng Chung

Ứng dụng tránh phụ thuộc vào global tự phát bằng cách đăng ký instance dùng chung qua `assets/js/appServices.js`.

Các singleton quan trọng:

- SFC loader options
- Auth store instance
- Modal store instance
- Toast store instance

Pattern này giảm coupling trực tiếp với `window.*`, nhưng vẫn phụ thuộc vào thời điểm init đúng.

## 6. Rủi Ro Khi Review

### Thay Đổi Nguy Cơ Cao

- Đảo thứ tự import hoặc cache registration trong `init.js`
- Đổi thời điểm load router module
- Thay `createWebHashHistory()` mà không kiểm tra ràng buộc static hosting
- Bỏ `keepAlive` metadata mà không kiểm tra workflow của operator
- Đưa feature logic vào `init.js` hoặc `router.js`

### Dấu Hiệu Hay Gặp Khi Lỗi Xảy Ra

- Loader mount rồi nhưng app chính không hiện ra
- Page render với store bị tạo trùng hoặc thiếu injected service
- Async route loading chỉ fail ở production cache mode
- Các admin screen trước đây được cache bắt đầu mất state khi điều hướng

## 7. Ý Tưởng Tối Ưu

1. Tách logic cache và tải asset khỏi `init.js` thành helper riêng.
2. Thêm chế độ chẩn đoán nhỏ cho module cache và loader failure.
3. Giữ `router.js` gọn bằng cách đưa auth guard sang hàm tạo riêng.
4. Ghi rõ convention route metadata nếu sau này có thêm loại route mới.

## 8. Checklist Thay Đổi An Toàn

1. Loader vẫn mount trước app chính.
2. Ngôn ngữ ban đầu vẫn được load trước khi text UI hiển thị.
3. Router vẫn được import sau khi module cache cần thiết đã có.
4. Toast, auth, và modal store vẫn là singleton.
5. Protected route vẫn hoạt động khi vào trực tiếp bằng URL.

---

[Đọc tài liệu này bằng tiếng Anh](APP_RUNTIME_AND_LOADING.md)

[Quay lại Mục Lục Tài Liệu](DOCUMENTATION_INDEX_vi.md)