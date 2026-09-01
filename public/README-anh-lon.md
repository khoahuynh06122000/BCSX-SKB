# Ba ảnh lon bia cho màn hình đăng nhập

| Loại bia | Tệp |
|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `lon-cau-vang.webp` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `lon-lau-dai-mat-trang.webp` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `lon-suc-manh-atlas.webp` |

Ba tấm này **không phải ảnh chụp**. Chúng do `scripts/dung-anh-lon.py` dựng ra:
cuộn ô nhãn trải phẳng 208 × 107 mm trong file bao bì của bộ phận quanh một
hình trụ, rồi chụp ngang — đúng như ảnh chụp lon thật.

Thiếu tệp nào thì **riêng loại đó** quay về hình vẽ SVG — không vỡ, không ô
trắng, hai loại kia vẫn hiện bình thường.

## Bao bì đổi mẫu thì làm gì

Xin bộ phận file PDF bao bì (bản dieline), bỏ cả ba file vào một thư mục rồi
chạy:

```bash
python scripts/dung-anh-lon.py "C:\Users\khoahd\Downloads\vỏ"
```

Script tự nhận loại bia theo tên file (`Atlas…`, `GoldenBridge…`, `Lunar…`) và
ghi đè ba tấm ở thư mục này. **Không phải sửa dòng code nào.**

Cần `pymupdf`, `numpy`, `pillow`:

```bash
python -m pip install pymupdf numpy pillow
```

## Script làm gì

1. **Tìm ô nhãn bằng đường kẻ vector**, không dò màu điểm ảnh. File dieline có
   sẵn một hình chữ nhật rộng đúng 208 mm — đó là ô nhãn. Dò màu thì mũi tên và
   chữ ghi kích thước lọt vào, và nhãn nền trắng (Lâu Đài Mặt Trăng) không tách
   nổi khỏi nền giấy.
2. **Xén 0,4 mm hai mép.** Đúng hai mép của ô nhãn gặp nhau khi cuộn quanh lon;
   sát mép còn đường đánh dấu chỗ cắt, để nguyên thì chỗ nối hiện ra một vạch
   dọc.
3. **Xoá mấy đường đứt màu hồng** đánh dấu chỗ cắt. Chúng nằm đè lên hình vẽ
   chứ không phải một lớp riêng nên không tắt được lúc kết xuất.
4. **Cuộn quanh hình trụ và chụp ngang.** Bán kính suy từ chính chu vi nhãn —
   208 mm ÷ 2π = 33,1 mm, đúng lon 330 ml. Cổ lon thóp 17,81 mm như file ghi.
   Kim loại trần ở vành miệng và đáy là **vàng champagne**, đúng như ảnh lon
   thật, không phải bạc.
5. **Ghi ra WebP chất lượng 92.** Cùng một tấm: PNG 833 KB, WebP 200 KB, mà
   nhìn không ra khác biệt. Đáng giá vì màn hình đăng nhập tải cả ba tấm trước
   khi ai kịp bấm gì.

## Vì sao không còn lon quay 3D

Trước đây màn hình đăng nhập quay một lon bia, dựng lại từng khung hình bằng
canvas. Đã làm ba vòng:

1. **Hai ảnh chụp mặt trước / mặt sau**, trộn lại khi xoay. Phần vỏ ở hai hông
   nằm đúng chỗ nhìn nghiêng hết cỡ nên cả một vòng cung chỉ còn dăm cột ảnh —
   xoay ra chính diện thì thành vệt nhoè.
2. **Cuộn nhãn 360° trực tiếp.** Hết nhoè, nhưng đỉnh và đáy không ra dáng lon
   vì góc nhìn ngang tuyệt đối thì nắp lon nằm đúng cạnh.
3. **Nhìn chếch 22° có nắp khui.** Đúng dáng lon, nhưng đủ rồi.

Chủ sở hữu quyết định bỏ. Đổi lại được ba thứ: màn hình đăng nhập hết một vòng
vẽ chạy liên tục, ba lon cùng hiện nên nói được đúng cái cần nói — đây là ba vị
bia của Bà Nà — và bộ mã nhẹ đi gần một nghìn dòng.

Lịch sử ba vòng ấy còn trong git, tới commit `b87e5f3`.

## Nếu muốn thay bằng ảnh chụp thật

Cứ thay đúng ba tên tệp trên. Yêu cầu:

- **Nền trong** (đã tách nền). Ảnh còn phông sẽ lộ ra một khối chữ nhật trên
  nền tối, hỏng hết hiệu ứng lon lơ lửng.
- Dựng đứng, cao từ **1000 px** trở lên.
- **Chữ trên lon phải đọc xuôi.** Ảnh xuất từ file dựng bao bì đôi khi bị lật
  gương, nhìn lướt không thấy nhưng lên màn hình thì chữ ngược hết.
- Ba lon nên chụp cùng khoảng cách và cùng ánh sáng — chúng đứng cạnh nhau nên
  lệch cỡ hay lệch sáng là thấy ngay.
