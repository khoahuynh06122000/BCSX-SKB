# Ba ảnh lon bia cho màn hình đăng nhập

| Loại bia | Tệp |
|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `lon-cau-vang.webp` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `lon-lau-dai-mat-trang.webp` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `lon-suc-manh-atlas.webp` |

Ba tấm này là **ảnh chụp lon thật** của bộ phận, đã qua
`scripts/chuan-hoa-anh-lon.py` để tách nền và sửa mấy chỗ lệch.

Thiếu tệp nào thì **riêng loại đó** quay về hình vẽ SVG — không vỡ, không ô
trắng, hai loại kia vẫn hiện bình thường.

## Có ảnh mới thì làm gì

Bỏ ba tệp vào một thư mục, đặt tên theo đúng ba tên bên dưới rồi chạy:

```bash
python scripts/chuan-hoa-anh-lon.py "C:\Users\khoahd\Downloads\anh-lon"
```

| Tên tệp nguồn | Ra thành |
|---|---|
| `bia vang.png` | `lon-cau-vang.webp` |
| `bia ale.png` | `lon-lau-dai-mat-trang.webp` |
| `bia den.png` | `lon-suc-manh-atlas.webp` |

Cần `numpy`, `pillow`:

```bash
python -m pip install numpy pillow
```

## Script sửa những gì

Ảnh gốc của bộ phận có ba chỗ không dùng thẳng được:

1. **Nền trắng đặc**, không phải nền trong. Thả thẳng vào màn hình đăng nhập
   thì lon hiện ra trong một khối chữ nhật trắng trên nền tối.
2. **Tấm `bia ale` bị nén dẹt**: tỉ lệ 0,843 trong khi lon 330 ml thật là 0,576.
   Ba lon đứng cạnh nhau mà một cái lùn hơn là thấy ngay.
3. **Tấm `bia den` bị lật gương** — chữ `KRAFTBEER` và `SÚC MẠNH ATLAS` đọc
   ngược. Ảnh xuất từ file dựng bao bì đôi khi bị lật, nhìn lướt không thấy.

### Tách nền theo từng hàng, không loang từ mép vào

Cách loang từ mép ảnh vào hỏng đúng ở lon Lâu Đài Mặt Trăng: thân nó gần như
trắng toàn bộ, và mép trái là một vệt sáng gần trắng tinh — nên vệt loang chui
thẳng qua đó vào ruột lon, ăn mất một mảng, để lại viền trắng lởm chởm.

Thân lon là **hình trụ**: nhìn ngang thì mỗi hàng ngang của nó là **một đoạn
liền**. Nên script chỉ tìm điểm không-phải-nền đầu tiên và cuối cùng trên hàng
đó rồi lấy trọn đoạn ở giữa. Mảng trắng nằm giữa hai mép tự động được giữ, dù
nó trắng bằng đúng nền.

Đổi lại phải chắc chắn lon **đứng thẳng** và không bị vật gì che ngang.

### Danh sách tấm cần lật để trong `CAN_LAT`

Không đoán tự động được — không có cách nào đọc chữ trên ảnh để biết nó xuôi hay
ngược. Nếu bộ phận gửi lại bản đã sửa thì **bỏ tên ấy khỏi `CAN_LAT`**, không
thì lật hai lần lại thành ngược.

Chạy xong script in ra lời nhắc: **nhìn ba tấm ảnh ra một lượt** trước khi đẩy
lên.

## Vì sao không còn lon quay 3D

Trước đây màn hình đăng nhập quay một lon bia, dựng lại từng khung hình bằng
canvas. Đã làm ba vòng — hai ảnh chụp trước/sau (nhoè ở hai hông), cuộn nhãn
360° (hết nhoè nhưng đỉnh và đáy không ra dáng lon), nhìn chếch 22° có nắp khui
(đúng dáng) — rồi chủ sở hữu quyết định bỏ.

Đổi lại được ba thứ: màn hình đăng nhập hết một vòng vẽ chạy liên tục, ba lon
cùng hiện nên nói được đúng cái cần nói — đây là ba vị bia của Bà Nà — và bộ mã
nhẹ đi gần một nghìn dòng.

Lịch sử ba vòng ấy còn trong git, tới commit `b87e5f3`. Ở đó cũng còn
`scripts/dung-anh-lon.py`, dựng lon thẳng từ file bao bì — dùng tới nếu một
ngày không còn ảnh chụp.
