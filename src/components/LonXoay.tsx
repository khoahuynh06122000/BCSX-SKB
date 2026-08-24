import { useEffect, useRef } from "react";
import type { BangChieu } from "../lib/lonXoay";
import { TRAN_NEN, bangChieu, bangRong } from "../lib/lonXoay";

/**
 * LON BIA XOAY 3D
 *
 * Vẽ lại ảnh chụp phẳng của lon lên canvas theo phép chiếu mặt tròn xoay, nên
 * nhãn cuộn quanh thân và nén lại ở hai mép đúng như lon thật đang xoay. Toàn
 * bộ phép tính nằm ở `src/lib/lonXoay.ts` — đọc chú thích đầu tệp đó trước.
 *
 * Mỗi loại bia cần HAI ảnh: mặt trước và mặt sau. Thiếu ảnh nào thì loại đó
 * quay về hình vẽ SVG, vì không có mặt sau thì xoay tới đâu cũng lòi ra một
 * mảng trống.
 *
 * Đổi loại bia thì lon quay TRỌN MỘT VÒNG, và ảnh được thay đúng lúc lon quay
 * được nửa vòng: lúc ấy màn hình toàn mặt sau, không còn tí nhãn trước nào,
 * nên không ai thấy ảnh nhảy.
 */

/**
 * Khung vẽ chuẩn.
 *
 * Bằng đúng cỡ ảnh nguồn (rộng hơn 300, cao gần 600). Vẽ to hơn không nét thêm
 * vì nguồn chỉ có chừng ấy chi tiết; vẽ nhỏ hơn thì vứt đi chi tiết đang có và
 * lon hiện ra nhoè — đó là lý do không rút khung xuống trên điện thoại nữa,
 * dù rút thì nhanh hơn.
 */
const KHUNG_W = 340;
const KHUNG_H = 560;
/** Số bậc của bảng tra. 1024 bậc là dưới nửa điểm ảnh, mắt không thấy bậc. */
const SO_BUC = 1024;
/** Cú xoay khi đổi loại, mili giây. */
const THOI_GIAN_QUAY = 950;
/**
 * Lon xoay đi bao nhiêu khi đổi loại, radian. Khoảng 32 độ.
 *
 * TRƯỚC ĐÂY QUAY TRỌN MỘT VÒNG, và đó là sai lầm. Quay tròn thì có lúc lon
 * nằm ngang đúng 90 độ, và khi ấy chỗ vỏ vòng ra sau — chỗ CẢ HAI ẢNH đều
 * không chụp tới — rơi vào chính giữa thân lon, nơi dễ thấy nhất. Bịa ra màu
 * gì ở đó cũng thành một vệt dọc giữa lon.
 *
 * Xoay vừa phải thì chỗ nối luôn nằm ở khoảng 85% bán kính trở ra, tức sát
 * mép, nơi nó bị nén lại còn vài điểm ảnh và tối đi — không ai nhận ra. Đổi
 * loại thì lon nghiêng đi rồi nghiêng về, ảnh tan dần sang loại mới giữa
 * chừng. Mất cú quay tròn, đổi lại không còn chỗ nào phải bịa lộ liễu.
 */
const GOC_DOI = 0.55;
/** Khoảng tan ảnh khi đổi loại, tính theo tiến trình cú xoay. */
const TAN_TU = 0.3;
const TAN_DEN = 0.7;
/** Chu kỳ lắc qua lại lúc đứng yên, mili giây. */
const CHU_KY_LAC = 9000;
/** Biên độ lắc, radian. Khoảng 23 độ mỗi bên. */
const BIEN_LAC = 0.4;

/** Bán kính làm mịn dọc dải màu hông, tính bằng hàng. */
const BAN_KINH_MO = 30;
/** Vị trí ngang lấy màu dựng hông, tính theo bán kính của hàng. */
const S_HONG = 0.88;
/**
 * Ngoài mức này của bán kính thì chuyển hẳn sang dải hông tự dựng.
 *
 * Chỉ được lấy đúng một hai điểm ảnh ngoài cùng, nơi ảnh gốc chỉ còn cái viền
 * khử răng cưa. Để rộng tay hơn thì cả một dải chục điểm sát mép bị thay bằng
 * màu tự dựng NGAY CẢ LÚC LON ĐỨNG YÊN — mà lúc ấy ảnh gốc có sẵn viền tối
 * đàng hoàng, thay vào chỉ tổ làm rìa lon bạc đi.
 *
 * Phần răng cưa của viền được xử lý chỗ khác: mép lon từng hàng đã lấy trung
 * vị chín hàng nên bóng lon là đường cong trơn.
 */
