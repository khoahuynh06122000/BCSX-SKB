# Ảnh lon bia cho màn hình đăng nhập

Chép ba tệp vào chính thư mục này (`public/`), đúng tên:

| Tệp | Loại bia | Danh mục trong app |
|---|---|---|
| `lon-cau-vang.png` | Cầu Vàng — lon đỏ | Bia Golden Bridge Helles Lager |
| `lon-lau-dai-mat-trang.png` | Lâu Đài Mặt Trăng — lon trắng | Bia Lunar Castle Dry hop Pale Ale |
| `lon-suc-manh-atlas.png` | Sức Mạnh Atlas — lon đen | Bia Wings Dark Lager |

Có tệp là màn hình tự dùng ảnh thật, **không phải sửa dòng code nào**. Thiếu
tệp nào thì riêng loại đó quay về hình vẽ — không vỡ, không ô trắng.

## Ảnh hiện tại

Ba tệp trong thư mục này đã tách nền và cắt sát viền, cao khoảng 530–590px.
Màn hình phóng lon tới ~560px nên vừa đủ nét ở màn thường; màn Retina sẽ hơi
mềm. Có ảnh gốc lớn hơn thì thay vào sẽ nét hơn.

## Thay ảnh mới

- **PNG nền trong.** Ảnh chụp còn phông sẽ lộ ra một khối chữ nhật trên nền
  tối, hỏng hết hiệu ứng lon lơ lửng.
- Dựng đứng, cao từ **1200px** trở lên là lý tưởng.
- **Chữ trên lon phải đọc xuôi.** Ảnh xuất từ file dựng bao bì đôi khi bị lật
  gương, nhìn lướt không thấy nhưng lên màn hình thì chữ ngược hết — tấm Sức
  Mạnh Atlas ban đầu đúng như vậy.

Ảnh mới còn nền trắng thì chạy tệp này để tách nền và cắt sát viền:

```
python scripts/tach-nen-anh-lon.py public/lon-cau-vang.png
```

Thêm cờ `--lat` nếu ảnh bị lật gương. Ảnh được ghi đè tại chỗ, nên giữ bản gốc
ở nơi khác trước khi chạy.

## Lấy ảnh ở đâu

Bộ phận truyền thông của công ty có ảnh sản phẩm chuẩn. Dùng ảnh của chính mình
thì không vướng bản quyền, và không sợ bên thứ ba đổi đường dẫn làm chết ảnh
ngay trên màn hình đăng nhập.
