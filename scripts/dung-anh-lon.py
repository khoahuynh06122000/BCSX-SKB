# -*- coding: utf-8 -*-
"""
DUNG BA ANH LON BIA TINH TU FILE BAO BI CUA BO PHAN

Man hinh dang nhap khong quay lon nua - no bay BA ANH TINH dung canh nhau. Nen
lon duoc dung san o day mot lan, thay vi ve lai tung khung hinh trong trinh
duyet.

VI SAO BO LON XOAY. Da lam ba vong: anh chup mat truoc/mat sau (nhoe o hai
hong), cuon nhan 360 do (het nhoe nhung dinh va day khong ra dang lon), roi
nhin chech co nap khui (dung dang nhung Khoa da met). Mot cai lon quay tren man
hinh dang nhap khong dang doi lay bay nhieu do phuc tap: ba anh dep dat canh
nhau noi duoc dung cai can noi - day la ba vi bia cua Ba Na.

CHUP NGANG, dung nhu ba tam anh chup lon that cua bo phan: khong thay mat nap,
chi thay mot net sam o mep tren. Nho vay khong con phai ve cai nap khui.

Chay:
    python scripts/dung-anh-lon.py "C:\\Users\\khoahd\\Downloads\\vo"

Can: python -m pip install pymupdf numpy pillow
"""
import math
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

MAU_DIELINE = np.array([236, 0, 140], dtype=np.int16)
SAI_MAU = 450
NO_VET = 3

# --------------------------------------------------------- dang hinh lon 330ml
CAO_MM = 115.2
BAN_KINH_MM = NHAN_RONG_MM / (2 * math.pi)  # 33,1mm, suy tu chinh chu vi nhan
MEP_MIENG_MM = 0.7
VANH_TREN_MM = 1.6
NHAN_DAU_MM = 2.1
NHAN_CUOI_MM = NHAN_DAU_MM + NHAN_CAO_MM     # 109,1
RANH_DUOI_MM = 110.2
VANH_DUOI_MM = 111.9
CO_DAI_MM = 17.81                            # dung nhu file bao bi ghi

BAN_VANH = 0.789 * BAN_KINH_MM               # 26,1mm tren lon 330ml that

"""
MAU KIM LOAI TRAN - VANG CHAMPAGNE, KHONG PHAI BAC.

Nhin ba tam anh chup lon that: day ca ba lon deu anh vang am, ke ca lon trang
Lau Dai Mat Trang va lon den Suc Manh Atlas. Lon phu mot lop son lot mau vang
nhat. De mau xam bac thi hai dau lon lac hang tong so voi nhan.
"""
NHOM = np.array([222.0, 199.0, 158.0])

# ------------------------------------------------------------------- bong sang
GOC_SANG = -0.22
NEN = 0.3
TAN_XA = 0.7
CHOI = 0.32
MU_CHOI = 16


def tho_raw(goc):
    khuech = np.clip(np.cos(goc - GOC_SANG), 0, None)
    return NEN + TAN_XA * khuech + CHOI * np.power(khuech, MU_CHOI)


DINH = float(tho_raw(np.array(GOC_SANG)))


def do_sang(goc):
    """Do sang cua mat nghieng goc `goc`, chuan hoa ve (0; 1]."""
    return tho_raw(goc) / DINH


CAO_PX = 1040
PX_MM = CAO_PX / CAO_MM
RONG_PX = int(round(2 * BAN_KINH_MM * PX_MM)) + 6


