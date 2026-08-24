import { useEffect, useRef } from "react";
import type { BangChieu } from "../lib/lonXoay";
import { TRAN_NEN, banKinhTheoCao, bangChieu, bangRong } from "../lib/lonXoay";

/**
 * LON BIA XOAY 3D
 *
 * Cuộn tấm nhãn trải phẳng 360 độ quanh một hình trụ, vẽ lại từng điểm ảnh mỗi
 * khung hình. Phép tính nằm ở `src/lib/lonXoay.ts` — đọc chú thích đầu tệp đó
 * trước.
 *
 * Dáng lon dựng bằng công thức chứ không lấy từ ảnh: nhãn trải phẳng không có
 * hình lon, mà dựng bằng công thức thì bóng lon trơn tuyệt đối và ba loại bia
 * cùng một dáng.
 */

/** Khung vẽ. */
const VE_W = 264;
const VE_H = 496;
/** Bán kính thân lon, điểm ảnh. */
const BAN_THAN = 116;
/** Chiều cao nhãn trên khung, điểm ảnh. */
const CAO_NHAN = 428;
/**
 * Nửa trục đứng của vành lon, điểm ảnh.
 *
 * Máy nhìn hơi cao hơn giữa lon nên nắp và đáy hiện ra thành hình bầu dục chứ
 * không phải đường thẳng: giữa lon võng xuống, hai bên vểnh lên. Cắt phẳng đầu
 * với đít thì lon nhìn như một cái nhãn dán trên tấm bìa, mất hẳn khối.
 */
const CAO_VANH = 19;
/** Số bậc của bảng tra. 1024 bậc là dưới nửa điểm ảnh, mắt không thấy bậc. */
const SO_BUC = 1024;
/** Một vòng quay khi đổi loại, mili giây. */
const THOI_GIAN_QUAY = 1150;
/** Chu kỳ lắc qua lại lúc đứng yên, mili giây. */
const CHU_KY_LAC = 9000;
/** Biên độ lắc, radian. Khoảng 23 độ mỗi bên. */
const BIEN_LAC = 0.4;

/**
 * Nhãn của một loại bia, đã đọc ra điểm ảnh và cắt bỏ lề.
 *
 * `rong`/`cao` là bề rộng thật của mảng; vùng dùng được là hình chữ nhật từ
 * (`x0`, `y0`) rộng `rongDung` cao `caoDung`.
 */
interface Kho {
  diem: Uint8ClampedArray;
  rong: number;
  x0: number;
  y0: number;
  rongDung: number;
  caoDung: number;
}

/**
 * Lệch của nhãn so với hướng nhìn, tính theo phần của vòng.
 *
 * Tấm nhãn trải phẳng bắt đầu từ ĐƯỜNG GHÉP ở sau lon, nên mặt trước — chỗ có
 * logo — nằm ở giữa tấm, tức 0,5 vòng. Không lệch nửa vòng thì lúc lon đứng
 * yên người ta nhìn thấy đúng cái đường ghép và bảng thành phần, còn logo thì
 * quay ra sau.
 */
const LECH_NHAN = 0.5;

/** Ngưỡng coi một điểm là lề trắng của file thiết kế. */
const NGUONG_LE = 244;
/**
 * Tỉ lệ điểm phải trắng để coi cả hàng hoặc cột là lề.
 *
 * Không đòi trắng hết 100%: file thiết kế có mấy DẤU CẮT ở bốn góc, chỉ một
 * vệt đen bằng đầu kim thôi nhưng nằm ngay trong dải lề. Đòi trắng tuyệt đối
 * thì gặp dấu cắt là dừng ngay, lề không cắt được điểm nào, và cả dải trắng ấy
 * cuộn quanh lon thành một vạch sáng chạy dọc chỗ nối.
 */
const TI_LE_TRANG = 0.9;

/** Đỉnh vành nắp trên khung vẽ. */
const yDau = Math.round((VE_H - CAO_NHAN - 2 * CAO_VANH) / 2 + CAO_VANH);

