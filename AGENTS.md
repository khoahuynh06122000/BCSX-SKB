# Vai trò: Tin Tin xinh đẹp

Bạn là một chuyên gia hàng đầu thế giới về hai lĩnh vực:
1. **Phát triển Web (Web Development):** Hiểu rõ các kiến trúc hiện đại, tối ưu hóa UI/UX, và xây dựng hệ thống ổn định.
2. **Phân tích Báo cáo Tài chính (Financial Analysis):** Có khả năng đọc hiểu dữ liệu phức tạp, phát hiện xu hướng, và đưa ra các nhận định kinh doanh sắc bén.

## Quy tắc ứng xử:
- Luôn xưng hô là "Tin Tin" hoặc trợ lý chuyên nghiệp.
- Cung cấp giải pháp kỹ thuật đi kèm với góc nhìn phân tích dữ liệu.
- Giữ phong cách làm việc của một chuyên gia giỏi nhất thế giới.
- **Xong mỗi task thì ghi vào mục "Nhật ký công việc" bên dưới** (ngày, việc gì, commit, còn dở gì) — để phiên sau (Claude Code hay Antigravity) đọc là nắm được ngay. Ghi cùng commit với code.

## Ghi nhớ vận hành & Khắc phục sự cố thực tế:
1. **Sự cố ảnh chứng từ "LỖI MẠNG / BỊ CHẶN" trên máy văn phòng Sun World (Kế toán)**:
   - Dữ liệu Firestore vẫn tải đủ 100% nhưng ảnh không hiện. Nút `SOÁT ẢNH` trả về Mã 0 (*Không hỏi tới máy chủ được*).
   - Anh Khoa xác nhận (19/11/2026): máy kế toán và máy admin **cùng một mạng**, admin thấy ảnh còn user khác thì không. Luồng tải ảnh trong code **không phân biệt vai trò** (luật Firestore cho mọi vai trò đã duyệt trừ DNC đọc đủ `anh_chung_tu`; tệp ảnh tải bằng cùng một URL). Nên nghi chặn ở chính máy đó (diệt virus lọc web, chính sách trình duyệt, proxy trên máy) hoặc admin còn cache.
   - ĐÃ LÀM (19/11/2026): ảnh hiển thị đi qua `/api/anh/xem/...` (luật `rewrites` trong `vercel.json`, `server.ts` khi chạy máy). Hàm `quaTrungChuyen` ở `src/anh/duongDan.ts`. Chỗ nào hiện/mở/tải ảnh mới đều phải bọc `quaTrungChuyen(url)`. Ô ảnh: thu nhỏ qua app → gốc qua app → gốc thẳng Cloudinary (dự phòng).
   - `SOÁT ẢNH` có dòng **Kiểm luồng**: cùng một tấm hỏi thẳng Cloudinary và qua app, nói đường nào bị chặn trên máy đang dùng.
   - Chiều TẢI LÊN vẫn đi thẳng `api.cloudinary.com` — nếu máy văn phòng báo lỗi lúc lưu ảnh thì làm thêm trung chuyển cho chiều này.
2. **Tải lại trang là app khoá, đòi PIN** — trợ lý không nhập PIN thay người dùng; muốn kiểm bản mới trên Vercel thì đọc tệp JS đã build (có mã build `xxxxxxx`).

## Nhật ký công việc

### 17/11/2026 (Antigravity)
- Gộp phiếu cũ + nhập lẻ vào panel Xưởng/Kho tổng; ảnh minh chứng thêm thử lại + chẩn đoán.
- Tách tab Tổng quan; chuẩn keg nội bộ 20,6 L, keg lẻ làm tròn lên; ĐVTV ký 20 L/keg (trừ BNC, FV nhận 20,6 L) → báo cáo hao hụt ĐVTV.
- Kho tổng: kiểm kê vỏ keg thu về + danh sách ĐVTV còn giữ keg.
- Nhật ký phiếu thành nút chọn riêng; bảng Rào & BM đứng trước Chứng từ ảnh.
- Phân hệ Quản lý xưởng: duyệt / trả về / nhật ký; admin thấy toàn bộ. `firestore.rules` thêm trường duyệt (commit `8a6e798`). **Chưa xác nhận đã đẩy luật lên Firebase** (`day-rules.cmd`).

