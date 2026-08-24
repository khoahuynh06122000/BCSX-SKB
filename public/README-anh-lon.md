# Ảnh lon bia cho màn hình đăng nhập

Mỗi loại bia cần **bốn tấm**, chụp cùng một lon xoay một chiều, mỗi lần 1/4
vòng. Màn hình đăng nhập chiếu lần lượt bốn tấm ấy nên lon quay trọn một vòng
mà khung hình nào cũng là ảnh thật — không có chỗ nào phải dựng thêm.

| Loại bia | mặt trước | hông phải | mặt sau | hông trái |
|---|---|---|---|---|
| Cầu Vàng | `lon-cau-vang.png` | `lon-cau-vang-hong-phai.png` | `lon-cau-vang-sau.png` | `lon-cau-vang-hong-trai.png` |
| Lâu Đài Mặt Trăng | `lon-lau-dai-mat-trang.png` | `lon-lau-dai-mat-trang-hong-phai.png` | `lon-lau-dai-mat-trang-sau.png` | `lon-lau-dai-mat-trang-hong-trai.png` |
| Sức Mạnh Atlas | `lon-suc-manh-atlas.png` | `lon-suc-manh-atlas-hong-phai.png` | `lon-suc-manh-atlas-sau.png` | `lon-suc-manh-atlas-hong-trai.png` |

Thiếu tấm nào thì riêng loại đó quay về hình vẽ SVG, hai loại kia vẫn chạy.

## Trái với phải là thế nào

Nhìn vào **mặt trước**. Phần vỏ đang ở **mép phải** của mặt trước — xoay lon
cho đúng phần đó ra chính giữa, đó là **hông phải**. Xoay tiếp một nấc nữa ra
**mặt sau**, thêm một nấc nữa ra **hông trái**. Tức là xoay một chiều duy nhất,
chụp bốn lần.

## Chụp thế nào

Quan trọng nhất: bốn tấm phải giống hệt nhau về điều kiện, chỉ khác góc lon.

- Máy **cố định trên giá**, ngang tầm giữa lon. Giữa bốn lần chụp không đụng
  vào máy, chỉ xoay lon tại chỗ.
- Đánh dấu một vòng tròn trên mặt bàn, đặt lon đúng vòng đó mỗi lần.
- Một nguồn sáng, không đổi, **không dùng flash** — lon nhôm bóng sẽ cháy đốm.
- Gửi **tệp gốc**, đừng qua Zalo hay Messenger; mấy ứng dụng đó nén ảnh xuống
  còn vài trăm điểm ảnh, lon sẽ mờ.

Phông nền màu gì cũng được, miễn khác hẳn màu lon. Vải xanh dùng tốt.

## Tách nền

```
# phông vải màu (so theo sắc, chịu được vải nhung sáng tối không đều)
python scripts/tach-nen-anh-lon.py --vai --saiso=110 --motkhoi --dac public/lon-*.png

# nền trắng phẳng
python scripts/tach-nen-anh-lon.py public/lon-cau-vang.png

# nền trắng nhưng THÂN LON cũng trắng
python scripts/tach-nen-anh-lon.py --nguong=250 --vien=250 public/lon-lau-dai-mat-trang.png

# ảnh bị lật gương
python scripts/tach-nen-anh-lon.py --lat public/lon-suc-manh-atlas.png
```

Ảnh bị **ghi đè tại chỗ** và cắt sát viền lon, nên giữ một bản gốc ở nơi khác
trước khi chạy. Bản gốc và bản đã tách của bộ ảnh hiện tại nằm ở `anh-lon-that/`.
