import { useEffect, useRef } from "react";
import {
  banKinhTheoHang,
  coNhan,
  cotNhan,
  dungBangS,
  sangDauLon,
  type BangS,
} from "../lib/lonXoay";

/**
 * LON BIA XOAY 3D
 *
 * Cuộn Ô NHÃN TRẢI PHẲNG — trọn một vòng 360° quanh thân lon, cắt thẳng từ file
 * bao bì của bộ phận — quanh một hình trụ, rồi vẽ lại theo phép chiếu nhìn từ
 * chính diện. Toàn bộ phép tính nằm ở `src/lib/lonXoay.ts`, đọc chú thích đầu
 * tệp đó trước.
 *
 * Mỗi loại bia chỉ cần MỘT ảnh. Thiếu ảnh thì loại đó quay về hình vẽ SVG.
 *
 * Đổi loại bia thì lon quay TRỌN MỘT VÒNG, và nhãn được thay đúng lúc lon quay
 * được nửa vòng: lúc ấy màn hình toàn mặt sau, không còn tí nhãn trước nào, nên
 * không ai thấy ảnh nhảy.
 */

/**
 * Khung vẽ chuẩn.
 *
 * Không còn bị buộc bằng cỡ ảnh nguồn như bản cũ: nhãn 1400 cột trải cho 360°
 * nên nửa vòng trước mặt có 700 cột, thừa sức cho một lon rộng 340. Giữ 340×560
 * vì vẽ to hơn tốn thêm mà mắt không thấy khác trên màn hình đăng nhập.
 */
const KHUNG_W = 340;
const KHUNG_H = 560;
/** Số bậc của bảng tra theo s. 2048 bậc là dưới một phần tư điểm ảnh. */
const SO_BUC = 2048;
/** Một vòng quay khi đổi loại, mili giây. */
const THOI_GIAN_QUAY = 1150;
/** Chu kỳ lắc qua lại lúc đứng yên, mili giây. */
const CHU_KY_LAC = 9000;
/** Biên độ lắc, radian. Khoảng 23 độ mỗi bên. */
const BIEN_LAC = 0.4;

/** Màu nhôm trần ở vành miệng và đáy lon, nơi không có nhãn. */
const NHOM = [206, 208, 213];

/** Một ô nhãn đã dựng sẵn bảng cộng dồn để lấy trung bình một khoảng bất kỳ. */
interface Nhan {
  rong: number;
  cao: number;
  /**
   * Cộng dồn theo chiều ngang: `congDon[(y*(rong+1) + x)*3 + k]` là tổng kênh
   * `k` của các cột 0..x−1 trên hàng `y`.
   *
   * Nhờ bảng này, trung bình của một khoảng cột bất kỳ chỉ tốn hai phép trừ —
   * dù khoảng ấy rộng một cột hay tám trăm cột. Đó là thứ khiến việc lấy trung
   * bình cả khoảng góc không đắt hơn chấm một điểm.
   */
  congDon: Float32Array;
}

/**
 * Ép ô nhãn về đúng số hàng nó chiếm trên lon, rồi dựng bảng cộng dồn.
 *
 * Chạy một lần cho mỗi loại bia. Ép hàng trước để vòng vẽ khỏi phải nội suy
 * dọc từng khung hình, và để bảng cộng dồn nhỏ đi đúng bằng tỉ lệ ấy.
 */