### 19/11/2026 (Claude Code)
- `457ec93` — Trung chuyển ảnh `/api/anh/xem` (xem mục 1 ở trên). Soát trên app thật bằng admin: 15/15 nhập + 325/325 xuất hiện được, 100% qua app.
- `cf39289` — Thêm Kiểm luồng vào `SOÁT ẢNH`. **Còn chờ** kế toán chạy trên máy họ và gửi lại dòng Kiểm luồng.
- Rà soát lỗi toàn app (chưa sửa gì). ✔ = Tin Tin đã tự đọc code xác nhận; còn lại do agent rà, độ tin trung bình–cao.
  - **A. Sai số liệu / tiền — ĐÃ SỬA cả 7 (19/11/2026, xem dòng dưới cùng)**
    1. ✔ Xuất kho lưu nhầm đối tác `SKB-BNC`: chuyển sang tab Xuất kho không đặt lại `partnerId`, ô chọn hiện APC nhưng state vẫn SKB-BNC → công nợ tính cho nhà máy (`App.tsx` ~5186, 5833, 6870).
    2. ✔ Công nợ / hoá đơn tính cả phiếu xuất ĐÃ HUỶ: `DebtExport` và các bảng kế hoạch, vỏ keg nhận `transactions` thô, không qua `boGiaoDichPhieuDaHuy` (`App.tsx` 10726…).
    3. ✔ Hai dòng xuất cùng mặt hàng ghi đè nhau: mã `split-${Date.now()}-${productId}-${allocIdx}` trùng → mất dòng, sổ số phiếu vẫn ghi tổng (`App.tsx` ~5670, 5697).
    4. ✔ Lệch ngày khi lưu 00:00–06:59 giờ VN: ghép ngày địa phương với giờ UTC (`App.tsx` ~5616, 5897); form kiểm kê lấy ngày theo UTC (`KiemKeKegLitSection` 45, `KiemKeVoKegThuVeSection` 51).
    5. ✔ Keg giao ĐVTV và hao hụt 0,6 L sai khi một đơn chia nhiều lô FIFO — đang làm tròn theo từng dòng lô (`lib/loBia.ts` ~575).
    6. Số hoá đơn thật không lên sheet Chốt cho đơn vị không có mã SAP (khoá `maBp || donVi` lệch với chỉ mục `h.maBp`) (`lib/congNo.ts` ~432).
    7. Xác nhận đơn đi đường dính ngày quét / số thực nhận của đơn trước (không reset `scannedInvoiceDate`, `soThucNhanText`).
  - **B. Báo cáo / hiển thị sai — ĐÃ SỬA cả 5 (19/11/2026, xem dòng dưới cùng)**
    8. ✔ Dashboard Kế toán cộng tồn bồn của mọi tháng (phải lấy lần kiểm mới nhất mỗi bồn) (`KeToanDashboardPanel` 87).
    9. ✔ Kiểm kê "Keg/Thùng" đếm lon, bỏ keg — và lưu sai `totalKegs` (`KiemKeKegLitSection` 118).
    10. Kiểm kê kho tổng so với tồn sổ theo bộ lọc của tab 1, không theo ngày kiểm (`KhoTongNxtPanel` ~157).
    11. Quét phiếu AI khớp nhầm mặt hàng chỉ vì trùng một từ ("lager") (`App.tsx` ~4509).
    12. Nạp lại cùng tệp BBGN báo "vượt tồn" giả (chỉ cảnh báo) (`App.tsx` ~2594).
  - **C. Bảo mật / quyền**
    13. ✔ Bản ghi giám sát ĐÃ DUYỆT vẫn sửa được số liệu bởi người không có quyền duyệt mà vẫn giữ "đã duyệt" (`firestore.rules` `canUpdateApprovalFields` ~604).
    14. ✔ API Gemini chỉ đòi đăng nhập Google, tài khoản CHỜ DUYỆT cũng gọi được → đốt quota (`api/gemini/scan-invoice.ts` 41).
    15. `/api/anh/xoa` (`vuaTai`) mở cho tài khoản chờ duyệt → có thể đốt hạn mức Admin API Cloudinary.
    16. ✔ Xoá kiểm kê bồn / keg (QLX, kế toán) bỏ lại ảnh và tệp Cloudinary mồ côi (`App.tsx` ~6306, 6319).
    17. Lý do "Trả lại" > 500 ký tự hoặc tên > 150 ký tự làm thao tác duyệt bị từ chối.
    18. Trung chuyển ảnh ở `server.ts` (chỉ khi chạy tại máy) lách được bằng `%2e%2e` — lỗi của bản 19/11, không ảnh hưởng Vercel.
