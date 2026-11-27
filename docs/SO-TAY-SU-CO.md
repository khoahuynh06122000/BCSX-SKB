# Sổ tay xử lý lỗi & bài học — app BCSX-SKB

> File này do bot `agent/canh_bao.py` **tự xuất** từ bảng `so_tay` + `su_co` sau mỗi lượt kiểm (17h). **Đừng sửa tay** — sửa trong app: *Sự cố hệ thống → Sổ tay & bài học* (chỉ admin). Bài học có **dấu hiệu nhận diện** thì bot tự báo ♻️ TÁI PHÁT khi lỗi quay lại.

Cập nhật: 12:04 27/11/2026 · 9 hướng dẫn · 12 bài học · 0 sự cố 30 ngày

**Trước khi sửa lỗi nào: đọc file này. Lỗi đang sửa trùng / gần bài học cũ thì làm đúng mục "Chặn tái phát".**

## Hướng dẫn xử lý

### Agent danh bạ MySun không chạy

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Bot báo danhba; danh bạ không cập nhật quá 8 ngày.
- **Kiểm tra:** Task Scheduler "KiemKe - Danh ba MySun"; nhật ký agent có câu "firebase login --reauth" không.
- **Xử lý:** Chạy firebase login --reauth trên máy admin rồi chạy lại agent.
- **Chặn tái phát:** Phiên Firebase CLI hết hạn thì cả agent danh bạ lẫn bot cảnh báo cùng dừng — đăng nhập lại ngay khi thấy.
- **Nhận diện:** `danhba`

### Bot cảnh báo BCSX không chạy / không nhắn

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Không thấy tin 17h; tab Sự cố không cập nhật.
- **Kiểm tra:** Task Scheduler "BCSX - Canh bao 17h"; agent/nhat_ky_canh_bao.txt; biến TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID của người dùng Windows.
- **Xử lý:** Chạy tay: python agent/canh_bao.py --thu (không nhắn, không ghi). Hết phiên Firebase → firebase login --reauth.
- **Chặn tái phát:** Máy admin tắt lúc 17h thì lượt đó bỏ qua — biết trước, không phải lỗi.

### Bộ phận báo lỗi đã sửa rồi mà vẫn gặp

- **Mức:** 🟡 NHẸ
- **Triệu chứng:** Người dùng gặp đúng lỗi đã sửa; câu chữ trên màn khác bản hiện tại.
- **Kiểm tra:** Hỏi mã "build xxxxxxx" cuối thanh bên, so với commit mới nhất (git log -1). Bot 17h cũng tự so bản trên Vercel.
- **Xử lý:** Điện thoại: vuốt tắt hẳn app rồi mở lại. Máy tính: Ctrl+Shift+R. Vẫn không lên thì xem Vercel đã build xong chưa.
- **Chặn tái phát:** Bản sửa quan trọng thì bật thông báo bộ phận mẫu "App chạy bản cũ".

### Cần quay lại bản trước gấp

- **Mức:** 🔴 KHẨN
- **Triệu chứng:** Bản vừa đẩy gây lỗi diện rộng, chưa kịp sửa.
- **Kiểm tra:** Xác định commit cuối chạy ổn. Bản lỗi có đổi firestore.rules không?
- **Xử lý:** Vercel → Deployments → bản chạy ổn → Promote to Production. Có đổi luật thì đẩy lại firestore.rules của commit ổn. Bật thông báo bộ phận.
- **Chặn tái phát:** Đổi luật Firestore: chạy Rules test API trước khi đẩy; ghi rõ trong commit luật cũ/mới để quay lại được.

### Hóa đơn đã tải tệp TEMPLATE mà lâu chưa điền số

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Bot báo hd_cho_so; Tra cứu không thấy tờ đó (tra cứu chỉ hiện tờ có số).
- **Kiểm tra:** Công nợ · Hóa đơn → Đã xuất → bảng "Chờ điền số". Dãy số hóa đơn trong app có chỗ hở không.
- **Xử lý:** Kế toán đối chiếu hệ thống hóa đơn điện tử, điền số + ngày.
- **Chặn tái phát:** Điền số ngay khi phát hành; bot nhắc tờ chờ quá 3 ngày.
- **Nhận diện:** `hd_cho_so`

