import { useEffect, useRef } from "react";
import type { BangChieu } from "../lib/lonXoay";
import { S_MEP, bangChieu, bangRong } from "../lib/lonXoay";

/**
 * LON BIA XOAY 3D
 *
 * Vẽ lại ảnh chụp phẳng của lon lên canvas theo phép chiếu mặt tròn xoay, nên
 * nhãn cuộn quanh thân và nén lại ở hai mép đúng như lon thật đang xoay. Toàn
 * bộ phép tính nằm ở `src/lib/lonXoay.ts` — đọc chú thích đầu tệp đó trước.
 *
 * Đổi loại bia thì lon quay TRỌN MỘT VÒNG, và ảnh được thay đúng lúc lon quay
 * được nửa vòng: lúc ấy cả bề mặt nhìn thấy đều là mặt sau dựng thêm, không
 * còn tí nhãn nào, nên không ai thấy ảnh nhảy.
 */

/**
 * Khung vẽ chuẩn, nhỏ lại trên máy màn hình nhỏ.
 *
 * Mỗi khung hình phải tính lại từng điểm ảnh, nên chi phí tỉ lệ thẳng với số
 * điểm. Điện thoại vốn hiện lon nhỏ hơn hẳn, vẽ ở 340×560 rồi thu lại là trả
 * tiền cho phần không ai nhìn thấy — khung nhỏ cắt được nửa số điểm.
 *
 * Chọn một lần lúc nạp mã: xoay ngang xoay dọc không đổi hạng máy, mà đổi cỡ
 * khung giữa chừng thì phải dựng lại toàn bộ kho ảnh.
 */
const MAN_NHO =
  typeof window !== "undefined" &&
  Math.min(window.innerWidth, window.innerHeight) < 700;
const KHUNG_W = MAN_NHO ? 240 : 340;
const KHUNG_H = MAN_NHO ? 396 : 560;
/** Số bậc của bảng tra. 1024 bậc là dưới nửa điểm ảnh, mắt không thấy bậc. */
const SO_BUC = 1024;
/** Bán kính làm mịn dọc dải màu mặt sau, tính bằng hàng. */
const BAN_KINH_MIN = 26;
/** Một vòng quay khi đổi loại, mili giây. */
const THOI_GIAN_QUAY = 1150;
/** Chu kỳ lắc qua lại lúc đứng yên, mili giây. */
const CHU_KY_LAC = 9000;
/** Biên độ lắc, radian. Khoảng 23 độ mỗi bên. */
const BIEN_LAC = 0.4;

interface Kho {
  /** Ảnh gốc đặt giữa khung chuẩn, chưa đụng gì tới màu. */
  diem: Uint8ClampedArray;
  /** Mép trái, mép phải, tâm và bán kính của TỪNG HÀNG. */
  trai: Int16Array;
  phai: Int16Array;
  tam: Float32Array;
  ban: Float32Array;
  /** Dải màu hai mép đã làm mịn dọc, dùng dựng mặt sau. RGBA theo hàng. */
  mepTrai: Uint8ClampedArray;
  mepPhai: Uint8ClampedArray;
}

/**
 * Dựng sẵn mọi thứ cần cho một loại bia. Chạy một lần lúc ảnh tải xong vì phải
 * quét toàn bộ điểm ảnh, đủ nặng để không được phép chạy mỗi khung hình.
 */