- Sửa nhóm A:
  - A1: sang tab Xuất kho mà đối tác đang là nhà cung cấp thì xoá trắng + ô chọn có dòng "— Chọn đơn vị nhận —"; lưu phiếu xuất cho NHÀ CUNG CẤP bị chặn.
  - A2: `giaoDichConHieuLuc` (bỏ phiếu đã huỷ) truyền cho DebtExport, TraCuuHoaDon, Xưởng, Quản lý xưởng, Kho tổng, Dashboard Kế toán. Lịch sử / ImportSlip / Đơn BNC vẫn dùng dữ liệu thô.
  - A3: mã giao dịch có số thứ tự dòng `d{n}`; kiểm tồn cộng dồn theo mặt hàng; FIFO trừ lô đã chia cho dòng trước.
  - A4: ngày lưu = ngày chọn + giờ máy, KHÔNG kèm `Z` (`ngayGioDiaPhuong` trong `lib/utils.ts`); form kiểm kê dùng `homNayDiaPhuong`. **Dữ liệu cũ** lưu 0h–7h vẫn mang giờ UTC — `slice(0,10)` vẫn đúng ngày, chỉ chỗ đọc bằng `new Date` lệch; chưa chuyển đổi dữ liệu cũ.
  - A5: keg & hao chuẩn 0,6 L làm tròn theo lượt giao (`referenceGroupId` + mặt hàng), không theo dòng lô (`lib/loBia.ts`); vỏ keg dùng chung kết quả.
  - A6: chỉ mục hoá đơn thật trong DebtExport dùng `maBp || donVi` khớp với khoá lưu.
  - A7: mở khung xác nhận đơn đi đường (3 chỗ) đặt lại ngày quét, số gõ dở, lý do hao, ảnh chờ.
  - Chưa kiểm trên giao diện thật (app khoá PIN khi tải lại); đã qua lint, test (thêm phép kiểm tách lô, ngày giờ VN), build.
  - Còn lại nhóm B, C chưa sửa.
- Anh Khoa xác nhận quy định (19/11/2026) và chỉnh lại A1, A2:
  - **A5 đúng ý anh**: keg lẻ làm tròn lên 1 keg, tính theo từng phiếu xuất (lượt giao).
  - **A1 — Trả bia về nhà máy**: được xuất cho nhà cung cấp (SKB-BNC) nhưng CHỈ khi có ảnh kho tổng chụp xác nhận trả bia. Làm: ô đơn vị nhận ở form xuất có dòng "↩ Trả bia về nhà máy · … (cần ảnh xác nhận)" ở cuối; chọn dòng này thì phiếu bắt buộc lưu dạng Đơn đi đường → bước xác nhận đơn (vốn bắt buộc ảnh) mới hoàn tất. Lưu thẳng "đã giao" cho nhà cung cấp bị chặn. SKB-BNC SÓT từ form nhập vẫn bị xoá trắng (`traVeNhaMayRef` phân biệt chủ ý với sót). Hàng trả nhà máy **không lên công nợ** (`dungBangCongNo` bỏ đối tác SUPPLIER) và **không tính là giao ĐVTV** trong báo cáo keg / vỏ keg (`tongHopGiaoKegVaHaoHutDVTV` nhận `partners`).
  - **A2 — Phiếu hủy = xoá hẳn**: dữ liệu (dòng hàng, tờ phiếu nhập, ảnh + tệp Cloudinary) xoá khỏi data lẫn server; sổ số phiếu chỉ giữ ghi chú "đã hủy", bấm vào không còn gì. Hai đường hủy hiện có (xoá phiếu nhập, hủy số mồ côi) vốn đã xoá dữ liệu trước. Phiếu hủy CŨ còn sót dữ liệu: admin thấy dải đỏ ở đầu tab Báo cáo + nút **"Xoá hẳn dữ liệu phiếu hủy"** (`giaoDichConSotCuaPhieuDaHuy` trong `lib/phieuHuy.ts`). `giaoDichConHieuLuc` vẫn giữ làm lớp chặn phụ.
  - **Việc anh cần làm**: vào Báo cáo bằng tài khoản admin, nếu có dải đỏ thì bấm nút để dọn dữ liệu phiếu hủy cũ.
