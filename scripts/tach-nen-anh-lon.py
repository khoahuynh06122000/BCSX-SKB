# -*- coding: utf-8 -*-
"""
TÁCH NỀN TRẮNG KHỎI ẢNH LON BIA

Ảnh sản phẩm thường được gửi ở dạng lon đặt trên nền trắng đặc. Màn hình đăng
nhập lại đặt lon lên nền tối, nên nền trắng đó hiện ra thành một khối chữ nhật
— phải xóa đi thành nền trong.

Không dùng ngưỡng màu toàn ảnh mà LOANG TỪ BIÊN vào: thân lon có nhiều mảng
sáng gần trắng (nắp nhôm, chữ, dải ruy băng kem), lọc theo ngưỡng là thủng
lỗ chỗ. Loang từ biên thì chỉ xóa phần trắng NỐI LIỀN với mép ảnh.

Viền lon bị khử răng cưa nên có một dải pixel pha giữa lon và nền trắng. Dải đó
để nguyên sẽ thành đường viền trắng quanh lon trên nền tối, nên tính alpha
giảm dần theo độ trắng cho các pixel sát vùng nền.

Chạy:  python scripts/tach-nen-anh-lon.py public/lon-cau-vang.png ...
Ảnh được ghi đè tại chỗ, đã cắt sát viền lon.

Thêm cờ --lat để lật ngang: ảnh xuất từ file dựng bao bì đôi khi bị lật gương,
nhìn lướt không thấy nhưng chữ trên lon đọc ngược hết.
"""
import struct
import sys
import zlib
from collections import deque

# Cửa sổ lệnh trên Windows mặc định cp1252, in tiếng Việt là văng UnicodeError.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Coi là nền: cả ba kênh sáng từ mức này trở lên.
NGUONG_NEN = 236
# Dải viền pha: pixel sáng từ mức này trở lên và nằm sát nền thì cho mờ dần.
NGUONG_VIEN = 170
# Chừa quanh lon sau khi cắt, tính bằng pixel.
LE = 2


def doc_png(duong_dan):
    """Giải mã PNG RGBA 8-bit về (rộng, cao, bytearray pixel)."""
    d = open(duong_dan, "rb").read()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{duong_dan}: không phải tệp PNG")
    i, idat, w, h, ctype = 8, b"", 0, 0, 0
    while i < len(d):
        ln = struct.unpack(">I", d[i : i + 4])[0]
        typ = d[i + 4 : i + 8]
        if typ == b"IHDR":
            w, h = struct.unpack(">II", d[i + 8 : i + 16])
            if d[i + 16] != 8:
                raise SystemExit(f"{duong_dan}: chỉ nhận PNG 8 bit mỗi kênh")
            ctype = d[i + 17]
        elif typ == b"IDAT":
            idat += d[i + 8 : i + 8 + ln]
        i += 12 + ln
    if ctype not in (2, 6):
        raise SystemExit(f"{duong_dan}: chỉ nhận PNG kiểu RGB hoặc RGBA")

    raw = zlib.decompress(idat)
    kenh = 4 if ctype == 6 else 3
    buoc = w * kenh
    px = bytearray()
    truoc = bytearray(buoc)
    vt = 0
    for _ in range(h):
        loc = raw[vt]
        vt += 1
        dong = bytearray(raw[vt : vt + buoc])
        vt += buoc
        if loc:
            for x in range(buoc):
                a = dong[x - kenh] if x >= kenh else 0
                b = truoc[x]
                c = truoc[x - kenh] if x >= kenh else 0
                if loc == 1:
                    dong[x] = (dong[x] + a) & 255
                elif loc == 2:
                    dong[x] = (dong[x] + b) & 255
                elif loc == 3:
                    dong[x] = (dong[x] + (a + b) // 2) & 255
                else:
                    p = a + b - c
                    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                    tt = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                    dong[x] = (dong[x] + tt) & 255
        px += dong
        truoc = dong

    if kenh == 3:  # bù kênh alpha đặc để phần sau chỉ phải lo một dạng
        day = bytearray(w * h * 4)
        for i in range(w * h):
            day[i * 4 : i * 4 + 3] = px[i * 3 : i * 3 + 3]
            day[i * 4 + 3] = 255
        px = day
    return w, h, px


def ghi_png(duong_dan, w, h, px):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += px[y * w * 4 : (y + 1) * w * 4]

    def khoi(typ, data):
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    out = b"\x89PNG\r\n\x1a\n"
    out += khoi(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    out += khoi(b"IDAT", zlib.compress(bytes(raw), 9))
    out += khoi(b"IEND", b"")
    open(duong_dan, "wb").write(out)


def tach_nen(w, h, px):
    """Loang từ biên, xóa nền trắng, làm mềm viền. Trả về số điểm đã xóa."""
    la_nen = bytearray(w * h)
    hang_doi = deque()

    def xet(i):
        if la_nen[i]:
            return
        r, g, b = px[i * 4], px[i * 4 + 1], px[i * 4 + 2]
        if min(r, g, b) >= NGUONG_NEN:
            la_nen[i] = 1
            hang_doi.append(i)

    for x in range(w):
        xet(x)
        xet((h - 1) * w + x)
    for y in range(h):
        xet(y * w)
        xet(y * w + w - 1)

    while hang_doi:
        i = hang_doi.popleft()
        x, y = i % w, i // w
        if x > 0:
            xet(i - 1)
        if x < w - 1:
            xet(i + 1)
        if y > 0:
            xet(i - w)
        if y < h - 1:
            xet(i + w)

    # Dải viền pha: sát nền và còn sáng thì mờ dần theo độ trắng.
    mo = {}
    for i in range(w * h):
        if la_nen[i]:
            continue
        x, y = i % w, i // w
        ke = (
            (x > 0 and la_nen[i - 1])
            or (x < w - 1 and la_nen[i + 1])
            or (y > 0 and la_nen[i - w])
            or (y < h - 1 and la_nen[i + w])
        )
        if not ke:
            continue
        sang = min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])
        if sang >= NGUONG_VIEN:
            mo[i] = int(255 * (NGUONG_NEN - sang) / (NGUONG_NEN - NGUONG_VIEN))

    for i in range(w * h):
        if la_nen[i]:
            px[i * 4 + 3] = 0
        elif i in mo:
            px[i * 4 + 3] = max(0, min(255, mo[i]))
    return sum(la_nen)