const S_VIEN = 0.985;
/**
 * Trên mức nén này cũng chuyển sang dải hông.
 *
 * Giữa lúc quay, sát mép có chỗ hàng trăm cột ảnh dồn vào một cột màn hình.
 * Lấy trung bình vài chục cột thì mỗi cột màn hình ra một kiểu, thành nhiễu.
 */
const NEN_CHUYEN_HONG = 4;
/**
 * Dải hông tự dựng được tô tối đi chừng này.
 *
 * Để đúng độ sáng thì nó thành một mảng sáng trơn nằm giữa hai vùng đầy chi
 * tiết, nhìn như nhãn bị bôi. Tối đi thì mắt đọc ra là chỗ vỏ lon cong khuất
 * đi — vốn cũng là sự thật, chỗ đó đúng là mép vỏ đang lượn ra sau.
 */
const TOI_HONG = 0.72;
/**
 * Dưới mức giãn này thì bắt đầu chuyển sang bản đã làm mờ dọc.
 *
 * Để rộng tay (0,4) thì hỏng: giữa lúc lon quay qua ngang, độ giãn ở CHÍNH
 * GIỮA thân lon cũng xuống quanh mức đó, nên cả cái nhãn bị làm mờ chứ không
 * riêng dải nối — vừa xấu vừa tốn, mỗi khung mất thêm bốn phần nghìn giây.
 * 0,15 chỉ bắt đúng chỗ vỏ lon bị chụp nghiêng gần hết cỡ.
 */
const NGUONG_GIAN = 0.15;

/** Một mặt lon đã đặt vào khung chuẩn, kèm bóng lon của từng hàng. */
interface Mat {
  diem: Uint8ClampedArray;
  /**
   * Màu HÔNG LON tự dựng, mỗi hàng ba số RGB, đã làm mịn dọc.
   *
   * Ảnh chụp chỉ có mặt trước và mặt sau; phần vỏ ở hai bên hông nằm đúng chỗ
   * ống kính nhìn nghiêng hết cỡ nên cả một vòng cung chỉ còn dăm cột ảnh —
   * kéo giãn ra là thành một mớ vạch ngang, mà chỗ nào ảnh không có dữ liệu
   * thì còn thủng lỗ, lòi cả nền ra sau.
   *
   * Nên phần hông được DỰNG chứ không cố moi từ ảnh: lấy màu ở gần mép rồi làm
   * mịn dọc, ra một dải chuyển màu êm nối liền hai nửa. Không phải nhãn thật,
   * nhưng đúng tông lon và không ai nhận ra chỗ nối — đủ cho một màn hình đăng
   * nhập.
   */
  hongTrai: Float32Array;
  hongPhai: Float32Array;
  /** Alpha ở giữa mỗi hàng, dùng làm alpha dự phòng để lon không bị thủng. */
  aGiua: Float32Array;
  trai: Int16Array;
  phai: Int16Array;
  tam: Float32Array;
  ban: Float32Array;
}

interface Kho {
  truoc: Mat;
  sau: Mat;
}

