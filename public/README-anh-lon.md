# Nhãn lon bia cho màn hình đăng nhập

Ba tấm PNG dưới đây **không phải ảnh chụp lon**. Chúng là chính **ô nhãn trải
phẳng 208 × 107 mm** trong file bao bì của bộ phận — trọn một vòng 360° quanh
thân lon. Lon trên màn hình do `src/components/LonXoay.tsx` cuộn tấm này quanh
một hình trụ mà thành, vẽ lại từng khung hình.

| Loại bia | Tệp |
|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `nhan-cau-vang.png` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `nhan-lau-dai-mat-trang.png` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `nhan-suc-manh-atlas.png` |

Thiếu tệp nào thì **riêng loại đó** quay về hình vẽ SVG — không vỡ, không ô
trắng, hai loại kia vẫn hiện bình thường.

## Bao bì đổi mẫu thì làm gì

Xin bộ phận file PDF bao bì (bản dieline), bỏ cả ba file vào một thư mục rồi
chạy:

```bash
python scripts/lay-nhan-tu-bao-bi.py "C:\Users\khoahd\Downloads\vỏ"
```

Script tự nhận loại bia theo tên file (`Atlas…`, `GoldenBridge…`, `Lunar…`) và
ghi đè ba tấm PNG ở thư mục này. **Không phải sửa dòng code nào.**

Cần `pymupdf`, `numpy`, `pillow`:

```bash
python -m pip install pymupdf numpy pillow
```

## Vì sao không dùng ảnh chụp lon

Bản trước dùng **hai ảnh chụp** cho mỗi loại — mặt trước và mặt sau — rồi trộn
lại khi xoay. Cách ấy có một chỗ hỏng không chữa được:

> Phần vỏ ở hai hông lon nằm đúng chỗ ống kính nhìn nghiêng hết cỡ, nên cả một
> vòng cung chỉ còn dăm cột ảnh. Xoay ra chính diện thì dăm cột ấy phải trải kín
> mấy chục cột màn hình — và thành **vệt nhoè**.

Cả một mớ chắp vá quanh chỗ hỏng đó cũng phải nuôi theo: dải hông tự dựng, hệ
số tô tối dải hông, bản làm mờ dọc cho chỗ nối, trần độ nén.

Cuộn thẳng từ nhãn 360° thì **không góc nào thiếu dữ liệu**, nên không cần chắp
vá gì. Đó cũng là điều Khoa nói: chỉ cần nối ảnh thành một vòng tròn.

## Script làm gì

1. **Tìm ô nhãn bằng đường kẻ vector**, không dò màu điểm ảnh. File dieline có
   sẵn một hình chữ nhật rộng đúng 208 mm — đó là ô nhãn. Dò màu thì mũi tên và
   chữ ghi kích thước lọt vào, và nhãn nền trắng (Lâu Đài Mặt Trăng) không tách
   nổi khỏi nền giấy.
2. **Xén 0,4 mm hai mép.** Đúng hai mép của ô nhãn gặp nhau khi cuộn quanh lon;
   sát mép còn đường đánh dấu chỗ cắt, để nguyên thì chỗ nối hiện ra một vạch
   dọc.
3. **Xoá mấy đường đứt màu hồng** đánh dấu chỗ cắt và chỗ gấp. Chúng nằm đè lên
   hình vẽ chứ không phải một lớp riêng nên không tắt được lúc kết xuất.
4. **Ghi ra bằng bảng màu 256.** Nhãn là hình vẽ vector — ít màu, mảng màu lớn
   và phẳng — nên bảng màu vừa đủ: từ 1,3 MB xuống 440 KB mỗi tấm mà nhìn không
   ra khác biệt. Đáng giá vì màn hình đăng nhập tải cả ba tấm trước khi ai kịp
   bấm gì.

## Dáng hình lon nằm ở đâu

Không nằm trong ảnh — nằm trong `src/lib/lonXoay.ts`, hàm `banKinhTheoHang()`
và `sangDauLon()`. Vành miệng, cổ thóp 17,81 mm, rãnh, vành đáy và đáy cuộn vào
đều dựng bằng phép tính theo đúng tỉ lệ lon 330 ml thật (rộng 66,3 mm trên
115,2 mm cao). Muốn sửa dáng lon thì sửa ở đó.