function dungKho(img: HTMLImageElement): Kho | null {
  const ti = Math.min(KHUNG_W / img.naturalWidth, KHUNG_H / img.naturalHeight);
  const w = Math.round(img.naturalWidth * ti);
  const h = Math.round(img.naturalHeight * ti);
  const tam = document.createElement("canvas");
  tam.width = KHUNG_W;
  tam.height = KHUNG_H;
  const g = tam.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, Math.round((KHUNG_W - w) / 2), Math.round((KHUNG_H - h) / 2), w, h);
  const diem = g.getImageData(0, 0, KHUNG_W, KHUNG_H).data;

  // Mép lon của TỪNG HÀNG, lấy theo alpha. Đây là chỗ giữ cho dáng lon không
  // vỡ khi xoay: lon thóp ở cổ và đáy nên mỗi hàng một bán kính khác nhau.
  const trai = new Int16Array(KHUNG_H).fill(-1);
  const phai = new Int16Array(KHUNG_H).fill(-1);
  const oTam = new Float32Array(KHUNG_H);
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
      oTam[y] = (trai[y] + phai[y] + 1) / 2;
      ban[y] = (phai[y] + 1 - trai[y]) / 2;
    }
  }

  // Hai dải màu dựng mặt sau.
  const thoTrai = new Uint8ClampedArray(KHUNG_H * 4);
  const thoPhai = new Uint8ClampedArray(KHUNG_H * 4);
  for (let y = 0; y < KHUNG_H; y++) {
    if (trai[y] < 0) continue;
    const kep = (x: number) => Math.max(trai[y], Math.min(phai[y], Math.round(x)));
    const xt = kep(oTam[y] - S_MEP * ban[y]);
    const xp = kep(oTam[y] + S_MEP * ban[y]);
    thoTrai.set(diem.subarray((y * KHUNG_W + xt) * 4, (y * KHUNG_W + xt) * 4 + 4), y * 4);
    thoPhai.set(diem.subarray((y * KHUNG_W + xp) * 4, (y * KHUNG_W + xp) * 4 + 4), y * 4);
  }

  // Làm mịn DỌC: lấy nguyên thì mặt sau thành sọc ngang, vì mỗi hàng một màu
  // theo chữ và hình trên nhãn. Mịn rồi thì còn lại màu nền thân lon và hai
  // vành kim loại trên dưới — đúng như mặt sau trơn của lon thật.
  const minDoc = (tho: Uint8ClampedArray) => {
    const ra = new Uint8ClampedArray(tho.length);
    for (let y = 0; y < KHUNG_H; y++) {
      let r = 0;
      let g2 = 0;
      let b = 0;
      let n = 0;
      const dau = Math.max(0, y - BAN_KINH_MIN);
      const cuoi = Math.min(KHUNG_H - 1, y + BAN_KINH_MIN);
      for (let k = dau; k <= cuoi; k++) {
        if (tho[k * 4 + 3] < 8) continue;
        r += tho[k * 4];
        g2 += tho[k * 4 + 1];
        b += tho[k * 4 + 2];
        n++;
      }
      if (n) {
        ra[y * 4] = r / n;
        ra[y * 4 + 1] = g2 / n;
        ra[y * 4 + 2] = b / n;
      }
      ra[y * 4 + 3] = tho[y * 4 + 3];
    }
    return ra;
  };

  return {
    diem,
    trai,
    phai,
    tam: oTam,
    ban,
    mepTrai: minDoc(thoTrai),
    mepPhai: minDoc(thoPhai),
  };
}

/**
 * Vẽ một khung hình: lon đã xoay đi góc `phi`, ghi thẳng vào `ra`.
 *
 * Vòng trong chạy hơn trăm nghìn lượt mỗi khung hình nên tách hẳn ba nhánh:
 * phần lớn điểm ảnh là NHÃN THUẦN, chỉ cần ba phép nhân. Gộp chung một công
 * thức cho cả ba thì mọi điểm đều phải tính thêm màu mặt sau và một phép chia,
 * đủ để tụt khung hình trên điện thoại.
 */
