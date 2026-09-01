import { useEffect, useRef } from "react";
import {
  COS_NGHIENG,
  NHAN_CUOI,
  NHAN_DAU,
  SIN_NGHIENG,
  banKinhTheoHang,
  coNhan,
  doSang,
  dungBangS,
  napLon,
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

/**
 * MÀU KIM LOẠI TRẦN ở vành miệng và đáy lon, nơi không có nhãn.
 *
 * VÀNG CHAMPAGNE, không phải bạc. Lon Sun KraftBeer phủ một lớp sơn lót màu
 * vàng nhạt — nhìn ba tấm ảnh chụp lon thật của bộ phận thì đáy cả ba lon đều
 * ánh vàng ấm, kể cả lon trắng Lâu Đài Mặt Trăng và lon đen Sức Mạnh Atlas.
 *
 * Bản trước để màu xám bạc, nên hai đầu lon lạc hẳn tông so với nhãn.
 */
const NHOM = [222, 199, 158];

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

/**
 * KÍCH THƯỚC LON TRÊN KHUNG VẼ.
 *
 * Nhìn chếch từ trên xuống thì lon chiếm CAO HƠN chính chiều cao của nó: hai
 * đầu là hai hình bầu dục, mỗi cái thò ra thêm `bán kính × sin(góc chếch)`.
 * Không trừ phần thò ra ấy thì nắp lon bị cắt mất ở mép trên khung.
 *
 *   cao trên màn hình = cao thân × cos(chếch) + (bán kính nắp + bán kính đáy) × sin(chếch)
 */
const LE = 3;
const TI_LE_LON = 66.3 / 115.2; // rộng trên cao, lon 330ml thật
const BAN_NAP = 0.789; // bán kính vành miệng, theo phần bán kính thân
const BAN_DAY = 0.958;

/** Chiều cao thân lon tính theo trục của nó, bằng điểm ảnh. */
const CAO_THAN =
  (KHUNG_H - 2 * LE) /
  (COS_NGHIENG + ((BAN_NAP + BAN_DAY) * TI_LE_LON * SIN_NGHIENG) / 2);
/** Bán kính thân lon, bằng điểm ảnh. */
const BAN_THAN_PX = (CAO_THAN * TI_LE_LON) / 2;
/** Toạ độ màn hình của điểm trên trục lon, ngay tại mặt phẳng nắp. */
const Y_DINH = LE + BAN_NAP * BAN_THAN_PX * SIN_NGHIENG;

/** Màu nhôm của nắp lon — sáng hơn thân một chút vì nó hứng trọn ánh sáng. */
/**
 * Nắp lon: cũng vàng nhưng NHẠT HƠN THÂN.
 *
 * Nắp là một chi tiết rời, dập từ tấm nhôm khác và không phủ cùng lớp sơn với
 * thân, nên trên ảnh thật nó luôn bạc hơn — chỉ ánh vàng nhẹ chứ không vàng
 * hẳn. Cho nó vàng bằng thân thì cả cái đỉnh lon dính thành một khối.
 */
const NHOM_NAP = [219, 209, 189];

/**
 * BẢNG TÍNH SẴN CHO TỪNG ĐIỂM ẢNH CỦA KHUNG VẼ.
 *
 * Then chốt: HÌNH HỌC CỦA LON KHÔNG ĐỔI KHI LON XOAY. Điểm ảnh nào thuộc nắp,
 * điểm nào thuộc thân, ở đó bán kính bao nhiêu, mặt nghiêng góc nào, sáng tối
 * ra sao, viền đục bao nhiêu — tất cả chỉ phụ thuộc vị trí trên màn hình. Chỉ
 * mỗi việc "chỗ này đang mang phần nhãn nào" là đổi theo góc xoay.
 *
 * Nên tính hết phần không đổi MỘT LẦN. Mỗi khung hình sau đó chỉ còn cộng góc
 * xoay rồi tra nhãn: từ 18 mili giây xuống dưới 5, tức từ chỗ không kịp 60
 * khung hình mỗi giây thành thừa sức — kể cả trên điện thoại.
 *
 * Tốn chừng 4MB cho khung 340×560. Đổi 4MB lấy chuyển động mượt là đáng, và nó
 * chỉ tồn tại trong lúc màn hình đăng nhập còn mở.
 */
interface BangDiem {
  /** 0 = trống, 1 = nắp lon, 2 = thân lon. */
  loai: Uint8Array;
  /** Thân: góc mặt nghiêng so với hướng nhìn. */
  beta: Float32Array;
  /** Thân: độ sáng đã gộp cả bóng tròn xoay lẫn dải sáng hai đầu lon. */
  sang: Float32Array;
  /** Thân: bề rộng góc mà điểm ảnh này che, radian. */
  dGoc: Float32Array;
  /** Thân: hàng của ô nhãn; −1 nghĩa là nhôm trần (vành miệng, đáy). */
  hang: Int16Array;
  /** Độ đục của viền lon. */
  alpha: Uint8Array;
  /** Nắp: góc quanh tâm nắp TRÊN MÀN HÌNH; trừ đi φ ra góc trong mặt nắp. */
  goc0: Float32Array;
}

function dungBangDiem(bang: BangS, soHangNhan: number): BangDiem {
  const n = KHUNG_W * KHUNG_H;
  const ra: BangDiem = {
    loai: new Uint8Array(n),
    beta: new Float32Array(n),
    sang: new Float32Array(n),
    dGoc: new Float32Array(n),
    hang: new Int16Array(n),
    alpha: new Uint8Array(n),
    goc0: new Float32Array(n),
  };

  // Bảng phụ theo từng điểm ảnh dọc trục, chỉ dùng trong lúc dựng.
  const soDoc = Math.ceil(CAO_THAN) + 2;
  const ban = new Float32Array(soDoc);
  const sangDau = new Float32Array(soDoc);
  const hangCua = new Int16Array(soDoc);
  for (let i = 0; i < soDoc; i++) {
    const t = Math.min(1, i / CAO_THAN);
    ban[i] = banKinhTheoHang(t) * BAN_THAN_PX;
    sangDau[i] = sangDauLon(t);
    hangCua[i] = coNhan(t)
      ? Math.min(
          soHangNhan - 1,
          Math.max(
            0,
            (((t - NHAN_DAU) / (NHAN_CUOI - NHAN_DAU)) * (soHangNhan - 1) + 0.5) | 0,
          ),
        )
      : -1;
  }

  const nuaW = KHUNG_W / 2;
  const buc = bang.beta.length - 1;
  const cuoiDoc = soDoc - 1;
  const banNapPx = BAN_NAP * BAN_THAN_PX;
  const dayNap = banNapPx * SIN_NGHIENG;

  for (let y = 0; y < KHUNG_H; y++) {
    const dy = y + 0.5 - Y_DINH;
    const dong = y * KHUNG_W;
    const trongNap = dy > -dayNap && dy < dayNap;
    const vNap = trongNap ? dy / dayNap : 0;
    const nuaNap = trongNap ? banNapPx * Math.sqrt(1 - vNap * vNap) : 0;

    for (let x = 0; x < KHUNG_W; x++) {
      const dx = x + 0.5 - nuaW;
      const p = dong + x;

      /*
       * NẮP LON — hình bầu dục ở đỉnh.
       *
       * Mép dưới của hình bầu dục này CHÍNH LÀ đường vành miệng phía gần mắt,
       * nên chỗ nào nằm trong bầu dục thì thuộc nắp, chỗ nào dưới nó thì thuộc
       * thân. Không phải so sánh độ sâu gì thêm.
       */
      if (trongNap && dx > -nuaNap && dx < nuaNap) {
        const u = dx / banNapPx;
        ra.loai[p] = 1;
        ra.goc0[p] = Math.atan2(u, vNap);
        const rho = Math.sqrt(u * u + vNap * vNap);
        const a = (1 - rho) * banNapPx + 0.5;
        ra.alpha[p] = a >= 1 ? 255 : a <= 0 ? 0 : a * 255;
        continue;
      }

      /*
       * THÂN LON.
       *
       * Điểm ở góc β so với hướng nhìn, cao h trên trục, hiện ra tại
       *
       *   y = h·cos(chếch) + r·sin(chếch)·cos(β)
       *
       * cos(β) chứ không phải cos(β+φ): bóng lon là hình dáng của vật, nó
       * không đổi khi lon xoay. Lấy góc của NHÃN vào đây thì cả cái lon nghiêng
       * qua nghiêng lại theo nhịp quay — và đó cũng là lý do bảng này tính sẵn
       * được.
       *
       * Cả β lẫn r đều phụ thuộc h nên không giải thẳng ra được. Đoán h bỏ qua
       * số hạng cuối, tra bán kính, tính lại — hai lượt là đủ vì số hạng ấy nhỏ
       * hơn một phần mười chiều cao lon.
       */
      let h = dy / COS_NGHIENG;
      let r = 0;
      let s = 0;
      let i = 0;
      let ngoai = false;
      for (let lap = 0; lap < 2; lap++) {
        i = h < 0 ? 0 : h > cuoiDoc ? cuoiDoc : h | 0;
        r = ban[i];
        s = dx / r;
        if (s <= -1 || s >= 1) {
          ngoai = true;
          break;
        }
        h = (dy - r * SIN_NGHIENG * Math.sqrt(1 - s * s)) / COS_NGHIENG;
      }
      if (ngoai || h < 0 || h > CAO_THAN) continue;

      const phu = r - (dx < 0 ? -dx : dx) + 0.5;
      if (phu <= 0) continue;

      const k = ((s + 1) * 0.5 * buc + 0.5) | 0;
      ra.loai[p] = 2;
      ra.beta[p] = bang.beta[k];
      ra.sang[p] = bang.sang[k] * sangDau[i];
      ra.dGoc[p] = bang.dGoc[k] / r;
      ra.hang[p] = hangCua[i];
      ra.alpha[p] = phu >= 1 ? 255 : phu * 255;
    }
  }
  return ra;
}

/**
 * Vẽ một khung hình: lon đã xoay đi góc `phi`, ghi thẳng vào `ra`.
 *
 * Vòng này cố ý mỏng: mọi phép hình học đã nằm trong `BangDiem`. Ở đây chỉ còn
 * cộng góc xoay rồi lấy trung bình một khoảng cột nhãn.
 */
function veLon(
  nhan: Nhan,
  phi: number,
  diem: BangDiem,
  ra: ImageData,
): void {
  const out = ra.data;
  const { loai, beta, sang, dGoc, hang, alpha, goc0 } = diem;
  const n = KHUNG_W * KHUNG_H;
  const mau = new Float32Array(3);
  const heSoNhan = nhan.rong / (2 * Math.PI);
  const sangNap = doSang(0) * 1.02;
  const banNapPx = BAN_NAP * BAN_THAN_PX;
  const dayNap = banNapPx * SIN_NGHIENG;
  const nuaW = KHUNG_W / 2;
  const lech = phi / (2 * Math.PI) + 0.5;

  for (let p = 0; p < n; p++) {
    const l = loai[p];
    const o = p * 4;
    if (l === 0) {
      out[o + 3] = 0;
      continue;
    }

    let r0: number;
    let r1: number;
    let r2: number;

    if (l === 2) {
      const hg = hang[p];
      if (hg >= 0) {
        // Vòng nhãn: đưa góc về cột, bỏ phần nguyên cho khỏi tràn.
        const v = beta[p] / (2 * Math.PI) + lech;
        const u0 = (v - Math.floor(v)) * nhan.rong;
        trungBinhKhoang(nhan, hg, u0, dGoc[p] * heSoNhan, mau);
        r0 = mau[0];
        r1 = mau[1];
        r2 = mau[2];
      } else {
        r0 = NHOM[0];
        r1 = NHOM[1];
        r2 = NHOM[2];
      }
      const s = sang[p];
      r0 *= s;
      r1 *= s;
      r2 *= s;
    } else {
      const x = p % KHUNG_W;
      const y = (p - x) / KHUNG_W;
      const u = (x + 0.5 - nuaW) / banNapPx;
      const v = (y + 0.5 - Y_DINH) / dayNap;
      const hs =
        napLon(Math.sqrt(u * u + v * v), goc0[p] - phi, u, v) * sangNap;
      r0 = NHOM_NAP[0] * hs;
      r1 = NHOM_NAP[1] * hs;
      r2 = NHOM_NAP[2] * hs;
    }

    out[o] = r0 > 255 ? 255 : r0;
    out[o + 1] = r1 > 255 ? 255 : r1;
    out[o + 2] = r2 > 255 ? 255 : r2;
    out[o + 3] = alpha[p];
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
  const diemRef = useRef<Record<string, BangDiem | undefined>>({});
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
      // Bảng điểm ảnh phụ thuộc số hàng của ô nhãn, mà số hàng chỉ biết được
      // sau khi nhãn tải xong — nên dựng ở đây, một lần cho mỗi loại.
      let diem = diemRef.current[hienRef.current];
      if (!diem) {
        diem = dungBangDiem(bang, kho.cao);
        diemRef.current[hienRef.current] = diem;
      }
      veLon(kho, phi, diem, dem);
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
