# -*- coding: utf-8 -*-
"""
CHUAN HOA BA ANH CHUP LON BIA CHO MAN HINH DANG NHAP

Nhan anh chup lon that cua bo phan roi lam ba viec: tach nen trang, sua may cho
lech, va ghi ra dung ten tep ma app doc.

VI SAO PHAI CO SCRIPT NAY chu khong chep tay ba tam anh vao `public/`:

  · Anh bo phan gui ra NEN TRANG DAC (255,255,255), khong phai nen trong. Tha
    thang vao man hinh dang nhap thi lon hien ra trong mot khoi chu nhat trang
    tren nen toi.
  · Ba tam khong cung ti le. Lon 330ml that rong 66,3mm tren 115,2mm cao, tuc
    0,576; nhung tam "bia ale" lai la 0,843 - bi nen det theo chieu doc. Ba lon
    dung canh nhau ma mot cai lun hon la thay ngay.
  · Mot tam bi LAT GUONG, chu doc nguoc. Xem `CAN_LAT` ben duoi.

Chay:
    python scripts/chuan-hoa-anh-lon.py "C:\\Users\\khoahd\\Downloads\\vo"

Can: python -m pip install numpy pillow
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

# Ten tep anh -> ma loai bia trong app.
TEN_TEP = {
    "bia vang": "cau-vang",          # Cau Vang - Golden Bridge Helles Lager
    "bia ale": "lau-dai-mat-trang",  # Lau Dai Mat Trang - Lunar Castle Dry Hop
    "bia den": "suc-manh-atlas",     # Suc Manh Atlas - Atlas Wings Dark Lager
}

"""
NHUNG TAM BI LAT GUONG, PHAI LAT LAI.

Tam "bia den" gui sang co chu doc nguoc: KRAFTBEER thanh REEBTFARK, SUC MANH
ATLAS cung nguoc. Anh xuat tu file dung bao bi doi khi bi lat, nhin luot khong
thay nhung len man hinh thi lo ngay.

DE O DAY MOT DANH SACH RO RANG chu khong doan tu dong: khong co cach nao doc
duoc chu tren anh de biet no xuoi hay nguoc. Neu bo phan gui lai ban da sua thi
BO TEN AY KHOI DANH SACH, khong thi lat hai lan lai thanh nguoc.

Chay xong script in ra loi nhac - nhin ba tam anh ra mot luot truoc khi day len.
"""
CAN_LAT = {"bia den"}

# Ti le lon 330ml that: rong 66,3mm tren 115,2mm cao.
TI_LE_LON = 66.3 / 115.2
# Chieu cao anh ra. Lon tren man hinh cao chung 500px nen 1040 la du net gap doi.
CAO_RA = 1040

"""
NGUONG COI LA NEN.

Anh bo phan gui ra co nen TRANG TINH: do mot dai ba diem anh quanh mep thi ca
ba tam deu dung 255 o moi kenh. Nen bat ky diem nao KHONG trang tinh deu thuoc
cai lon, ke ca vet sang gan trang o hai men.

Ban truoc lay nguong 246 va da cat an vao than lon Lau Dai Mat Trang: than no
trang, hai men lai co vet sang gan trang tinh nen bi coi la nen. Moi hang cat
lech mot ti - ra cai vien rang cua chay doc ma Khoa nhin thay.
"""
NGUONG_NEN = 255

"""
SO HANG LAY TRUNG VI DE LAM TRON BONG LON.

Du da lay nguong dung, men lon van xe dich vai diem anh giua cac hang: anh chup
co hat nuoc dong, co vet sang, va vien anh thi da qua khu rang cua. De nguyen
thi bong lon lom nhom.