### Không ký điện tử được

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Bấm ký báo "chưa gắn danh bạ" hoặc "nội dung đã đổi sau chữ ký".
- **Kiểm tra:** Danh bạ → khung "Tài khoản chưa gắn". Hoặc phiếu bị sửa số sau chữ ký trước.
- **Xử lý:** Admin gắn tài khoản ở Danh bạ (khai tay nếu không có trên MySun). Số đổi sau chữ ký → trả lại để ký lại từ đầu.
- **Chặn tái phát:** Tài khoản cần ký phải gắn danh bạ ngay khi duyệt vai trò.
- **Nhận diện:** `chưa gắn với danh bạ`

### Lưu bị từ chối "Missing or insufficient permissions"

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Bấm lưu báo thiếu quyền; app ghi lỗi `permission-denied` vào Lỗi 24 giờ.
- **Kiểm tra:** Câu báo có nói vai trò hiện tại. Vai trò đúng mà vẫn bị → nghi firestore.rules (vượt 1.000 phép tính, luật chưa đẩy, khoá mới chưa có trong hasOnly).
- **Xử lý:** Dựng lại đúng ca bằng Rules test API (scratchpad thu_luat_*.py), sửa luật, thử đủ bộ ca rồi đẩy.
- **Chặn tái phát:** Mỗi lần thêm trường vào dữ liệu được luật kiểm `hasOnly`: sửa luật + đẩy luật TRƯỚC code.
- **Nhận diện:** `permission-denied|insufficient permissions`

### Lượt đọc Firebase cao / sắp vượt hạn mức ngày

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Dải đỏ "Lượt gọi Firebase hôm nay đang cao"; bot báo sự cố han_muc.
- **Kiểm tra:** Cài đặt → Lượt gọi Firebase: ai đọc nhiều. Hạn mức đặt lại 14–15h giờ VN.
- **Xử lý:** Nhắc đóng bớt tab, bớt F5. Tìm onSnapshot cả bảng mới thêm. Vượt hẳn thì chờ đặt lại, bật thông báo bộ phận.
- **Chặn tái phát:** Không thêm onSnapshot cả bảng mới; màn quản trị dùng getDocs lúc mở. Giữ persistentLocalCache.
- **Nhận diện:** `han_muc|resource-exhausted|quota`

### Ảnh chứng từ không hiện trên một máy

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Dữ liệu đủ nhưng ảnh trống / báo lỗi mạng trên máy văn phòng.
- **Kiểm tra:** Ảnh có đi qua /api/anh/xem (quaTrungChuyen) không; máy đó có proxy / diệt virus lọc web không.
- **Xử lý:** Mọi chỗ hiện / tải ảnh bọc quaTrungChuyen(url). Chiều tải lên vẫn thẳng Cloudinary.
- **Chặn tái phát:** Chỗ hiện ảnh mới phải dùng quaTrungChuyen.

## Bài học đã sửa

### Khung phủ màn hình bị thanh tiêu đề che trên điện thoại — không bấm được chọn ảnh

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Kéo lên không tới đầu khung xác nhận phiếu giao hàng.
- **Nguyên nhân:** Khung `fixed` nằm trong vùng nội dung có transform (hiệu ứng) nên bám theo vùng đó, không theo màn hình.
- **Xử lý:** createPortal(…, document.body), z cao hơn thanh tiêu đề, max-h theo dvh.
- **Chặn tái phát:** Khung phủ màn hình (modal) mới luôn gắn vào body bằng createPortal; chiều cao dùng dvh.
- **Sửa ở:** b23a5ba 2026-11-27