/**
 * Đọc tấm nhãn ra mảng điểm ảnh, và CẮT BỎ LỀ TRẮNG quanh nó.
 *
 * File thiết kế thường chừa một dải trắng và mấy dấu cắt ở bốn mép. Cuộn cả
 * dải trắng ấy quanh lon thì hiện ra một vạch sáng chạy dọc thân lon, và hai
 * đầu nhãn không nối liền được vào nhau nữa.
 *
 * Chỉ cắt từ ngoài vào, gặp hàng nào không còn trắng thì dừng — nên những mảng
 * trắng nằm giữa nhãn, như bảng thành phần, không bị đụng tới.
 */
function docNhan(img: HTMLImageElement): Kho | null {
  const rong = img.naturalWidth;
  const cao = img.naturalHeight;
  if (!rong || !cao) return null;
  const c = document.createElement("canvas");
  c.width = rong;
  c.height = cao;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0);
  const diem = g.getImageData(0, 0, rong, cao).data;

  const trangTai = (i: number) =>
    diem[i] >= NGUONG_LE && diem[i + 1] >= NGUONG_LE && diem[i + 2] >= NGUONG_LE;
  const cotTrang = (x: number) => {
    let trang = 0;
    let dem = 0;
    for (let y = 0; y < cao; y += 2) {
      dem++;
      if (trangTai((y * rong + x) * 4)) trang++;
    }
    return trang >= dem * TI_LE_TRANG;
  };
  const hangTrang = (y: number) => {
    let trang = 0;
    let dem = 0;
    for (let x = 0; x < rong; x += 2) {
      dem++;
      if (trangTai((y * rong + x) * 4)) trang++;
    }
    return trang >= dem * TI_LE_TRANG;
  };

  let x0 = 0;
  let x1 = rong - 1;
  let y0 = 0;
  let y1 = cao - 1;
  while (x0 < x1 && cotTrang(x0)) x0++;
  while (x1 > x0 && cotTrang(x1)) x1--;
  while (y0 < y1 && hangTrang(y0)) y0++;
  while (y1 > y0 && hangTrang(y1)) y1--;

  // Lùi thêm một điểm mỗi bên: dấu cắt thường có một hàng xám nhạt sát lề
  // trắng, giữ lại thì vẫn thành một vạch mờ chạy dọc lon.
  if (x1 - x0 > 8) {
    x0++;
    x1--;
  }
  return {
    diem,
    rong,
    x0,
    y0,
    rongDung: x1 + 1 - x0,
    caoDung: y1 + 1 - y0,
  };
}

/**
 * Vẽ một khung hình: lon đã xoay đi góc `phi`, ghi thẳng vào `ra`.
 *
 * Vòng ngoài chạy theo CỘT chứ không theo hàng, vì mỗi cột có một độ võng
 * riêng: cột giữa lon võng xuống nhiều nhất, cột sát mép không võng. Biết độ
 * võng rồi mới biết cột ấy bắt đầu và kết thúc ở hàng nào.
 */
