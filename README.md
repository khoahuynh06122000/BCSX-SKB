# BiaLogistics — Quản lý Kho Bia

Ứng dụng quản lý nhập/xuất kho bia (Lon/Lít/Chai), đối tác và báo cáo tồn kho.

**Nền tảng:** React + Vite + TailwindCSS, backend **Supabase** (Postgres + Auth + Realtime),
lưu ảnh trên **Cloudinary**, và tính năng quét phiếu xuất bằng AI (**Gemini**).

## Chạy tại máy

**Yêu cầu:** Node.js

### 1. Cài đặt

```bash
npm install
```

### 2. Tạo Supabase project

1. Vào https://supabase.com tạo project mới.
2. Mở **SQL Editor**, dán toàn bộ nội dung file [`supabase/schema.sql`](supabase/schema.sql) và chạy một lần
   (tạo bảng, RLS, trigger, và seed sẵn danh mục sản phẩm + đối tác).
3. Vào **Authentication → Providers → Email**, tắt tuỳ chọn *"Confirm email"*
   để đăng nhập được ngay sau khi đăng ký (khuyến nghị cho hệ thống nội bộ).
4. Lấy **Project URL**, **anon public key** và **service_role key** ở **Project Settings → API**.

### 3. Tạo Cloudinary account

1. Vào https://cloudinary.com tạo tài khoản, lấy **Cloud name**.
2. Vào **Settings → Upload → Upload presets**, tạo một preset **Unsigned** và lấy tên preset.

### 4. Cấu hình biến môi trường

Sao chép `.env.example` thành `.env.local` rồi điền đầy đủ giá trị:

```
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET, GEMINI_API_KEY
```

### 5. Chạy app

```bash
npm run dev
```

Mở http://localhost:3000. **Tài khoản đăng ký ĐẦU TIÊN sẽ tự động là OWNER (quản trị).**
Sau đó OWNER vào mục **Thiết lập** để tạo tài khoản cho nhân viên (STAFF/VIEWER).
