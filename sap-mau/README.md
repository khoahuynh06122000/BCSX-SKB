# Thư mục nhận tệp mẫu SAP

Để vào đây **một tệp thật** mà anh vẫn nạp vào SAP hàng kỳ để xuất hóa đơn.

Cần gì:

1. **Tệp mẫu** — đúng tệp đang dùng, không phải tệp gõ lại. Đặt tên gì cũng được,
   ví dụ `mau-xuat-hoa-don.txt` hoặc `.xlsx` / `.csv` tuỳ SAP nhận kiểu nào.
2. **Ảnh chụp màn hình chỗ nạp tệp trong SAP** — thấy được mã giao dịch là đủ.
   Đặt cùng thư mục này.

Có hai thứ đó thì dựng được bộ kết xuất, và viết được test đối chiếu tệp app xuất
ra với tệp mẫu — để không phải mở SAP mới biết đúng sai.

## Cảnh báo: không commit tệp thật

Repo này **công khai trên GitHub**. Tệp mẫu thật chứa tên khách hàng, mã số thuế,
số tiền — đẩy lên là lộ ra ngoài, và xoá commit sau cũng không rút lại được vì nó
đã nằm trong lịch sử git.

Nên `.gitignore` đã chặn toàn bộ nội dung thư mục này, chỉ giữ lại tệp README.
Kiểm tra trước khi commit:

```bash
git status --short sap-mau/
```

Không thấy tệp nào của mình hiện ra là đúng.

## Rồi sau đó

Tệp mẫu ở lại máy anh; em đọc để lấy khuôn rồi dựng phần kết xuất và script nạp
SAP. Chỉ **khuôn** (có cột nào, thứ tự nào, định dạng ngày/số nào) đi vào code —
số liệu thật thì không.
