# Ảnh lon bia cho màn hình đăng nhập

Mỗi loại bia cần **hai tấm**: mặt trước và mặt sau. Lon trên màn hình quay
tròn, nên thiếu mặt sau là xoay tới đâu lòi ra mảng trống tới đó. Thiếu tấm nào
thì riêng loại đó quay về hình vẽ, không làm hỏng hai loại kia.

| Loại bia | Mặt trước | Mặt sau |
|---|---|---|
| Cầu Vàng — Golden Bridge Helles Lager | `lon-cau-vang.png` | `lon-cau-vang-sau.png` |
| Lâu Đài Mặt Trăng — Lunar Castle Dry Hop Pale Ale | `lon-lau-dai-mat-trang.png` | `lon-lau-dai-mat-trang-sau.png` |
| Sức Mạnh Atlas — Atlas Wings Dark Lager | `lon-suc-manh-atlas.png` | `lon-suc-manh-atlas-sau.png` |

Chép vào chính thư mục này (`public/`) là xong, **không phải sửa dòng code nào**.

## Yêu cầu ảnh

- **PNG nền trong** (đã tách nền). Ảnh chụp còn phông sẽ lộ ra một khối chữ
  nhật trên nền tối, hỏng hết hiệu ứng lon lơ lửng.
- Dựng đứng, cao từ **1200px** trở lên.
- **Mặt sau phải là đúng cái lon ấy quay 180°**, chụp cùng khoảng cách và cùng
  ánh sáng với mặt trước. Lệch sáng thì lúc quay thấy nhảy màu ở chỗ nối.
- **Chữ trên lon phải đọc xuôi.** Ảnh xuất từ file dựng bao bì đôi khi bị lật
  gương, nhìn lướt không thấy nhưng lên màn hình thì chữ ngược hết.

## Tách nền

Ảnh còn phông thì chạy `scripts/tach-nen-anh-lon.py`, chọn chế độ theo phông:

```
# nền trắng phẳng
python scripts/tach-nen-anh-lon.py public/lon-cau-vang.png

# nền trắng nhưng THÂN LON cũng trắng (Lâu Đài Mặt Trăng)
python scripts/tach-nen-anh-lon.py --nguong=250 --vien=250 public/lon-lau-dai-mat-trang.png

# phông studio xám chuyển sắc
python scripts/tach-nen-anh-lon.py --mohinh --saiso=40 public/lon-cau-vang-sau.png

# ảnh bị lật gương
python scripts/tach-nen-anh-lon.py --lat public/lon-suc-manh-atlas.png
```

Ảnh được ghi đè tại chỗ và cắt sát viền lon, nên giữ một bản gốc ở nơi khác
trước khi chạy.