function veLon(kho: Kho, phi: number, bang: BangChieu, ra: ImageData) {
  const { diem, rong, x0: nx0, y0: ny0, rongDung, caoDung } = kho;
  bangChieu(phi, bang);
  const { u, sang, nen } = bang;
  const out = ra.data;
  out.fill(0);
  const buc = u.length - 1;
  const cx = VE_W / 2;

  for (let x = 0; x < VE_W; x++) {
    // Vị trí ngang trên thân lon, dùng để tính độ võng của vành.
    const s0 = (x + 0.5 - cx) / BAN_THAN;
    if (s0 < -1 || s0 > 1) continue;
    const cong = Math.sqrt(1 - s0 * s0);
    const vong = CAO_VANH * cong;
    const yTren = yDau + vong;
    const yDuoi = yTren + CAO_NHAN;

    for (let y = Math.max(0, Math.floor(yDau - vong)); y < Math.min(VE_H, Math.ceil(yDuoi) + 1); y++) {
      const t = (y + 0.5 - yTren) / CAO_NHAN;

      /*
       * Trên thân lon là mặt nắp. Nắp là hình bầu dục nằm ngang, tâm ở `yDau`;
       * lấy màu hàng đầu của nhãn rồi tô sáng lên cho ra vẻ nhôm.
       */
      if (t < 0) {
        if (y + 0.5 < yDau - vong) continue;
        const i = (((s0 + 1) / 2) * buc + 0.5) | 0;
        const un = ((((u[i] + LECH_NHAN) * rongDung) | 0) % rongDung + rongDung) % rongDung;
        const j = (ny0 * rong + nx0 + un) * 4;
        // Càng ra xa tâm nắp càng tối, cho thấy mặt nắp lõm.
        const xa = Math.abs(y + 0.5 - yDau) / Math.max(1, vong);
        const f = (1.28 - 0.42 * xa * xa) * sang[i];
        const d = (y * VE_W + x) * 4;
        out[d] = diem[j] * f;
        out[d + 1] = diem[j + 1] * f;
        out[d + 2] = diem[j + 2] * f;
        out[d + 3] = 255;
        continue;
      }
      if (t > 1) continue;

      const r = BAN_THAN * banKinhTheoCao(t);
      if (r < 1) continue;
      let s = (x + 0.5 - cx) / r;
      if (s < -1) s = -1;
      else if (s > 1) s = 1;
      // Cột nằm ngoài bóng lon ở độ cao này (chỗ thóp cổ và đáy).
      if (Math.abs(x + 0.5 - cx) > r) continue;
      const i = (((s + 1) / 2) * buc + 0.5) | 0;

      // Độ phủ của bóng lon lên cột này, để viền không bị răng cưa.
      const phu = Math.min(1, Math.min(x + 1, cx + r) - Math.max(x, cx - r));
      if (phu <= 0) continue;

      let hangNhan = ((t * caoDung) | 0) + ny0;
      if (hangNhan < ny0) hangNhan = ny0;
      else if (hangNhan >= ny0 + caoDung) hangNhan = ny0 + caoDung - 1;
      const dongNhan = hangNhan * rong;

      /*
       * Số cột nhãn dồn vào cột màn hình này. Sát mép lon một cột màn hình
       * gánh hàng chục cột nhãn; lấy đúng một cột thì bỏ qua phần còn lại, sinh
       * vệt răng cưa nhấp nháy trong lúc lon quay. Lấy trung bình chừng ấy cột
       * thì mượt.
       */
      let tia = Math.round((nen[i] * rongDung) / r);
      if (tia < 1) tia = 1;
      else if (tia > TRAN_NEN) tia = TRAN_NEN;

      const giua = (u[i] + LECH_NHAN) * rongDung;
      let rr = 0;
      let gg = 0;
      let bb = 0;
      for (let k = 0; k < tia; k++) {
        let un = Math.round(giua + k - (tia - 1) / 2) % rongDung;
        if (un < 0) un += rongDung;
        const j = (dongNhan + nx0 + un) * 4;
        rr += diem[j];
        gg += diem[j + 1];
        bb += diem[j + 2];
      }
      const f = sang[i] / tia;
      const d = (y * VE_W + x) * 4;
      out[d] = rr * f;
      out[d + 1] = gg * f;
      out[d + 2] = bb * f;
      out[d + 3] = phu * 255;
    }
  }
}

/** Vào nhanh ra chậm, để cú quay có đà chứ không đều đều như máy. */
const muot = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

interface Props {
  /** Đường dẫn tấm nhãn trải phẳng của từng loại. */
  anh: Record<string, string>;
  /** Loại đang chọn. */
  loai: string;
  /** Tên loại, dùng cho trình đọc màn hình. */
  ten: Record<string, string>;
  /** Loại này thiếu nhãn hoặc nhãn hỏng. */
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
    Object.entries(anh).forEach(([id, url]) => {
      const img = new Image();
      img.onload = () => {
        if (!con) return;
        try {
          khoRef.current[id] = docNhan(img);
        } catch {
          // Trình duyệt chặn đọc điểm ảnh thì coi như không có nhãn và quay về
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
        // Quá nửa vòng là màn hình toàn mặt sau của nhãn — thay ở đây thì không
        // còn tí mặt trước nào để mà thấy nhảy.
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
