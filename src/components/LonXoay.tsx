import { useEffect, useRef } from "react";

/**
 * LON BIA XOAY
 *
 * Chiếu lần lượt BỐN TẤM ẢNH CHỤP THẬT của cùng một lon ở bốn góc — mặt trước,
 * hông phải, mặt sau, hông trái — nên lon quay trọn một vòng mà mỗi khung hình
 * đều là một tấm ảnh nguyên vẹn.
 *
 * VÌ SAO KHÔNG DỰNG HÌNH TRỤ NỮA. Bản trước chiếu ảnh phẳng lên một mặt tròn
 * xoay, tính lại từng điểm ảnh. Cách ấy chỉ có hai tấm nên phần vỏ quanh hai
 * bên hông không có dữ liệu, phải bịa; mà bịa một khúc nhãn rồi đặt cạnh khúc
 * nhãn thật thì bao giờ cũng lộ ra thành vệt nhoè. Đã thử làm mượt, tô tối,
 * dựng màu nền theo từng hàng — vẫn lộ, vì gốc rễ là thiếu ảnh chứ không phải
 * thiếu thuật toán.
 *
 * Bốn tấm ảnh thật thì không còn chỗ nào phải bịa, và cũng không còn phép tính
 * nào kéo giãn điểm ảnh. Đổi lại lon quay theo bốn nấc chứ không liền mạch,
 * nên giữa hai nấc có một nhịp ảnh tan vào nhau để mắt đọc thành một cú xoay.
 *
 * Bốn tấm chụp ở khoảng cách khác nhau nên lon to nhỏ mỗi tấm một kiểu. Mỗi
 * tấm vì vậy được ép vào đúng một khung chuẩn theo khung bao của lon trong
 * chính nó — không thì lúc xoay lon phình ra thóp vào theo từng nấc.
 */

/**
 * Khung chuẩn, bằng đúng tấm ảnh lớn nhất trong bộ (245×493).
 *
 * Không phóng to ở bước này: phóng bằng canvas là nhân đôi điểm ảnh, còn để
 * trình duyệt phóng lúc hiển thị thì nó nội suy mượt hơn nhiều.
 */
const KHUNG_W = 248;
const KHUNG_H = 496;
/** Trọn một vòng quay khi đổi loại, mili giây. */
const THOI_GIAN_QUAY = 900;
/** Số góc chụp của mỗi lon. */
const SO_GOC = 4;
/**
 * Phần của mỗi nấc dành cho việc tan ảnh, tính hai đầu.
 *
 * Để tan suốt cả nấc thì lúc nào cũng thấy hai tấm chồng lên nhau, hoá ra
 * nhìn như mờ. Chỉ tan ở khúc giữa thì mỗi tấm được đứng rõ một lúc, mắt đọc
 * ra từng nấc quay thay vì một mảng bóng đôi.
 */
const TAN_TU = 0.32;
const TAN_DEN = 0.68;

/** Bốn góc của một loại bia, đã ép về cùng khung chuẩn. */
type Kho = HTMLCanvasElement[];

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

/**
 * Ép một tấm ảnh vào khung chuẩn: lon cao hết khung và nằm giữa.
 *
 * Đây là chỗ bù cho việc bốn tấm chụp ở khoảng cách khác nhau.
 */
function epVaoKhung(img: HTMLImageElement): HTMLCanvasElement | null {
  const bao = khungBao(img);
  if (!bao) return null;
  const c = document.createElement("canvas");
  c.width = KHUNG_W;
  c.height = KHUNG_H;
  const g = c.getContext("2d");
  if (!g) return null;
  const ti = Math.min(KHUNG_W / bao.w, KHUNG_H / bao.h);
  const w = bao.w * ti;
  const h = bao.h * ti;
  g.imageSmoothingQuality = "high";
  g.drawImage(
    img,
    bao.x,
    bao.y,
    bao.w,
    bao.h,
    (KHUNG_W - w) / 2,
    (KHUNG_H - h) / 2,
    w,
    h,
  );
  return c;
}

/** Vào nhanh ra chậm, để cú xoay có đà chứ không đều đều như máy. */
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
  const quayRef = useRef<number | null>(null);
  const veRef = useRef(false);
  const loiRef = useRef(onLoiAnh);
  loiRef.current = onLoiAnh;

  // Nạp cả bốn ảnh của mỗi loại rồi ép về khung chuẩn, mỗi loại một lần.
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
          let kho: Kho | null = null;
          try {
            const cs = imgs.map(epVaoKhung);
            kho = cs.every((c): c is HTMLCanvasElement => !!c) ? cs : null;
          } catch {
            // Trình duyệt chặn đọc điểm ảnh thì coi như không có ảnh và quay về
            // hình vẽ, chứ không để lon biến mất khỏi màn hình đăng nhập.
            kho = null;
          }
          khoRef.current[id] = kho;
          if (!kho) loiRef.current(id);
          else veRef.current = true;
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
    let id = 0;

    const khung = (moc: number) => {
      id = requestAnimationFrame(khung);
      // Tab bị ẩn thì thôi vẽ, quay ở chỗ không ai nhìn chỉ tốn pin.
      if (document.hidden) return;

      if (dichRef.current !== hienRef.current && quayRef.current === null) {
        if (giam) {
          hienRef.current = dichRef.current;
          veRef.current = true;
        } else {
          quayRef.current = moc;
        }
      }

      const khoCu = khoRef.current[hienRef.current];
      if (!khoCu) return;

      // Đứng yên thì thôi vẽ lại: ảnh không đổi, vẽ thêm cũng ra đúng thế.
      if (quayRef.current === null) {
        if (!veRef.current) return;
        veRef.current = false;
        ctx.clearRect(0, 0, KHUNG_W, KHUNG_H);
        ctx.drawImage(khoCu[0], 0, 0);
        return;
      }

      const p = Math.min(1, (moc - quayRef.current) / THOI_GIAN_QUAY);
      if (p >= 1) {
        hienRef.current = dichRef.current;
        quayRef.current = null;
        veRef.current = true;
        return;
      }

      /*
       * Cú xoay đi qua bốn nấc: ba nấc còn trong loại cũ, nấc cuối đáp sang
       * mặt trước của loại mới. Giữa hai nấc, tấm sau hiện dần lên trên tấm
       * trước — mắt đọc thành một cú xoay liền thay vì bốn cái ảnh nhảy.
       */
      const buoc = muot(p) * SO_GOC;
      const nac = Math.min(SO_GOC - 1, Math.floor(buoc));
      const tho = buoc - nac;
      const le = Math.min(1, Math.max(0, (tho - TAN_TU) / (TAN_DEN - TAN_TU)));
      const khoMoi = khoRef.current[dichRef.current];
      const tamA = khoCu[nac];
      const tamB = nac < SO_GOC - 1 ? khoCu[nac + 1] : (khoMoi ?? khoCu)[0];

      ctx.clearRect(0, 0, KHUNG_W, KHUNG_H);
      ctx.drawImage(tamA, 0, 0);
      ctx.globalAlpha = le;
      ctx.drawImage(tamB, 0, 0);
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
