# Ba ảnh lon bia cho màn hình đăng nhập

| Loại bia | Tệp |
|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `lon-cau-vang.webp` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `lon-lau-dai-mat-trang.webp` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `lon-suc-manh-atlas.webp` |

Ba tấm này là **ảnh chụp lon thật** của bộ phận, đã qua
`scripts/chuan-hoa-anh-lon.py`.

Thiếu tệp nào thì **riêng loại đó** quay về hình vẽ SVG — không vỡ, không ô
trắng, hai loại kia vẫn hiện bình thường.

## Có ảnh mới thì làm gì

Bỏ ba tệp vào một thư mục, đặt đúng ba tên bên dưới rồi chạy:

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

Chạy xong script in ra lời nhắc: **nhìn ba tấm ảnh ra một lượt** trước khi đẩy
lên — chữ phải đọc xuôi, quanh lon không còn viền trắng.

## Script sửa những gì

Ảnh gốc của bộ phận có bốn chỗ không dùng thẳng được.

**1. Nền trắng đặc**, không phải nền trong. Thả thẳng vào là lon nằm trong một
khối chữ nhật trắng trên nền tối.

**2. Một tấm bị lật gương** — chữ đọc ngược. Để tên tấm ấy trong `CAN_LAT`.
Không đoán tự động được; bộ phận gửi lại bản đã sửa thì **bỏ tên khỏi danh
sách**, không thì lật hai lần lại thành ngược.

**3. Hạt nước đọng.** Lon chụp ra từ tủ lạnh nên bám đầy hạt nước.

**4. Viền trắng mảnh ăn sẵn vào điểm ảnh** ở mép lon — dấu vết của một lần tách
nền trước đó. Không xoá bằng cách chỉnh độ trong được, chỉ còn cách thu bóng lon
vào hai điểm ảnh mỗi bên.

### Tách nền theo từng hàng, không loang từ mép vào

Cách loang hỏng đúng ở lon Lâu Đài Mặt Trăng: thân nó trắng, hai mép lại là vệt
sáng gần trắng tinh, nên vệt loang chui qua đó vào ruột lon và ăn mất một mảng.

Thân lon là **hình trụ** — mỗi hàng ngang của nó là **một đoạn liền**. Nên chỉ
cần lấy trọn đoạn giữa điểm không-phải-nền đầu và cuối. Mảng trắng nằm giữa hai
mép tự động được giữ, dù nó trắng bằng đúng nền.

Ngưỡng nền là **242**, không phải 255: quanh lon còn rải rác điểm 249–254 (nhiễu
còn lại của lần tách nền trước), lấy 255 thì chúng bị coi là lon và kéo bóng lon
ra tận mép ảnh — có hàng lệch tới 126 điểm.

Mép mỗi hàng lấy **trung vị trên 31 hàng** cho bóng lon trơn. Cửa sổ hẹp hơn thì
còn thấy bậc thang ở mép.

### Xoá hạt nước: chỉ ở vùng trơn

Đây là điểm then chốt. Lọc trung vị trên cả tấm thì **hoặc** hạt nước còn nguyên
(lọc nhẹ), **hoặc** chữ trên nhãn nhoè theo (lọc mạnh) — đã thử cả hai.

Nhưng những hạt dễ thấy nhất lại nằm ở mấy mảng màu phẳng: đáy lon, thân đỏ, nền
trắng của lon Lâu Đài. Ở đó xoá chúng không đụng chạm gì đến hình vẽ.

Nên script chỉ thay ở chỗ **lệch nhiều so với ảnh đã làm mịn** (đó là hạt nước)
**và** nền ở đó **trơn** (đó là mảng màu phẳng). Hạt nằm đè lên hoa văn thì để
nguyên — chúng khuất trong chi tiết nên mắt gần như không nhận ra, mà gỡ đi thì
làm nhoè đúng chỗ người ta nhìn.

Độ nhám đo trên ảnh **đã làm mịn** chứ không phải ảnh gốc: đo trên ảnh gốc thì
chính mấy hạt nước làm vùng quanh chúng "nhám", và thế là chúng tự bảo vệ mình
khỏi bị xoá.

## Vì sao không còn lon quay 3D

Trước đây màn hình đăng nhập quay một lon bia, dựng lại từng khung hình bằng
canvas. Đã làm ba vòng — hai ảnh chụp trước/sau (nhoè ở hai hông), cuộn nhãn
360° (hết nhoè nhưng đỉnh và đáy không ra dáng lon), nhìn chếch 22° có nắp khui
(đúng dáng) — rồi chủ sở hữu quyết định bỏ.

Đổi lại được ba thứ: màn hình đăng nhập hết một vòng vẽ chạy liên tục, ba lon
cùng hiện nên nói được đúng cái cần nói — đây là ba vị bia của Bà Nà — và bộ mã
nhẹ đi gần một nghìn dòng.

Lịch sử ba vòng ấy còn trong git, tới commit `b87e5f3`. Ở đó cũng còn
`scripts/dung-anh-lon.py`, dựng lon thẳng từ file bao bì — dùng tới nếu một ngày
không còn ảnh chụp.
