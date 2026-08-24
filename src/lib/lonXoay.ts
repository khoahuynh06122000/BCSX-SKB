/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÉP TÍNH CHO LON BIA XOAY 3D
 *
 * Lon quay liên tục quanh trục đứng. Mỗi loại bia có BỐN TẤM ẢNH CHỤP THẬT ở
 * bốn góc cách nhau 90 độ, và bốn tấm ấy được trải ra thành MỘT DẢI NHÃN 360
 * ĐỘ. Lúc vẽ chỉ việc cuộn dải nhãn ấy quanh hình trụ.
 *
 * VÌ SAO PHẢI TRẢI RA TRƯỚC. Bản cũ chỉ có hai tấm (trước và sau), mỗi tấm
 * thấy được nửa lon. Nhưng nửa ấy không đều: phần vỏ ở hai bên mép bị chụp
 * nghiêng gần hết cỡ, cả một vòng cung chỉ nằm gọn trong dăm cột ảnh. Xoay ra
 * chính diện thì dăm cột ấy phải trải kín mấy chục cột màn hình — thành vệt
 * nhoè. Bịa thêm màu vào đó cũng không cứu được, vì nó nằm cạnh phần nhãn
 * thật nên chênh lệch lộ ngay.
 *
 * Bốn tấm thì mỗi tấm chỉ cần đóng góp phần GIỮA của nó, khoảng ±45 độ quanh
 * tâm — chỗ ống kính nhìn thẳng nhất, một độ góc trải ra được nhiều điểm ảnh
 * nhất. Ghép bốn phần giữa ấy lại là kín vòng, không còn chỗ nào thiếu.
 *
 * PHÉP CHIẾU. Điểm ở vị trí ngang s (−1 mép trái, +1 mép phải) nằm trên phần
 * mặt nghiêng một góc β = asin(s) so với hướng nhìn. Lon xoay đi góc φ thì chỗ
 * ấy mang phần nhãn ở góc a = β + φ. Tra dải nhãn tại a là xong.
 *
 * CHỈNH SÁNG. Ảnh chụp nào cũng có sẵn bóng của lon: sáng giữa, tối dần ra
 * mép. Lúc trải nhãn phải CHIA NGƯỢC lại cho độ sáng ấy để lấy màu gốc; lúc vẽ
 * mới nhân với độ sáng theo góc TRÊN MÀN HÌNH. Nhờ vậy vệt sáng đứng yên một
 * chỗ trong khi nhãn cuộn qua — đây mới là thứ khiến mắt tin đó là vật tròn
 * đang xoay. Vì mỗi tấm chỉ dùng phần giữa nên hệ số chia lớn nhất chỉ khoảng
 * 1,6 lần, không kéo sáng quá tay như bản cũ (có chỗ đòi gấp ba).
 */

/** Hướng nguồn sáng, radian. Âm là lệch sang trái người nhìn. */
export const GOC_SANG = -0.22;
/** Ánh sáng môi trường, phần không phụ thuộc hướng. */
const NEN = 0.34;
/** Phần tán xạ theo hướng bề mặt. */
const TAN_XA = 0.66;
/** Độ chói của vệt phản chiếu trên vỏ nhôm. */
const CHOI = 0.3;
/** Số mũ của vệt chói: càng lớn vệt càng hẹp và gắt. */
const MU_CHOI = 16;

/**
 * Ranh giới giữa hai tấm kề nhau, radian. Bốn tấm cách nhau 90 độ nên là ±45.
 */
export const NUA_CUNG = Math.PI / 4;
/**
 * Nửa bề rộng dải hoà tại ranh giới, radian. Khoảng 5 độ.
 *
 * Phải HẸP. Bốn tấm chụp tay nên góc xoay giữa các lần không đúng 90 độ tuyệt
 * đối; cho hai tấm chồng lấn rộng rồi lấy trung bình thì cùng một dòng chữ
 * hiện ra hai lần lệch nhau, cả dải nhãn thành bóng đôi. Hoà hẹp thì mỗi tấm
 * gần như làm chủ hẳn phần của nó, chỉ giao nhau đúng ở đường ghép.
 */
