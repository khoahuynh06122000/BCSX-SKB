# Ảnh lon bia cho màn hình đăng nhập

Sáu tấm PNG dưới đây **không vẽ tay và không chụp** — chúng được dựng từ chính
file bao bì của bộ phận bằng `scripts/dung-lon-tu-nhan.py`. Sửa ảnh thì sửa ở
file bao bì rồi chạy lại script, đừng chỉnh tay từng tấm.

| Loại bia | Mặt trước | Mặt sau |
|---|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `lon-cau-vang.png` | `lon-cau-vang-sau.png` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `lon-lau-dai-mat-trang.png` | `lon-lau-dai-mat-trang-sau.png` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `lon-suc-manh-atlas.png` | `lon-suc-manh-atlas-sau.png` |

## Bao bì đổi mẫu thì làm gì

Xin bộ phận file PDF bao bì (bản dieline, một ô nhãn trải phẳng 208 × 107 mm),
bỏ cả ba file vào một thư mục rồi chạy:

```bash
python scripts/dung-lon-tu-nhan.py "C:\Users\khoahd\Downloads\vỏ"
```

Script tự nhận loại bia theo tên file (`Atlas…`, `GoldenBridge…`, `Lunar…`),
ghi đè thẳng sáu tấm PNG ở thư mục này. **Không phải sửa dòng code nào.**

Cần `pymupdf`, `numpy`, `pillow`:

```bash
python -m pip install pymupdf numpy pillow
```

## Script làm gì

1. **Tìm ô nhãn bằng đường kẻ vector**, không dò màu điểm ảnh. File dieline có
   sẵn một hình chữ nhật rộng đúng 208 mm — đó là ô nhãn. Dò màu thì mũi tên
   và chữ ghi kích thước lọt vào, và nhãn nền trắng (Lâu Đài Mặt Trăng) không
   tách nổi khỏi nền giấy.
2. **Xoá mấy đường đứt màu hồng** đánh dấu chỗ cắt và chỗ gấp. Chúng nằm đè lên
   hình vẽ chứ không phải một lớp riêng nên không tắt được lúc kết xuất; để lại
   thì lon trên màn hình có một vạch hồng chạy ngang.
3. **Cuộn ô nhãn quanh một hình trụ** rồi chụp hai góc: 0° (mặt trước) và 180°
   (mặt sau). Bán kính suy từ chính chu vi nhãn — 208 mm ÷ 2π = 33,1 mm, đúng
   lon 330 ml. Cổ lon thóp lại đúng 17,81 mm như file ghi.
4. **Tô bóng bằng đúng công thức `doSang()`** của `src/lib/lonXoay.ts`. Phải
   giống tuyệt đối: lúc lon quay, app chia lại phần bóng có sẵn trong ảnh để
   thay bằng bóng mới. Lệch công thức thì vệt sáng không đứng yên mà trượt theo
   nhãn — đúng thứ khiến mắt nhận ra đó không phải vật thật.

## Vì sao không cuộn thẳng trong app

`src/lib/lonXoay.ts` đã có sẵn phép chiếu để xoay lon, nhưng đầu vào của nó là
**ảnh chụp** — ảnh đã mang sẵn phép chiếu trụ và đã có sẵn bóng sáng. Đưa thẳng
nhãn phẳng vào đó thì chữ bị kéo dẹt ra hai mép. Cuộn trước ở script thì app
không phải sửa gì, và ảnh sinh ra đúng định dạng nó vốn chờ đợi.

## Nếu muốn thay bằng ảnh chụp thật

Vẫn được — cứ thay đúng sáu tên file trên. Yêu cầu:

- **PNG nền trong** (đã tách nền). Ảnh còn phông sẽ lộ ra một khối chữ nhật
  trên nền tối, hỏng hết hiệu ứng lon lơ lửng.
- Dựng đứng, cao từ **1200px** trở lên.
- **Mặt sau phải là đúng cái lon ấy quay 180°**, chụp cùng khoảng cách và cùng
  ánh sáng với mặt trước. Lệch sáng thì lúc quay thấy nhảy màu ở chỗ nối.
- **Chữ trên lon phải đọc xuôi.** Ảnh xuất từ file dựng bao bì đôi khi bị lật
  gương, nhìn lướt không thấy nhưng lên màn hình thì chữ ngược hết.

Ảnh chụp còn phông thì chạy `scripts/tach-nen-anh-lon.py` (xem `--help`).
