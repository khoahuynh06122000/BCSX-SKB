# BiaLogistics — Quản lý Kho Bia

Ứng dụng quản lý nhập/xuất kho bia (Lon/Lít/Chai), đối tác và báo cáo tồn kho.

**Nền tảng:** React + Vite + TailwindCSS · dữ liệu **Firebase (Firestore)** ·
ảnh minh chứng **Cloudinary** · quét phiếu bằng AI **Gemini** · chạy trên **Vercel**.

---

## Triển khai trên Vercel

Dự án Vercel nối trực tiếp với repo này: **mỗi lần có commit mới vào nhánh `main`,
Vercel tự động build và cập nhật app.** Push lên nhánh khác sẽ tạo bản xem thử
(Preview) riêng, không ảnh hưởng bản đang chạy.

### Biến môi trường (bắt buộc)

Vào **Vercel → dự án → Settings → Environment Variables** và điền đầy đủ các biến
liệt kê trong [`.env.example`](.env.example). Thiếu biến Firebase thì app sẽ mở lên
nhưng không tải được dữ liệu.

| Nhóm | Biến | Lấy ở đâu |
|---|---|---|
| Firebase | `VITE_FIREBASE_*` | Firebase Console → Project settings → *Your apps* → SDK setup and configuration → Config |
| Cloudinary | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary Dashboard (cloud name) và Settings → Upload → tạo preset **Unsigned** |
| Gemini | `GEMINI_API_KEY` | Google AI Studio. Không có tiền tố `VITE_` nên chỉ máy chủ đọc được. |

Sau khi thêm hoặc sửa biến, phải **Redeploy** thì thay đổi mới có hiệu lực.

### Phân quyền Firestore

Quy tắc bảo mật nằm ở [`firestore.rules`](firestore.rules). Dán nội dung file này vào
Firebase Console → **Firestore Database → Rules → Publish** thì phân quyền
OWNER / STAFF / VIEWER mới có hiệu lực.

---

## Chạy thử (tuỳ chọn)

### Trên GitHub Codespaces — không cần cài gì

Repo → nút **Code** → tab **Codespaces** → **Create codespace on main**.
Codespace tự cài Node và chạy `npm install` (cấu hình ở
[`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json)).
Tạo file `.env.local` theo mẫu `.env.example`, rồi:

```bash
npm run dev
```

### Trên máy cá nhân

Cần Node.js 20 trở lên.

```bash
npm install
```

Tạo `.env.local` theo mẫu, rồi `npm run dev` và mở http://localhost:3000.

> Kiểm tra lỗi kiểu dữ liệu trước khi deploy: `npm run lint`

---

## Đăng nhập lần đầu

Tài khoản quản trị mặc định: `khoahuynh` / `123456`, mã PIN `061220`.
**Hãy đổi mật khẩu và PIN ngay sau lần đăng nhập đầu tiên** ở mục Hồ sơ cá nhân.

## Theo dõi dung lượng

Tab **Thiết lập** có mục *Sức khỏe hệ thống · Dung lượng Firebase*: ước tính phần trăm
dung lượng đã dùng trên 1 GB của gói Spark miễn phí, tốc độ phát sinh giao dịch và dự
báo còn bao lâu thì đầy. Ảnh minh chứng nằm trên Cloudinary nên không chiếm dung lượng
Firebase.

## Kiến trúc thư mục

```
src/App.tsx        Toàn bộ giao diện và logic nghiệp vụ (file lớn ~10.000 dòng)
src/firebase.ts    Khởi tạo Firebase, đọc cấu hình từ biến môi trường
src/lib/cloudinary.ts  Nén và tải ảnh lên Cloudinary
src/lib/bbgn.ts          Đọc file BBGN dạng bảng chéo và dựng file mẫu BBGN
src/lib/reconcile.ts     Đối soát xuất kho ↔ hóa đơn, quy đổi lít, khớp mã vật tư
src/lib/revenueKey.ts    Khoá định danh dòng doanh thu để chống nạp trùng
src/lib/revenueImport.ts Quyết định ghi gì / xoá gì khi nạp file doanh thu
src/lib/__tests__/       Chạy thử các phép tính trên bằng dữ liệu giả
api/gemini/        Hàm serverless của Vercel cho tính năng quét phiếu bằng AI
server.ts          Máy chủ Express dùng khi chạy tại máy (Vercel không dùng file này)
firestore.rules    Quy tắc phân quyền Firestore
```

## Kiểm tra trước khi đẩy code

```bash
npm run lint && npm test
```

`lint` kiểm kiểu dữ liệu toàn bộ dự án (phải sạch, 0 lỗi). `test` chạy các phép
tính nghiệp vụ nặng nhất — đối soát và chống trùng doanh thu — bằng dữ liệu giả,
không cần Firebase hay mở app.
