import { useEffect, useRef } from "react";
import type { BangChieu } from "../lib/lonXoay";
import {
  TRAN_NEN,
  bangChieu,
  bangRong,
  doSang,
  trongSo,
  veVong,
} from "../lib/lonXoay";

/**
 * LON BIA XOAY 3D
 *
 * Trải bốn tấm ảnh chụp thật của một lon thành MỘT DẢI NHÃN 360 ĐỘ, rồi cuộn
 * dải ấy quanh hình trụ. Lon quay liên tục và mượt, mà không còn chỗ nào thiếu
 * ảnh phải bịa. Phép tính nằm ở `src/lib/lonXoay.ts` — đọc chú thích đầu tệp
 * đó trước.
 *
 * Bốn tấm chụp ở khoảng cách khác nhau nên lon to nhỏ mỗi tấm một kiểu; mỗi
 * tấm vì vậy được ép vào cùng một khung chuẩn trước khi trải.
 */

/** Khung chuẩn cho từng tấm ảnh, bằng cỡ tấm lớn nhất trong bộ. */
const KHUNG_W = 248;
const KHUNG_H = 496;
/** Lề chừa trên dưới, để lon không chạm mép khung và bóng đổ có chỗ. */
const LE_DOC = 10;
/** Khung vẽ ra màn hình. Rộng hơn khung ảnh để lon không bị cắt lúc xoay. */
const VE_W = 264;
const VE_H = 496;
/**
 * Bề rộng dải nhãn trải phẳng, tính bằng điểm ảnh cho trọn vòng.
 *
 * Chu vi lon trên màn hình khoảng 2π×110 ≈ 690 điểm, nên 720 là vừa đủ một
 * đổi một. Rộng hơn không nét thêm vì ảnh gốc chỉ có chừng ấy chi tiết.
 */
const NHAN_W = 720;
/** Số góc chụp của mỗi lon. */
const SO_GOC = 4;
/** Số bậc của bảng tra. 1024 bậc là dưới nửa điểm ảnh, mắt không thấy bậc. */
const SO_BUC = 1024;
/** Một vòng quay khi đổi loại, mili giây. */
const THOI_GIAN_QUAY = 1150;
/** Chu kỳ lắc qua lại lúc đứng yên, mili giây. */
const CHU_KY_LAC = 9000;
/** Biên độ lắc, radian. Khoảng 23 độ mỗi bên. */
const BIEN_LAC = 0.4;

interface Kho {
  /** Dải nhãn 360 độ đã trải phẳng, NHAN_W × KHUNG_H, RGBA. */
  nhan: Uint8ClampedArray;
  /** Tâm và bán kính bóng lon của từng hàng, trên khung vẽ. */
  tam: Float32Array;
  ban: Float32Array;
  /** Độ đục của từng hàng: 1 ở thân, vát dần ở nắp và đáy. */
  aHang: Float32Array;
}

/** Một mặt lon đã ép vào khung chuẩn, kèm bóng lon của từng hàng. */
interface Mat {
  diem: Uint8ClampedArray;
  trai: Int16Array;
  phai: Int16Array;
  tam: Float32Array;
  ban: Float32Array;
}

/** Khung bao quanh phần đục của một ảnh, theo alpha. */
function khungBao(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let tren = c.height;
  let duoi = -1;
  let trai = c.width;
  let phai = -1;
  for (let y = 0; y < c.height; y++) {
    const dong = y * c.width;
    for (let x = 0; x < c.width; x++) {
      if (d[(dong + x) * 4 + 3] > 24) {
        if (y < tren) tren = y;
        if (y > duoi) duoi = y;
        if (x < trai) trai = x;
        if (x > phai) phai = x;
      }
    }
  }
  if (duoi < 0) return null;
  return { x: trai, y: tren, w: phai + 1 - trai, h: duoi + 1 - tren };
}