def ban_kinh(y_mm):
    """
    Ban kinh cua lon tai do cao `y_mm` tinh tu dinh xuong.

    Lon khong phai hinh tru deu: no thop lai o co va o day. Lay mot ban kinh
    chung thi hai dau lon hien ra vuong chan chan, nhin nhu ong nuoc.
    """
    r = np.full_like(y_mm, BAN_KINH_MM, dtype=np.float64)

    m = y_mm < MEP_MIENG_MM                       # mep mieng cuon lai
    r[m] = BAN_VANH * (0.982 + 0.018 * (y_mm[m] / MEP_MIENG_MM))

    m = (y_mm >= MEP_MIENG_MM) & (y_mm < VANH_TREN_MM)   # vanh mieng phinh
    t = (y_mm[m] - MEP_MIENG_MM) / (VANH_TREN_MM - MEP_MIENG_MM)
    r[m] = BAN_VANH * (1 + 0.034 * np.sin(t * math.pi))

    m = (y_mm >= VANH_TREN_MM) & (y_mm < NHAN_DAU_MM)    # ranh duoi vanh
    r[m] = BAN_VANH * 0.992

    m = (y_mm >= NHAN_DAU_MM) & (y_mm < NHAN_DAU_MM + CO_DAI_MM)
    t = (y_mm[m] - NHAN_DAU_MM) / CO_DAI_MM
    # Duong cong lom, khong phai duong thang: vai lon that phinh dan.
    r[m] = BAN_VANH * 0.992 + (BAN_KINH_MM - BAN_VANH * 0.992) * np.sqrt(t)

    m = (y_mm >= RANH_DUOI_MM - 2.0) & (y_mm < RANH_DUOI_MM)
    t = (y_mm[m] - (RANH_DUOI_MM - 2.0)) / 2.0
    r[m] = BAN_KINH_MM - 1.4 * t

    m = (y_mm >= RANH_DUOI_MM) & (y_mm < VANH_DUOI_MM)   # ranh roi vanh day
    t = (y_mm[m] - RANH_DUOI_MM) / (VANH_DUOI_MM - RANH_DUOI_MM)
    r[m] = BAN_KINH_MM * 0.958 + 0.6 * np.sin(t * math.pi)

    # Day cuon vao theo mot CUNG TRON: ham mu cho ra day gan vuong.
    m = y_mm >= VANH_DUOI_MM
    t = np.clip((y_mm[m] - VANH_DUOI_MM) / (CAO_MM - VANH_DUOI_MM), 0, 1)
    r[m] = BAN_KINH_MM * 0.958 * (
        1 - 0.32 * (1 - np.sqrt(np.maximum(0, 1 - t * t)))
    )
    return r


def sang_dau_lon(y_mm):
    """
    He so sang rieng cua hai dau lon.

    Chi doi ban kinh thoi thi hai dau van la hai khoi det. Lon that co mep toi
    o tren cung, vanh sang ngay duoi, ranh toi ngan cach vanh voi co - va o day
    thi dung nhu vay lat nguoc.

    Khong to toi qua: anh lon that cho thay day la mot dai VANG NHAT sang deu,
    chi toi nhe o mep duoi cung.
    """
    s = np.ones_like(y_mm)

    m = y_mm < MEP_MIENG_MM
    s[m] = 0.64
    m = (y_mm >= MEP_MIENG_MM) & (y_mm < VANH_TREN_MM)
    t = (y_mm[m] - MEP_MIENG_MM) / (VANH_TREN_MM - MEP_MIENG_MM)
    s[m] = 0.78 + 0.34 * np.sin(t * math.pi)
    m = (y_mm >= VANH_TREN_MM) & (y_mm < NHAN_DAU_MM)
    s[m] = 0.74

    m = (y_mm > NHAN_CUOI_MM) & (y_mm <= RANH_DUOI_MM)
    s[m] = 0.72
    m = (y_mm > RANH_DUOI_MM) & (y_mm <= VANH_DUOI_MM)
    t = (y_mm[m] - RANH_DUOI_MM) / (VANH_DUOI_MM - RANH_DUOI_MM)
    # Bot choi so voi vanh mieng: day lon huong xuong nen it don sang hon.
    s[m] = 0.72 + 0.26 * np.sin(t * math.pi)
    m = y_mm > VANH_DUOI_MM
    t = np.clip((y_mm[m] - VANH_DUOI_MM) / (CAO_MM - VANH_DUOI_MM), 0, 1)
    s[m] = 0.86 - 0.42 * np.power(t, 0.8)
    return s


