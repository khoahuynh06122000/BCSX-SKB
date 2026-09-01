# -*- coding: utf-8 -*-
"""
DUNG ANH LON BIA TU FILE BAO BI CUA BO PHAN

Bo phan giao file PDF bao bi (dieline): mot o nhan TRAI PHANG 208 x 107 mm,
dung bang be mat quanh than lon 330ml (chu vi 208,3mm). Man hinh dang nhap lai
can ANH CHUP LON dung, mat truoc va mat sau.

Script nay cuon o nhan phang do quanh mot hinh tru va chup lai hai goc: 0 do
(mat truoc) va 180 do (mat sau).

VI SAO CUON O DAY MA KHONG CUON TRONG APP. `src/lib/lonXoay.ts` da co san phep
chieu de xoay lon, nhung no nhan dau vao la ANH CHUP - anh da mang san phep
chieu tru va da co san bong sang. Dua thang nhan phang vao do thi chu bi keo
det ra hai men. Cuon truoc o day thi app khong phai sua mot dong nao, va anh
sinh ra dung dinh dang no von cho doi.

BONG SANG DUNG CUNG MOT CONG THUC voi `doSang()` ben `lonXoay.ts`. Phai giong
tuyet doi: khi xoay, app chia lai bong sang co san trong anh de thay bang bong
sang moi. Lech cong thuc thi vet sang khong dung yen ma truot theo nhan.

Chay:
    python scripts/dung-lon-tu-nhan.py "C:\\Users\\khoahd\\Downloads\\vo"

Ket qua ghi thang vao `public/`, dung sau ten ma `ManHinhDangNhap.tsx` doc.
"""
import math
import os
import sys

import numpy as np
import pymupdf
from PIL import Image

# ------------------------------------------------------------------ nhan dang

# Ten file PDF bat dau bang gi -> ma loai bia trong app.
TEN_FILE = {
    "Atlas": "suc-manh-atlas",
    "GoldenBridge": "cau-vang",
    "Golden Bridge": "cau-vang",
    "Lunar": "lau-dai-mat-trang",
}

MM = 72 / 25.4
# O nhan that trong file dieline, doc ra tu chinh duong ke vector.
NHAN_RONG_MM = 208.0
NHAN_CAO_MM = 107.0
SAI_SO_MM = 1.5

# ------------------------------------------------------------ dang hinh cua lon

# Lon 330ml tieu chuan.
LON_CAO_MM = 115.2
BAN_KINH_MM = NHAN_RONG_MM / (2 * math.pi)  # 33.1 mm, suy tu chinh chu vi nhan
NHAN_DINH_MM = 2.0                          # nhan bat dau cach dinh lon 2mm
CO_HET_MM = NHAN_DINH_MM + 17.81            # 17,81mm o co, dung nhu file ghi

# ------------------------------------------------------------------- bong sang
# Chep nguyen tu src/lib/lonXoay.ts. Doi mot ben thi phai doi ca hai.
GOC_SANG = -0.22
NEN = 0.3
TAN_XA = 0.7
CHOI = 0.32
MU_CHOI = 16


def tho_raw(goc):
    c = np.cos(goc - GOC_SANG)
    khuech = np.clip(c, 0, None)
    return NEN + TAN_XA * khuech + CHOI * np.power(khuech, MU_CHOI)


DINH = float(tho_raw(np.array(GOC_SANG)))


def do_sang(goc):
    """Do sang cua mat nghieng goc `goc`, chuan hoa ve (0; 1]."""
    return tho_raw(goc) / DINH


# ------------------------------------------------------------------- kich thuoc
"""
DO PHAN GIAI ANH RA - 900px cao, tuc lon rong chung 520px.

Man hinh dang nhap bay lon cao chung 380px, nen 900px la gap hon hai lan - du
net tren man hinh Retina ma khong phi. Anh cu chi 306x527, nhin ro net mo.

Dung tang len 1280: sau tam anh khi do nang 4,6MB, va man hinh dang nhap tai
CA SAU (ba loai bia, moi loai mat truoc va mat sau) truoc khi ai kip bam gi.
Vy dung 3G thi do la gan nam giay nhin man hinh trong.
"""
CAO_PX = 900
SS = 6   # lay mau day them theo chieu ngang, roi thu nho lai
SSY = 2