/** Ép một tấm ảnh vào khung chuẩn rồi đo bóng lon của từng hàng. */
function doMat(img: HTMLImageElement): Mat | null {
  const bao = khungBao(img);
  if (!bao) return null;
  const c = document.createElement("canvas");
  c.width = KHUNG_W;
  c.height = KHUNG_H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  const ti = Math.min(KHUNG_W / bao.w, (KHUNG_H - 2 * LE_DOC) / bao.h);
  const w = bao.w * ti;
  const h = bao.h * ti;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, bao.x, bao.y, bao.w, bao.h, (KHUNG_W - w) / 2, (KHUNG_H - h) / 2, w, h);
  const diem = g.getImageData(0, 0, KHUNG_W, KHUNG_H).data;

  const trai = new Int16Array(KHUNG_H).fill(-1);
  const phai = new Int16Array(KHUNG_H).fill(-1);
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
   * Làm mượt mép lon theo chiều dọc.
   *
   * Mép đo theo alpha lem nhem: hàng này rộng hơn hàng kia một hai điểm, hoàn
   * toàn ngẫu nhiên. Lấy trung vị chín hàng rồi trung bình bảy hàng — trung vị
   * bỏ được hàng lỗi mà không kéo lệch cả đoạn, trung bình cho ra số lẻ để
   * bóng lon là đường cong liền chứ không nhảy từng điểm.
   */
  const dem: number[] = [];
  const trungVi = (nguon: Int16Array, y: number) => {
    dem.length = 0;
    for (let k = Math.max(0, y - 4); k <= Math.min(KHUNG_H - 1, y + 4); k++) {
      if (nguon[k] >= 0) dem.push(nguon[k]);
    }
    if (!dem.length) return -1;
    dem.sort((a, b) => a - b);
    return dem[dem.length >> 1];
  };
  const tv = { t: new Int16Array(KHUNG_H).fill(-1), p: new Int16Array(KHUNG_H).fill(-1) };
  for (let y = 0; y < KHUNG_H; y++) {
    if (trai[y] < 0) continue;
    const t = trungVi(trai, y);
    const p = trungVi(phai, y);
    if (t >= 0 && p > t) {
      tv.t[y] = t;
      tv.p[y] = p;
    }
  }
  const tam = new Float32Array(KHUNG_H);
  const ban = new Float32Array(KHUNG_H);
  for (let y = 0; y < KHUNG_H; y++) {
    if (tv.t[y] < 0) continue;
    let st = 0;
    let sp = 0;
    let n = 0;
    for (let k = Math.max(0, y - 3); k <= Math.min(KHUNG_H - 1, y + 3); k++) {
      if (tv.t[k] < 0) continue;
      st += tv.t[k];
      sp += tv.p[k];
      n++;
    }
    tam[y] = (st / n + sp / n + 1) / 2;
    ban[y] = (sp / n + 1 - st / n) / 2;
  }
  return { diem, trai: tv.t, phai: tv.p, tam, ban };
}

/**
 * Trải bốn tấm thành một dải nhãn 360 độ.
 *
 * Với mỗi vị trí trên dải, hỏi cả bốn tấm xem tấm nào nhìn thấy chỗ ấy và nhìn
 * thẳng đến đâu, rồi lấy trung bình có trọng số. Tấm nào nhìn nghiêng quá thì
 * trọng số bằng 0, không được đóng góp — đó là cách gạt bỏ đúng phần dữ liệu
 * tồi từng gây ra vệt nhoè.
 */
function traiNhan(mat: Mat[]): Uint8ClampedArray {
  const nhan = new Uint8ClampedArray(NHAN_W * KHUNG_H * 4);
  const vong = 2 * Math.PI;
  // Hệ số khử bóng tra sẵn theo góc lệch, khỏi tính lại cho từng hàng.
  const khu = new Float32Array(SO_GOC * NHAN_W);
  const viTri = new Float32Array(SO_GOC * NHAN_W);
  const nang = new Float32Array(SO_GOC * NHAN_W);
  for (let k = 0; k < SO_GOC; k++) {
    for (let u = 0; u < NHAN_W; u++) {
      const lech = veVong((u / NHAN_W) * vong - (k * vong) / SO_GOC);
      const w = trongSo(lech);
      nang[k * NHAN_W + u] = w;
      viTri[k * NHAN_W + u] = w > 0 ? Math.sin(lech) : 0;
      khu[k * NHAN_W + u] = w > 0 ? 1 / doSang(lech) : 0;
    }
  }

  for (let y = 0; y < KHUNG_H; y++) {
    for (let u = 0; u < NHAN_W; u++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let tong = 0;
      for (let k = 0; k < SO_GOC; k++) {
        const w = nang[k * NHAN_W + u];
        if (w <= 0) continue;
        const m = mat[k];
        if (m.ban[y] < 1) continue;
        let x = Math.round(m.tam[y] + m.ban[y] * viTri[k * NHAN_W + u]);
        if (x < m.trai[y]) x = m.trai[y];
        else if (x > m.phai[y]) x = m.phai[y];
        const i = (y * KHUNG_W + x) * 4;
        if (m.diem[i + 3] < 128) continue;
        const f = w * khu[k * NHAN_W + u];
        r += m.diem[i] * f;
        g += m.diem[i + 1] * f;
        b += m.diem[i + 2] * f;
        tong += w;
      }
      const d = (y * NHAN_W + u) * 4;
      if (tong > 0) {
        nhan[d] = r / tong;
        nhan[d + 1] = g / tong;
        nhan[d + 2] = b / tong;
        nhan[d + 3] = 255;
      }
    }
  }
  return nhan;
}