- Sửa nhóm B:
  - B8: tồn bồn ở Dashboard Kế toán = lần kiểm mới nhất của MỖI bồn, bỏ bản bị trả lại (`kiemKeBonMoiNhat` trong `lib/loBia.ts`).
  - B9: ô "Keg/Thùng" kiểm kê = số keg 20,6 L (keg lẻ làm tròn lên, theo từng mặt hàng) + số thùng 24 lon (`demKegThungKiemKe`); hiện "X Keg · Y Thùng". Danh sách bản ghi cũ tính lại từ từng dòng, không đọc `totalKegs` đã lưu sai.
  - B10: kiểm kê kho tổng so với tồn sổ TÍNH ĐẾN NGÀY KIỂM, mọi mặt hàng — không theo bộ lọc của tab Sổ NXT (`tonSoDenNgay` truyền vào `KiemKeKegLitSection`).
  - B11: quét phiếu AI khớp khắt khe — đủ chữ riêng của tên bia + đúng dạng keg/lon (`lib/khopPhieuQuet.ts`, có test riêng). Không khớp được thì người kho tự tích.
  - B12: nạp lại tệp BBGN trả lại tồn tạm phần dòng cũ sắp ghi đè / xoá → hết báo "vượt tồn" giả; bỏ chữ "VUOT_DINH_MUC" trong thông báo.
  - Lint, test, build sạch. Chưa kiểm trên giao diện thật (khoá PIN). Còn nhóm C.
- Anh Khoa chỉnh lại quy định B8, B9 (19/11/2026) — **thay thế** cách sửa B8, B9 ở trên:
  - **B8 — Kiểm kê bồn chốt theo THÁNG, tháng nào dứt điểm tháng đó**, không cộng dồn, không mượn số tháng trước. Dashboard Kế toán có ô **"Tháng chốt"** (mặc định tháng hiện tại); thẻ Tồn kho + Bồn chỉ cộng bồn đã chốt trong tháng đó, tháng chưa kiểm hiện "chưa kiểm". Cùng bồn kiểm 2 lần trong tháng lấy lần sau; bản bị trả lại không tính (`kiemKeBonCuaThang` trong `lib/loBia.ts`).
  - **B9 — Kiểm bia riêng, kiểm keg riêng, KHÔNG quy đổi.** Form kiểm kê Keg & Lít có ô **"Số keg đếm thực tế"** nhập tay; `totalKegs` = số keg đếm tay. Bỏ hẳn cách suy keg/thùng từ số lít. Bản kiểm kê cũ lưu "keg" = tổng số lon (lỗi cũ) thì hiện "— Keg".
  - **Quy đổi lít ↔ keg CHỈ dùng khi kho tổng GIAO bia** cho đơn vị: để biết đã giao bao nhiêu lít, bao nhiêu keg (báo cáo keg giao ĐVTV, hao chuẩn 0,6 L/keg).
  - **Việc tiếp theo anh muốn**: mục **Thu hồi keg** ở phân hệ Kho tổng + **đánh giá thời gian thu hồi keg** (keg giao đi bao lâu thì về). Chưa làm.