PX_MM = CAO_PX / LON_CAO_MM
BAN_KINH_PX = BAN_KINH_MM * PX_MM
RONG_PX = int(round(2 * BAN_KINH_PX)) + 8   # chua 4px moi ben cho vien mem


def ban_kinh_theo_hang(y_mm):
    """
    Ban kinh cua lon tai do cao `y_mm` tinh tu dinh xuong.

    Lon khong phai hinh tru deu: no thop lai o co va o day. Lay mot ban kinh
    chung thi luc app xoay anh nay, phan co va day bi keo tran ra ngoai bong
    lon - `lonXoay.ts` da ghi ro cai tat do.
    """
    r = np.full_like(y_mm, BAN_KINH_MM, dtype=np.float64)

    # Vanh mieng lon.
    m = y_mm < 1.0
    r[m] = 26.2 + 1.0 * (y_mm[m] / 1.0)

    # Vai lon: no ra rat nhanh tu vanh sang co.
    m = (y_mm >= 1.0) & (y_mm < NHAN_DINH_MM)
    t = (y_mm[m] - 1.0) / (NHAN_DINH_MM - 1.0)
    r[m] = 27.2 + (28.6 - 27.2) * t

    # Co lon: 17,81mm dung nhu file bao bi ghi, no dan ra bang than.
    m = (y_mm >= NHAN_DINH_MM) & (y_mm < CO_HET_MM)
    t = (y_mm[m] - NHAN_DINH_MM) / (CO_HET_MM - NHAN_DINH_MM)
    # Duong cong lom, khong phai duong thang: vai lon that phinh dan.
    r[m] = 28.6 + (BAN_KINH_MM - 28.6) * np.sqrt(t)

    # Day lon.
    m = y_mm >= 108.0
    t = np.clip((y_mm[m] - 108.0) / (LON_CAO_MM - 108.0), 0, 1)
    r[m] = BAN_KINH_MM - (BAN_KINH_MM - 25.5) * (t ** 2.2)

    return r


def cat_nhan(duong_dan, dpi=500):
    """
    Cat lay dung o nhan trong file dieline.

    Tim bang DUONG KE VECTOR chu khong do mau diem anh: file co san mot hinh
    chu nhat dung 208 x 107 mm: do la o nhan. Do mau thi dinh mui ten va chu
    ghi kich thuoc mau hong lot vao, va nhan nen trang (Lau Dai Mat Trang) thi
    khong tach noi khoi nen giay.
    """
    page = pymupdf.open(duong_dan)[0]

    """
    CHI DO THEO BE RONG, KHONG DO CHIEU CAO.

    Ca ba file deu co mot duong ke rong dung 208mm bat dau tai cung mot moc -
    do la o nhan. Nhung chieu cao cua duong ke ay thi khong dong nhat: Lunar
    Castle ghi tron 107mm, con Atlas va Golden Bridge chi ghi 97,15mm vi dai
    duoi cung cua chung la mot doi tuong ve rieng. Do ca chieu cao thi hai file
    sau khong khop.

    Chieu cao lay theo con so 107mm ghi ngay tren ban ve, chung cho ca ba.
    """
    o = None
    for d in page.get_drawings():
        r = d["rect"]
        if abs(r.width / MM - NHAN_RONG_MM) < SAI_SO_MM and r.height / MM > 80:
            if o is None or r.height > o.height:
                o = r
    if o is None:
        raise SystemExit(
            f"Khong tim thay o nhan rong {NHAN_RONG_MM}mm trong "
            f"{os.path.basename(duong_dan)}. File bao bi co the da doi khuon."
        )
    """
    XEN BOT MOT CHUT O HAI MEP TRAI PHAI.

    Dung hai mep cua o nhan gap nhau o CHINH GIUA MAT SAU cua lon. Sat hai mep
    ay con duong dut danh dau cho cat, va vien anh thi lem mot hai diem do khu
    rang cua. De nguyen thi giua mat sau hien ra mot vach doc chay tu tren
    xuong duoi - dung cho de nhin nhat.

    Xen 0,4mm moi ben. Chu vi hut di 0,8mm tren 208mm, tuc bon phan nghin - mat
    khong thay duoc, ma cho noi thi lien lac.
    """
    xen = 0.4 * MM
    khung = pymupdf.Rect(
        o.x0 + xen,
        o.y0,
        o.x0 + NHAN_RONG_MM * MM - xen,
        o.y0 + NHAN_CAO_MM * MM,
    )
    pix = page.get_pixmap(dpi=dpi, clip=khung)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