/** Dựng sẵn mọi thứ cần cho một loại bia, chạy một lần lúc bốn ảnh tải xong. */
function dungKho(imgs: HTMLImageElement[]): Kho | null {
  const mat: Mat[] = [];
  for (const img of imgs) {
    const m = doMat(img);
    if (!m) return null;
    mat.push(m);
  }

  /*
   * Bóng lon dùng chung cho mọi góc xoay: lấy trung bình bốn tấm.
   *
   * Lon là vật tròn xoay nên bóng của nó không đổi dù xoay thế nào. Bốn tấm đo
   * ra bốn kết quả hơi khác nhau vì chụp lệch; lấy trung bình rồi dùng cố định
   * thì lúc quay bóng lon đứng yên tuyệt đối, không nhúc nhích.
   */
  const tam = new Float32Array(KHUNG_H);
  const ban = new Float32Array(KHUNG_H);
  const aHang = new Float32Array(KHUNG_H);
  const lech = (VE_W - KHUNG_W) / 2;
  for (let y = 0; y < KHUNG_H; y++) {
    let st = 0;
    let sb = 0;
    let n = 0;
    for (const m of mat) {
      if (m.ban[y] < 1) continue;
      st += m.tam[y];
      sb += m.ban[y];
      n++;
    }
    if (!n) continue;
    tam[y] = st / n + lech;
    ban[y] = sb / n;
    // Chỉ coi là có lon khi quá nửa số tấm nhìn thấy hàng ấy.
    aHang[y] = n >= SO_GOC / 2 ? 1 : n / SO_GOC;
  }

  return { nhan: traiNhan(mat), tam, ban, aHang };
}

/** Vẽ một khung hình: lon đã xoay đi góc `phi`, ghi thẳng vào `ra`. */
function veLon(kho: Kho, phi: number, bang: BangChieu, ra: ImageData) {
  const { nhan, tam, ban, aHang } = kho;
  bangChieu(phi, bang);
  const { u, sang, nen } = bang;
  const out = ra.data;
  out.fill(0);
  const buc = u.length - 1;

  for (let y = 0; y < KHUNG_H; y++) {
    const r = ban[y];
    if (r < 1) continue;
    const cx = tam[y];
    const dongNhan = y * NHAN_W;
    const aY = aHang[y];
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(VE_W, Math.ceil(cx + r));

    for (let x = x0; x < x1; x++) {
      // Độ phủ của bóng lon lên cột này, để viền không bị răng cưa.
      const phu = Math.min(1, Math.min(x + 1, cx + r) - Math.max(x, cx - r));
      if (phu <= 0) continue;
      let s = (x + 0.5 - cx) / r;
      if (s < -1) s = -1;
      else if (s > 1) s = 1;
      const i = (((s + 1) / 2) * buc + 0.5) | 0;

      // Số điểm nhãn dồn vào cột này. Lấy trung bình đúng chừng ấy điểm thì
      // chỗ nén không sinh vệt răng cưa nhấp nháy lúc lon quay.
      let tia = Math.round((nen[i] * NHAN_W) / r);
      if (tia < 1) tia = 1;
      else if (tia > TRAN_NEN) tia = TRAN_NEN;

      const giua = u[i] * NHAN_W;
      let rr = 0;
      let gg = 0;
      let bb = 0;
      for (let t = 0; t < tia; t++) {
        let un = Math.round(giua + t - (tia - 1) / 2) % NHAN_W;
        if (un < 0) un += NHAN_W;
        const j = (dongNhan + un) * 4;
        rr += nhan[j];
        gg += nhan[j + 1];
        bb += nhan[j + 2];
      }
      const f = sang[i] / tia;
      const d = (y * VE_W + x) * 4;
      out[d] = rr * f;
      out[d + 1] = gg * f;
      out[d + 2] = bb * f;
      out[d + 3] = aY * phu * 255;
    }
  }
}

/** Vào nhanh ra chậm, để cú quay có đà chứ không đều đều như máy. */
const muot = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

interface Props {
  /** Bốn đường dẫn ảnh cho mỗi loại, theo thứ tự xoay một chiều. */
  anh: Record<string, string[]>;
  /** Loại đang chọn. */
  loai: string;
  /** Tên loại, dùng cho trình đọc màn hình. */
  ten: Record<string, string>;
  /** Loại này thiếu ảnh hoặc ảnh hỏng. */
  onLoiAnh: (loai: string) => void;
}

export default function LonXoay({ anh, loai, ten, onLoiAnh }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const khoRef = useRef<Record<string, Kho | null>>({});
  const hienRef = useRef(loai);
  const dichRef = useRef(loai);
  const quayRef = useRef<{ tu: number; da: boolean } | null>(null);
  const loiRef = useRef(onLoiAnh);
  loiRef.current = onLoiAnh;

  useEffect(() => {
    let con = true;
    const nap = (url: string) =>
      new Promise<HTMLImageElement>((xong, hong) => {
        const img = new Image();
        img.onload = () => xong(img);
        img.onerror = hong;
        img.src = url;
      });

    Object.entries(anh).forEach(([id, ds]) => {
      if (!ds || ds.length !== SO_GOC) {
        loiRef.current(id);
        return;
      }
      Promise.all(ds.map(nap))
        .then((imgs) => {
          if (!con) return;
          try {
            khoRef.current[id] = dungKho(imgs);
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
  }, [anh]);

  useEffect(() => {
    dichRef.current = loai;
  }, [loai]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const giam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dem = ctx.createImageData(VE_W, VE_H);
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
      width={VE_W}
      height={VE_H}
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
