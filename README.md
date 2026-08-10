# BiaLogistics — Quản lý Kho Bia

Ứng dụng quản lý nhập/xuất kho bia (Lon/Lít/Chai), đối tác và báo cáo tồn kho.

**Nền tảng:** React + Vite + TailwindCSS, dữ liệu trên **Firebase (Firestore)**,
ảnh minh chứng lưu trên **Cloudinary**, quét phiếu chuyển bộ phận bằng AI (**Gemini**).

---

## Cách 1 — Chạy trên GitHub Codespaces (khuyên dùng, không cần cài gì)

Dùng khi máy không cài được Node.js (ví dụ máy công ty bị khoá quyền cài đặt).
Mọi thứ chạy trên máy chủ GitHub, thao tác qua trình duyệt.

### Bước 1: Mở Codespace

Vào repo trên GitHub → nút **Code** (màu xanh) → tab **Codespaces** →
**Create codespace on main**.

Chờ khoảng 2–3 phút. Codespace tự cài sẵn Node 22 và chạy `npm install`
(cấu hình ở [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json)).

### Bước 2: Tạo 2 file cấu hình

Hai file này chứa thông tin riêng nên **không** nằm trong repo — cần tạo thủ công
trong Codespace (chuột phải vào vùng danh sách file → **New File**):

**File `firebase-applet-config.json`** (đặt ở thư mục gốc) — lấy nội dung từ
Firebase Console → ⚙️ Project settings → mục *Your apps* → *SDK setup and configuration*:

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

**File `.env.local`** (đặt ở thư mục gốc):

```
VITE_CLOUDINARY_CLOUD_NAME=ten_cloud_cua_ban
VITE_CLOUDINARY_UPLOAD_PRESET=ten_upload_preset
GEMINI_API_KEY=khoa_gemini_cua_ban
```

### Bước 3: Chạy

Trong ô Terminal phía dưới của Codespace, gõ:

```bash
npm run dev
```

Codespace sẽ hiện thông báo mở cổng 3000 → bấm **Open in Browser**.

> Kiểm tra lỗi cú pháp/kiểu dữ liệu trước khi chạy: `npm run lint`

---

## Cách 2 — Chạy tại máy (nếu máy cài được Node.js)

**Yêu cầu:** Node.js 20 trở lên.

```bash
npm install
```

Tạo 2 file cấu hình như mô tả ở Bước 2 phía trên, rồi:

```bash
npm run dev
```

Mở http://localhost:3000.

---

## Đăng nhập lần đầu

Tài khoản quản trị mặc định: `khoahuynh` / `123456`, mã PIN `061220`.
**Hãy đổi mật khẩu và PIN ngay sau lần đăng nhập đầu tiên** trong mục Hồ sơ cá nhân.

## Cấu hình Cloudinary (lưu ảnh)

1. Tạo tài khoản tại https://cloudinary.com → lấy **Cloud name** ở Dashboard.
2. Vào **Settings → Upload → Upload presets** → tạo preset chế độ **Unsigned** → lấy tên preset.

## Phân quyền Firestore

Quy tắc bảo mật nằm ở [`firestore.rules`](firestore.rules). Cần dán nội dung file này
vào Firebase Console → **Firestore Database → Rules → Publish** thì phân quyền
OWNER / STAFF / VIEWER mới có hiệu lực.

## Theo dõi dung lượng

Tab **Thiết lập** có mục *Sức khỏe hệ thống · Dung lượng Firebase*: ước tính phần trăm
dung lượng đã dùng trên 1 GB của gói Spark miễn phí, tốc độ phát sinh giao dịch và dự báo
còn bao lâu thì đầy — giúp dọn dẹp trước khi hệ thống gặp sự cố.
Ảnh minh chứng nằm trên Cloudinary nên không chiếm dung lượng Firebase.