# Mau cua duong dieline trong file bao bi: mot mau hong duy nhat cho ca nam
# duong dut. Doc thang tu thuoc tinh net ve nen khong phai doan.
MAU_DIELINE = np.array([236, 0, 140], dtype=np.int16)
SAI_MAU = 150
# Noi rong vet danh dau them may diem anh moi ben.
NO_VET = 3


def bo_duong_dieline(nhan_rgb, so_lan=28):
    """
    Xoa may duong dut mau hong danh dau cho cat va cho gap.

    Chung nam DE TREN hinh ve chu khong phai mot lop rieng (file khong co lop
    nao), nen khong tat di duoc luc ket xuat. May duong nay khong thuoc vo lon
    that - de lai thi lon tren man hinh co mot vach hong chay ngang.

    Cach xoa: danh dau dung mau hong ay roi loang mau tu cac diem xung quanh
    vao. Duong dut chi day chung bay diem anh nen vai luot la lap kin, va vi
    loang tu bon phia nen ca duong ngang lan duong doc deu duoc.
    """
    a = nhan_rgb.astype(np.float64)
    r, g, b = (nhan_rgb[..., i].astype(np.int16) for i in range(3))

    """
    NHAN DUONG DUT BANG SAC MAU, KHONG BANG KHOANG CACH MAU.

    Duong dut ve bang mau hong (236, 0, 140). Nhung men cua no da qua khu rang
    cua nen nhat dan ra, va chinh may diem nhat ay moi la thu con sot lai thanh
    vet hong mo tren than lon. Do khoang cach toi dung mau goc thi bo sot het.

    Nen bat theo SAC: do cao han luc, xanh lam cung cao han luc. Vo lon that
    khong co mau nao nhu vay - do co (do 200, luc 30, lam 40) thi lam khong
    vuot luc, con vang va xanh ret thi luc cao.
    """
    can_xoa = (
        (r > 120)
        & (r - g > 55)
        & (b - g > 35)
        & (np.abs(nhan_rgb.astype(np.int16) - MAU_DIELINE).sum(axis=2) < SAI_MAU * 3)
    )
    if not can_xoa.any():
        return nhan_rgb

    # No vet ra vai diem: men da qua khu rang cua khong con dung sac hong nua
    # nhung van du hong de nhin thay tren than lon.
    for _ in range(NO_VET):
        cu = can_xoa
        for truc, buoc in ((0, 1), (0, -1), (1, 1), (1, -1)):
            can_xoa = can_xoa | np.roll(cu, buoc, axis=truc)

    a[can_xoa] = np.nan
    for _ in range(so_lan):
        thieu = np.isnan(a[..., 0])
        if not thieu.any():
            break
        # Trung binh bon hang xom, bo qua nhung diem cung dang thieu.
        tong = np.zeros_like(a)
        dem = np.zeros(a.shape[:2])
        for truc, buoc in ((0, 1), (0, -1), (1, 1), (1, -1)):
            d = np.roll(a, buoc, axis=truc)
            co = ~np.isnan(d[..., 0])
            tong[co] += d[co]
            dem += co
        lap = thieu & (dem > 0)
        a[lap] = tong[lap] / dem[lap, None]

    a[np.isnan(a)] = 255.0
    return np.clip(a, 0, 255).astype(np.uint8)