- **Ký duyệt = chốt kiểm kê tháng** (quy định anh Khoa 19/11/2026):
  - **Kho tổng** (Kiểm kê Keg & Lít): **KẾ TOÁN** (và admin) ký duyệt. **Xưởng** (Keg & Lít + bồn FST/BBT): **GIÁM SÁT XƯỞNG** (`QUAN_LY_XUONG`, và admin) ký duyệt. Kế toán mở được panel Quản lý xưởng nhưng không còn nút duyệt kiểm kê xưởng.
  - Nút "Ký duyệt & chốt tháng" hỏi xác nhận; tháng đó đã có bản chốt thì báo "sẽ THAY làm bản chốt". Bản đã duyệt hiện "✍ Đã ký duyệt · tên · giờ" + "📌 CHỐT KIỂM KÊ THÁNG MM/yyyy". Mỗi nơi mỗi tháng một bản chốt — bản duyệt SAU thay (`banChotThangKiemKe` trong `lib/loBia.ts`).
  - Tồn bồn tháng ở Dashboard Kế toán chỉ tính bản **đã được giám sát xưởng ký duyệt** (`kiemKeBonCuaThang`), hiện thêm số bản chờ ký duyệt (`soBonChoDuyet`); tháng chưa có bản duyệt hiện "chưa chốt".
  - Luật Firestore hiện cho OWNER / KE_TOAN / QUAN_LY_XUONG cùng duyệt mọi kiểm kê — UI đã chặn đúng người, còn siết luật theo nơi kiểm thì làm cùng nhóm C.
- **Gỡ hẳn OCR / AI quét phiếu** (anh Khoa 19/11/2026: nay chụp ảnh HIỆN TRƯỜNG, không chụp giấy) — B11 bỏ luôn:
  - Xoá `api/gemini/scan-invoice.ts`, route Gemini trong `server.ts`, `requireUser` + `AI_ALLOWED_EMAILS` trong `api/_auth.ts`, nút "Quét bằng Tin" + `handleScanInvoice` + `scannedInvoiceDate` trong `App.tsx` (ngày nhận nay là ngày của dòng đơn), `lib/khopPhieuQuet.ts` + test, gói `@google/genai`, biến `GEMINI_API_KEY` trong `vite.config.ts` / `.env.example` / README.
  - Khung xác nhận đơn đi đường còn 2 nút ảnh: Chụp thêm, Chọn từ máy (vẫn bắt buộc có ảnh).
  - **Việc anh làm**: có thể xoá biến `GEMINI_API_KEY`, `AI_ALLOWED_EMAILS` trên Vercel (không còn dùng).
- B10 — anh đã chốt thiết kế, xem dòng dưới.
- **B10 làm lại — 2 loại kiểm kê, CHỈ Kho tổng** (anh Khoa chốt 19/11/2026):
  - **Chốt tháng (đối chiếu tồn app)**: cột Tồn app = tồn đến ngày chốt; kho đếm **keg đầy** (× 20,6 L) / **thùng** (× 24 lon) + phần **lẻ**, chụp ảnh hiện trạng toàn bộ keg & thùng; mỗi dòng báo "✓ Khớp" hoặc "Lệch ±x". Kế toán ký duyệt = chốt tháng.
  - **Đột xuất (đếm mù)**: chỉ **kế toán** (và admin) tạo; không hiện tồn app khi đếm; lưu xong danh sách mới hiện lệch so với tồn app; không có nút ký duyệt, **không thay bản chốt tháng**.
  - Đánh dấu loại bằng tiền tố `shiftOrPeriod` ("CHỐT THÁNG · " / "ĐỘT XUẤT · ") — không thêm trường, không sửa luật. Mỗi dòng lưu thêm `kienDem` (keg/thùng) và `leDem` (lẻ). Hàm `soLuongTuKien`, `soKegCuaDong`, `laKiemKeDotXuat` trong `lib/loBia.ts`. Kho tổng không còn ô "Số keg đếm thực tế" (keg suy từ kiện đếm); Xưởng vẫn giữ.
  - **Xưởng chú trọng kiểm kê bồn**: ảnh bắt buộc đổi theo loại bồn — **FST: ảnh bảng hệ thống theo dõi trên bồn nấu**; **BBT: ảnh chụp rõ bia trong bồn**. Giám sát xưởng ký duyệt = chốt tháng (đã làm trước).
  - Chưa thử trên giao diện thật (khoá PIN). Còn: nhóm C; mục Thu hồi keg + đánh giá thời gian thu hồi.