/** Vẽ ảnh vào khung chuẩn rồi đo bóng lon của từng hàng theo alpha. */
function doMat(ve: (g: CanvasRenderingContext2D) => void): Mat | null {
  const c = document.createElement("canvas");
  c.width = KHUNG_W;
  c.height = KHUNG_H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  ve(g);
  const diem = g.getImageData(0, 0, KHUNG_W, KHUNG_H).data;

  // Mép lon của TỪNG HÀNG. Đây là chỗ giữ cho dáng lon không vỡ khi xoay: lon
  // thóp ở cổ và đáy nên mỗi hàng một bán kính khác nhau.
  const trai = new Int16Array(KHUNG_H).fill(-1);
  const phai = new Int16Array(KHUNG_H).fill(-1);
  const tam = new Float32Array(KHUNG_H);
  const ban = new Float32Array(KHUNG_H);
  for (let y = 0; y < KHUNG_H; y++) {
    const dong = y * KHUNG_W;
    for (let x = 0; x < KHUNG_W; x++) {
      if (diem[(dong + x) * 4 + 3] > 24) {
        if (trai[y] < 0) trai[y] = x;
        phai[y] = x;
      }
    }
  }

  /*
   * LÀM MƯỢT MÉP LON THEO CHIỀU DỌC.
   *
   * Mép vừa đo được lấy theo alpha của ảnh gốc, mà cái viền alpha ấy lem nhem:
   * hàng này rộng hơn hàng kia một hai điểm, hoàn toàn ngẫu nhiên. Bóng lon
   * dựng theo đó thì đường viền lởm chởm như bị xé, và vì mỗi khung hình lại
   * lởm một kiểu nên lúc lon quay nhìn cứ rung rung — đúng cái "nhoè" ở hai
   * bên rìa.
   *
   * Thân lon là một đường cong trơn, nên lấy TRUNG VỊ của chín hàng quanh đó.
   * Trung vị chứ không phải trung bình: nó bỏ qua vài hàng lỗi mà không kéo
   * theo cả đoạn, nên chỗ vát ở nắp và đáy vẫn giữ đúng dáng.
   */
  const BK = 4;
  const goc = { trai: Int16Array.from(trai), phai: Int16Array.from(phai) };
  const dem: number[] = [];
  const trungVi = (nguon: Int16Array, y: number) => {
    dem.length = 0;
    for (let k = Math.max(0, y - BK); k <= Math.min(KHUNG_H - 1, y + BK); k++) {
      if (nguon[k] >= 0) dem.push(nguon[k]);
    }
    if (!dem.length) return -1;
    dem.sort((a, b) => a - b);
    return dem[dem.length >> 1];
  };
  for (let y = 0; y < KHUNG_H; y++) {
    if (goc.trai[y] < 0) continue;
    const t = trungVi(goc.trai, y);
    const p = trungVi(goc.phai, y);
    if (t < 0 || p <= t) continue;
    trai[y] = t;
    phai[y] = p;
  }

  /*
   * Rồi lấy TRUNG BÌNH của các trung vị để bóng lon nhận cả giá trị lẻ.
   *
   * Trung vị chỉ trả về số nguyên nên đường viền vẫn nhảy từng điểm một, nhìn
   * gần thấy rõ những bậc răng cưa chạy dọc rìa lon. Trung bình cho ra số lẻ,
   * và `phu` biến phần lẻ ấy thành độ đục — viền thành đường cong liền mạch.
   *
   * Chỉ dùng cho hình dáng (`tam`, `ban`); còn `trai`/`phai` giữ số nguyên vì
   * chúng dùng để kẹp toạ độ lấy màu.
   */
  for (let y = 0; y < KHUNG_H; y++) {
    if (trai[y] < 0) continue;
    let st = 0;
    let sp = 0;
    let n = 0;
    for (let k = Math.max(0, y - 3); k <= Math.min(KHUNG_H - 1, y + 3); k++) {
      if (trai[k] < 0) continue;
      st += trai[k];
      sp += phai[k];
      n++;
    }
    const t = st / n;
    const p = sp / n;
    tam[y] = (t + p + 1) / 2;
    ban[y] = (p + 1 - t) / 2;
  }
  // Dải màu hông, dựng một lần cho mỗi mặt lon.
  const thoTrai = new Float32Array(KHUNG_H * 3);
  const thoPhai = new Float32Array(KHUNG_H * 3);
  const aGiua = new Float32Array(KHUNG_H);
  for (let y = 0; y < KHUNG_H; y++) {
    if (trai[y] < 0) continue;
    const kep = (v: number) => Math.max(trai[y], Math.min(phai[y], Math.round(v)));
    const xt = kep(tam[y] - S_HONG * ban[y]);
    const xp = kep(tam[y] + S_HONG * ban[y]);
    for (let c = 0; c < 3; c++) {
      thoTrai[y * 3 + c] = diem[(y * KHUNG_W + xt) * 4 + c];
      thoPhai[y * 3 + c] = diem[(y * KHUNG_W + xp) * 4 + c];
    }
    aGiua[y] = diem[(y * KHUNG_W + kep(tam[y])) * 4 + 3] / 255;
  }

  // Làm mịn dọc: lấy nguyên thì dải hông thành sọc ngang, vì mỗi hàng một màu
  // theo chữ và hình trên nhãn.
  const minDoc = (tho: Float32Array) => {
    const ra = new Float32Array(tho.length);
    for (let y = 0; y < KHUNG_H; y++) {
      const dau = Math.max(0, y - BAN_KINH_MO);
      const cuoi = Math.min(KHUNG_H - 1, y + BAN_KINH_MO);
      let n = 0;
      let r = 0;
      let g2 = 0;
      let b = 0;
      for (let k = dau; k <= cuoi; k++) {
        if (trai[k] < 0) continue;
        r += tho[k * 3];
        g2 += tho[k * 3 + 1];
        b += tho[k * 3 + 2];
        n++;
      }
      if (n) {
        ra[y * 3] = r / n;
        ra[y * 3 + 1] = g2 / n;
        ra[y * 3 + 2] = b / n;
      }
    }
    return ra;
  };

  return {
    diem,
    hongTrai: minDoc(thoTrai),
    hongPhai: minDoc(thoPhai),
    aGiua,
    trai,
    phai,
    tam,
    ban,
  };
}

