# -*- coding: utf-8 -*-
"""
LAY O NHAN TRAI PHANG TU FILE BAO BI CUA BO PHAN

Bo phan giao file PDF bao bi (dieline): mot o nhan TRAI PHANG 208 x 107 mm,
dung bang be mat quanh than lon 330ml (chu vi 208,3mm). Script nay cat lay o
nhan ay, xoa may duong danh dau cho cat, roi ghi ra `public/nhan-*.png`.

MAN HINH DANG NHAP TU CUON O NHAN QUANH HINH TRU ngay trong luc ve tung khung
hinh - xem `src/lib/lonXoay.ts`. Nen o day khong dung san anh lon nua.

VI SAO BO CACH DUNG SAN HAI ANH LON. Ban truoc script xuat hai anh cho moi
loai: mat truoc va mat sau, roi app tron hai anh do lai khi xoay. Cach ay co
mot cho hong khong chua duoc - phan vo o hai hong lon nam dung cho nhin nghieng
het co, ca mot vong cung chi con dam cot anh. Xoay ra chinh dien thi dam cot ay
phai trai kin may chuc cot man hinh, va thanh vet nhoe.

Cuon thang tu o nhan 360 do thi khong con cho nao thieu du lieu: goc nao cung
co day cot anh de lay.

Chay:
    python scripts/lay-nhan-tu-bao-bi.py "C:\\Users\\khoahd\\Downloads\\vo"

Can: python -m pip install pymupdf numpy pillow
"""
import os
import sys

import numpy as np
import pymupdf
from PIL import Image

# Ten file PDF bat dau bang gi -> ma loai bia trong app.
TEN_FILE = {
    "Atlas": "suc-manh-atlas",
    "GoldenBridge": "cau-vang",
    "Golden Bridge": "cau-vang",
    "Lunar": "lau-dai-mat-trang",
}

MM = 72 / 25.4
NHAN_RONG_MM = 208.0
NHAN_CAO_MM = 107.0
SAI_SO_MM = 1.5

"""
BE RONG O NHAN LUC GHI RA TEP, tinh bang diem anh.

Lon tren man hinh dang nhap rong chung 300px, tuc nua vong nhan truoc mat trai
tren chung 300 cot. Ca vong 360 do vi vay chi can chung 1.200 cot la du net o
giua. Lay rong tay hon mot chut cho phan sat men - cho ay nen manh nen an
nhieu cot anh goc, va app lay trung binh ca khoang nen cang nhieu cot cang min.
"""
RONG_RA = 1400

MAU_DIELINE = np.array([236, 0, 140], dtype=np.int16)
SAI_MAU = 450
NO_VET = 3