### 20/11/2026 (Claude Code)
- `b529c5a` — Luật Rào xưởng (danh_gia_sx / kiem_ke_bon / kiem_ke_keg): bản `8a6e798` vượt ngưỡng 1.000 phép tính, mọi lần SỬA bị từ chối. Tra vai trò một lần (`coQuyenRaoXuong`), quyền giữ nguyên. Thử 53/53 ca bằng Rules test API, **đã đẩy lên af5bc7f8** (khớp repo).
- Kiểm kê Kho tổng: lít lẻ nằm trong 1 keg vơi riêng → 20 keg đầy + 10,9 L = **21 keg**. Dòng mặt hàng hiện "= 21 keg (20 đầy + 1 keg vơi 10,9 L)", danh sách đã lưu cũng vậy. Ô lẻ ≥ 20,6 L (hoặc ≥ 24 lon) là đếm nhầm → báo đỏ, chặn lưu (`leDuMotKien` trong `lib/loBia.ts`). Tổng "Keg đếm" vốn đã tính đúng (`soKegCuaDong`).
- Sổ NXT Kho tổng: bỏ nút "Xuất kho FIFO" (xuất kho vốn tự trừ FIFO theo lô — lít & keg — khi lưu phiếu). Thanh lọc dựng lại: chọn nhanh kỳ **Tháng này / Tháng trước / Năm nay / Toàn bộ** + ô Từ–Đến gọn (w-40) + tìm mặt hàng, nằm dưới tiêu đề. Mặc định vẫn Toàn bộ. Bỏ prop `canExport`, `onDiToiXuatKho`.
- **Chữ ký điện tử + bỏ phiếu giấy** (anh Khoa chọn 20/11/2026: 3 ô ký, bỏ hẳn in giấy, nhập PIN mỗi lần ký):
  - Chữ ký mẫu vẽ tay bắt buộc lần đầu vào app (`chu_ky_mau`, id `${uid}_${yyyyMMddHHmmss}`, bất biến). Đổi ở Cài đặt = thêm mẫu mới. `src/components/ChuKy.tsx` (khung vẽ, `HopKy` nhập PIN), `src/lib/chuKy.ts` (băm SHA-256 nội dung phiếu: mã + ngày + mặt hàng × số lượng, KHÔNG gồm mã lô).
  - Phiếu nhập: người nhập ký trình lúc lưu (nhập trực tiếp cũng vậy, tạo phiếu `cho_ql_xuong`) → QL xưởng Rào 1 → Kho tổng Rào 2. Ký sau chặn nếu nội dung đã đổi sau chữ ký trước, và chặn một người ký 2 ô. Bỏ `handleMarkSlipPrinted`, `handleUploadSignedSlip`, nút Chụp/Tải ảnh ký. Phiếu giấy cũ giữ ảnh; không cho gỡ ảnh ký cuối của phiếu giấy.
  - Luật: `chu_ky_mau` chỉ tạo cho chính mình; chữ ký MỚI trên phiếu phải đủ `chuKyId`/`bamNoiDung`/`xacThuc` và là của chính người ghi (mọi vai trò). Viết lại luật phiếu: tra vai trò một lần (`quyenTaoPhieu`/`quyenSuaPhieu`), chỉ kiểm trường đổi (`phieuHopLe`) — bản trước VƯỢT ngưỡng 1.000 phép tính ở mọi lần tạo phiếu (chưa ai dính vì chưa phiếu nào tạo qua luồng xưởng). Không tạo mới phiếu `draft`/`printed`. Thử 31/31 + 53/53 ca (scratchpad `thu_luat_chuky.py`, `thu_luat_xuong.py`).
  - Kế hoạch SX: lưới đủ mã bia + file mẫu + nạp Excel (`src/lib/keHoachSX.ts`, id `kh-${ngày}-${mã}`); sản lượng 0 = bỏ dòng.
  - **Code và luật phải lên CÙNG LÚC**: code mới mà luật cũ thì màn đăng ký chữ ký (không đóng được) không lưu được → kẹt cả app.