/** Khung bao quanh phần đục của một ảnh, theo alpha. */
function khungBao(img: HTMLImageElement): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let t = c.height;
  let d2 = -1;
  let tr = c.width;
  let ph = -1;
  for (let y = 0; y < c.height; y++) {
    const dong = y * c.width;
    for (let x = 0; x < c.width; x++) {
      if (d[(dong + x) * 4 + 3] > 24) {
        if (y < t) t = y;
        if (y > d2) d2 = y;
        if (x < tr) tr = x;
        if (x > ph) ph = x;
      }
    }
  }
  if (d2 < 0) return null;
  return { x: tr, y: t, w: ph + 1 - tr, h: d2 + 1 - t };
}

/**
 * Dựng sẵn mọi thứ cần cho một loại bia. Chạy một lần lúc hai ảnh tải xong vì
 * phải quét toàn bộ điểm ảnh vài lượt, quá nặng để chạy mỗi khung hình.
 *
 * Ảnh mặt sau được ép vào ĐÚNG khung bao của mặt trước. Hai ảnh chụp rời nhau
 * nên cỡ lon và lề chừa mỗi tấm một khác; không ép về cùng một chỗ thì lúc
 * quay qua chỗ nối, bóng lon nhảy một cái.
 */
function dungKho(anhTruoc: HTMLImageElement, anhSau: HTMLImageElement): Kho | null {
  const baoTruoc = khungBao(anhTruoc);
  const baoSau = khungBao(anhSau);
  if (!baoTruoc || !baoSau) return null;

  const ti = Math.min(KHUNG_W / baoTruoc.w, KHUNG_H / baoTruoc.h);
  const w = Math.round(baoTruoc.w * ti);
  const h = Math.round(baoTruoc.h * ti);
  const dx = Math.round((KHUNG_W - w) / 2);
  const dy = Math.round((KHUNG_H - h) / 2);

  const truoc = doMat((g) =>
    g.drawImage(anhTruoc, baoTruoc.x, baoTruoc.y, baoTruoc.w, baoTruoc.h, dx, dy, w, h),
  );
  const sau = doMat((g) =>
    g.drawImage(anhSau, baoSau.x, baoSau.y, baoSau.w, baoSau.h, dx, dy, w, h),
  );
  if (!truoc || !sau) return null;
  return { truoc, sau };
}

/**
 * Lấy màu một cột nguồn, có khử răng cưa theo độ nén.
 *
 * Chỗ nén nhiều thì một cột màn hình gánh nhiều cột ảnh; lấy đúng một cột là
 * bỏ qua phần còn lại, sinh vệt răng cưa nhấp nháy lúc lon quay. Lấy trung
 * bình đúng chừng ấy cột thì mượt. Chỗ không nén thì nội suy giữa hai cột kề
 * để khỏi bị bậc thang.
 */