def cat_nhan(duong_dan, dpi=500):
    """
    Cat lay dung o nhan trong file dieline.

    Tim bang DUONG KE VECTOR chu khong do mau diem anh: file co san mot hinh
    chu nhat rong dung 208mm - do la o nhan. Do mau thi mui ten va chu ghi kich
    thuoc mau hong lot vao, va nhan nen trang (Lau Dai Mat Trang) thi khong
    tach noi khoi nen giay.

    Chieu cao lay theo con so 107mm ghi tren ban ve: Lunar Castle ghi tron
    107mm, con Atlas va Golden Bridge chi ghi 97,15mm vi dai duoi cung cua
    chung la mot doi tuong ve rieng.

    Xen 0,4mm hai mep - dung hai mep gap nhau khi cuon quanh lon, sat do con
    duong danh dau cho cat.
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
        o.x0 + xen, o.y0, o.x0 + NHAN_RONG_MM * MM - xen, o.y0 + NHAN_CAO_MM * MM
    )
    pix = page.get_pixmap(dpi=dpi, clip=khung)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def bo_duong_dieline(nhan_rgb, so_lan=28):
    """
    Xoa may duong dut mau hong danh dau cho cat va cho gap.

    Chung nam DE TREN hinh ve chu khong phai mot lop rieng (file khong co lop
    nao) nen khong tat di duoc luc ket xuat. De lai thi lon co mot vach hong
    chay ngang.

    Nhan theo SAC MAU chu khong theo khoang cach mau: men duong dut da qua khu
    rang cua nen nhat dan, va chinh may diem nhat ay moi la thu con sot lai.
    Do cao han luc, xanh lam cung cao han luc - vo lon that khong co mau nao
    nhu vay.
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


