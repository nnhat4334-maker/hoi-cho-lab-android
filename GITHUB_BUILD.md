# HƯỚNG DẪN BUILD APK BẰNG GITHUB — HỘI CHỢ LAB

Không cần Android Studio hoặc cPanel.

1. Vào https://github.com/new, đăng nhập GitHub.
2. Đặt Repository name: `hoi-cho-lab-android`; chọn Private; tạo repository.
3. Tải `HCLGH.zip` và chọn Extract All (Giải nén tất cả) trên Windows.
4. Mở thư mục vừa giải nén đến khi nhìn thấy: `app`, `.github`, `build.gradle`, `settings.gradle`, `README.md`.
5. Trong trang repository, chọn Add file -> Upload files.
6. Trong File Explorer, mở ĐÚNG thư mục ở bước 4, Ctrl+A chọn tất cả **nội dung bên trong**, kéo vào vùng Upload files của GitHub. KHÔNG kéo nguyên ZIP, KHÔNG kéo thư mục bọc bên ngoài.
7. Kiểm tra `.github/workflows/build-apk.yml` đã xuất hiện trong danh sách file chuẩn bị upload; sau đó bấm Commit changes.
8. Mở Actions -> Build Hoi Cho Lab APK -> Run workflow -> Run workflow (hoặc đợi run tự khởi tạo bởi push).
9. Sau khi run có dấu xanh, bấm vào run -> Artifacts -> HCL-APK, tải file ZIP artifact về.
10. Giải nén artifact và lấy HCL.apk, chuyển sang điện thoại Android để cài.

Nếu không thấy workflow trong Actions: kiểm tra file `.github/workflows/build-apk.yml` nằm ở GỐC repo, không nằm trong `HoiChoLabAndroid/.github/`.

Nếu run màu đỏ, mở run -> build -> bước lỗi và chụp/log phần màu đỏ (không gửi mã bí mật) để được hướng dẫn sửa.

Lưu ý: HCL.apk là bản debug-signed dùng để cài thử. Chưa chạy Android build trong môi trường tạo bộ mã nguồn này; lần GitHub Actions chạy đầu tiên sẽ là phép thử build thực tế.