function layCot(
  m: Mat,
  y: number,
  xThuc: number,
  nen: number,
  ra: Float32Array,
): number {
  const diem = m.diem;
  const dong = y * KHUNG_W;
  const mepT = m.trai[y];
  const mepP = m.phai[y];
  ra[0] = 0;
  ra[1] = 0;
  ra[2] = 0;
  let tong = 0;

  const soTia = nen < 1.5 ? 0 : Math.min(8, Math.round(nen));
  if (soTia === 0) {
    // Nội suy giữa hai cột kề.
    const san = Math.floor(xThuc);
    const le = xThuc - san;
    for (let k = 0; k < 2; k++) {
      let x = san + k;
      if (x < mepT) x = mepT;
      else if (x > mepP) x = mepP;
      const i = (dong + x) * 4;
      const a = (diem[i + 3] / 255) * (k === 0 ? 1 - le : le);
      ra[0] += diem[i] * a;
      ra[1] += diem[i + 1] * a;
      ra[2] += diem[i + 2] * a;
      tong += a;
    }
  } else {
    const dau = xThuc - (soTia - 1) / 2;
    for (let k = 0; k < soTia; k++) {
      let x = Math.round(dau + k);
      if (x < mepT) x = mepT;
      else if (x > mepP) x = mepP;
      const i = (dong + x) * 4;
      const a = diem[i + 3] / 255;
      ra[0] += diem[i] * a;
      ra[1] += diem[i + 1] * a;
      ra[2] += diem[i + 2] * a;
      tong += a;
    }
    tong /= soTia;
    if (tong > 0) {
      ra[0] /= soTia;
      ra[1] /= soTia;
      ra[2] /= soTia;
    }
  }
  if (tong > 0) {
    ra[0] /= tong;
    ra[1] /= tong;
    ra[2] /= tong;
  }
  return tong;
}

