# Bàn giao phiên làm việc Demo & Paperless (`paperless-v2`)

> **Mục đích:** Giúp anh Khoa mở Antigravity trên máy công ty và tiếp tục làm demo mà không cần bật máy ở nhà, không làm ảnh hưởng nhánh `main` (Production/Vercel).

---

## 1. Trạng thái hiện tại (cập nhật 17/11/2026)

- **Nhánh `main` (chỉ mới commit cục bộ tại máy nhà ở `39c4f2a`, CHƯA push lên `origin/main`):**
  - Đã tích hợp hoàn chỉnh luồng **Paperless 2 bước rào** (`cho_ql_xuong` ➔ `cho_kho_tong` ➔ `signed`) vào app chính React + TypeScript + Firestore (`src/types.ts`, `src/lib/quyen.ts`, `src/lib/slip.ts`, `src/lib/loBia.ts`, `src/components/XuongSanXuatPanel.tsx`, `QuanLyXuongPanel.tsx`, `KhoTongNxtPanel.tsx`, `KeToanDashboardPanel.tsx`, `ImportSlip.tsx`, `src/App.tsx`, `src/index.css`, `firestore.rules`).
  - Kiểm tra trên bản chính: `npm run lint` (0 lỗi), `npm test` (31/31 file đạt), `npm run build` (thành công).
- **Nhánh nháp `paperless-v2` (đã đẩy lên GitHub để làm tiếp trên máy công ty):**
  - Chứa toàn bộ code mới từ `39c4f2a` + file demo 1 trang offline **`demo-paperless-skb.html`** (đã bỏ dòng `"Chuỗi Khép Kín: ..."` ở thanh header theo góp ý của anh Khoa).

---

## 2. Quy tắc nghiệp vụ & giao diện anh Khoa đã chốt trong phiên

1. **4 vai trò tách gọn (ít chữ, không rối):**
   - **`SAN_XUAT` (NV Sản Xuất):** Chỉ tập trung lập phiếu giao bia `PN-YYMMDD-NN` (bắt buộc mã lô 100%, quy đổi Keg/Thùng, bắt buộc ảnh chụp hiện trạng đủ số lượng Keg/Thùng), kế thừa **Kế hoạch SX** từ quản lý (có nút điền phần thiếu), sửa phiếu bị `tra_lai`, nhập **Đánh giá sản lượng ngày**, và **Kiểm kê tháng bồn FST & BBT** (bắt buộc kèm ảnh minh chứng).
   - **`QUAN_LY_XUONG` (Quản Lý Xưởng):** Kiểm tra nhật ký nhập, phóng to ảnh đếm số Keg để duyệt **Rào 1** (`cho_kho_tong`) hoặc trả lại kèm lý do (`tra_lai`), và nhập/phát hành **Kế hoạch sản xuất** (để sau này có thể mở rộng nạp tự động từ agent bóc mail).
   - **`NHAP_KHO` (Kho Tổng):** Kiểm tra hàng thực nhận & ảnh để duyệt **Rào 2** (`signed`), xem **Nhập · Xuất · Tồn (NXT)** kỳ và tồn theo lô **FIFO** (xuất bán tự phân bổ lô FIFO).
   - **`KE_TOAN` (Kế Toán):** Dashboard đối chiếu Kế hoạch SX vs Thực xuất bán vs Xưởng giao vs Kho nhận 2 rào, truy xuất lô bia realtime đi về các điểm bán nào (`BNC · ...` / đại lý), rà soát kiểm kê bồn FST/BBT và in/xem biểu mẫu điện tử `BM-SKB-01`.
2. **Rào tồn kho bắt buộc (`src/lib/slip.ts` -> `phieuDaVaoTon`):**
   - Phiếu ở `cho_ql_xuong`, `cho_kho_tong`, `tra_lai` dù đã gắn ảnh hiện trạng Keg vẫn **KHÔNG** cộng vào tồn kho; chỉ khi qua đủ 2 rào (`signed`) mới vào tồn. Phiếu cũ giữ tương thích ngược.
3. **Thẩm mỹ UI:**
   - Giữ phong cách Craft Brewery (`#141A23` header + nhấn hổ phách + nền `#F4F1EA` + animation mượt ở `src/index.css` + số `tabular-nums`), **không** thêm lại dòng `"Chuỗi Khép Kín: ..."` ở header.
4. **An toàn khi làm trên máy công ty:**
   - Ở máy công ty **chỉ code & chạy demo bằng dữ liệu giả lập** trong `demo-paperless-skb.html` (không đưa `.env.local` hay file `.xlsx` thật lên GitHub).
   - Tối về máy nhà sẽ lấy phần sửa ở nhánh `paperless-v2` về ghép vào `main`, kiểm tra lại với `.env.local` thật rồi mới duyệt deploy Production & `firestore.rules`.

---

## 3. Cách bắt đầu nhanh ở máy công ty sáng mai

1. Mở **GitHub Desktop** ➔ chuyển sang nhánh `paperless-v2` ➔ bấm **Fetch / Pull**.
2. Mở file `demo-paperless-skb.html` thẳng bằng Chrome/Edge để xem giao diện demo hiện tại.
3. Mở thư mục này bằng **Antigravity** ở máy công ty, tạo chat mới và nhắn:
   > *"Đọc `HANDOFF_DEMO.md` và `demo-paperless-skb.html` để tiếp tục mạch tối qua, bây giờ làm thêm cho anh phần demo: ..."*
4. Cuối ngày, **Commit & Push** lên lại chính nhánh `paperless-v2` để tối về máy nhà kéo xuống ghép vào bản chính.