Lay TRUNG VI cua men tren mot cua so hang chu khong lay min/max: min/max se phinh
bong lon ra ngoai o cho co, con trung vi thi bo hat nhieu ma van bam theo duong
cong that cua co va day lon.
"""
CUA_SO_LAM_TRON = 9


def _lam_tron(men, hop_le):
    """Lấy trung vị của mép trên một cửa sổ hàng, bỏ qua hàng trống."""
    ra = men.copy()
    nua = CUA_SO_LAM_TRON // 2
    for y in np.flatnonzero(hop_le):
        d = max(0, y - nua)
        c = min(len(men), y + nua + 1)
        lan_can = men[d:c][hop_le[d:c]]
        if lan_can.size:
            ra[y] = int(np.median(lan_can))
    return ra


def tach_nen(im):
    """
    Tach nen trang bang TINH LOI THEO TUNG HANG, khong loang tu mep vao.

    Cach loang tu mep hong o dung lon Lau Dai Mat Trang: than no gan nhu trang
    toan bo, va men trai cua no la mot vet sang gan nhu trang tinh - nen vet
    loang chui thang qua do vao trong ruot lon, an mat mot mang.

    Than lon la HINH TRU: nhin ngang thi moi hang ngang cua no la MOT DOAN
    LIEN, khong dut quang. Nen chi can tim diem khong-phai-nen dau tien va cuoi
    cung tren hang do, roi lay tron doan giua. Mang trang nam giua hai men tu
    dong duoc giu, du no trang bang dung nen.

    Doi lai phai chac chan lon dung THANG va khong bi vat gi che ngang. Ba tam
    anh cua bo phan deu vay.
    """
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    # Nen la trang tinh, nen bat ky diem nao khong trang tinh deu thuoc lon.
    dam = a.min(axis=2) < NGUONG_NEN

    cao, rong = dam.shape
    trai = np.zeros(cao, dtype=np.int32)
    phai = np.zeros(cao, dtype=np.int32)
    hop_le = np.zeros(cao, dtype=bool)
    for y in range(cao):
        cot = np.flatnonzero(dam[y])
        if cot.size == 0:
            continue
        trai[y] = cot[0]
        phai[y] = cot[-1]
        hop_le[y] = True

    trai = _lam_tron(trai, hop_le)
    phai = _lam_tron(phai, hop_le)

    mask = np.zeros(dam.shape, dtype=bool)
    for y in np.flatnonzero(hop_le):
        mask[y, trai[y] : phai[y] + 1] = True

    ra = np.asarray(im.convert("RGBA"))
    kq = np.dstack([ra[..., :3], np.where(mask, 255, 0).astype(np.uint8)])
    im2 = Image.fromarray(kq, "RGBA")

    """
    LAM MEM VIEN MOT DIEM ANH.

    Tach nen theo nguong cho ra vien rang cua: moi diem hoac duc han hoac trong
    han. Lam mo rieng kenh alpha mot chut roi ep lai thi vien min, ma phan ruot
    lon khong bi anh huong.
    """
    im2.putalpha(im2.split()[3].filter(ImageFilter.GaussianBlur(0.7)))
    return im2


def cat_sat_vien(im):
    """Cắt sát viền lon theo alpha, bỏ phần nền thừa quanh ảnh."""
    hop = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(hop) if hop else im


# Lech duoi muc nay thi de nguyen, khong ep ti le.
SAI_SO_TI_LE = 0.08


def sua_ti_le(im):
    """
    Ep ve dung ti le lon 330ml that, NHUNG CHI KHI LECH NHIEU.

    Do sau khi da cat sat vien, khong do tren ca tam anh: tam "bia ale" co le
    trang hai ben nen do ca tam ra 0,843, keo len la lon bi giat cao mot cach
    vo co. Cat sat vien roi thi no la 0,603 - lech 4,7% so voi 0,576, do la vi
    anh goc bi cat sat mep tren va mep duoi, mat vai diem anh cua vanh mieng va
    vanh day.

    Vai phan tram thi de nguyen. Ep lai chi de bat truong hop anh bi nen det
    han, chu khong phai de got tung phan tram - got thi net chu bi keo ra ma
    chang ai thay lon dep hon.
    """
    cao = round(im.width / TI_LE_LON)
    if abs(cao - im.height) <= im.height * SAI_SO_TI_LE:
        return im, False
    return im.resize((im.width, cao), Image.Resampling.LANCZOS), True


def main():
    thu_muc = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\khoahd\Downloads\anh-lon"
    goc = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ra_thu_muc = os.path.join(goc, "public")

    if not os.path.isdir(thu_muc):
        raise SystemExit(f"Khong co thu muc {thu_muc}")

    xong = 0
    for f in sorted(os.listdir(thu_muc)):
        ten, duoi = os.path.splitext(f)
        if duoi.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue
        ma = TEN_TEP.get(ten.strip().lower())
        if not ma:
            print(f"BO QUA {f}: chua biet la loai bia nao, xem TEN_TEP")
            continue

        im = Image.open(os.path.join(thu_muc, f))
        lat = ten.strip().lower() in CAN_LAT
        if lat:
            im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

        im = cat_sat_vien(tach_nen(im))
        im, da_sua = sua_ti_le(im)
        rong = round(CAO_RA * im.width / im.height)
        im = im.resize((rong, CAO_RA), Image.Resampling.LANCZOS)

        # WebP: cung mot tam thi PNG nang gap bon, ma nhin khong ra khac biet.
        im.save(os.path.join(ra_thu_muc, f"lon-{ma}.webp"), quality=92, method=6)
        ghi_chu = []
        if lat:
            ghi_chu.append("da lat guong")
        if da_sua:
            ghi_chu.append("da sua ti le")
        print(
            f"{f}\n   -> public/lon-{ma}.webp  {rong} x {CAO_RA}"
            + (f"  ({', '.join(ghi_chu)})" if ghi_chu else "")
        )
        xong += 1

    if xong:
        print(
            f"\nXong {xong} tam. NHIN LAI MOT LUOT truoc khi day len: chu tren lon"
            " phai doc xuoi, va quanh lon khong duoc con vien trang."
        )


if __name__ == "__main__":
    main()
