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
| AI (tuỳ chọn) | `AI_ALLOWED_EMAILS` | Danh sách email được phép dùng tính năng AI, cách nhau bởi dấu phẩy. Để trống thì mọi người đã đăng nhập đều dùng được. |

Sau khi thêm hoặc sửa biến, phải **Redeploy** thì thay đổi mới có hiệu lực.

> `VITE_FIREBASE_API_KEY` được dùng ở **cả hai phía**: trình duyệt dùng để kết nối
> Firebase, và hàm serverless dùng để xác minh người gọi các endpoint AI. Thiếu biến
> này thì hai tính năng quét ảnh bằng AI sẽ báo lỗi 500.

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

App **đăng nhập bằng Google**, không có username/password riêng — mật khẩu do Google
quản lý, app không giữ gì cả.

1. Bấm đăng nhập, chọn tài khoản Google.
2. Tài khoản mới vào sẽ ở trạng thái **chờ duyệt** (`PENDING`) và chưa xem được dữ liệu.
3. Chủ sở hữu — tài khoản có email khai trong `ownerEmail()` của
   [`firestore.rules`](firestore.rules) — vào tab **Thiết lập** để đặt vai trò
   OWNER / STAFF / VIEWER cho từng người.

Mã **PIN** là lớp khoá màn hình cho máy dùng chung, đặt trong mục Hồ sơ cá nhân. Nó
không thay cho đăng nhập: PIN chỉ có 6 chữ số nên đừng dùng lại PIN thẻ ngân hàng.

## Theo dõi hạn mức

### Việc còn nợ: lượt đọc sẽ hết trước dung lượng

App hiện **tải trọn** các collection mỗi lần mở (`onSnapshot` không có `limit()` hay
`where()`), nên mỗi lần mở app tốn số lượt đọc bằng đúng tổng số tài liệu đang có. Gói
Spark cho **50.000 lượt đọc/ngày**. Với 10.000 tài liệu thì cả nhóm chỉ mở được khoảng
5 lần một ngày là hết hạn mức, và khi hết thì app không tải được dữ liệu.

**Vì sao chưa thêm `limit()`:** tồn kho theo lô (FIFO) và tồn đầu/cuối kỳ đều duyệt
**toàn bộ** lịch sử giao dịch. Cắt bớt dữ liệu tải về sẽ làm số tồn kho sai mà không
báo lỗi gì — tệ hơn hẳn việc hết hạn mức đọc.

**Cách sửa đúng** (là một thay đổi thiết kế, chưa làm): chốt **tồn đầu kỳ** theo tháng
vào một collection riêng, rồi mỗi lần mở app chỉ tải tồn đầu kỳ + giao dịch của kỳ đang
xem. Khi đó `limit()`/`where()` mới an toàn.

Mục *Sức khỏe hệ thống* trong tab Thiết lập hiện số lượt đọc mỗi lần mở app và ước
lượng còn mở được bao nhiêu lần mỗi ngày. Khi ô đó chuyển sang **"Chật"** là lúc phải
làm việc trên, đừng đợi app trắng dữ liệu.

### Dung lượng

Cùng mục đó ước tính phần trăm
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