/** Vẽ một khung hình: lon đã xoay đi góc `phi`, ghi thẳng vào `ra`. */
function veLon(kho: Kho, phi: number, bang: BangChieu, ra: ImageData) {
  const { truoc, sau } = kho;
  bangChieu(phi, bang);
  const { u, hoa, nen, heSoNhan, heSoSau } = bang;
  const out = ra.data;
  out.fill(0);
  const buc = u.length - 1;
  const mauTruoc = new Float32Array(3);
  const mauSau = new Float32Array(3);

  // Bóng lon lấy theo MẶT TRƯỚC cho cả hai mặt: hai ảnh đã ép về cùng khung
  // bao nhưng vẫn lệch nhau vài điểm, mà bóng lon thì không được phép nhúc
  // nhích giữa chừng lúc quay.
  for (let y = 0; y < KHUNG_H; y++) {
    const r = truoc.ban[y];
    if (r < 1) continue;
    const cx = truoc.tam[y];
    const dong = y * KHUNG_W;
    const coSau = sau.ban[y] >= 1;
    const cxS = sau.tam[y];
    const rS = sau.ban[y];
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(KHUNG_W, Math.ceil(cx + r));

    for (let x = x0; x < x1; x++) {
      // Độ phủ của bóng lon lên cột này, để viền không bị răng cưa.
      const phu = Math.min(1, Math.min(x + 1, cx + r) - Math.max(x, cx - r));
      if (phu <= 0) continue;
      let s = (x + 0.5 - cx) / r;
      if (s < -1) s = -1;
      else if (s > 1) s = 1;
      const i = (((s + 1) / 2) * buc + 0.5) | 0;
      const w = hoa[i];
      const d = (dong + x) * 4;
      const doNen = nen[i];
      /*
       * Độ đục lấy theo HÌNH DÁNG LON, không lấy theo điểm ảnh vừa nhặt được.
       *
       * Nhặt theo điểm ảnh thì hỏng: sát mép ảnh nguồn có một viền khử răng
       * cưa nửa trong nửa đục, mà lúc lon xoay thì chính cái viền ấy bị kéo
       * vào giữa thân lon — thành ra một mảng nhìn xuyên thấy nền phía sau.
       * Điểm nào nằm trong bóng lon thì phải đục, chấm hết; `phu` lo phần rìa
       * trái phải, `aGiua` lo phần vát ở nắp và đáy.
       */
      const aVien = truoc.aGiua[y] * phu * 255;

      /*
       * Mức chuyển sang dải hông tự dựng: 0 là dùng ảnh thật, 1 là dựng hẳn.
       *
       * Ba trường hợp phải dựng, đều là chỗ ảnh chụp không còn gì để lấy:
       *   - sát mép lon, nơi chỉ còn viền khử răng cưa;
       *   - chỗ bị kéo giãn mạnh, tức dải nối hai ảnh;
       *   - chỗ bị nén mạnh, hàng trăm cột ảnh dồn vào một cột màn hình.
       */
      const xa = s < 0 ? -s : s;
      let mo = xa > S_VIEN ? (xa - S_VIEN) / (1 - S_VIEN) : 0;
      if (doNen < NGUONG_GIAN) {
        const g = (NGUONG_GIAN - doNen) / NGUONG_GIAN;
        if (g > mo) mo = g;
      } else if (doNen > NEN_CHUYEN_HONG) {
        const n2 = Math.min(
          1,
          (doNen - NEN_CHUYEN_HONG) / (TRAN_NEN - NEN_CHUYEN_HONG),
        );
        if (n2 > mo) mo = n2;
      }
      // Cả vùng vỏ đang VÒNG RA SAU cũng dùng màu hông, đậm nhất ở đúng giữa
      // rồi nhạt dần về hai đầu. Đó là dải mà cả hai ảnh đều chỉ còn vài cột
      // để mô tả cả một vòng cung, lấy ảnh thật ra chỉ được một mớ vạch ngang.
      const vong = 4 * w * (1 - w);
      if (vong > mo) mo = vong;
      if (mo > 1) mo = 1;

      if (w <= 0 && doNen < 1.5 && mo === 0) {
        // Đường đi của phần lớn điểm ảnh: nhãn thuần, không nén. Viết thẳng ra
        // đây thay vì gọi `layCot` — hơn trăm nghìn lượt gọi mỗi khung hình,
        // riêng chi phí gọi hàm đã đủ tụt mất vài khung mỗi giây.
        const xT = cx + r * u[i];
        const san = Math.floor(xT);
        const le = xT - san;
        let xa = san;
        if (xa < truoc.trai[y]) xa = truoc.trai[y];
        else if (xa > truoc.phai[y]) xa = truoc.phai[y];
        let xb = san + 1;
        if (xb < truoc.trai[y]) xb = truoc.trai[y];
        else if (xb > truoc.phai[y]) xb = truoc.phai[y];
        const ia = (dong + xa) * 4;
        const ib = (dong + xb) * 4;
        const aa = (truoc.diem[ia + 3] / 255) * (1 - le);
        const ab = (truoc.diem[ib + 3] / 255) * le;
        const tong = aa + ab;
        // Có màu thì đi lối tắt; không có thì rơi xuống nhánh chung để được
        // lấp bằng màu hông, tuyệt đối không bỏ trống.
        if (tong > 0) {
          const f = heSoNhan[i] / tong;
          out[d] = (truoc.diem[ia] * aa + truoc.diem[ib] * ab) * f;
          out[d + 1] = (truoc.diem[ia + 1] * aa + truoc.diem[ib + 1] * ab) * f;
          out[d + 2] = (truoc.diem[ia + 2] * aa + truoc.diem[ib + 2] * ab) * f;
          out[d + 3] = aVien;
          continue;
        }
      }
      if (w >= 1 && coSau && doNen < 1.5 && mo === 0) {
        // Mặt sau thuần. Giữa lúc quay thì nửa lon là mặt sau, nên nhánh này
        // cũng phải viết thẳng ra như nhánh mặt trước, không thì mất một nửa
        // số điểm ảnh vào chi phí gọi hàm.
        const xT = cxS - rS * u[i];
        const san = Math.floor(xT);
        const le = xT - san;
        let xa = san;
        if (xa < sau.trai[y]) xa = sau.trai[y];
        else if (xa > sau.phai[y]) xa = sau.phai[y];
        let xb = san + 1;
        if (xb < sau.trai[y]) xb = sau.trai[y];
        else if (xb > sau.phai[y]) xb = sau.phai[y];
        const ia = (dong + xa) * 4;
        const ib = (dong + xb) * 4;
        const aa = (sau.diem[ia + 3] / 255) * (1 - le);
        const ab = (sau.diem[ib + 3] / 255) * le;
        const tong = aa + ab;
        if (tong > 0) {
          const f = heSoSau[i] / tong;
          out[d] = (sau.diem[ia] * aa + sau.diem[ib] * ab) * f;
          out[d + 1] = (sau.diem[ia + 1] * aa + sau.diem[ib + 1] * ab) * f;
          out[d + 2] = (sau.diem[ia + 2] * aa + sau.diem[ib + 2] * ab) * f;
          out[d + 3] = aVien;
          continue;
        }
      }

      let aTruoc = 0;
      if (w < 1) {
        aTruoc = layCot(truoc, y, cx + r * u[i], doNen, mauTruoc);
      }
      let aSau = 0;
      if (w > 0 && coSau) {
        // Ảnh mặt sau là lon đã quay nửa vòng, nên đổi dấu vị trí ngang.
        aSau = layCot(sau, y, cxS - rS * u[i], doNen, mauSau);
      }

      // Màu hông tự dựng cho chỗ này: đi vòng qua bên nào thì lấy mép bên ấy
      // của mặt trước, nối sang mép đối diện của mặt sau.
      const benPhai = u[i] > 0;
      const hT = benPhai ? truoc.hongPhai : truoc.hongTrai;
      // Hàng nào ảnh mặt sau không có (hai tấm chụp lệch nhau vài hàng ở nắp
      // và đáy) thì vòng tiếp bằng mép đối diện của chính mặt trước, chứ
      // không lấy mảng rỗng — lấy rỗng là ra một vệt đen.
      const hS = coSau
        ? benPhai
          ? sau.hongTrai
          : sau.hongPhai
        : benPhai
          ? truoc.hongTrai
          : truoc.hongPhai;
      const q3 = y * 3;
      const sangHong =
        (heSoNhan[i] * (1 - w) + heSoSau[i] * w) * TOI_HONG;

      const gop = aTruoc * (1 - w) + aSau * w;
      // KHÔNG BAO GIỜ để trống một điểm nằm trong bóng lon. Chỗ ảnh không có
      // dữ liệu mà bỏ qua thì lòi cả nền ra sau, hiện thành vệt xé dọc thân
      // lon — đúng lỗi thấy khi lon quay. Thiếu thì lấp bằng màu hông.
      const co = gop > 0.02;
      const fT = co ? (heSoNhan[i] * aTruoc * (1 - w)) / gop : 0;
      const fS = co ? (heSoSau[i] * aSau * w) / gop : 0;
      const moHong = co ? mo : 1;
      const roHong = 1 - moHong;
      for (let cc = 0; cc < 3; cc++) {
        const that = mauTruoc[cc] * fT + mauSau[cc] * fS;
        const hong = (hT[q3 + cc] * (1 - w) + hS[q3 + cc] * w) * sangHong;
        out[d + cc] = that * roHong + hong * moHong;
      }
      out[d + 3] = aVien;
    }
  }
}

