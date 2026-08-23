/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÉP TÍNH CHO LON BIA XOAY 3D
 *
 * Ta chỉ có ẢNH CHỤP PHẲNG của lon, không có mô hình 3D. Lật ảnh phẳng bằng
 * `rotateY` thì trông như tấm bìa quay chứ không phải lon: chữ vẫn thẳng hàng,
 * nhãn không cuộn quanh thân, vệt sáng chạy theo ảnh.
 *
 * Cách làm ở đây coi ảnh chụp như NHÃN ĐÃ DÁN SẴN trên một mặt tròn xoay nhìn
 * từ chính diện, rồi vẽ lại từng điểm theo phép chiếu của mặt đó:
 *
 *   - Điểm ở vị trí ngang s (−1 mép trái, +1 mép phải) nằm trên phần mặt
 *     nghiêng một góc β = asin(s) so với hướng nhìn.
 *   - Lon xoay đi góc φ thì chỗ ấy mang phần nhãn ở góc a = β + φ.
 *   - Nhãn ở góc a nằm tại cột nào của ảnh gốc? Chính là cx + r·sin(a).
 *
 * Hệ quả quan trọng: khi φ = 0 thì a = β nên cột nguồn trùng đúng cột đích, và
 * độ sáng chỉnh lại cũng đúng bằng 1 — ảnh đứng yên hiện ra Y HỆT ảnh gốc. Còn
 * khi φ khác 0 thì nhãn tự cuộn và tự nén ở hai mép, như nhãn trên lon thật.
 *
 * BÁN KÍNH TÍNH THEO TỪNG HÀNG. Lon không phải hình trụ đều: nó thóp lại ở cổ
 * và ở đáy. Lấy một bán kính chung cho cả lon thì khi xoay, phần cổ và đáy bị
 * kéo tràn ra ngoài bóng lon, dáng lon vỡ ra thành những vệt ngang. Mỗi hàng
 * một bán kính riêng thì bóng lon đứng yên tuyệt đối trong lúc xoay — đúng như
 * mọi vật tròn xoay.
 *
 * MẶT SAU. Ảnh chụp chỉ thấy nửa trước, nửa sau không có dữ liệu. Lấy nửa
 * trước lật gương đắp vào thì chữ đọc ngược — chính lỗi đã phải sửa ở lon
 * Atlas. Thay vào đó dựng một mặt sau trơn bằng cách hoà hai dải màu hai bên
 * mép lon, đã làm mịn dọc để không thành sọc ngang. Kết quả là màu nền thân
 * lon cùng hai vành kim loại trên dưới — đúng như phần thân không có hình.
 *
 * CHỈNH SÁNG. Ảnh chụp đã có sẵn bóng của lon: sáng giữa, tối dần ra mép. Cứ
 * thế xoay thì mảng tối chạy theo nhãn, nhìn như nhãn bị bẩn. Nên mỗi điểm
 * phải nhân với `doSang(β)/doSang(a)` — bỏ đi độ sáng ứng với chỗ nhãn ĐANG
 * NẰM trên ảnh gốc, thay bằng độ sáng ứng với chỗ nó ĐANG HIỆN trên màn hình.
 * Vệt sáng vì vậy đứng yên một chỗ trong khi nhãn cuộn qua — đây mới là thứ
 * khiến mắt tin đó là vật tròn đang xoay.
 */

/** Hướng nguồn sáng, radian. Âm là lệch sang trái người nhìn. */
export const GOC_SANG = -0.22;
/** Ánh sáng môi trường, phần không phụ thuộc hướng. */
const NEN = 0.3;
/** Phần tán xạ theo hướng bề mặt. */
const TAN_XA = 0.7;
/** Độ chói của vệt phản chiếu trên vỏ nhôm. */
const CHOI = 0.32;
/** Số mũ của vệt chói: càng lớn vệt càng hẹp và gắt. */
const MU_CHOI = 16;

/**
 * Trần của hệ số chỉnh sáng.
 *
 * Phần nhãn vốn nằm sát mép ảnh rất tối; xoay ra chính diện thì hệ số đòi kéo
 * sáng gấp ba, quá tay là bệt trắng. Chặn lại thì chỗ đó hơi tối hơn thực tế,
 * đổi lại không cháy. Lúc đứng yên hệ số luôn bằng 1 nên trần này không đụng
 * tới ảnh tĩnh.
 */
export const TRAN_SANG = 1.5;

/**
 * Bề rộng dải hoà từ nhãn sang mặt sau, tính theo cos của góc nhãn.
 *
 * Không hoà thì chỗ nhãn hết hiện ra một vạch dọc cắt ngang thân lon, nhìn
 * như nhãn bị rách.
 */
export const DAI_HOA = 0.2;

/**
 * Vị trí ngang lấy màu dựng mặt sau, −0,82 và +0,82 của bán kính.
 *
 * Không lấy sát mép: chỗ sát mép ảnh bị nén và tối, kéo sáng lên thì bạc trắng
 * ra, mặt sau nhìn như phủ sương.
 */
export const S_MEP = 0.82;

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