def cat_sat(w, h, px):
    """Cắt bỏ phần trong suốt thừa quanh lon, chừa LE pixel."""
    t, d, tr, ph = h, -1, w, -1
    for y in range(h):
        for x in range(w):
            if px[(y * w + x) * 4 + 3] > 8:
                t = min(t, y)
                d = max(d, y)
                tr = min(tr, x)
                ph = max(ph, x)
    if d < 0:
        return w, h, px
    t, tr = max(0, t - LE), max(0, tr - LE)
    d, ph = min(h - 1, d + LE), min(w - 1, ph + LE)
    nw, nh = ph - tr + 1, d - t + 1
    moi = bytearray(nw * nh * 4)
    for y in range(nh):
        nguon = ((t + y) * w + tr) * 4
        moi[y * nw * 4 : (y + 1) * nw * 4] = px[nguon : nguon + nw * 4]
    return nw, nh, moi


def lat_ngang(w, h, px):
    """Lật gương theo chiều ngang, cho ảnh bị xuất ngược."""
    moi = bytearray(len(px))
    for y in range(h):
        for x in range(w):
            n = (y * w + x) * 4
            d = (y * w + (w - 1 - x)) * 4
            moi[d : d + 4] = px[n : n + 4]
    return moi


def main(doi_so):
    lat = "--lat" in doi_so
    cac_tep = [a for a in doi_so if not a.startswith("--")]
    if not cac_tep:
        raise SystemExit(
            "Cách dùng: python scripts/tach-nen-anh-lon.py [--lat] <tệp.png>..."
        )
    for tep in cac_tep:
        w, h, px = doc_png(tep)
        xoa = tach_nen(w, h, px)
        nw, nh, moi = cat_sat(w, h, px)
        if lat:
            moi = lat_ngang(nw, nh, moi)
        ghi_png(tep, nw, nh, moi)
        them = ", đã lật ngang" if lat else ""
        print(f"{tep}: {w}x{h} -> {nw}x{nh}, xóa {xoa * 100 // (w * h)}% nền{them}")


if __name__ == "__main__":
    main(sys.argv[1:])