function dungNhan(img: HTMLImageElement): Nhan | null {
  const soHang = Math.max(2, Math.round(KHUNG_H * (109.7 - 2.7) / 115.2));
  const rong = img.naturalWidth;
  if (!rong || !img.naturalHeight) return null;

  const c = document.createElement("canvas");
  c.width = rong;
  c.height = soHang;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, rong, soHang);
  const d = g.getImageData(0, 0, rong, soHang).data;

  const congDon = new Float32Array(soHang * (rong + 1) * 3);
  for (let y = 0; y < soHang; y++) {
    const goc = y * (rong + 1) * 3;
    const nguon = y * rong * 4;
    let r = 0;
    let lu = 0;
    let b = 0;
    for (let x = 0; x < rong; x++) {
      const i = nguon + x * 4;
      r += d[i];
      lu += d[i + 1];
      b += d[i + 2];
      const o = goc + (x + 1) * 3;
      congDon[o] = r;
      congDon[o + 1] = lu;
      congDon[o + 2] = b;
    }
  }
  return { rong, cao: soHang, congDon };
}

/**
 * Trung bình các cột nhãn trong khoảng [u0; u1), có vòng qua mép.
 *
 * `u0` đã đưa về [0; rong), `du` là bề rộng khoảng tính bằng cột và luôn nhỏ
 * hơn nửa vòng nhãn (một điểm ảnh không thể che quá 180°).
 */
function trungBinhKhoang(
  nhan: Nhan,
  hang: number,
  u0: number,
  du: number,
  ra: Float32Array,
): void {
  const { rong, congDon } = nhan;
  const goc = hang * (rong + 1) * 3;

  let i0 = Math.floor(u0);
  let i1 = Math.ceil(u0 + du);
  if (i1 <= i0) i1 = i0 + 1;
  if (i0 < 0) i0 = 0;

  let r = 0;
  let lu = 0;
  let b = 0;
  let dem = 0;

  if (i1 <= rong) {
    const a = goc + i0 * 3;
    const c = goc + i1 * 3;
    r = congDon[c] - congDon[a];
    lu = congDon[c + 1] - congDon[a + 1];
    b = congDon[c + 2] - congDon[a + 2];
    dem = i1 - i0;
  } else {
    // Khoảng vắt qua mép phải: cộng nốt phần đầu vòng bên kia.
    const a = goc + i0 * 3;
    const cuoi = goc + rong * 3;
    const du2 = Math.min(rong, i1 - rong);
    const c2 = goc + du2 * 3;
    r = congDon[cuoi] - congDon[a] + (congDon[c2] - congDon[goc]);
    lu = congDon[cuoi + 1] - congDon[a + 1] + (congDon[c2 + 1] - congDon[goc + 1]);
    b = congDon[cuoi + 2] - congDon[a + 2] + (congDon[c2 + 2] - congDon[goc + 2]);
    dem = rong - i0 + du2;
  }

  if (dem <= 0) dem = 1;
  ra[0] = r / dem;
  ra[1] = lu / dem;
  ra[2] = b / dem;
}

