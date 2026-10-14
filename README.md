# BCSX-SKB — Quản lý kho bia

App quản lý nhập / xuất kho bia (Lon / Lít / Chai), đơn đi đường, sổ số phiếu,
công nợ, hóa đơn và thư viện ảnh minh chứng.

**Nền tảng:** React + Vite + TailwindCSS · dữ liệu **Firebase (Firestore)** ·
ảnh **Cloudinary** · quét phiếu bằng AI **Gemini** · chạy trên **Vercel**.

---

## Triển khai

Vercel nối thẳng với repo: **mỗi commit vào `main` là Vercel tự build và cập
nhật app.** Nhánh khác tạo bản xem thử riêng.

### Biến môi trường

Điền ở **Vercel → Settings → Environment Variables**, đủ các biến trong
[`.env.example`](.env.example). Sửa biến xong phải **Redeploy**.

| Nhóm | Biến | Ghi chú |
|---|---|---|
| Firebase | `VITE_FIREBASE_*` | Firebase Console → Project settings → Your apps → Config |
| Cơ sở dữ liệu | `VITE_FIREBASE_DATABASE_ID` | `ai-studio-af5bc7f8-…` — app **không** dùng `(default)` |
| Cloudinary tải ảnh | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | preset **Unsigned** |
| Cloudinary xoá ảnh | `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Chỉ máy chủ đọc. Thiếu thì xoá dữ liệu không xoá được ảnh — app báo đỏ cho admin |
| Gemini | `GEMINI_API_KEY` | Chỉ máy chủ đọc |
| AI (tuỳ chọn) | `AI_ALLOWED_EMAILS` | Email được dùng AI, cách nhau dấu phẩy |

### Phân quyền Firestore

Luật ở [`firestore.rules`](firestore.rules), cấu hình đẩy ở
[`firebase.json`](firebase.json) (đã trỏ đúng cơ sở dữ liệu của app):

```bash
npx --yes firebase-tools@latest deploy --only firestore:rules --project gen-lang-client-0780471401
```

Máy công ty chặn PowerShell chạy `npx` thì bấm đôi chuột
[`day-rules.cmd`](day-rules.cmd). Đẩy luật xong phải **tải lại trang app**: đăng
ký nào đã bị máy chủ từ chối thì Firestore đóng luôn, không tự thử lại.

Chống xoá nhầm cơ sở dữ liệu (delete protection) **đang bật**.

---

## Vai trò

Đăng nhập bằng Google. Tài khoản mới ở trạng thái **chờ duyệt**; chủ sở hữu
chọn vai trò trong mục Người dùng. Bảng quyền đầy đủ ở
[`src/lib/quyen.ts`](src/lib/quyen.ts):

| Vai trò | Làm được |
|---|---|
| OWNER | Mọi thứ; là người duy nhất xoá được dữ liệu và ảnh |
| KE_TOAN | Xem và ghi cả hai chiều, công nợ, hóa đơn |
| NHAP_KHO | Chỉ ghi chiều nhập |
| XUAT_KHO | Chỉ ghi chiều xuất, nạp tệp BBGN; xem thư viện ảnh |
| DNC | Khối cung ứng — chỉ xem chiều xuất và ảnh chiều xuất |

---

## Những luật nghiệp vụ không được phá

**Nhập kho có chữ ký mới vào tồn.** Mỗi lượt giao có một mã phiếu
`PN-YYMMDD-NN`. Số đã điền chỉ cộng vào tồn khi phiếu có ảnh ký; trước đó nằm ở
cột *Chờ ký*. Xem [`src/lib/slip.ts`](src/lib/slip.ts).

**Nạp tệp không bao giờ nhân đôi.** Mã tài liệu suy từ nội dung dòng; nạp lại
cùng tệp là ghi đè lên chính nó. Dòng lệch với dữ liệu cũ thì hỏi một lần.
Xem [`src/lib/napTonKho.ts`](src/lib/napTonKho.ts), [`src/lib/bbgn.ts`](src/lib/bbgn.ts).

**Dữ liệu và ảnh đi một cụm.** Mỗi ảnh có một dòng trong sổ `anh_minh_chung`
(khoá theo publicId của Cloudinary). Xoá dữ liệu là xoá luôn ảnh không còn ai
dùng trên Cloudinary — chỉ admin. Kho Cloudinary dùng chung với web khác, nên app
chỉ xoá đúng ảnh có trong dữ liệu của mình. Xem
[`src/lib/soAnh.ts`](src/lib/soAnh.ts), [`api/anh/xoa.ts`](api/anh/xoa.ts).

---

## Theo dõi sức khỏe

- **Dải cảnh báo nguồn dữ liệu** (mọi người dùng thấy): hết hạn mức Firebase,
  mất mạng, lệnh lưu treo chưa lên máy chủ, lưu hỏng, Cloudinary từ chối ảnh.
  Hết chuyện thì tự tắt. Xem [`src/lib/sucKhoe.ts`](src/lib/sucKhoe.ts).
- **Lượt gọi Firebase · đo thật** (Cài đặt, admin): đếm lượt đọc / ghi / xoá
  như Firestore tính, theo ngày hạn mức (giờ Mỹ — đặt lại 14h–15h giờ Việt Nam).
  Cao thì có dải cảnh báo. Xem [`src/lib/doLuong.ts`](src/lib/doLuong.ts).
- **Dung lượng**: Cài đặt → Sức khỏe hệ thống ước tính *cao hơn* số thật. Số
  thật ở Firebase Console → Firestore → Usage.

---

## Thư mục

```
src/App.tsx          Giao diện chính và phần lớn nghiệp vụ (~10.700 dòng)
src/components/      Các màn hình tách riêng (sổ phiếu, công nợ, hóa đơn, BNC…)
src/lib/             Phép tính thuần — chạy thử được không cần Firebase
src/lib/__tests__/   Phép kiểm bằng dữ liệu giả
src/firebase.ts      Khởi tạo Firebase; mọi lệnh Firestore đi qua lib/firestoreDem.ts
api/                 Hàm Vercel: quét phiếu AI, xoá ảnh Cloudinary
server.ts            Máy chủ Express khi chạy tại máy (Vercel không dùng)
firestore.rules      Phân quyền
```

Hàm trong `api/` là ESM biên dịch từng tệp: **import tương đối phải có đuôi
`.js`**, thiếu là cả hàm sập trên Vercel (`apiImport.test.ts` canh việc này).

## Chạy tại máy

Node.js 20 trở lên. Tạo `.env.local` theo `.env.example`, rồi:

```bash
npm install
```

```bash
npm run dev
```

## Kiểm tra trước khi đẩy code

```bash
npm run lint && npm test && npm run build
```

Ba lệnh phải sạch: `lint` kiểm kiểu, `test` in `N DUNG / 0 SAI` cho từng tệp
kiểm, `build` dựng bản chạy thật.
