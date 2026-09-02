# Ba ảnh lon bia cho màn hình đăng nhập

| Loại bia | Tệp |
|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `lon-cau-vang.webp` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `lon-lau-dai-mat-trang.webp` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `lon-suc-manh-atlas.webp` |

Ba tấm này **dựng từ file bao bì**, không phải ảnh chụp:
`scripts/dung-anh-lon.py` cuộn ô nhãn trải phẳng 208 × 107 mm quanh một hình
trụ rồi chụp ngang.

Thiếu tệp nào thì **riêng loại đó** quay về hình vẽ SVG — không vỡ, không ô
trắng, hai loại kia vẫn hiện bình thường.

## Vì sao không dùng ảnh chụp thật

Đã thử. Bộ phận có ba tấm ảnh chụp lon rất đẹp, nhưng **tấm nào cũng có hạt
nước đọng** — và hạt nước thì không tẩy khỏi ảnh được cho sạch:

- Hạt nước to hơn bộ lọc trung vị, nên lọc nhẹ thì chúng vẫn còn nguyên.
- Lọc đủ mạnh để xoá được chúng thì chữ trên nhãn nhoè theo.
- Chúng là những thấu kính trong suốt làm méo hình bên dưới, nên vá lại chỗ
  chúng đứng cũng để lại vết trên phần hoa văn nhiều chi tiết.

Bản dựng từ file bao bì thì **không có hạt nước nào**, và cũng không có chuyện
cắt nền hỏng.

Nếu một ngày có ảnh chụp **không có hạt nước**, dùng
`scripts/chuan-hoa-anh-lon.py` — xem phần cuối.

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

### Script làm gì

1. **Tìm ô nhãn bằng đường kẻ vector**, không dò màu điểm ảnh. File dieline có
   sẵn một hình chữ nhật rộng đúng 208 mm — đó là ô nhãn. Dò màu thì mũi tên và
   chữ ghi kích thước lọt vào, và nhãn nền trắng (Lâu Đài Mặt Trăng) không tách
   nổi khỏi nền giấy.
2. **Xén 0,4 mm hai mép.** Đúng hai mép của ô nhãn gặp nhau khi cuộn quanh lon;
   sát mép còn đường đánh dấu chỗ cắt.
3. **Xoá mấy đường đứt màu hồng** đánh dấu chỗ cắt. Chúng nằm đè lên hình vẽ
   chứ không phải một lớp riêng nên không tắt được lúc kết xuất.
4. **Cuộn quanh hình trụ và chụp ngang.** Bán kính suy từ chính chu vi nhãn —
   208 mm ÷ 2π = 33,1 mm, đúng lon 330 ml. Cổ lon thóp 17,81 mm như file ghi.
   Kim loại trần ở vành miệng và đáy là **vàng champagne**, đúng như lon thật.
5. **Ghi ra WebP chất lượng 92.** Cùng một tấm: PNG 833 KB, WebP 200 KB, nhìn
   không ra khác biệt.

## Nếu có ảnh chụp không hạt nước

```bash
python scripts/chuan-hoa-anh-lon.py "C:\Users\khoahd\Downloads\anh-lon"
```

| Tên tệp nguồn | Ra thành |
|---|---|
| `bia vang.png` | `lon-cau-vang.webp` |
| `bia ale.png` | `lon-lau-dai-mat-trang.webp` |
| `bia den.png` | `lon-suc-manh-atlas.webp` |

Script lo ba chỗ mà ảnh gốc thường vướng:

- **Nền trắng đặc**, không phải nền trong.
- **Tấm bị lật gương** — chữ đọc ngược. Để tên tấm ấy trong `CAN_LAT`. Không
  đoán tự động được; bộ phận gửi lại bản đã sửa thì **bỏ tên khỏi danh sách**,
  không thì lật hai lần lại thành ngược.
- **Tấm bị nén dẹt** so với tỉ lệ lon thật.

**Tách nền theo từng hàng, không loang từ mép vào.** Cách loang hỏng đúng ở lon
Lâu Đài Mặt Trăng: thân nó trắng, hai mép lại là vệt sáng gần trắng tinh, nên
vệt loang chui qua đó vào ruột lon. Thân lon là hình trụ nên mỗi hàng ngang của
nó là **một đoạn liền** — chỉ cần lấy trọn đoạn giữa điểm không-phải-nền đầu và
cuối. Mép của mỗi hàng còn được lấy **trung vị trên chín hàng** cho bóng lon
trơn, không lởm chởm.

## Vì sao không còn lon quay 3D

Trước đây màn hình đăng nhập quay một lon bia, dựng lại từng khung hình bằng
canvas. Đã làm ba vòng — hai ảnh chụp trước/sau (nhoè ở hai hông), cuộn nhãn
360° (hết nhoè nhưng đỉnh và đáy không ra dáng lon), nhìn chếch 22° có nắp khui
(đúng dáng) — rồi chủ sở hữu quyết định bỏ.

Đổi lại được ba thứ: màn hình đăng nhập hết một vòng vẽ chạy liên tục, ba lon
cùng hiện nên nói được đúng cái cần nói — đây là ba vị bia của Bà Nà — và bộ mã
nhẹ đi gần một nghìn dòng.

Lịch sử ba vòng ấy còn trong git, tới commit `b87e5f3`.
