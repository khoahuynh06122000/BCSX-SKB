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

"""
MOC CAO DO CUA CAC PHAN TREN LON, tinh tu dinh xuong (mm).

Ban truoc chi co "nhan" va "nhom tron", nen hai dau lon ra hai khoi xam det -
Khoa noi dung: chang giong lon bia gi ca. Lon that co nhung chi tiet rat nho
nhung mat nhan ra ngay: mep mieng toi, ngay duoi la vanh sang loang, roi mot
ranh toi ngan cach vanh voi co lon; duoi day cung vay, mot ranh toi, mot vanh
sang, roi day lom vao va toi han.

May dai nay chi day vai milimet nhung chinh chung lam cho khoi kim loai doc ra
la mot cai lon chu khong phai mot ong tru.
"""
MEP_MIENG_MM = 0.9      # mep tren cung, nhin nghieng thay toi
VANH_TREN_MM = 2.1      # vanh mieng sang loang
RANH_TREN_MM = 2.7      # ranh toi duoi vanh
NHAN_DINH_MM = 2.7      # nhan bat dau ngay duoi ranh
NHAN_CUOI_MM = NHAN_DINH_MM + NHAN_CAO_MM   # 109,7
RANH_DUOI_MM = NHAN_CUOI_MM + 1.1           # ranh toi cuoi than
VANH_DUOI_MM = RANH_DUOI_MM + 1.6           # vanh day sang
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

    # Mep mieng: vanh nhom cuon lai, nho nhat lon.
    m = y_mm < MEP_MIENG_MM
    r[m] = 25.6 + 0.5 * (y_mm[m] / MEP_MIENG_MM)

    # Vanh mieng: phinh ra mot chut roi thot lai - do la net cuon cua vanh.
    m = (y_mm >= MEP_MIENG_MM) & (y_mm < VANH_TREN_MM)
    t = (y_mm[m] - MEP_MIENG_MM) / (VANH_TREN_MM - MEP_MIENG_MM)
    r[m] = 26.1 + 0.9 * np.sin(t * math.pi)

    # Ranh duoi vanh: thot vao, cho hep nhat cua ca cai lon.
    m = (y_mm >= VANH_TREN_MM) & (y_mm < RANH_TREN_MM)
    r[m] = 25.9

    # Co lon: 17,81mm dung nhu file bao bi ghi, no dan ra bang than.
    m = (y_mm >= NHAN_DINH_MM) & (y_mm < CO_HET_MM)
    t = (y_mm[m] - NHAN_DINH_MM) / (CO_HET_MM - NHAN_DINH_MM)
    # Duong cong lom, khong phai duong thang: vai lon that phinh dan.
    r[m] = 25.9 + (BAN_KINH_MM - 25.9) * np.sqrt(t)

    # Goc duoi cua than, ngay truoc ranh day.
    m = (y_mm >= NHAN_CUOI_MM - 2.0) & (y_mm < RANH_DUOI_MM)
    t = (y_mm[m] - (NHAN_CUOI_MM - 2.0)) / (RANH_DUOI_MM - (NHAN_CUOI_MM - 2.0))
    r[m] = BAN_KINH_MM - 1.4 * t

    # Ranh day roi vanh day: cung mot net cuon nhu tren mieng, lat nguoc lai.
    m = (y_mm >= RANH_DUOI_MM) & (y_mm < VANH_DUOI_MM)
    t = (y_mm[m] - RANH_DUOI_MM) / (VANH_DUOI_MM - RANH_DUOI_MM)
    r[m] = 31.7 + 0.6 * np.sin(t * math.pi)

    # Day lon lom vao: thot rat nhanh, nen mat doc ra la mat day chu khong
    # phai lon bi cat cut.
    m = y_mm >= VANH_DUOI_MM
    t = np.clip((y_mm[m] - VANH_DUOI_MM) / (LON_CAO_MM - VANH_DUOI_MM), 0, 1)
    # Cung tron chu khong phai ham mu: ham mu cho ra day gan vuong, con day lon
    # that cuon vao theo mot cung.
    r[m] = 31.7 * (1.0 - 0.32 * (1.0 - np.sqrt(np.maximum(0.0, 1.0 - t * t))))

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

    LAY TRUNG BINH CA KHOANG GOC MA MOT DIEM ANH CHE, khong lay mau tai mot
    diem. Day la cho ban truoc lam sai va sinh ra vet nhoe o hai men.

    Cang ra men lon, be mat cang nghieng: mot cot diem anh o sat men gom toi
    gan mot phan tu vong nhan, tuc hang tram cot cua anh nhan goc. Cham mot
    diem giua khoang do thi moi hang lay trung mot cho khac nhau - ra vet soc
    doc lem nhem, dung thu Khoa goi la "nhoe". Lay day them vai mau roi trung
    binh cung khong cuu duoc: vai mau tren hang tram cot van la lay bua.

    Cach dung: tinh dung hai men goc cua tung diem anh roi lay TRUNG BINH TOAN
    BO cac cot nhan nam giua hai men do. Lam bang bang cong don theo chieu
    ngang nen du khoang rong bao nhieu cung chi hai phep tru - khong ton them
    gi so voi cham mot diem.
    """
    Hn, Wn = nhan_rgb.shape[:2]

    # ---- 1. Ep anh nhan ve dung so hang no chiem tren lon ----
    # Lam mot lan bang LANCZOS, thay vi lay bua mot hang cho moi hang man hinh.
    so_hang_nhan = max(2, int(round(NHAN_CAO_MM * PX_MM)))
    nhan_hang = np.asarray(
        Image.fromarray(nhan_rgb).resize(
            (Wn, so_hang_nhan), Image.Resampling.LANCZOS
        ),
        dtype=np.float64,
    )

    # ---- 2. Bang cong don theo chieu ngang, de trung binh mot khoang bat ky ----
    cong_don = np.zeros((so_hang_nhan, Wn + 1, 3), dtype=np.float64)
    np.cumsum(nhan_hang, axis=1, out=cong_don[:, 1:, :])
    tong_hang = cong_don[:, -1, :]          # tong ca vong nhan, cho luc vong qua men

    # ---- 3. Luoi diem anh dau ra ----
    y_mm = (np.arange(CAO_PX) + 0.5) / CAO_PX * LON_CAO_MM
    r_px = (ban_kinh_theo_hang(y_mm) * PX_MM)[:, None]

    x = (np.arange(RONG_PX) + 0.5) - RONG_PX / 2.0
    x = x[None, :]

    # Hai men cua tung diem anh, khong phai tam diem anh.
    s_giua = np.clip(x / r_px, -1.0, 1.0)
    s_trai = np.clip((x - 0.5) / r_px, -1.0, 1.0)
    s_phai = np.clip((x + 0.5) / r_px, -1.0, 1.0)

    beta = np.arcsin(s_giua)
    a_trai = np.arcsin(s_trai) + phi
    a_phai = np.arcsin(s_phai) + phi

    # Doi ra don vi "cot cua anh nhan".
    u_trai = (((a_trai / (2 * math.pi)) + 0.5) % 1.0) * Wn
    rong = (a_phai - a_trai) / (2 * math.pi) * Wn      # luon >= 0
    u_phai = u_trai + rong

    i0 = np.clip(np.floor(u_trai).astype(np.int64), 0, Wn)
    i1 = np.clip(np.ceil(u_phai).astype(np.int64), 0, 2 * Wn)
    # Khoang hep hon mot cot thi van phai lay tron mot cot.
    i1 = np.maximum(i1, i0 + 1)

    hang = np.clip(
        ((y_mm - NHAN_DINH_MM) / NHAN_CAO_MM * (so_hang_nhan - 1)),
        0,
        so_hang_nhan - 1,
    ).astype(np.int64)[:, None]
    hang = np.broadcast_to(hang, i0.shape)

    vong = i1 > Wn                                    # khoang vat qua men phai
    i1_kep = np.where(vong, Wn, i1)
    i1_du = np.where(vong, i1 - Wn, 0)

    tong = cong_don[hang, i1_kep] - cong_don[hang, i0]
    tong = tong + np.where(
        vong[..., None], cong_don[hang, i1_du] - cong_don[hang, 0], 0.0
    )
    dem = (i1_kep - i0) + i1_du
    mau = tong / dem[..., None]

    # ---- 4. Vanh mieng va day lon: khong co nhan, la nhom tran ----
    co_nhan = (y_mm >= NHAN_DINH_MM) & (y_mm <= NHAN_CUOI_MM)
    nhom = np.array([206, 208, 213], dtype=np.float64)
    mau = np.where(co_nhan[:, None, None], mau, nhom)

    """
    DAI TOI VA DAI SANG O HAI DAU.

    Chi doi ban kinh thoi thi hai dau van la hai khoi xam det. Lon that co mot
    mep toi o tren cung, mot vanh sang ngay duoi, mot ranh toi ngan cach vanh
    voi co - va o day thi dung nhu vay lat nguoc. May dai nay chi day vai
    milimet nhung chinh chung lam mat doc ra day la cai lon.
    """
    doc = np.ones_like(y_mm)

    m = y_mm < MEP_MIENG_MM                                   # mep mieng
    doc[m] = 0.34
    m = (y_mm >= MEP_MIENG_MM) & (y_mm < VANH_TREN_MM)        # vanh sang
    t = (y_mm[m] - MEP_MIENG_MM) / (VANH_TREN_MM - MEP_MIENG_MM)
    doc[m] = 0.62 + 0.55 * np.sin(t * math.pi)
    m = (y_mm >= VANH_TREN_MM) & (y_mm < RANH_TREN_MM)        # ranh toi
    doc[m] = 0.40

    m = (y_mm > NHAN_CUOI_MM) & (y_mm <= RANH_DUOI_MM)        # ranh toi cuoi than
    doc[m] = 0.42
    m = (y_mm > RANH_DUOI_MM) & (y_mm <= VANH_DUOI_MM)        # vanh day sang
    t = (y_mm[m] - RANH_DUOI_MM) / (VANH_DUOI_MM - RANH_DUOI_MM)
    # Bot choi so voi vanh mieng: day lon huong xuong nen it don anh sang hon.
    doc[m] = 0.50 + 0.34 * np.sin(t * math.pi)
    m = y_mm > VANH_DUOI_MM                                   # day lom, toi han
    t = np.clip((y_mm[m] - VANH_DUOI_MM) / (LON_CAO_MM - VANH_DUOI_MM), 0, 1)
    # Toi nhanh dan: mep duoi cung gan nhu chim han vao bong, nho vay lon co ve
    # dat tren mot mat phang chu khong lo lung.
    doc[m] = 0.46 - 0.36 * (t ** 0.7)

    sang = (do_sang(beta) * doc[:, None])[:, :, None]
    rgb = np.clip(mau * sang, 0, 255)

    """
    VIEN LON: do phu tinh thang, khong lay mau day them.

    Mot diem anh nam vat qua men lon thi chi phu mot phan. Tinh thang phan ay
    ra do duc thi vien min tuyet doi, ma khong phai dung anh lon gap sau lan
    roi thu nho - vua nhanh hon vua khong con vet rang cua o cho ban kinh doi
    dot ngot (ranh mieng, vanh day).
    """
    phu = np.clip(r_px - np.abs(x) + 0.5, 0.0, 1.0)
    alpha = phu * 255.0

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
