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
> Firebase, và hàm serverless dùng để xác minh người gọi endpoint AI. Thiếu biến
> này thì tính năng quét phiếu chuyển bộ phận bằng AI sẽ báo lỗi 500.

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

## Nhập kho: có chữ ký mới vào tồn

Quy trình một lượt giao nhận thành phẩm:

1. **Sản xuất** làm ra thành phẩm, điền thẳng số vào tab **Nhập kho**.
2. Hệ thống cấp ngay một **mã phiếu** cho lượt giao đó, dạng `PN-YYMMDD-NN`
   (`PN-260818-02` = lượt giao thứ hai trong ngày 18/08/2026).
3. **Kho** đếm, đối chiếu với số đã điền. Khớp thì sang tab **Phiếu nhập kho**,
   bấm *Xem & in*.
4. Hai bên ký tươi lên bản in.
5. Chụp ảnh tờ đã ký, đưa vào đúng phiếu đó trên app.

**Bước 5 là bước ghi tăng tồn kho.** Trước khi có ảnh ký, số lượng đã điền:

- không cộng vào tồn kho,
- không lên báo cáo nhập/xuất/tồn,
- không xuất bán được (chọn để xuất sẽ báo không đủ hàng).

Nó chỉ nằm chờ ở tab Phiếu nhập kho, và tab Nhập kho hiện cảnh báo vàng kèm danh
sách mã phiếu còn thiếu chữ ký. Chữ ký giấy vì vậy là lớp kiểm soát thật: **không
ai làm tăng tồn kho một mình được.**

Gỡ hết ảnh ký khỏi một phiếu thì hàng trên phiếu đó **rời khỏi tồn kho ngay** —
chỉ làm khi tải nhầm tờ ảnh.

**Mỗi lượt giao một phiếu, không gộp cả ngày.** Một ngày giao 2–3 đợt là bình
thường; gộp cả ngày thì một tờ ảnh ký sẽ duyệt luôn những đợt chưa ai kiểm, và
dòng điền thêm sau khi đã ký sẽ âm thầm nhập vào phiếu đã duyệt.

Hai nguồn nhập **không** cần chữ ký, vì không có lượt giao nhận nào để hai bên ký:
tồn đầu kỳ (`OPENING`) và số nhập từ file Excel tồn kho. Hai nguồn này vào tồn ngay.

Toàn bộ phép tính quanh mã phiếu và việc duyệt nằm ở
[`src/lib/slip.ts`](src/lib/slip.ts), chạy thử được bằng dữ liệu giả.

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

## Xuất hóa đơn lên SAP (đang dựng)

Nằm trong tab **Doanh thu**, chỉ chủ sở hữu thấy.

**Nguồn là xuất kho, không phải bảng doanh thu.** Xuất kho là gốc, doanh thu sinh
ra từ đó — lấy từ bảng doanh thu thì thành vòng tròn. Chỉ lấy giao dịch `OUT` đã
giao xong: hàng còn `in_transit` chưa giao xong nên chưa lên hóa đơn, còn hao hụt
và hàng hỏng không phải bán.

Tiền hiện trên màn hình chỉ là **tạm tính theo giá danh mục**, không phải giá hợp
đồng của từng khách — xuất kho ghi hàng đi ra, không ghi bán bao nhiêu. Con số đó
để ước lượng độ lớn cho khỏi xuất nhầm kỳ; SAP tính lại tiền và thuế theo bảng giá
của nó. App cũng không tự đặt thuế suất: đoán thì chỉ tạo ra một con số trông có
vẻ đúng.

App **không** chạm được vào SAP: nó chạy trong trình duyệt, không mở được SAP GUI
và không gọi được COM. Nên việc chia làm hai nửa:

| Ở đâu | Làm gì |
|---|---|
| App (tab Doanh thu) | Chọn kỳ → dựng **lệnh xuất** → kết xuất tệp `.json` về máy |
| Máy có SAP | Script đọc tệp đó, nạp lên SAP, **dừng trước nút Duyệt** |
| App | Chủ sở hữu xác nhận đã duyệt xong, hoặc ghi lại lỗi |

Ba điều cố ý làm như vậy:

**Không lưu mật khẩu SAP ở đâu cả.** Người dùng tự đăng nhập SAP như mọi ngày,
script gắn vào phiên đang mở qua SAP GUI Scripting. Không có mật khẩu nào được lưu
nên không có mật khẩu nào lộ được.

**Máy chạy script không có quyền vào Firestore.** Nó chỉ đọc tệp `.json` tải về.
Cấp quyền Firestore cho máy nghĩa là phải giữ khoá tài khoản dịch vụ — thêm một bí
mật nữa phải quản, và khoá đó ghi được mọi collection. Đổi lại: trạng thái "đã
duyệt" phải bấm tay trong app, script chưa tự báo về được.

**Nút Duyệt không tự động.** Hóa đơn đã phát hành là đã lên cơ quan thuế, hủy phải
làm biên bản — nên bước đó do người bấm, app chỉ ghi ai xác nhận và lúc nào.

Chống xuất trùng: khoá lệnh suy ra từ chính tập dòng trong lệnh, nên bấm hai lần
không tạo hai lệnh; và dòng đã nằm trong một lệnh còn hiệu lực thì không được chọn
lại. Xuất trùng là phát hành hai hóa đơn cho cùng một lần bán. Phép tính ở
[`src/lib/sapExport.ts`](src/lib/sapExport.ts).

**Còn thiếu để chạy được:** một tệp mẫu thật đang nạp vào SAP, để vào thư mục
[`sap-mau/`](sap-mau/README.md) — đã chặn không cho commit vì chứa dữ liệu khách
hàng — và kết quả kiểm tra xem SAP GUI Scripting đã được bật chưa.

## Kiến trúc thư mục

```
src/App.tsx        Toàn bộ giao diện và logic nghiệp vụ (file lớn ~10.000 dòng)
src/firebase.ts    Khởi tạo Firebase, đọc cấu hình từ biến môi trường
src/lib/cloudinary.ts  Nén và tải ảnh lên Cloudinary
src/lib/bbgn.ts          Đọc file BBGN dạng bảng chéo và dựng file mẫu BBGN
src/lib/slip.ts          Mã phiếu nhập kho và điều kiện duyệt để hàng vào tồn
src/lib/sapExport.ts     Lệnh xuất hóa đơn lên SAP: chọn kỳ, chống xuất trùng
sap-mau/                 Nơi để tệp mẫu SAP (không commit — chứa dữ liệu khách)
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
tính nghiệp vụ nặng nhất — đối soát doanh thu, chống trùng khi nạp file, đọc file
BBGN, và điều kiện duyệt phiếu để hàng vào tồn — bằng dữ liệu giả, không cần
Firebase hay mở app.
