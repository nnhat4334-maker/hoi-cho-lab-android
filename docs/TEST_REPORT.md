# HỘI CHỢ LAB Android — Báo cáo kiểm thử (nguồn)

Ngày kiểm tra: 2026-11-17 (Asia/Bangkok)

## ĐÃ THỰC HIỆN

- **39/39** phép kiểm tra engine tài chính gốc: PASS (`node tests/engine.test.cjs`).
- Cú pháp `app.js` và `engine.js`: PASS (`node --check`).
- XML `AndroidManifest.xml`, `strings.xml`, `colors.xml`, `styles.xml`: PASS (XML parser).
- Kiểm tra cấu hình: không khai báo quyền Internet, assets HTML/JS/CSS đóng gói, cấu hình cầu nối save/print: PASS ở mức kiểm tra mã nguồn.
- Kiểm tra browser dựa trên mô phỏng native bridge: **4/4** độ rộng **320, 390, 768, 1440 px** hiển thị, script tải không báo pageerror, không tràn ngang. Ở 390px đã thử: xuất JSON/CSV gửi lệnh đến bridge giả, tạo đơn, lưu vào localStorage giả, mở Pitch Mode, gọi bridge in, nhấn logo về Tổng quan — PASS.

## CHƯA THỰC HIỆN

- **Chưa build APK thật:** môi trường không có Android SDK/Gradle và không có Internet trực tiếp để tải SDK.
- **Chưa cài và chạy trên máy Android hoặc emulator.** Do đó chưa xác minh `WebView.shouldInterceptRequest`, import JSON qua ACTION_GET_CONTENT, xuất JSON/CSV qua ACTION_CREATE_DOCUMENT, in Android Print Framework và hành vi Back trên OS thật.
- **Chưa ký bản release APK.** GitHub Actions và script Windows tạo debug-signed APK nếu build chạy thành công, chưa được kiểm thử thực tế ở môi trường này.

## Smoke test cần làm sau khi có APK

1. Chạy khi **bật chế độ máy bay**; vào được 7 màn hình, mốc hòa vốn 49 phần.
2. Nhập đơn Trà chanh 2 phần, lưu; đóng/mở lại app — đơn vẫn tồn tại.
3. Xuất JSON và CSV tới Downloads; kiểm tra file mở được trong Files.
4. Nhập lại JSON; dữ liệu phục hồi đúng; thay giá sản phẩm không đổi doanh thu đơn cũ.
5. Vào Trình bày → In/Lưu PDF → chọn Save as PDF; kiểm tra nội dung có đủ dấu tiếng Việt.
6. Tại menu bất kỳ, nhấn Back → Tổng quan; tại Tổng quan, Back → về màn hình điện thoại.
7. Kiểm tra portrait/landscape, Android dark mode, kích thước 320–430dp, bàn phím không che ô nhập.
8. Nếu build lại từ khóa debug khác, cần xuất JSON trước khi gỡ bản cũ và cài bản mới.