def dung_lon(nhan_rgb, phi):
    """
    Cuon o nhan quanh hinh tru roi chup o goc xoay `phi`.

    Diem o vi tri ngang x tren bong lon nam tren phan mat nghieng mot goc
    beta = asin(x/r). Lon xoay di goc phi thi cho ay mang phan nhan o goc
    a = beta + phi. Nhan la mot vong 360 do nen cot can lay la
    ((a/2pi) + 0.5) mod 1 - cong 0,5 de goc 0 roi vao GIUA o nhan, tuc mat
    truoc cua lon.
    """
    Hn, Wn = nhan_rgb.shape[:2]

    hs = CAO_PX * SSY
    ws = RONG_PX * SS
    y_mm = (np.arange(hs) + 0.5) / hs * LON_CAO_MM
    r_mm = ban_kinh_theo_hang(y_mm)
    r_px = (r_mm * PX_MM * SS)[:, None]

    x = (np.arange(ws) + 0.5) - ws / 2.0
    s = np.clip(x[None, :] / r_px, -1.0, 1.0)
    trong = np.abs(x[None, :]) <= r_px

    beta = np.arcsin(s)
    a = beta + phi
    u = (((a / (2 * math.pi)) + 0.5) % 1.0) * (Wn - 1)

    # Hang cua nhan: chi phan than lon moi co nhan.
    v = (y_mm - NHAN_DINH_MM) / NHAN_CAO_MM
    co_nhan = (v >= 0) & (v <= 1)
    vi = np.clip((v * (Hn - 1)).astype(np.int32), 0, Hn - 1)

    ui = u.astype(np.int32)
    mau = nhan_rgb[vi[:, None], ui]           # (hs, ws, 3)

    """
    VANH MIENG VA DAY LON.

    Hai phan nay khong co nhan. De mau nhom tron mot mau thi ra hai khoi xam
    det, nhin nhu lon bi cat cut. Them mot dai toi dan ve sat mep tren va mep
    duoi thi mat doc ra ngay la vanh tron nhin hoi cheo.
    """
    nhom = np.array([198, 200, 206], dtype=np.float64)
    mau = np.where(co_nhan[:, None, None], mau.astype(np.float64), nhom)

    doc = np.ones_like(y_mm)
    m = y_mm < NHAN_DINH_MM                       # vanh mieng
    doc[m] = 0.52 + 0.48 * (y_mm[m] / NHAN_DINH_MM)
    m = y_mm > 109.0                              # day lon
    t = np.clip((y_mm[m] - 109.0) / (LON_CAO_MM - 109.0), 0, 1)
    doc[m] = 1.0 - 0.55 * (t ** 1.6)

    sang = (do_sang(beta) * doc[:, None])[:, :, None]
    rgb = np.clip(mau * sang, 0, 255)

    alpha = np.where(trong, 255.0, 0.0)

    # Thu nho lai: vien lon va cho nen sat mep tu min di, khong con rang cua.
    rgb = rgb.reshape(CAO_PX, SSY, RONG_PX, SS, 3).mean(axis=(1, 3))
    alpha = alpha.reshape(CAO_PX, SSY, RONG_PX, SS).mean(axis=(1, 3))

    ra = np.zeros((CAO_PX, RONG_PX, 4), dtype=np.uint8)
    ra[..., :3] = np.round(rgb).astype(np.uint8)
    ra[..., 3] = np.round(alpha).astype(np.uint8)
    return Image.fromarray(ra, "RGBA")


def main():
    thu_muc = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\khoahd\Downloads\vỏ"
    goc_du_an = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ra_thu_muc = os.path.join(goc_du_an, "public")

    tep = [f for f in sorted(os.listdir(thu_muc)) if f.lower().endswith(".pdf")]
    if not tep:
        raise SystemExit(f"Khong co file PDF nao trong {thu_muc}")

    for f in tep:
        ma = next((v for k, v in TEN_FILE.items() if f.startswith(k)), None)
        if not ma:
            print(f"BO QUA {f}: khong doan duoc la loai bia nao")
            continue

        nhan = bo_duong_dieline(np.asarray(cat_nhan(os.path.join(thu_muc, f))))
        print(f"{f}\n   o nhan {nhan.shape[1]} x {nhan.shape[0]}")

        for hau, phi in (("", 0.0), ("-sau", math.pi)):
            im = dung_lon(nhan, phi)
            duong = os.path.join(ra_thu_muc, f"lon-{ma}{hau}.png")
            im.save(duong, optimize=True)
            print(f"   -> public/lon-{ma}{hau}.png  {im.size[0]} x {im.size[1]}")


if __name__ == "__main__":
    main()
