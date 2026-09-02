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
  · Lon chup ra tu tu lanh nen BAM DAY HAT NUOC. Xem `xoa_giot_nuoc`.

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

Anh gui sang co nen trang, nhung KHONG phai trang tinh tuyet doi: rai rac quanh
lon con nhung diem 249-254 - nhieu con lai cua lan tach nen truoc do. Lay nguong
255 thi may diem ay bi coi la lon va keo bong lon ra tan mep anh, co hang lech
toi 126 diem.

242 thi bo het nhieu ma van om duoc men lon, ke ca lon trang Lau Dai Mat Trang.
"""
NGUONG_NEN = 242

"""
SO HANG LAY TRUNG VI DE LAM TRON BONG LON.

Men lon xe dich vai diem anh giua cac hang: co hat nuoc dong, co vet sang, va
vien anh thi da qua khu rang cua. De nguyen thi bong lon lom nhom.

Lay TRUNG VI tren mot cua so hang chu khong lay min/max: min/max se phinh bong
lon ra o cho co, con trung vi thi bo hat nhieu ma van bam theo duong cong that.
Cua so 31 hang - hep hon (9, 15) thi con thay bac thang o men.
"""
CUA_SO_LAM_TRON = 31

"""
THU BONG LON VAO HAI DIEM ANH MOI BEN.

Anh gui sang da qua mot lan tach nen o dau do, va lan ay de lai mot vien trang
mo AN THANG VAO DIEM ANH cua men lon - khong phai o kenh trong suot ma o chinh
mau. Nen du cat dung men, van con mot vach trang manh chay doc, lo ro tren nen
toi cua man hinh dang nhap.

Vach ay khong xoa bang cach chinh do trong duoc, chi con cach thu vao. Mat hai
diem anh moi ben tren sau tram - khong ai thay lon gay di, ma vach trang thi
hong han.
"""
THU_VAO = 2

# Do mo cua vien, tinh bang diem anh. Du de het bac thang, chua du de lon bi nhoe.
MO_VIEN = 1.2


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
    dam = a.min(axis=2) < NGUONG_NEN

    cao = dam.shape[0]
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
        t = trai[y] + THU_VAO
        p = phai[y] - THU_VAO
        if p > t:
            mask[y, t : p + 1] = True

    ra = np.asarray(im.convert("RGBA"))
    kq = np.dstack([ra[..., :3], np.where(mask, 255, 0).astype(np.uint8)])
    im2 = Image.fromarray(kq, "RGBA")

    # Lam mem vien: cat theo nguong cho ra vien rang cua, moi diem hoac duc han
    # hoac trong han. Lam mo rieng kenh trong suot thi vien min ma ruot lon
    # khong bi anh huong.
    im2.putalpha(im2.split()[3].filter(ImageFilter.GaussianBlur(MO_VIEN)))
    return im2


"""
THAM SO XOA GIOT NUOC. Do bang mat tren ca ba lon, o co anh ra (cao 1040).

  CO_LOC       be rong bo loc trung vi. 7 vua trum mot giot nuoc.
  NGUONG_GIOT  lech bao nhieu so voi anh da lam min thi coi la giot.
  NGUONG_RON   vung nen phai tron hon muc nay moi dong vao.

Noi rong hon (9/6/22 hay 11/5/26) thi xoa duoc them vai giot nhung bat dau an
vao chu: "GOLDEN BRIDGE HELLES LAGER" mat net, cai quai coc bi bao mon. Chat
hon thi giot con nguyen. Ba con so nay la cho vua.
"""
CO_LOC = 7
NGUONG_GIOT = 7
NGUONG_RON = 17
BAN_KINH_RON = 6


def _do_ron(anh):
    """
    Do lech chuan cuc bo -> cho nao la nen tron, cho nao la hoa van ron.

    Tinh tren anh DA LAM MIN chu khong phai anh goc: tinh tren anh goc thi
    chinh may giot nuoc lam cho vung quanh chung "ron", va the la chung tu bao
    ve minh khoi bi xoa.
    """
    a = np.asarray(anh.convert("L")).astype(np.float64)
    tb = np.asarray(
        Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.BoxBlur(BAN_KINH_RON))
    ).astype(np.float64)
    tb2 = (
        np.asarray(
            Image.fromarray(np.clip(a * a / 255.0, 0, 255).astype(np.uint8)).filter(
                ImageFilter.BoxBlur(BAN_KINH_RON)
            )
        ).astype(np.float64)
        * 255.0
    )
    return np.sqrt(np.maximum(0.0, tb2 - tb * tb))


def xoa_giot_nuoc(im):
    """
    Xoa hat nuoc dong tren vo lon.

    Anh chup lon lay tu tu lanh nen bam day hat nuoc. Khoa thay xau, va tren
    man hinh dang nhap thi chung chi lam roi mat.

    CHI XOA O VUNG TRON, KHONG DUNG VAO HOA VAN. Do la diem then chot. Loc
    trung vi tren ca tam thi hoac giot nuoc con nguyen (loc nhe), hoac chu tren
    nhan nhoe theo (loc manh) - da thu ca hai. Nhung giot nuoc de thay nhat lai
    nam o may mang mau phang: day lon, than do, nen trang cua lon Lau Dai. O do
    xoa chung khong dung cham gi den hinh ve.

    Con giot nam de len hoa van thi de nguyen. Chung khuat trong chi tiet nen
    mat gan nhu khong nhan ra, ma go di thi lam nhoe dung cho nguoi ta nhin.

    Cach lam: cho nao lech nhieu so voi anh da lam min (do la giot) VA nen o do
    tron (do la mang mau phang) thi thay bang anh da lam min.
    """
    rgb = im.convert("RGB")
    med = rgb.filter(ImageFilter.MedianFilter(size=CO_LOC))

    a = np.asarray(rgb).astype(np.float64)
    m = np.asarray(med).astype(np.float64)

    lech = np.abs(a.mean(axis=2) - m.mean(axis=2))
    tron = _do_ron(med) < NGUONG_RON
    mask = (lech > NGUONG_GIOT) & tron

    # No vet ra mot diem de trum ca quang sang quanh giot, nhung van chi trong
    # vung tron.
    for truc, buoc in ((0, 1), (0, -1), (1, 1), (1, -1)):
        mask |= np.roll(mask, buoc, axis=truc) & tron

    kq = np.where(mask[..., None], m, a).astype(np.uint8)
    ra = Image.fromarray(kq, "RGB").convert("RGBA")
    ra.putalpha(im.split()[3])
    return ra


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
        # Xoa giot nuoc SAU khi da dua ve co cuoi: ba tham so o tren do bang
        # mat o dung co nay, doi co thi phai do lai.
        im = xoa_giot_nuoc(im)

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