def cat_nhan(duong_dan, dpi=500):
    """
    Cat lay dung o nhan trong file dieline.

    Tim bang DUONG KE VECTOR chu khong do mau diem anh: file co san mot hinh
    chu nhat rong dung 208mm - do la o nhan. Do mau thi mui ten va chu ghi kich
    thuoc mau hong lot vao, va nhan nen trang (Lau Dai Mat Trang) thi khong
    tach noi khoi nen giay.

    CHI DO THEO BE RONG. Ca ba file deu co duong ke rong dung 208mm bat dau tai
    cung mot moc, nhung chieu cao thi khong dong nhat: Lunar Castle ghi tron
    107mm, con Atlas va Golden Bridge chi ghi 97,15mm vi dai duoi cung cua chung
    la mot doi tuong ve rieng. Chieu cao lay theo con so 107mm ghi tren ban ve.

    XEN 0,4mm HAI MEP. Dung hai mep cua o nhan gap nhau khi cuon quanh lon. Sat
    hai mep con duong danh dau cho cat, va vien anh thi lem mot hai diem do khu
    rang cua. De nguyen thi cho noi hien ra mot vach doc. Chu vi hut di 0,8mm
    tren 208mm - bon phan nghin, mat khong thay duoc.
    """
    page = pymupdf.open(duong_dan)[0]
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

    xen = 0.4 * MM
    khung = pymupdf.Rect(
        o.x0 + xen,
        o.y0,
        o.x0 + NHAN_RONG_MM * MM - xen,
        o.y0 + NHAN_CAO_MM * MM,
    )
    pix = page.get_pixmap(dpi=dpi, clip=khung)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def bo_duong_dieline(nhan_rgb, so_lan=28):
    """
    Xoa may duong dut mau hong danh dau cho cat va cho gap.

    Chung nam DE TREN hinh ve chu khong phai mot lop rieng (file khong co lop
    nao), nen khong tat di duoc luc ket xuat. May duong nay khong thuoc vo lon
    that - de lai thi lon tren man hinh co mot vach hong chay ngang.

    NHAN BANG SAC MAU, KHONG BANG KHOANG CACH MAU. Duong dut ve bang mau hong
    (236, 0, 140), nhung men cua no da qua khu rang cua nen nhat dan ra - va
    chinh may diem nhat ay moi la thu con sot lai thanh vet hong mo. Do khoang
    cach toi dung mau goc thi bo sot het.

    Nen bat theo sac: do cao han luc, xanh lam cung cao han luc. Vo lon that
    khong co mau nao nhu vay - do co (200, 30, 40) thi lam khong vuot luc, con
    vang va xanh ret thi luc cao. Toa lau dai mau hong tren nhan Atlas van con
    nguyen: no o xa mau dieline hon nguong `SAI_MAU`.

    Xoa xong thi loang mau tu cac diem xung quanh vao. Duong dut chi day chung
    bay diem anh nen vai luot la lap kin, va vi loang tu bon phia nen ca duong
    ngang lan duong doc deu duoc.
    """
    a = nhan_rgb.astype(np.float64)
    r, g, b = (nhan_rgb[..., i].astype(np.int16) for i in range(3))

    can_xoa = (
        (r > 120)
        & (r - g > 55)
        & (b - g > 35)
        & (np.abs(nhan_rgb.astype(np.int16) - MAU_DIELINE).sum(axis=2) < SAI_MAU)
    )
    if not can_xoa.any():
        return nhan_rgb

    for _ in range(NO_VET):
        cu = can_xoa
        for truc, buoc in ((0, 1), (0, -1), (1, 1), (1, -1)):
            can_xoa = can_xoa | np.roll(cu, buoc, axis=truc)

    a[can_xoa] = np.nan
    for _ in range(so_lan):
        thieu = np.isnan(a[..., 0])
        if not thieu.any():
            break
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
        cao_ra = int(round(RONG_RA * NHAN_CAO_MM / NHAN_RONG_MM))
        im = Image.fromarray(nhan).resize(
            (RONG_RA, cao_ra), Image.Resampling.LANCZOS
        )
        """
        GHI RA BANG BANG MAU 256, KHONG GHI RGB DAY DU.

        Nhan la hinh ve vector: it mau, mang mau lon va phang. Bang mau 256 vua
        du cho loai hinh ay - tu 1,3MB xuong con 440KB moi tam, ma nhin khong ra
        khac biet. Ba tam cong lai 1,3MB thay vi 4MB.

        Dang gia vi man hinh dang nhap tai CA BA tam truoc khi ai kip bam gi.

        Rai mau (dither) khong lam ban anh: cho chinh dien app phong nhan len
        chua toi mot nua nen hat rai van nho hon mot diem anh man hinh, con sat
        men thi app lay trung binh ca tram cot nen rai bao nhieu cung tan het.
        """
        im = im.quantize(
            colors=256,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
        im.save(os.path.join(ra_thu_muc, f"nhan-{ma}.png"), optimize=True)
        print(f"{f}\n   -> public/nhan-{ma}.png  {RONG_RA} x {cao_ra}")


if __name__ == "__main__":
    main()
