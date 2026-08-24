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
 * MẶT SAU LÀ ẢNH THẬT. Mỗi loại bia cần hai ảnh: mặt trước và mặt sau (lon
 * xoay đúng 180°). Trước đây chỉ có mặt trước nên phải bịa mặt sau bằng cách
 * hoà hai dải màu ở hai mép — ra một mảng trơn lì, không chữ không mã vạch,
 * nhìn không ra lon bia.
 *
 * Ảnh mặt sau chụp cùng cái lon đã quay nửa vòng, nên phần nhãn ở góc a xuất
 * hiện trong ảnh ấy tại cột `cxSau − rSau·sin(a)` — vẫn công thức cũ, chỉ đổi
 * dấu. Nhờ vậy hai mép nối liền nhau đúng theo hình học: tại a = π/2, mặt
 * trước chạm mép phải của nó thì mặt sau cũng chạm mép trái của nó, cùng một
 * đường trên vỏ lon thật.
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
 * sáng gấp ba. Chỗ ấy trong ảnh gốc chỉ rộng vài điểm nên chẳng còn chi tiết
 * gì, kéo sáng lên chỉ được một dải bệt trắng chạy dọc thân lon — thà để nó
 * hơi tối hơn thực tế mà chìm đi. Lúc đứng yên hệ số luôn đúng bằng 1 nên trần
 * này không đụng gì tới ảnh tĩnh.
 */
export const TRAN_SANG = 1.2;


/**
 * Bề rộng dải hoà từ nhãn sang mặt sau, tính theo cos của góc nhãn.
 *
 * Không hoà thì chỗ nhãn hết hiện ra một vạch dọc cắt ngang thân lon, nhìn
 * như nhãn bị rách.
 */
export const DAI_HOA = 0.3;

/**
 * Trần của độ nén, tính bằng số điểm ảnh nguồn dồn vào một điểm ảnh đích.
 *
 * Sát mép lon độ nén tiến ra vô cùng, không chặn thì vòng lấy mẫu chạy mãi.
 * Lấy ít quá thì dải sát mép hiện ra thành vệt sọc nhấp nháy lúc lon quay, nên
 * để rộng tay; dải đó hẹp nên tốn thêm không đáng kể.
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
  /** 1 nếu chỗ này thuộc mặt sau, 0 nếu là mặt trước. */
  sau: Uint8Array;
  /**
   * Độ nén tại chỗ: một điểm ảnh trên màn hình gánh bao nhiêu điểm ảnh nguồn.
   *
   * Lớn hơn 1 là NÉN — hay gặp ở sát mép lon. Không tính tới thì chỗ nén chỉ
   * lấy đúng một điểm nguồn, bỏ qua những điểm bên cạnh, sinh vệt răng cưa
   * nhấp nháy lúc lon quay. Biết độ nén thì lấy trung bình đúng chừng ấy điểm.
   *
   * Nhỏ hơn 1 là GIÃN, và giãn rất mạnh ở đúng chỗ nối hai ảnh: phần vỏ quanh
   * góc ±π/2 bị chụp nghiêng gần hết cỡ nên cả một vòng cung chỉ nằm gọn trong
   * dăm cột ảnh; xoay ra chính diện thì dăm cột ấy phải trải kín mấy chục cột
   * màn hình. Xem `veLon` để biết cách làm dịu chỗ đó.
   */
  nen: Float32Array;
  /** Độ sáng theo vị trí TRÊN MÀN HÌNH. */
  sangManHinh: Float32Array;
  /** Độ sáng đã có sẵn trong ảnh tại chỗ lấy nhãn. */
  sangNhan: Float32Array;
  /** Hệ số nhân màu nhãn, đã chặn trần. Tra sẵn để vòng vẽ khỏi phải chia. */
  heSoNhan: Float32Array;
  /** Hệ số nhân màu lấy từ ảnh mặt sau, đã chặn trần. */
  heSoSau: Float32Array;
}

/** Cấp phát một bảng rỗng để dùng lại qua các khung hình. */
export function bangRong(soBuc: number): BangChieu {
  return {
    u: new Float32Array(soBuc),
    hoa: new Float32Array(soBuc),
    sau: new Uint8Array(soBuc),
    nen: new Float32Array(soBuc),
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
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  for (let i = 0; i < soBuc; i++) {
    const s = -1 + (2 * i) / (soBuc - 1);
    const m = mauLay(s, phi);
    const sMh = doSang(m.beta);
    // Ảnh mặt sau chụp lon đã quay nửa vòng, nên phần nhãn ở góc a nằm ở chỗ
    // ứng với góc a∓π trong ảnh đó, và mang sẵn bóng của góc ấy.
    const gocSau = m.gocNhan > 0 ? m.gocNhan - Math.PI : m.gocNhan + Math.PI;
    ra.u[i] = Math.sin(m.gocNhan);
    ra.sau[i] = m.sau ? 1 : 0;
    ra.hoa[i] =
      m.cosNhan <= 0
        ? 1
        : m.cosNhan >= DAI_HOA
          ? 0
          : (DAI_HOA - m.cosNhan) / DAI_HOA;
    ra.sangManHinh[i] = sMh;
    ra.sangNhan[i] = doSang(m.gocNhan);
    ra.heSoNhan[i] = Math.min(TRAN_SANG, sMh / ra.sangNhan[i]);
    ra.heSoSau[i] = Math.min(TRAN_SANG, sMh / doSang(gocSau));
    // du/ds = cos φ − s·sin φ / √(1−s²). Ra vô cùng ở đúng mép lon nên chặn.
    const cosBeta = Math.sqrt(1 - s * s);
    // Số hạng s·sinφ/cosβ chỉ vọt lên vô cùng khi lon ĐANG xoay. Lon đứng yên
    // thì sinφ = 0, độ nén đúng bằng 1 ở khắp nơi kể cả sát mép — không tách
    // riêng trường hợp này thì hai cột ngoài cùng bị làm mờ oan lúc đứng yên.
    const dao =
      Math.abs(sp) < 1e-9
        ? Math.abs(cp)
        : cosBeta < 1e-6
          ? TRAN_NEN
          : Math.abs(cp - (s * sp) / cosBeta);
    // Chỉ chặn đầu trên. Giữ nguyên phần nhỏ hơn 1 vì đó chính là tín hiệu
    // cho biết chỗ nào đang bị kéo giãn.
    ra.nen[i] = dao > TRAN_NEN ? TRAN_NEN : dao;
  }
  return ra;
}