function veLon(kho: Kho, phi: number, bang: BangChieu, ra: ImageData) {
  const { diem, trai, phai, tam, ban, mepTrai, mepPhai } = kho;
  bangChieu(phi, bang);
  const { u, hoa, t: thamSo, heSoNhan, heSoSau } = bang;
  const out = ra.data;
  out.fill(0);
  const buc = u.length - 1;

  for (let y = 0; y < KHUNG_H; y++) {
    const r = ban[y];
    if (r < 1) continue;
    const cx = tam[y];
    const q = y * 4;
    const aPhai = mepPhai[q + 3] / 255;
    const aTrai = mepTrai[q + 3] / 255;
    const dongNguon = y * KHUNG_W;
    const mepT = trai[y];
    const mepP = phai[y];
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
      const d = (dongNguon + x) * 4;

      if (w <= 0) {
        // Nhãn thuần — đường đi của phần lớn điểm ảnh.
        let xn = ((cx + r * u[i] + 0.5) | 0) as number;
        if (xn < mepT) xn = mepT;
        else if (xn > mepP) xn = mepP;
        const n = (dongNguon + xn) * 4;
        const f = heSoNhan[i];
        out[d] = diem[n] * f;
        out[d + 1] = diem[n + 1] * f;
        out[d + 2] = diem[n + 2] * f;
        out[d + 3] = diem[n + 3] * phu;
        continue;
      }

      // Màu mặt sau, cần cho cả nhánh hoà lẫn nhánh mặt sau thuần.
      const ts = thamSo[i];
      const wTrai = aTrai * ts;
      const aSau = wTrai + aPhai * (1 - wTrai);
      const fSau = heSoSau[i];

      if (w >= 1) {
        if (aSau <= 0) continue;
        for (let c = 0; c < 3; c++) {
          out[d + c] =
            ((mepTrai[q + c] * wTrai + mepPhai[q + c] * aPhai * (1 - wTrai)) / aSau) *
            fSau;
        }
        out[d + 3] = aSau * phu * 255;
        continue;
      }

      // Dải hoà giữa nhãn và mặt sau, chỉ vài cột quanh chỗ nhãn hết.
      let xn = ((cx + r * u[i] + 0.5) | 0) as number;
      if (xn < mepT) xn = mepT;
      else if (xn > mepP) xn = mepP;
      const n = (dongNguon + xn) * 4;
      const aNhan = diem[n + 3] / 255;
      const fNhan = heSoNhan[i];
      const aGop = aNhan * (1 - w) + aSau * w;
      if (aGop <= 0) continue;
      for (let c = 0; c < 3; c++) {
        const tuNhan = diem[n + c] * fNhan * aNhan * (1 - w);
        const tuSau =
          aSau > 0
            ? (mepTrai[q + c] * wTrai + mepPhai[q + c] * aPhai * (1 - wTrai)) * fSau * w
            : 0;
        out[d + c] = (tuNhan + tuSau) / aGop;
      }
      out[d + 3] = aGop * phu * 255;
    }
  }
}

/** Vào nhanh ra chậm, để cú quay có đà chứ không đều đều như máy. */
const muot = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

interface Props {
  /** Đường dẫn ảnh của từng loại. */
  anh: Record<string, string>;
  /** Loại đang chọn. */
  loai: string;
  /** Tên loại, dùng cho trình đọc màn hình. */
  ten: Record<string, string>;
  /** Ảnh của loại này không dùng được. */
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

  // Nạp ảnh và dựng kho, mỗi loại một lần.
  useEffect(() => {
    let con = true;
    Object.entries(anh).forEach(([id, url]) => {
      const img = new Image();
      img.onload = () => {
        if (!con) return;
        try {
          khoRef.current[id] = dungKho(img);
        } catch {
          // Trình duyệt chặn đọc điểm ảnh thì coi như không có ảnh và quay về
          // hình vẽ, chứ không để lon biến mất khỏi màn hình đăng nhập.
          khoRef.current[id] = null;
        }
        if (!khoRef.current[id]) loiRef.current(id);
      };
      img.onerror = () => {
        if (con) loiRef.current(id);
      };
      img.src = url;
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
        // Quá nửa vòng là cả mặt nhìn thấy đều là mặt sau — thay ảnh ở đây thì
        // không còn tí nhãn cũ nào trên màn hình để mà thấy nhảy.
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