/** Vẽ một khung hình: lon đã xoay đi góc `phi`, ghi thẳng vào `ra`. */
function veLon(nhan: Nhan, phi: number, bang: BangS, ra: ImageData): void {
  const out = ra.data;
  out.fill(0);
  const mau = new Float32Array(3);
  const nuaW = KHUNG_W / 2;
  /**
   * Bán kính thân lon tính bằng điểm ảnh.
   *
   * Suy từ CHIỀU CAO khung chứ không lấy nửa bề rộng: lon 330ml thật rộng
   * 66,3mm trên 115,2mm cao, tức 0,5755. Lấy nửa bề rộng thì lon căng hết
   * khung và thành ra mập hơn lon thật, mà phần thừa hai bên cũng không còn
   * chỗ cho bóng đổ.
   */
  const banThan = (KHUNG_H * (66.3 / 115.2)) / 2;
  const buc = bang.beta.length - 1;

  for (let y = 0; y < KHUNG_H; y++) {
    const t = (y + 0.5) / KHUNG_H;
    const r = banKinhTheoHang(t) * banThan;
    if (r < 0.5) continue;

    const dauLon = sangDauLon(t);
    const laNhan = coNhan(t);
    const hangNhan = laNhan
      ? Math.min(
          nhan.cao - 1,
          Math.max(
            0,
            Math.round(((t - 2.7 / 115.2) / (107 / 115.2)) * (nhan.cao - 1)),
          ),
        )
      : 0;

    const dong = y * KHUNG_W;
    const x0 = Math.max(0, Math.floor(nuaW - r - 1));
    const x1 = Math.min(KHUNG_W - 1, Math.ceil(nuaW + r + 1));

    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - nuaW;
      /*
       * VIỀN LON: tính độ phủ thẳng, không lấy mẫu dày thêm.
       *
       * Một điểm ảnh nằm vắt qua mép lon thì chỉ phủ một phần. Tính thẳng phần
       * ấy ra độ đục thì viền mịn tuyệt đối, kể cả ở chỗ bán kính đổi đột ngột
       * (rãnh miệng, vành đáy).
       */
      const phu = r - Math.abs(dx) + 0.5;
      if (phu <= 0) continue;
      const a = phu >= 1 ? 1 : phu;

      const s = dx / r;
      const i = Math.round(((s < -1 ? -1 : s > 1 ? 1 : s) + 1) * 0.5 * buc);
      const sang = bang.sang[i] * dauLon;

      if (laNhan) {
        /*
         * Bề rộng góc mà điểm ảnh này che: một điểm ảnh rộng 1/r đơn vị s, nhân
         * đạo hàm dβ/ds. Sát mép lon con số này lên tới gần nửa radian — tức
         * hàng trăm cột nhãn dồn vào một cột màn hình.
         */
        const dGoc = bang.dGoc[i] / r;
        const gocTrai = bang.beta[i] - dGoc * 0.5 + phi;
        const u0 = cotNhan(gocTrai) * nhan.rong;
        const du = (dGoc / (2 * Math.PI)) * nhan.rong;
        trungBinhKhoang(nhan, hangNhan, u0, du, mau);
      } else {
        mau[0] = NHOM[0];
        mau[1] = NHOM[1];
        mau[2] = NHOM[2];
      }

      const o = (dong + x) * 4;
      const v0 = mau[0] * sang;
      const v1 = mau[1] * sang;
      const v2 = mau[2] * sang;
      out[o] = v0 > 255 ? 255 : v0;
      out[o + 1] = v1 > 255 ? 255 : v1;
      out[o + 2] = v2 > 255 ? 255 : v2;
      out[o + 3] = a * 255;
    }
  }
}

/** Vào nhanh ra chậm, để cú quay có đà chứ không đều đều như máy. */
const muot = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

interface Props {
  /** Đường dẫn ô nhãn trải phẳng của từng loại. */
  nhan: Record<string, string>;
  /** Loại đang chọn. */
  loai: string;
  /** Tên loại, dùng cho trình đọc màn hình. */
  ten: Record<string, string>;
  /** Nhãn của loại này không dùng được. */
  onLoiAnh: (loai: string) => void;
}

export default function LonXoay({ nhan, loai, ten, onLoiAnh }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const khoRef = useRef<Record<string, Nhan | null>>({});
  const hienRef = useRef(loai);
  const dichRef = useRef(loai);
  const quayRef = useRef<{ tu: number; da: boolean } | null>(null);
  const loiRef = useRef(onLoiAnh);
  loiRef.current = onLoiAnh;

  // Nạp ô nhãn của mỗi loại rồi dựng bảng cộng dồn, mỗi loại một lần.
  useEffect(() => {
    let con = true;
    Object.entries(nhan).forEach(([id, url]) => {
      const img = new Image();
      img.onload = () => {
        if (!con) return;
        try {
          khoRef.current[id] = dungNhan(img);
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
  }, [nhan]);

  useEffect(() => {
    dichRef.current = loai;
  }, [loai]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const giam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dem = ctx.createImageData(KHUNG_W, KHUNG_H);
    const bang = dungBangS(SO_BUC);
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
        // Quá nửa vòng là màn hình toàn mặt sau — thay nhãn ở đây thì không còn
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