def dung_lon(nhan_rgb):
    """
    Cuon o nhan quanh hinh tru roi chup ngang.

    Diem o vi tri ngang s tren bong lon nam tren phan mat nghieng mot goc
    beta = asin(s). Nhan la mot vong 360 do nen cot can lay la
    ((beta/2pi) + 0,5) mod 1 - cong 0,5 de goc 0 roi vao GIUA o nhan, tuc mat
    truoc cua lon.

    LAY TRUNG BINH CA KHOANG GOC MA MOT DIEM ANH CHE, khong cham mot diem.
    Cang ra men lon be mat cang nghieng: mot cot diem anh sat men gom toi gan
    mot phan tu vong nhan, tuc hang tram cot anh goc. Cham mot diem thi moi
    hang trung mot cho khac nhau, ra vet soc doc lem nhem.

    Lam bang bang cong don theo chieu ngang nen khoang rong mot cot hay tam
    tram cot cung chi hai phep tru.
    """
    Hn, Wn = nhan_rgb.shape[:2]

    # Ep nhan ve dung so hang no chiem tren lon, mot lan bang LANCZOS.
    so_hang = max(2, int(round(NHAN_CAO_MM * PX_MM)))
    nhan = np.asarray(
        Image.fromarray(nhan_rgb).resize((Wn, so_hang), Image.Resampling.LANCZOS),
        dtype=np.float64,
    )
    cong_don = np.zeros((so_hang, Wn + 1, 3))
    np.cumsum(nhan, axis=1, out=cong_don[:, 1:, :])

    y_mm = (np.arange(CAO_PX) + 0.5) / CAO_PX * CAO_MM
    r_px = (ban_kinh(y_mm) * PX_MM)[:, None]
    x = ((np.arange(RONG_PX) + 0.5) - RONG_PX / 2.0)[None, :]

    # Hai men goc cua tung diem anh, khong phai tam diem anh.
    s_giua = np.clip(x / r_px, -1.0, 1.0)
    b_trai = np.arcsin(np.clip((x - 0.5) / r_px, -1.0, 1.0))
    b_phai = np.arcsin(np.clip((x + 0.5) / r_px, -1.0, 1.0))
    beta = np.arcsin(s_giua)

    u_trai = (((b_trai / (2 * math.pi)) + 0.5) % 1.0) * Wn
    rong = (b_phai - b_trai) / (2 * math.pi) * Wn
    i0 = np.clip(np.floor(u_trai).astype(np.int64), 0, Wn)
    i1 = np.maximum(np.ceil(u_trai + rong).astype(np.int64), i0 + 1)

    hang = np.clip(
        (y_mm - NHAN_DAU_MM) / NHAN_CAO_MM * (so_hang - 1), 0, so_hang - 1
    ).astype(np.int64)[:, None]
    hang = np.broadcast_to(hang, i0.shape)

    vong = i1 > Wn
    i1_kep = np.where(vong, Wn, i1)
    i1_du = np.where(vong, i1 - Wn, 0)
    tong = cong_don[hang, i1_kep] - cong_don[hang, i0]
    tong = tong + np.where(
        vong[..., None], cong_don[hang, i1_du] - cong_don[hang, 0], 0.0
    )
    mau = tong / ((i1_kep - i0) + i1_du)[..., None]

    co_nhan = (y_mm >= NHAN_DAU_MM) & (y_mm <= NHAN_CUOI_MM)
    mau = np.where(co_nhan[:, None, None], mau, NHOM)

    sang = (do_sang(beta) * sang_dau_lon(y_mm)[:, None])[:, :, None]
    rgb = np.clip(mau * sang, 0, 255)

    # Vien lon: tinh do phu thang, khong lay mau day them - min tuyet doi ke ca
    # o cho ban kinh doi dot ngot (ranh mieng, vanh day).
    alpha = np.clip(r_px - np.abs(x) + 0.5, 0.0, 1.0) * 255.0

    ra = np.zeros((CAO_PX, RONG_PX, 4), dtype=np.uint8)
    ra[..., :3] = np.round(rgb).astype(np.uint8)
    ra[..., 3] = np.round(alpha).astype(np.uint8)
    return Image.fromarray(ra, "RGBA")


def main():
    thu_muc = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\khoahd\Downloads\vỏ"
    goc = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ra_thu_muc = os.path.join(goc, "public")

    tep = [f for f in sorted(os.listdir(thu_muc)) if f.lower().endswith(".pdf")]
    if not tep:
        raise SystemExit(f"Khong co file PDF nao trong {thu_muc}")

    for f in tep:
        ma = next((v for k, v in TEN_FILE.items() if f.startswith(k)), None)
        if not ma:
            print(f"BO QUA {f}: khong doan duoc la loai bia nao")
            continue
        nhan = bo_duong_dieline(np.asarray(cat_nhan(os.path.join(thu_muc, f))))
        im = dung_lon(nhan)
        """
        GHI RA WEBP, KHONG GHI PNG.

        Cung mot tam anh: PNG 833KB, WebP chat luong 92 chi 200KB - va dat canh
        nhau thi khong nhin ra khac biet. Ba lon vi vay chi ton 600KB thay vi
        2,5MB.

        Dang gia vi man hinh dang nhap tai ca ba lon truoc khi ai kip bam gi.
        Trinh duyet nao khong doc duoc WebP thi rieng lon do quay ve hinh ve
        SVG - xem `anhHong` trong ManHinhDangNhap.tsx.
        """
        im.save(os.path.join(ra_thu_muc, f"lon-{ma}.webp"), quality=92, method=6)
        print(f"{f}\n   -> public/lon-{ma}.webp  {im.size[0]} x {im.size[1]}")


if __name__ == "__main__":
    main()
