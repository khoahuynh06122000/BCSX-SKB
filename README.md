# BiaLogistics — Quản lý Kho Bia

Ứng dụng quản lý nhập/xuất kho bia (Lon/Lít/Chai), đối tác và báo cáo tồn kho.

**Nền tảng:** React + Vite + TailwindCSS, dữ liệu trên **Firebase (Firestore)**,
ảnh minh chứng lưu trên **Cloudinary**, quét phiếu chuyển bộ phận bằng AI (**Gemini**).

## Chạy tại máy

**Yêu cầu:** Node.js

### 1. Cài đặt

```bash
npm install
```

### 2. Cấu hình Firebase

App đọc cấu hình kết nối từ file `firebase-applet-config.json` ở thư mục gốc dự án
(file này chứa khoá riêng nên **không** được commit lên GitHub). Nội dung có dạng:

```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "...",
  "firestoreDatabaseId": "(default)"
}
```

Quy tắc bảo mật Firestore nằm ở [`firestore.rules`](firestore.rules) — deploy lên
Firebase Console (Firestore → Rules) để phân quyền OWNER/STAFF/VIEWER hoạt động đúng.

### 3. Tạo Cloudinary account (lưu ảnh)

1. Vào https://cloudinary.com tạo tài khoản, lấy **Cloud name**.
2. Vào **Settings → Upload → Upload presets**, tạo một preset **Unsigned**, lấy tên preset.

### 4. Cấu hình biến môi trường

Sao chép `.env.example` thành `.env.local` rồi điền:

```
VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET, GEMINI_API_KEY
```

### 5. Chạy app

```bash
npm run dev
```

Mở http://localhost:3000. Đăng nhập lần đầu bằng tài khoản quản trị
(`khoahuynh` / `123456`, PIN `061220`) — **nhớ đổi mật khẩu và PIN ngay sau đó**
trong mục Hồ sơ cá nhân.

## Theo dõi dung lượng

Tab **Thiết lập** có mục *Sức khỏe hệ thống · Dung lượng Firebase*: ước tính phần
trăm dung lượng đã dùng trên 1 GB của gói Spark miễn phí, tốc độ phát sinh giao dịch
và dự báo còn bao lâu thì đầy — giúp dọn dẹp trước khi hệ thống gặp sự cố.
Ảnh minh chứng nằm trên Cloudinary nên không chiếm dung lượng Firebase.