### Nhật ký ghi "đã sửa" mà code chưa có (xoá kiểm kê để lại ảnh mồ côi)

- **Mức:** 🟡 NHẸ
- **Triệu chứng:** Lỗi được coi là xong nhưng vẫn còn.
- **Nguyên nhân:** Ghi nhật ký theo kế hoạch, không đối chiếu code đã đẩy.
- **Xử lý:** Làm thật: xoá kiểm kê đi qua viecAnhKhiXoa; bản có ảnh chỉ admin xoá.
- **Chặn tái phát:** Chỉ ghi "đã sửa" sau khi grep thấy code + test qua; xoá chứng từ luôn đi qua viecAnhKhiXoa.
- **Sửa ở:** c3439c5 2026-11-26

### Mỗi lần F5 tải lại toàn bộ 15 bảng — lượt đọc Firebase cao

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Dự báo lượt đọc cuối ngày ~100 nghìn (hạn mức 50 nghìn).
- **Nguyên nhân:** 15 onSnapshot cả bảng, chưa bật bộ nhớ đệm trên máy.
- **Xử lý:** persistentLocalCache + persistentMultipleTabManager.
- **Chặn tái phát:** Không thêm onSnapshot cả bảng; màn quản trị dùng getDocs.
- **Nhận diện:** `han_muc`
- **Sửa ở:** c3439c5 2026-11-26

### Đợt công nợ lưu riêng từng trình duyệt — mất bảng "Chờ điền số", nguy cơ xuất trùng hóa đơn

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Máy admin thấy bảng chờ điền số trống dù kế toán đã tải tệp; thẻ Chưa xuất coi chuyến đã xuất là chưa.
- **Nguyên nhân:** Danh sách đợt ở localStorage; khoá hóa đơn băm theo đợt nên hai máy khai đợt khác nhau là lệch khoá.
- **Xử lý:** dotHieuLuc: đợt của hóa đơn đã kết xuất / có số là cố định, đợt khai chỉ phủ ngày còn lại.
- **Chặn tái phát:** Không để dữ liệu quyết định khoá nghiệp vụ nằm ở localStorage; trạng thái dùng chung phải lưu máy chủ.
- **Nhận diện:** `hd_cho_so`
- **Sửa ở:** 51d59e7 2026-11-25

### Tài khoản admin bị bỏ sót vì hồ sơ users ghi "chờ duyệt"

- **Mức:** 🟡 NHẸ
- **Triệu chứng:** Admin không có trong danh sách cần gắn danh bạ; không gắn được chính mình.
- **Nguyên nhân:** Admin nhận theo email cố định; hồ sơ users của admin vẫn ghi PENDING nên bộ lọc "đang hoạt động" loại ra.
- **Xử lý:** Coi tài khoản admin đang đăng nhập là OWNER bất kể users ghi gì.
- **Chặn tái phát:** Mọi bộ lọc theo vai trò phải xét cả admin theo email (như isOwner() trong luật).
- **Sửa ở:** b1f0e30 2026-11-23

### Code ghi thêm trường mới mà luật chưa nhận — mọi lần ký bị từ chối

- **Mức:** 🔴 KHẨN
- **Triệu chứng:** Sau khi đẩy code, mọi thao tác ghi có trường mới bị từ chối.
- **Nguyên nhân:** Luật dùng keys().hasOnly([...]); code mới thêm khoá (maNv, emailCty) trước khi luật biết.
- **Xử lý:** Đẩy luật trước, code sau.
- **Chặn tái phát:** Thêm khoá vào dữ liệu có hasOnly: ĐẨY LUẬT TRƯỚC CODE.
- **Sửa ở:** 2f38f8c 2026-11-23

### Luật Firestore vượt ngưỡng 1.000 phép tính — mọi lần SỬA bị từ chối