export const NUA_HOA = Math.PI / 36;

/**
 * Trần của độ nén, tính bằng số điểm ảnh nguồn dồn vào một điểm ảnh đích.
 *
 * Sát mép lon độ nén tiến ra vô cùng, không chặn thì vòng lấy mẫu chạy mãi.
 */
export const TRAN_NEN = 14;

function thoRaw(goc: number): number {
  const c = Math.cos(goc - GOC_SANG);
  const khuech = c > 0 ? c : 0;
  return NEN + TAN_XA * khuech + CHOI * Math.pow(khuech, MU_CHOI);
}

/** Độ sáng lớn nhất, ngay tại hướng nguồn sáng. Dùng để chuẩn hoá về 0..1. */
const DINH = thoRaw(GOC_SANG);

/** Độ sáng của mặt nghiêng góc `goc`, chuẩn hoá về khoảng (0; 1]. */
export function doSang(goc: number): number {
  return thoRaw(goc) / DINH;
}

/** Đưa một góc về khoảng (−π; π]. */
export function veVong(goc: number): number {
  const v = 2 * Math.PI;
  let a = ((goc % v) + v) % v;
  if (a > Math.PI) a -= v;
  return a;
}

/**
 * Trọng số của một tấm ảnh khi trải nhãn, theo góc lệch so với tâm tấm ấy.
 *
 * Bằng 1 trong suốt phần tấm ấy làm chủ, rồi tắt nhanh qua dải hoà hẹp ở ranh
 * giới. Hai tấm kề nhau tại đúng ranh giới đều được 0,5 nên cộng lại vừa 1.
 */
export function trongSo(lech: number): number {
  const d = lech < 0 ? -lech : lech;
  const t = (NUA_CUNG + NUA_HOA - d) / (2 * NUA_HOA);
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}

/**
 * Bảng tra sẵn cho một góc xoay, để vòng vẽ không phải gọi lượng giác từng
 * điểm ảnh. Mỗi khung hình dựng một bảng rồi hàng trăm nghìn điểm dùng chung.
 */
export interface BangChieu {
  /** Vị trí trên dải nhãn, tính theo phần của vòng: 0 đến 1. */
  u: Float32Array;
  /** Độ sáng theo vị trí TRÊN MÀN HÌNH. */
  sang: Float32Array;
  /**
   * Độ nén: một điểm ảnh màn hình gánh bao nhiêu phần nghìn vòng nhãn.
   *
   * Càng ra mép lon càng nén. Không tính tới thì chỗ nén chỉ lấy một điểm
   * nguồn, bỏ qua những điểm bên cạnh, sinh vệt răng cưa nhấp nháy lúc quay.
   */
  nen: Float32Array;
}

/** Cấp phát một bảng rỗng để dùng lại qua các khung hình. */
export function bangRong(soBuc: number): BangChieu {
  return {
    u: new Float32Array(soBuc),
    sang: new Float32Array(soBuc),
    nen: new Float32Array(soBuc),
  };
}

/**
 * Dựng bảng tra cho góc xoay `phi`, chia đều theo vị trí ngang.
 *
 * Ghi đè vào `ra` chứ không cấp phát mới: hàm này chạy mỗi khung hình, cấp
 * phát ba mảng mỗi lần là bắt bộ dọn rác làm việc suốt lúc lon đang quay.
 */
export function bangChieu(phi: number, ra: BangChieu): BangChieu {
  const soBuc = ra.u.length;
  const vong = 2 * Math.PI;
  for (let i = 0; i < soBuc; i++) {
    let s = -1 + (2 * i) / (soBuc - 1);
    if (s < -1) s = -1;
    else if (s > 1) s = 1;
    const beta = Math.asin(s);
    const a = beta + phi;
    ra.u[i] = (((a % vong) + vong) % vong) / vong;
    ra.sang[i] = doSang(beta);
    // da/ds = 1/√(1−s²), đổi ra phần của vòng thì chia cho 2π.
    const cosBeta = Math.sqrt(1 - s * s);
    const d = cosBeta < 1e-6 ? TRAN_NEN : 1 / (cosBeta * vong);
    ra.nen[i] = d;
  }
  return ra;
}