- **Chữ ký vào biên bản kiểm kê + ký nháy phiếu nhập** (anh Khoa 20/11/2026):
  - Kiểm kê Keg & Lít (Xưởng, Kho tổng) và kiểm kê bồn: người kiểm ký lúc lưu (`nguoiLapSig`), người ký duyệt ký lúc duyệt (`duyetSig`, + PIN). Trả lại thì gỡ `duyetSig`. Chặn ký duyệt khi số đã đổi sau chữ ký người kiểm, hoặc người duyệt chính là người kiểm. Đột xuất chỉ có ô người kiểm. Băm nội dung: `noiDungKiemKeKeg` / `noiDungKiemKeBon` (`lib/chuKy.ts`). Khối ký `KhoiKyBienBan` đọc mẫu qua context `NguonChuKyMau`.
  - Ký nháy (`nhaySig`, chỉ admin): nút "Ký nháy xác nhận số" ở Quản lý xưởng (phiếu chờ Rào 1); giám sát xưởng thấy "✓ … đã ký nháy". BM-SKB-01 in ký nháy dưới ô Quản lý xưởng. Số đổi sau ký nháy → Rào 1 bị chặn. Trả lại / trình lại thì gỡ ký nháy.
  - Luật: `nhaySig` chỉ OWNER đặt (ai cũng gỡ được khi trả lại). Kiểm kê thêm `nguoiLapSig`/`duyetSig`; lần SỬA kiểm kê nay chỉ kiểm trường đổi (`duyetDoiHopLe`, `sotChungDoiHopLe`) — thêm chữ ký vào bản kiểm cũ là vượt ngưỡng 1.000. Thử 49/49 + 53/53 ca.
- Giao diện (20/11/2026): khung Hồ sơ cá nhân bị MỜ vì nằm trong `#app` mà `#app` phủ `blur` khi khung mở → bỏ blur lúc khung mở; khung phủ kín màn hình điện thoại, cuộn bên trong; thẻ chữ ký xếp dọc, chữ ký to. Khung "Xác nhận cả phiếu giao hàng": khối ẢNH MINH CHỨNG chuyển lên đầu (trước danh sách mặt hàng) để điện thoại khỏi cuộn tận đáy.
- Tab "Tồn đầu kỳ & Nạp Excel" (Xưởng → Kiểm kê): CHỈ admin thấy (`renderTonDauVaNapLe` gác `isOwner`). Admin nạp tồn đầu lúc đưa kho vào dùng; bộ phận thao tác theo luồng của mình. Luật Firestore CHƯA siết (kế toán / nhập kho vẫn ghi được dòng OPENING nếu gọi thẳng) — chờ anh quyết.
- **Xem như vai trò** (admin, 20/11/2026): ô chọn trên thanh đầu trang, chỉ tài khoản OWNER thật thấy. Đổi `vaiTroXem` → `quyen`, `isOwner`, menu, nút theo vai trò chọn; `userRole` (thật) vẫn dùng cho tải dữ liệu và luật máy chủ — lưu/xoá vẫn theo quyền admin. Dải vàng nhắc + nút "Về admin". Một tài khoản không ký được 2 ô cùng phiếu → thử trọn luồng ký cần tài khoản thật.
- Kế hoạch SX bỏ MÃ LÔ (lưới, file mẫu, đọc file): kế hoạch chỉ bia nào, bao nhiêu; mã lô chỉ có khi chiết thực tế (anh Khoa 20/11/2026).
- **Cân đối keg + sổ keg** (anh Khoa duyệt công thức 20/11/2026): Kho tổng → Thu hồi keg → "Cân đối keg & keg rỗng". Keg rỗng = Tổng sở hữu (tồn đầu + mua thêm − hỏng/mất) − keg có bia Kho tổng (kiểm kê chốt đã duyệt gần nhất) − Xưởng (kiểm kê chốt) − đang chuyển (phiếu chờ Rào 2) − xuất đi đường − đang ở ĐVTV (tồn đầu ĐVTV + giao − thu về, tới ngày cân đối). Trả bia nhà máy không tính. `src/lib/soKeg.ts` (+ test), `CanDoiKegSection.tsx`, bảng `so_keg` (ghi: admin/kế toán; xoá: admin; không sửa).
- **Nhân viên xưởng = nhân viên nhập kho**: `SAN_XUAT` và mã cũ `NHAP_KHO` cùng quyền (lập phiếu, ghi nhập, ký nhận Rào 2, xem ảnh). Ô chọn vai trò ẩn mã cũ (`vaiTroDeChon`). Luật `duyetKhoTongR` nhận cả hai. Tách nhiệm theo tài khoản: người trình không tự ký Rào 2. Tài khoản cuối cùng mang `NHAP_KHO` đã đổi sang `SAN_XUAT` (anh Khoa duyệt 21/11/2026, chỉ sửa trường `role`); prod không còn ai mang mã cũ.
- Hoá đơn / công nợ, thẻ "Chưa xuất hóa đơn": bỏ khung "Chi tiết số liệu · bảng giá · xem trước tệp" (thống kê theo đơn vị, bảng đơn giá tĩnh, xem trước 18 cột, tóm tắt chứng từ, nút tải trùng) — bảng đơn ngay trên đã đủ. Ô **Ngày chứng từ**, **Tiêu đề chứng từ**, **mã cố định** của tệp TEMPLATE chuyển lên ngay dưới nút "Tải tệp TEMPLATE" (trước giấu trong khung nên dễ tải với ngày mặc định). Khung "Số liệu theo đợt" giữ nguyên.

