# HỘI CHỢ LAB — ứng dụng Android Offline

**Trạng thái thực tế:** Đây là **mã nguồn Android Studio hoàn chỉnh để biên dịch APK**, **không phải APK đã được biên dịch**. Môi trường tạo mã nguồn không có Android SDK/Gradle và không thể tải công cụ này, nên chưa chạy build Android hoặc kiểm thử trên điện thoại thật. Không đổi tên ZIP thành APK.

## Nội dung

- Ứng dụng offline bằng Android WebView (Java), không yêu cầu quyền `INTERNET`, **không phải shortcut đến website**.
- Gồm 7 màn hình của bản HC5: Tổng quan, Sản phẩm & chi phí, Kịch bản, Break-even Lab, Bán thử, Gợi ý cải thiện, Trình bày.
- Android API 24 trở lên (Android 7.0+), compile SDK 35, target SDK 34; ứng dụng demo cài trực tiếp, chưa cấu hình phát hành Play Store.
- Màu Market Day Editorial và font hệ thống Arial/Tahoma; không tải Google Fonts.
- Dữ liệu giả định và đơn bán thử lưu qua `localStorage` trong không gian riêng của ứng dụng, không tự đồng bộ với Chrome hoặc website trước đó.
- Xuất JSON/CSV qua hộp thoại **chọn nơi lưu của Android**; nhập JSON qua **chọn tệp**; In/Lưu PDF qua Android Print Framework.
- Không yêu cầu MySQL, cPanel, Google/Gemini/OpenAI API, máy chủ hay quyền Internet.

## Cách lấy APK trên máy Windows

1. Cài **Android Studio** từ <https://developer.android.com/studio>. Khởi động ít nhất một lần để cài Android SDK.
2. Vào **Tools → SDK Manager → SDK Platforms** và cài **Android 15 (API 35)**. Trong **SDK Tools**, cài Android SDK Build-Tools 35.
3. Giải nén ZIP dự án, mở thư mục `HoiChoLabAndroid`.
4. Nhấp đúp file **`build-apk-windows.bat`**. Script dùng JDK đi kèm Android Studio, tự tải Gradle 8.9 từ `services.gradle.org` (cần Internet lần đầu), rồi build `assembleDebug`.
5. Nếu build thành công, tại thư mục dự án xuất hiện file **`HCL.apk`**. Đây là APK **debug-signed**, phù hợp cài thử trực tiếp, không phải bản phát hành lên Google Play.
6. Sao chép `HCL.apk` sang điện thoại Android, mở file và cho phép ứng dụng quản lý tệp cài ứng dụng từ nguồn này nếu Android yêu cầu. Chỉ cấp quyền cho nguồn bạn tin tưởng và tắt quyền đó sau khi cài.

Nếu muốn xem mã nguồn trong Android Studio: **File → Open → HoiChoLabAndroid**. Phiên bản Gradle cần dùng là 8.9, AGP 8.7.3. Nếu Android Studio yêu cầu chỉ định Gradle, có thể dùng thư mục `.build-tools/gradle-8.9` do script vừa tải. Bộ mã nguồn cũng có quy trình GitHub Actions tự động trong `.github/workflows/build-apk.yml` (xem bên dưới).

## Cách build APK bằng GitHub Actions (không cần cài Android Studio)

1. Tạo một repository GitHub **riêng tư** mới.
2. Đưa **nội dung bên trong** thư mục `HoiChoLabAndroid` lên gốc repository (gồm `app`, `build.gradle`, `settings.gradle` và `.github/workflows/build-apk.yml`). Không chỉ tải mỗi ZIP nếu GitHub không giải nén nó.
3. Mở tab **Actions → Build Hoi Cho Lab APK → Run workflow**.
4. Khi hoàn tất thành công, vào run → **Artifacts → HoiChoLab-Android-APK**. Tải xuống ZIP artifact và giải nén lấy `app-debug.apk`.
5. Chuyển file APK đó sang Android để cài. Trước khi tải hãy kiểm tra run thành công.

GitHub Actions thực hiện build trên máy chủ của GitHub, không phải công cụ build đã chạy trong cuộc trò chuyện này. Android Studio hoặc GitHub có thể cần download dependencies từ Google Maven/Gradle nên cần kết nối Internet khi build.

## Dữ liệu và an toàn

- Người dùng có thể dùng app **không có mạng** sau khi cài APK.
- App không có quyền Internet; chỉ truy cập tài nguyên HTML/CSS/JS đóng gói tại `appassets.androidplatform.net`, **không gửi dữ liệu lên website**.
- Khi xóa ứng dụng, dữ liệu localStorage của app bị xóa. **Xuất JSON trước khi gỡ** nếu có đơn bán thử quan trọng.
- Cùng một file APK cài trên các máy khác nhau **không tự chia sẻ dữ liệu**; có thể dùng Xuất/Nhập JSON.
- APK debug có chữ ký debug của máy build, không thích hợp phát hành Play Store. Nếu build bằng hai máy khác nhau, chữ ký có thể khác: cập nhật APK không tương thích sẽ đòi gỡ bản cũ, có nguy cơ mất dữ liệu.
- Không cần yêu cầu quyền truy cập tệp rộng: nhập/xuất tệp qua Android Storage Access Framework.

## Cấu trúc chính

```
HoiChoLabAndroid/
├── app/
│   ├── build.gradle
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/vn/hoicholab/offline/MainActivity.java
│       ├── assets/web/
│       │   ├── index.html
│       │   └── assets/{app.js,engine.js,styles.css}
│       └── res/  (icon, màu và tên app)
├── .github/workflows/build-apk.yml
├── build.gradle, settings.gradle, gradle.properties
├── build-apk-windows.bat
├── scripts/build-apk.ps1
└── tests/engine.test.cjs
```

## Kiểm tra đã thực hiện

- Cú pháp JS: `node --check` trên `app.js` và `engine.js` — ĐẠT.
- Công thức tài chính: `node tests/engine.test.cjs` — **39/39 PASS**.
- XML manifest/resources được parse thành công — ĐẠT.
- Tệp APK/Android runtime: **CHƯA BUILD / CHƯA TEST** do không có Android SDK và thiết bị Android ở môi trường hiện tại.

Chạy test lại nếu có Node.js: `node tests/engine.test.cjs`.

### Dữ liệu mẫu BTC

- Trà chanh 20.000đ/8.000đ, 80 phần; Cacao đá 25.000đ/11.000đ, 55 phần; Bánh quy gói 15.000đ/7.000đ, 60 phần.
- Chi phí cố định 550.000đ; hòa vốn lý thuyết **49 phần**.
- Thận trọng: 55 phần, lợi nhuận 72.000đ; Cơ sở: 98 phần, lợi nhuận 562.000đ.

## Sự khác nhau so với website HC5

- Đã điều chỉnh xuất JSON/CSV và in PDF để hoạt động với Android WebView.
- Bản này chưa đồng bộ dữ liệu với trình duyệt trên PC/cPanel (vốn đã được xóa).
- Website gốc vẫn được giữ làm source trong thư mục assets; không chạy phụ thuộc domain.


Báo cáo kiểm thử chi tiết: `docs/TEST_REPORT.md`. Xác nhận APK tải xuống thực sự là một file `.apk` (không phải ZIP dự án).