export interface DiemLay {
  /** Góc bề mặt so với hướng nhìn, quyết định độ sáng trên màn hình. */
  beta: number;
  /** Góc của phần nhãn đang hiện ra ở đây, đưa về (−π; π]. */
  gocNhan: number;
  /** cos của góc nhãn. Âm là đã vòng ra mặt sau. */
  cosNhan: number;
  /** Điểm này thuộc mặt sau của lon (ảnh chụp không có dữ liệu). */
  sau: boolean;
  /**
   * Mặt trước: vị trí ngang trên ảnh gốc, −1 mép trái .. +1 mép phải.
   * Mặt sau: tham số vòng ra sau, 0 tại mép phải .. 1 tại mép trái.
   */
  u: number;
}

/**
 * Với một vị trí ngang trên bóng lon, tra xem phải lấy màu ở đâu trên nhãn.
 *
 * @param s vị trí ngang, −1 mép trái .. +1 mép phải
 * @param phi góc lon đã xoay, radian
 */
export function mauLay(s: number, phi: number): DiemLay {
  const kep = s < -1 ? -1 : s > 1 ? 1 : s;
  const beta = Math.asin(kep);
  const cosBeta = Math.sqrt(1 - kep * kep);
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  // Khai triển sin(β+φ) và cos(β+φ) để khỏi gọi lượng giác lần nữa.
  const sinNhan = kep * cp + cosBeta * sp;
  const cosNhan = cosBeta * cp - kep * sp;
  const gocNhan = Math.atan2(sinNhan, cosNhan);
  if (cosNhan >= 0) {
    return { beta, gocNhan, cosNhan, sau: false, u: sinNhan };
  }
  const vong = 2 * Math.PI;
  const t = ((((gocNhan - Math.PI / 2) % vong) + vong) % vong) / Math.PI;
  return { beta, gocNhan, cosNhan, sau: true, u: t > 1 ? 1 : t };
}

/**
 * Bảng tra sẵn cho một góc xoay, để vòng vẽ không phải gọi lượng giác từng
 * điểm ảnh. Mỗi khung hình dựng một bảng rồi hàng trăm nghìn điểm dùng chung.
 */
export interface BangChieu {
  /** Mặt trước: sin của góc nhãn. Mặt sau: tham số 0..1. */
  u: Float32Array;
  /** Tỉ lệ hoà sang mặt sau, 0 là nhãn thuần, 1 là mặt sau thuần. */
  hoa: Float32Array;
  /** Tham số mặt sau, đã kẹp về 0..1. */
  t: Float32Array;
  /** Độ sáng theo vị trí TRÊN MÀN HÌNH. */
  sangManHinh: Float32Array;
  /** Độ sáng đã có sẵn trong ảnh tại chỗ lấy nhãn. */
  sangNhan: Float32Array;
  /** Hệ số nhân màu nhãn, đã chặn trần. Tra sẵn để vòng vẽ khỏi phải chia. */
  heSoNhan: Float32Array;
  /** Hệ số nhân màu mặt sau, đã chặn trần. */
  heSoSau: Float32Array;
}

/** Độ sáng sẵn có tại hai chỗ lấy màu dựng mặt sau. */
const SANG_MEP_PHAI = doSang(Math.asin(S_MEP));
const SANG_MEP_TRAI = doSang(Math.asin(-S_MEP));

/** Cấp phát một bảng rỗng để dùng lại qua các khung hình. */
export function bangRong(soBuc: number): BangChieu {
  return {
    u: new Float32Array(soBuc),
    hoa: new Float32Array(soBuc),
    t: new Float32Array(soBuc),
    sangManHinh: new Float32Array(soBuc),
    sangNhan: new Float32Array(soBuc),
    heSoNhan: new Float32Array(soBuc),
    heSoSau: new Float32Array(soBuc),
  };
}

/**
 * Dựng bảng tra cho góc xoay `phi`, chia đều theo vị trí ngang.
 *
 * Ghi đè vào `ra` chứ không cấp phát mới: hàm này chạy mỗi khung hình, cấp
 * phát bảy mảng mỗi lần là bắt bộ dọn rác làm việc suốt lúc lon đang quay.
 */
export function bangChieu(phi: number, ra: BangChieu): BangChieu {
  const soBuc = ra.u.length;
  for (let i = 0; i < soBuc; i++) {
    const s = -1 + (2 * i) / (soBuc - 1);
    const m = mauLay(s, phi);
    const sMh = doSang(m.beta);
    const sNhan = doSang(m.gocNhan);
    const t = m.sau ? m.u : 0;
    ra.u[i] = m.u;
    ra.t[i] = t;
    ra.hoa[i] =
      m.cosNhan <= 0
        ? 1
        : m.cosNhan >= DAI_HOA
          ? 0
          : (DAI_HOA - m.cosNhan) / DAI_HOA;
    ra.sangManHinh[i] = sMh;
    ra.sangNhan[i] = sNhan;
    ra.heSoNhan[i] = Math.min(TRAN_SANG, sMh / sNhan);
    ra.heSoSau[i] = Math.min(
      TRAN_SANG,
      sMh / (SANG_MEP_TRAI * t + SANG_MEP_PHAI * (1 - t)),
    );
  }
  return ra;
}
