import { useEffect, useRef } from "react";
import type { BangChieu } from "../lib/lonXoay";
import { bangChieu, bangRong } from "../lib/lonXoay";

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
/** Một vòng quay khi đổi loại, mili giây. */
const THOI_GIAN_QUAY = 1150;
/** Chu kỳ lắc qua lại lúc đứng yên, mili giây. */
const CHU_KY_LAC = 9000;
/** Biên độ lắc, radian. Khoảng 23 độ mỗi bên. */
const BIEN_LAC = 0.4;

/** Bán kính làm mờ dọc, tính bằng hàng. Xem `diemMo`. */
const BAN_KINH_MO = 6;
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
   * Bản đã làm mờ THEO CHIỀU DỌC, dùng riêng cho dải nối hai ảnh.
   *
   * Ở đó dăm cột ảnh phải trải kín mấy chục cột màn hình. Kéo giãn ngang thì
   * màu của mỗi hàng bị bôi dài ra, mà hàng nào cũng khác hàng nào, nên hiện
   * lên thành một mớ vạch ngang chồng chất — đúng cái dải nhoè nhìn thấy giữa
   * thân lon. Làm mờ dọc trước rồi mới kéo giãn thì dải ấy thành một mảng màu
   * chuyển mượt, đọc ra như phần vỏ đang cong khuất đi.
   */
  diemMo: Uint8ClampedArray;
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
    if (trai[y] >= 0) {
      tam[y] = (trai[y] + phai[y] + 1) / 2;
      ban[y] = (phai[y] + 1 - trai[y]) / 2;
    }
  }
  // Làm mờ dọc: chỉ chạy một lần cho mỗi mặt lon.
  const diemMo = new Uint8ClampedArray(diem.length);
  for (let x = 0; x < KHUNG_W; x++) {
    for (let y = 0; y < KHUNG_H; y++) {
      let r = 0;
      let g2 = 0;
      let b = 0;
      let n = 0;
      const dau = Math.max(0, y - BAN_KINH_MO);
      const cuoi = Math.min(KHUNG_H - 1, y + BAN_KINH_MO);
      for (let k = dau; k <= cuoi; k++) {
        const i = (k * KHUNG_W + x) * 4;
        if (diem[i + 3] < 8) continue;
        r += diem[i];
        g2 += diem[i + 1];
        b += diem[i + 2];
        n++;
      }
      const d = (y * KHUNG_W + x) * 4;
      if (n) {
        diemMo[d] = r / n;
        diemMo[d + 1] = g2 / n;
        diemMo[d + 2] = b / n;
      }
      diemMo[d + 3] = diem[d + 3];
    }
  }

  return { diem, diemMo, trai, phai, tam, ban };
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
  mo: number,
  ra: Float32Array,
): number {
  // Chỉ đụng tới bản đã làm mờ khi thật sự cần: đó là một mảng gần một megabyte
  // nữa, đọc vào cả lúc không dùng là thừa mà còn đẩy bộ nhớ đệm.
  const diem = m.diem;
  const diemMo = mo > 0 ? m.diemMo : m.diem;
  const ro = 1 - mo;
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
      ra[0] += (diem[i] * ro + diemMo[i] * mo) * a;
      ra[1] += (diem[i + 1] * ro + diemMo[i + 1] * mo) * a;
      ra[2] += (diem[i + 2] * ro + diemMo[i + 2] * mo) * a;
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
      ra[0] += (diem[i] * ro + diemMo[i] * mo) * a;
      ra[1] += (diem[i + 1] * ro + diemMo[i + 1] * mo) * a;
      ra[2] += (diem[i + 2] * ro + diemMo[i + 2] * mo) * a;
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

      // Mức chuyển sang bản làm mờ dọc: 0 là dùng ảnh gốc, 1 là mờ hẳn.
      const mo =
        doNen >= NGUONG_GIAN ? 0 : (NGUONG_GIAN - doNen) / NGUONG_GIAN;

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
        if (tong <= 0) continue;
        const f = heSoNhan[i] / tong;
        out[d] = (truoc.diem[ia] * aa + truoc.diem[ib] * ab) * f;
        out[d + 1] = (truoc.diem[ia + 1] * aa + truoc.diem[ib + 1] * ab) * f;
        out[d + 2] = (truoc.diem[ia + 2] * aa + truoc.diem[ib + 2] * ab) * f;
        out[d + 3] = tong * phu * 255;
        continue;
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
        if (tong <= 0) continue;
        const f = heSoSau[i] / tong;
        out[d] = (sau.diem[ia] * aa + sau.diem[ib] * ab) * f;
        out[d + 1] = (sau.diem[ia + 1] * aa + sau.diem[ib + 1] * ab) * f;
        out[d + 2] = (sau.diem[ia + 2] * aa + sau.diem[ib + 2] * ab) * f;
        out[d + 3] = tong * phu * 255;
        continue;
      }

      let aTruoc = 0;
      if (w < 1) {
        aTruoc = layCot(truoc, y, cx + r * u[i], doNen, mo, mauTruoc);
      }
      let aSau = 0;
      if (w > 0 && coSau) {
        // Ảnh mặt sau là lon đã quay nửa vòng, nên đổi dấu vị trí ngang.
        aSau = layCot(sau, y, cxS - rS * u[i], doNen, mo, mauSau);
      }

      const gop = aTruoc * (1 - w) + aSau * w;
      if (gop <= 0) continue;
      const fT = heSoNhan[i] * aTruoc * (1 - w);
      const fS = heSoSau[i] * aSau * w;
      out[d] = (mauTruoc[0] * fT + mauSau[0] * fS) / gop;
      out[d + 1] = (mauTruoc[1] * fT + mauSau[1] * fS) / gop;
      out[d + 2] = (mauTruoc[2] * fT + mauSau[2] * fS) / gop;
      out[d + 3] = gop * phu * 255;
    }
  }
}

/** Vào nhanh ra chậm, để cú quay có đà chứ không đều đều như máy. */
const muot = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

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
      const q = quayRef.current;
      if (q) {
        const p = Math.min(1, (moc - q.tu) / THOI_GIAN_QUAY);
        phi += 2 * Math.PI * muot(p);
        // Quá nửa vòng là màn hình toàn mặt sau — thay ảnh ở đây thì không còn
        // tí nhãn trước nào để mà thấy nhảy.
        if (!q.da && p >= 0.5) {
          hienRef.current = dichRef.current;
          q.da = true;
        }
        if (p >= 1) quayRef.current = null;
      }

      const kho = khoRef.current[hienRef.current];
      if (!kho) return;
      veLon(kho, phi, bang, dem);
      ctx.putImageData(dem, 0, 0);
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