interface Props {
  /** Đường dẫn ảnh mặt trước của từng loại. */
  anh: Record<string, string>;
  /** Đường dẫn ảnh mặt sau của từng loại. */
  anhSau: Record<string, string>;
  /** Loại đang chọn. */
  loai: string;
  /** Tên loại, dùng cho trình đọc màn hình. */
  ten: Record<string, string>;
  /** Ảnh của loại này không dùng được. */
  onLoiAnh: (loai: string) => void;
}

export default function LonXoay({ anh, anhSau, loai, ten, onLoiAnh }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const khoRef = useRef<Record<string, Kho | null>>({});
  const hienRef = useRef(loai);
  const dichRef = useRef(loai);
  const quayRef = useRef<{ tu: number; da: boolean } | null>(null);
  const loiRef = useRef(onLoiAnh);
  loiRef.current = onLoiAnh;

  // Nạp cả hai ảnh của mỗi loại rồi dựng kho, mỗi loại một lần.
  useEffect(() => {
    let con = true;
    const nap = (url: string) =>
      new Promise<HTMLImageElement>((xong, hong) => {
        const img = new Image();
        img.onload = () => xong(img);
        img.onerror = hong;
        img.src = url;
      });

    Object.entries(anh).forEach(([id, urlTruoc]) => {
      const urlSau = anhSau[id];
      if (!urlSau) {
        loiRef.current(id);
        return;
      }
      Promise.all([nap(urlTruoc), nap(urlSau)])
        .then(([t, s]) => {
          if (!con) return;
          try {
            khoRef.current[id] = dungKho(t, s);
          } catch {
            // Trình duyệt chặn đọc điểm ảnh thì coi như không có ảnh và quay về
            // hình vẽ, chứ không để lon biến mất khỏi màn hình đăng nhập.
            khoRef.current[id] = null;
          }
          if (!khoRef.current[id]) loiRef.current(id);
        })
        .catch(() => {
          if (con) loiRef.current(id);
        });
    });
    return () => {
      con = false;
    };
  }, [anh, anhSau]);

  useEffect(() => {
    dichRef.current = loai;
  }, [loai]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const giam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dem = ctx.createImageData(KHUNG_W, KHUNG_H);
    const bang = bangRong(SO_BUC);
    const tam = document.createElement("canvas");
    tam.width = KHUNG_W;
    tam.height = KHUNG_H;
    const tctx = tam.getContext("2d");
    if (!tctx) return;
    let id = 0;
    let batDau = -1;

    const khung = (moc: number) => {
      id = requestAnimationFrame(khung);
      // Mốc đầu tiên làm gốc cho nhịp lắc. Dùng -1 làm dấu chưa đặt vì mốc
      // thời gian có thể đúng bằng 0 ở khung hình đầu.
      if (batDau < 0) batDau = moc;
      // Tab bị ẩn thì thôi vẽ, quay ở chỗ không ai nhìn chỉ tốn pin.
      if (document.hidden) return;

      if (dichRef.current !== hienRef.current && !quayRef.current) {
        if (giam) hienRef.current = dichRef.current;
        else quayRef.current = { tu: moc, da: false };
      }

      let phi = giam
        ? 0
        : BIEN_LAC * Math.sin((2 * Math.PI * (moc - batDau)) / CHU_KY_LAC);
      let pha = 0;
      const q = quayRef.current;
      if (q) {
        const p = Math.min(1, (moc - q.tu) / THOI_GIAN_QUAY);
        // Nghiêng đi rồi nghiêng về, không quay tròn. Xem chú thích GOC_DOI.
        phi += GOC_DOI * Math.sin(Math.PI * p);
        pha = Math.min(1, Math.max(0, (p - TAN_TU) / (TAN_DEN - TAN_TU)));
        if (p >= 1) {
          hienRef.current = dichRef.current;
          quayRef.current = null;
          pha = 0;
        }
      }

      const kho = khoRef.current[hienRef.current];
      if (!kho) return;
      const khoMoi = pha > 0 ? khoRef.current[dichRef.current] : null;
      if (!khoMoi) {
        veLon(kho, phi, bang, dem);
        ctx.putImageData(dem, 0, 0);
        return;
      }
      // Đang đổi loại: vẽ cả hai rồi chồng lên nhau. putImageData không nghe
      // globalAlpha nên phải mượn một canvas tạm rồi drawImage.
      veLon(khoMoi, phi, bang, dem);
      ctx.putImageData(dem, 0, 0);
      veLon(kho, phi, bang, dem);
      tctx.putImageData(dem, 0, 0);
      ctx.globalAlpha = 1 - pha;
      ctx.drawImage(tam, 0, 0);
      ctx.globalAlpha = 1;
    };

    id = requestAnimationFrame(khung);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={KHUNG_W}
      height={KHUNG_H}
      role="img"
      aria-label={`Lon ${ten[loai] ?? ""}`}
      className="h-full w-full"
      style={{
        objectFit: "contain",
        filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))",
      }}
    />
  );
}