- **Mức:** 🔴 KHẨN
- **Triệu chứng:** Lưu / duyệt báo thiếu quyền dù vai trò đúng.
- **Nguyên nhân:** Luật gọi get(users/...) và kiểm lại toàn bộ trường ở mỗi lần ghi, cộng dồn vượt 1.000 phép tính.
- **Xử lý:** Tra vai trò MỘT lần rồi truyền xuống; lần SỬA chỉ kiểm trường thay đổi (diff().affectedKeys()).
- **Chặn tái phát:** Mọi thay đổi luật phải thử bằng Rules test API đủ bộ ca (thu_luat_*.py) trước khi đẩy; tránh `is string` dư thừa.
- **Sửa ở:** b529c5a 2026-11-20

### Phiếu xuất lưu nhầm đối tác của tab nhập (SKB-BNC) — công nợ tính cho nhà máy

- **Mức:** 🔴 KHẨN
- **Triệu chứng:** Ô chọn hiện đơn vị khác nhưng phiếu lưu cho nhà cung cấp.
- **Nguyên nhân:** Chuyển tab không đặt lại partnerId; state cũ sót lại.
- **Xử lý:** Sang tab Xuất kho mà đối tác là nhà cung cấp thì xoá trắng; chặn lưu xuất cho nhà cung cấp (trừ luồng Trả bia về nhà máy có ảnh).
- **Chặn tái phát:** Đổi ngữ cảnh form phải đặt lại mọi lựa chọn phụ thuộc ngữ cảnh.
- **Sửa ở:**  2026-11-19

### Hai dòng xuất cùng mặt hàng ghi đè nhau — mất dòng

- **Mức:** 🔴 KHẨN
- **Triệu chứng:** Sổ số phiếu ghi tổng đúng mà dòng hàng thiếu.
- **Nguyên nhân:** Mã giao dịch chỉ gồm Date.now() + mặt hàng → trùng khoá trong cùng lần lưu.
- **Xử lý:** Mã giao dịch có số thứ tự dòng d{n}.
- **Chặn tái phát:** Khoá tài liệu sinh trong vòng lặp phải có chỉ số dòng; không dựa riêng vào Date.now().
- **Sửa ở:**  2026-11-19

### Số keg giao / hao hụt sai khi một đơn chia nhiều lô FIFO

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Keg giao ĐVTV và hao chuẩn 0,6 L lệch.
- **Nguyên nhân:** Làm tròn keg theo từng dòng lô thay vì theo lượt giao.
- **Xử lý:** Làm tròn theo referenceGroupId + mặt hàng.
- **Chặn tái phát:** Quy đổi / làm tròn ở mức nghiệp vụ (lượt giao), không ở mức dòng kỹ thuật.
- **Sửa ở:**  2026-11-19

### Lệch ngày khi lưu lúc 00:00–06:59 giờ VN

- **Mức:** 🟠 NẶNG
- **Triệu chứng:** Phiếu lưu sáng sớm nhảy về ngày hôm trước.
- **Nguyên nhân:** Ghép ngày địa phương với giờ UTC (toISOString có Z).
- **Xử lý:** ngayGioDiaPhuong / homNayDiaPhuong — không kèm Z.
- **Chặn tái phát:** Không dùng toISOString().slice(0,10) cho "hôm nay" theo giờ VN.
- **Sửa ở:**  2026-11-19

### Công nợ / hóa đơn tính cả phiếu đã huỷ

- **Mức:** 🔴 KHẨN
- **Triệu chứng:** Số công nợ cao hơn thực giao.
- **Nguyên nhân:** Bảng công nợ nhận transactions thô, không lọc phiếu huỷ.
- **Xử lý:** giaoDichConHieuLuc cho mọi báo cáo; phiếu huỷ = xoá hẳn dữ liệu.
- **Chặn tái phát:** Báo cáo tiền / tồn mới phải lấy từ giaoDichConHieuLuc, không lấy transactions thô.
- **Sửa ở:**  2026-11-19

## Sự cố 30 ngày gần đây

| Mở lúc | Mức | Sự cố | Đóng |
|---|---|---|---|