### 21/11/2026 (Claude Code)
- **Tải ảnh theo hóa đơn** (Bảng Chốt, thẻ Đã xuất hóa đơn): cột **Ảnh** mỗi tờ + nút **"Tải ảnh (N)"** cho cả phần đang lọc (ZIP, mỗi hóa đơn một thư mục). Chỉ kế toán, DNC, admin. Nối ảnh theo ĐÚNG giao dịch gộp vào tờ (`DongCongNo.nguon` → mã chuyến → ảnh XUẤT), không dò theo ngày (`src/anh/anhHoaDon.ts`). Tên: `<số HĐ>_<đơn vị>` (`#`→`-`): 1 tấm `.jpg`, nhiều tấm `.zip` bên trong `_01, _02…`. Tải qua trung chuyển app, hỏng thì thẳng Cloudinary (`src/anh/taiBoAnh.ts`); tấm hỏng được báo tên.
  - Thử trên dữ liệu thật: 47 hóa đơn, 46 có ảnh (298 ảnh); C26TKB#00000269 SPA (12.10–14.10) không có ảnh. 29 ảnh xuất ngoài hóa đơn đều là đơn 14–17/11 chưa xuất hóa đơn. Tải thật qua Vercel tờ BNC #253: 57/57 JPEG đúng trong ZIP.
- **Bỏ Thư viện ảnh** (anh Khoa: hết tác dụng): xoá `ThuVienAnh.tsx`, `ChonNhieuDonVi.tsx`, `thuVien.ts`, menu "Thư viện ảnh", hàm xoá ảnh lẻ của admin. Mất theo: nút **SOÁT ẢNH / Kiểm luồng** (chẩn đoán máy kế toán — nay ảnh đã qua trung chuyển). Ảnh vẫn xem ở từng phiếu / biên bản.
- **Chữ ký điện tử chỉ cho người ký**: `VAI_TRO_CAN_CHU_KY` (`lib/quyen.ts`) = admin, kế toán, giám sát xưởng, nhân viên xưởng · nhập kho, xuất kho. DNC / chờ duyệt không bị bắt đăng ký, không thấy thẻ chữ ký ở Hồ sơ. Theo vai trò THẬT của tài khoản (không theo "Xem như").
- Tra cứu hóa đơn đã xuất: ô Từ–Đến ngày mặc định **tháng hiện tại** (01 → ngày cuối tháng, giờ VN), không mở toàn bộ; nút "Tất cả" vẫn xoá lọc (`thangHienTai` trong `TraCuuHoaDon.tsx`).
