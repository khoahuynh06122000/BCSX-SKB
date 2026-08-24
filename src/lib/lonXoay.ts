/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÉP TÍNH CHO LON BIA XOAY 3D
 *
 * Mỗi loại bia có MỘT TẤM NHÃN TRẢI PHẲNG 360 độ — cả cái nhãn bóc khỏi lon,
 * dàn ra thành hình chữ nhật dài, hai đầu nối liền được vào nhau. Vẽ lon chỉ
 * còn là cuộn tấm nhãn ấy quanh một hình trụ.
 *
 * VÌ SAO NHÃN TRẢI PHẲNG GIẢI QUYẾT ĐƯỢC MỌI THỨ. Trước đây phải dựng nhãn từ
 * ảnh chụp lon, và đó là nguồn của mọi vệt nhoè:
 *
 *   - Hai tấm (trước và sau) thì phần vỏ ở hai bên hông không có dữ liệu, phải
 *     bịa — mà bịa một khúc nhãn rồi đặt cạnh khúc nhãn thật là lộ ngay.
 *   - Bốn tấm thì phải ghép, mà ghép cần biết chúng cách nhau bao nhiêu độ. Đo
 *     ra thì bốn tấm chụp tay lệch nhau từ 40 tới 140 độ, không tấm nào khớp
 *     tấm nào; ghép theo giả định 90 độ nên cả nhãn bị co kéo, chữ bị cắt.
 *
 * Nhãn trải phẳng thì không phải ghép, không phải bịa, không phải đoán góc, và
 * mọi vị trí trên vòng đều có dữ liệu thật với độ chi tiết đều nhau.
 *
 * PHÉP CHIẾU. Điểm ở vị trí ngang s (−1 mép trái, +1 mép phải) nằm trên phần
 * mặt nghiêng một góc β = asin(s) so với hướng nhìn. Lon xoay đi góc φ thì chỗ
 * ấy mang phần nhãn ở góc a = β + φ. Tra nhãn tại a là xong.
 *
 * CHỈNH SÁNG. Nhãn trải phẳng là hình vẽ phẳng, KHÔNG mang bóng sẵn — khác hẳn
 * ảnh chụp. Nên chỉ việc nhân với độ sáng theo góc bề mặt, không phải chia
 * ngược cho cái gì. Nhờ vậy hết luôn lỗi tràn 8 bit từng làm nhãn bệt thành
 * mảng: trước đây phải chia cho một số nhỏ hơn 1 rồi lưu vào mảng 8 bit, kết
 * quả vượt 255 và bị cắt cụt.
 */

/** Hướng nguồn sáng, radian. Âm là lệch sang trái người nhìn. */
export const GOC_SANG = -0.3;
/** Ánh sáng môi trường, phần không phụ thuộc hướng. */
const NEN = 0.44;
/** Phần tán xạ theo hướng bề mặt. */
const TAN_XA = 0.56;
/** Độ chói của vệt phản chiếu trên vỏ nhôm. */
const CHOI = 0.24;
/** Số mũ của vệt chói: càng lớn vệt càng hẹp và gắt. */
const MU_CHOI = 22;

/**
 * Trần của độ nén, tính bằng số điểm ảnh nhãn dồn vào một điểm ảnh màn hình.
 *
 * Sát mép lon độ nén tiến ra vô cùng, không chặn thì vòng lấy mẫu chạy mãi.
 */
export const TRAN_NEN = 16;

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

/**
 * Bán kính lon ở độ cao `t`, tính theo phần của bán kính thân. `t` chạy từ 0
 * (đỉnh nhãn) tới 1 (đáy nhãn).
 *
 * Lon nước không phải hình trụ đều: nó thóp vào ở cổ và ở đáy. Không tả đúng
 * chỗ thóp thì lon nhìn như một cái ống, mất hẳn dáng lon bia.
 */
export function banKinhTheoCao(t: number): number {
  if (t < 0.06) {
    // Cổ: nở dần lên bán kính thân theo đường cong cho mềm, không gấp khúc.
    return 0.85 + 0.15 * Math.sin(((t / 0.06) * Math.PI) / 2);
  }
  if (t > 0.94) {
    /*
     * Đáy: thóp lại, ít hơn cổ một chút.
     *
     * Dùng 1−cos chứ không dùng sin: sin bắt đầu bằng độ dốc lớn nhất, nên chỗ
     * nối với thân lon bị gấp khúc và viền lon hiện ra một cái bậc. 1−cos bắt
     * đầu bằng độ dốc 0 nên nối vào thân trơn tuột.
     */
    const k = (t - 0.94) / 0.06;
    return 1 - 0.11 * (1 - Math.cos((k * Math.PI) / 2));
  }
  return 1;
}

/**
 * Bảng tra sẵn cho một góc xoay, để vòng vẽ không phải gọi lượng giác từng
 * điểm ảnh. Mỗi khung hình dựng một bảng rồi hàng trăm nghìn điểm dùng chung.
 */
export interface BangChieu {
  /** Vị trí trên nhãn, tính theo phần của vòng: 0 đến 1. */
  u: Float32Array;
  /** Độ sáng theo vị trí TRÊN MÀN HÌNH. */
  sang: Float32Array;
  /** Độ nén: một điểm ảnh màn hình gánh bao nhiêu phần của vòng nhãn. */
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
    ra.nen[i] = cosBeta < 1e-6 ? TRAN_NEN : 1 / (cosBeta * vong);
  }
  return ra;
}
