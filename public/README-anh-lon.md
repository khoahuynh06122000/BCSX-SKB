# Nhãn lon cho màn hình đăng nhập

Mỗi loại bia cần **một tấm nhãn trải phẳng 360 độ** — cả cái nhãn bóc khỏi lon,
dàn ra thành hình chữ nhật dài, hai đầu nối liền được vào nhau. Màn hình đăng
nhập cuộn tấm ấy quanh một hình trụ nên lon quay liên tục, mọi góc đều là nhãn
thật, không có chỗ nào phải dựng thêm.

| Loại bia | Tệp |
|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `nhan-cau-vang.png` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `nhan-lau-dai-mat-trang.png` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `nhan-suc-manh-atlas.png` |

Thiếu tấm nào thì riêng loại đó hiện hình vẽ, hai loại kia vẫn chạy.

## Cách xin nhãn trải phẳng

Đưa Gemini một ảnh lon rồi nhắn:

> Trải phẳng nhãn lon bia này thành một hình chữ nhật dài, đúng tỉ lệ chu vi lon
> (rộng gấp khoảng 2,4 lần chiều cao nhãn). Không có lon, không bóng đổ, không
> nền — chỉ có nhãn trải phẳng. Hai đầu trái và phải phải nối liền được vào nhau.

Yêu cầu:

- **Tỉ lệ rộng/cao khoảng 2,4.** Lệch một chút không sao, chữ chỉ hơi béo hoặc
  hơi gầy; lệch nhiều thì nhìn ra ngay.
- **Hai đầu phải nối liền.** Chỗ ghép nằm ở sau lon nên ít ai để ý, nhưng lệch
  hẳn màu thì lúc quay thấy một vạch dọc.
- Lề trắng và dấu cắt ở bốn góc thì **để nguyên**, app tự cắt bỏ.
- Càng lớn càng tốt. Tấm hiện tại 1942×809 là vừa đủ.

## Vì sao phải là nhãn trải phẳng

Đã thử dựng nhãn từ ảnh chụp lon và đều thất bại:

- **Hai tấm** (trước, sau): phần vỏ hai bên hông không có dữ liệu, phải bịa. Bịa
  một khúc nhãn rồi đặt cạnh khúc nhãn thật là lộ ngay thành vệt nhoè.
- **Bốn tấm** (thêm hai bên hông): phải ghép, mà ghép cần biết chúng cách nhau
  bao nhiêu độ. Đo ra bốn tấm chụp tay lệch nhau từ 40 tới 140 độ, không tấm nào
  khớp tấm nào; ghép theo giả định 90 độ thì cả nhãn bị co kéo, chữ bị cắt.

Ảnh chụp lon (12 tấm, ba loại bốn góc) vẫn giữ trong `anh-lon-that/` nếu cần.
