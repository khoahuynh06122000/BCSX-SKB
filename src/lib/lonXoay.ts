/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÉP TÍNH CHO LON BIA XOAY 3D
 *
 * Đầu vào là Ô NHÃN TRẢI PHẲNG — đúng tấm 208 × 107 mm trong file bao bì của
 * bộ phận, tức trọn một vòng 360° quanh thân lon. `scripts/lay-nhan-tu-bao-bi.py`
 * cắt nó ra từ file PDF.
 *
 * Ta cuộn tấm ấy quanh một hình trụ rồi vẽ lại theo phép chiếu nhìn từ chính
 * diện:
 *
 *   - Điểm ở vị trí ngang s (−1 mép trái, +1 mép phải) nằm trên phần mặt
 *     nghiêng một góc β = asin(s) so với hướng nhìn.
 *   - Lon xoay đi góc φ thì chỗ ấy mang phần nhãn ở góc a = β + φ.
 *   - Nhãn là một vòng tròn nên cột cần lấy là ((a/2π) + 0,5) mod 1, nhân bề
 *     rộng nhãn. Cộng 0,5 để góc 0 rơi vào GIỮA ô nhãn, tức mặt trước lon.
 *
 * VÌ SAO BỎ CÁCH DÙNG HAI ẢNH CHỤP. Bản trước nhận hai ảnh — mặt trước và mặt
 * sau — rồi trộn lại khi xoay. Cách ấy có một chỗ hỏng không chữa được: phần vỏ
 * ở hai hông lon nằm đúng chỗ ống kính nhìn nghiêng hết cỡ, cả một vòng cung
 * chỉ còn dăm cột ảnh. Xoay ra chính diện thì dăm cột ấy phải trải kín mấy chục
 * cột màn hình — và thành vệt nhoè.
 *
 * Cả một mớ chắp vá quanh chỗ hỏng đó cũng đi theo: dải hông tự dựng, hệ số tô
 * tối dải hông, bản làm mờ dọc cho chỗ nối, trần độ nén. Cuộn thẳng từ nhãn
 * 360° thì không góc nào thiếu dữ liệu, nên không cần chắp vá gì.
 *
 * LẤY TRUNG BÌNH CẢ KHOẢNG GÓC MÀ MỘT ĐIỂM ẢNH CHE, không lấy màu tại một
 * điểm. Càng ra mép lon bề mặt càng nghiêng: một cột điểm ảnh sát mép gom tới
 * gần một phần tư vòng nhãn, tức hàng trăm cột ảnh gốc. Chấm một điểm giữa
 * khoảng đó thì mỗi hàng trúng một chỗ khác nhau, ra vệt sọc dọc lem nhem.
 *
 * BẢNG TRA THEO s, KHÔNG THEO CỘT MÀN HÌNH. Mọi thứ chỉ phụ thuộc s = x/r, mà
 * bán kính r đổi theo từng hàng. Tra theo s thì một bảng dùng chung cho cả lon;
 * tra theo cột thì mỗi hàng một bảng.
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

/* ------------------------------------------------------------ dáng hình lon */

/**
 * MỐC CAO ĐỘ CỦA TỪNG PHẦN TRÊN LON, tính theo phần của chiều cao (0 ở đỉnh).
 *
 * Lon 330ml tiêu chuẩn cao 115,2mm; nhãn cao 107mm và bắt đầu cách đỉnh 2,7mm.
 * Mấy dải ở hai đầu chỉ dày vài milimet nhưng chính chúng làm mắt đọc ra đây là
 * cái lon chứ không phải một ống trụ.
 */
const CAO_MM = 115.2;
const mm = (v: number) => v / CAO_MM;

export const MEP_MIENG = mm(0.9); // mép trên cùng, nhìn nghiêng thấy tối
export const VANH_TREN = mm(2.1); // vành miệng sáng loáng
export const NHAN_DAU = mm(2.7); // nhãn bắt đầu ngay dưới rãnh miệng
export const NHAN_CUOI = mm(109.7); // 2,7 + 107
export const RANH_DUOI = mm(110.8);
export const VANH_DUOI = mm(112.4);

/** Bán kính thân lon, theo phần của nửa bề rộng khung vẽ. */
const BAN_THAN = 1.0;
/** Bán kính vành miệng: 26,1 / 33,1 của lon 330ml thật. */
const BAN_VANH = 0.789;

/**
 * Bán kính của lon tại độ cao `t` (0 ở đỉnh, 1 ở đáy), theo phần của bán kính
 * thân.
 *
 * Lon không phải hình trụ đều: nó thóp lại ở cổ và ở đáy. Lấy một bán kính
 * chung thì hai đầu lon hiện ra vuông chằn chặn, nhìn như ống nước.
 */
export function banKinhTheoHang(t: number): number {
  if (t < MEP_MIENG) {
    // Mép miệng: vành nhôm cuộn lại, nhỏ nhất lon.
    return BAN_VANH * (0.982 + 0.018 * (t / MEP_MIENG));
  }
  if (t < VANH_TREN) {
    // Vành miệng phình ra một chút rồi thót — đó là nét cuộn của vành.
    const u = (t - MEP_MIENG) / (VANH_TREN - MEP_MIENG);
    return BAN_VANH * (1 + 0.034 * Math.sin(u * Math.PI));
  }
  if (t < NHAN_DAU) {
    // Rãnh dưới vành: chỗ hẹp nhất của cả cái lon.
    return BAN_VANH * 0.992;
  }
  if (t < NHAN_DAU + mm(17.81)) {
    /*
     * Cổ lon: 17,81mm đúng như file bao bì ghi, nở dần ra bằng thân.
     * Đường cong lõm chứ không phải đường thẳng — vai lon thật phình dần.
     */
    const u = (t - NHAN_DAU) / mm(17.81);
    return BAN_VANH * 0.992 + (BAN_THAN - BAN_VANH * 0.992) * Math.sqrt(u);
  }
  if (t < RANH_DUOI - mm(2)) return BAN_THAN;
  if (t < RANH_DUOI) {
    // Góc dưới của thân, ngay trước rãnh đáy.
    const u = (t - (RANH_DUOI - mm(2))) / mm(2);
    return BAN_THAN - 0.042 * u;
  }
  if (t < VANH_DUOI) {
    // Rãnh đáy rồi vành đáy: cùng nét cuộn như trên miệng, lật ngược lại.
    const u = (t - RANH_DUOI) / (VANH_DUOI - RANH_DUOI);
    return 0.958 + 0.018 * Math.sin(u * Math.PI);
  }
  /*
   * Đáy lon cuộn vào theo một CUNG TRÒN, không phải hàm mũ: hàm mũ cho ra đáy
   * gần vuông, còn đáy lon thật cuốn vào theo một cung.
   */
  const u = Math.min(1, (t - VANH_DUOI) / (1 - VANH_DUOI));
  return 0.958 * (1 - 0.32 * (1 - Math.sqrt(Math.max(0, 1 - u * u))));
}

/**
 * Hệ số sáng riêng của hai đầu lon, nhân thêm vào độ sáng theo góc.
 *
 * Chỉ đổi bán kính thôi thì hai đầu vẫn là hai khối xám dẹt. Lon thật có một
 * mép tối ở trên cùng, một vành sáng ngay dưới, một rãnh tối ngăn vành với cổ —
 * và ở đáy thì đúng như vậy lật ngược.
 */
export function sangDauLon(t: number): number {
  if (t < MEP_MIENG) return 0.34;
  if (t < VANH_TREN) {
    const u = (t - MEP_MIENG) / (VANH_TREN - MEP_MIENG);
    return 0.62 + 0.55 * Math.sin(u * Math.PI);
  }
  if (t < NHAN_DAU) return 0.4;
  if (t <= NHAN_CUOI) return 1;
  if (t <= RANH_DUOI) return 0.42;
  if (t <= VANH_DUOI) {
    const u = (t - RANH_DUOI) / (VANH_DUOI - RANH_DUOI);
    // Bớt chói so với vành miệng: đáy lon hướng xuống nên ít đón sáng hơn.
    return 0.5 + 0.34 * Math.sin(u * Math.PI);
  }
  const u = Math.min(1, (t - VANH_DUOI) / (1 - VANH_DUOI));
  // Tối nhanh dần: mép dưới cùng gần như chìm hẳn vào bóng, nhờ vậy lon có vẻ
  // đặt trên một mặt phẳng chứ không lơ lửng.
  return 0.46 - 0.36 * Math.pow(u, 0.7);
}

/** Nhãn phủ tới độ cao này không. */
export function coNhan(t: number): boolean {
  return t >= NHAN_DAU && t <= NHAN_CUOI;
}

/* ---------------------------------------------------------------- bảng tra */

/**
 * Bảng tra theo vị trí ngang s ∈ [−1; 1], dựng một lần lúc khởi động.
 *
 * `beta` là góc mặt nghiêng, `sang` là độ sáng tại đó, `dGoc` là đạo hàm
 * dβ/ds — dùng để biết một điểm ảnh che bao nhiêu radian nhãn.
 */
export interface BangS {
  beta: Float32Array;
  sang: Float32Array;
  dGoc: Float32Array;
}

/**
 * Đạo hàm dβ/ds = 1/√(1−s²) tiến ra vô cùng ở hai mép.
 *
 * Chặn lại ở đây để bề rộng lấy mẫu không vọt lên vô hạn. 60 rad/đơn vị ứng
 * với s ≈ 0,99986 — sát mép tới mức một điểm ảnh cũng không phân biệt được,
 * mà vẫn đủ để phần trung bình bao trọn dải cuối.
 */
export const TRAN_DGOC = 60;

export function dungBangS(soBuc: number): BangS {
  const beta = new Float32Array(soBuc);
  const sang = new Float32Array(soBuc);
  const dGoc = new Float32Array(soBuc);
  for (let i = 0; i < soBuc; i++) {
    const s = (i / (soBuc - 1)) * 2 - 1;
    const b = Math.asin(s < -1 ? -1 : s > 1 ? 1 : s);
    beta[i] = b;
    sang[i] = doSang(b);
    const con = 1 - s * s;
    dGoc[i] = con <= 0 ? TRAN_DGOC : Math.min(TRAN_DGOC, 1 / Math.sqrt(con));
  }
  return { beta, sang, dGoc };
}

/**
 * Đưa một góc nhãn về cột trên ô nhãn, theo phần của bề rộng (0 ≤ u < 1).
 *
 * Cộng 0,5 để góc 0 — mặt trước lon — rơi vào giữa ô nhãn, đúng chỗ có logo.
 */
export function cotNhan(goc: number): number {
  const v = goc / (2 * Math.PI) + 0.5;
  return v - Math.floor(v);
}

/* ---------------------------------------------------- nhìn chếch từ trên */

/**
 * GÓC NHÌN CHẾCH TỪ TRÊN XUỐNG.
 *
 * Bản trước nhìn NGANG TUYỆT ĐỐI — mắt đặt đúng giữa thân lon. Ở góc ấy nắp lon
 * nằm đúng cạnh nên chỉ còn một vạch, không tài nào thấy được cái nắp khui. Đó
 * là lý do đỉnh lon trông như bị cắt cụt.
 *
 * Mọi ảnh chụp lon bia đều chếch từ trên xuống, đủ để thấy mặt nắp thành một
 * hình bầu dục.
 *
 * 22° là chỗ vừa. Thử 12° thì nắp dẹt còn một phần năm bề ngang, cái khoen bị
 * bóp lại thành một cục không đọc ra hình gì. Quá 30° thì thành nhìn từ trên
 * xuống, thân lon bị bóp ngắn và nhãn mất chỗ. 22° thấy rõ cả cái nắp khui mà
 * thân chỉ ngắn đi bảy phần trăm.
 *
 * Hệ quả quan trọng: MỌI ĐƯỜNG NGANG TRÊN NHÃN THÀNH MỘT CUNG CONG. Một vòng
 * tròn nằm ngang, nhìn chếch, chiếu ra thành hình bầu dục — nên mép trên của
 * nhãn võng xuống ở phía gần mắt và cong lên ở phía xa. Chính cái võng ấy làm
 * mắt đọc ra vật tròn xoay, chứ không phải một cái ống dán giấy.
 */
export const NGHIENG = (22 * Math.PI) / 180;
export const SIN_NGHIENG = Math.sin(NGHIENG);
export const COS_NGHIENG = Math.cos(NGHIENG);

/**
 * NẮP LON NHÌN TỪ TRÊN XUỐNG — trả hệ số sáng tại một điểm trên mặt nắp.
 *
 * Nhận HAI hệ toạ độ, và đó là chỗ dễ nhầm nhất:
 *
 *   · `rho`, `psi` — toạ độ TRONG MẶT NẮP, xoay theo lon. Mọi chi tiết dập nổi
 *     dùng hệ này: cái khoen gắn chặt vào nắp nên phải quay theo lon.
 *   · `u`, `v` — toạ độ TRÊN MÀN HÌNH, đứng yên. Ánh sáng dùng hệ này: đèn
 *     không quay theo lon. Lấy nhầm hệ thì vệt sáng bám dính lấy cái khoen và
 *     quay vòng vòng cùng nó, nhìn rất giả.
 *
 * Dựng theo đúng cấu tạo nắp lon 202 loại giật (khoen ở lại trên nắp):
 *
 *   mép ghép mí cuộn tròn → rãnh chìm quanh nắp → mặt nắp hơi lõm
 *   → đường khắc hình giọt nước → khoen: đinh tán giữa, mũi đè lên đường khắc,
 *     đuôi loe ra có lỗ móc ngón tay
 */
export function napLon(rho: number, psi: number, u: number, v: number): number {
  /*
   * ÁNH SÁNG MÔI TRƯỜNG TRÊN MẶT NẮP.
   *
   * Mặt nắp nằm ngang nên xét thuần theo hướng thì chỗ nào cũng sáng như nhau,
   * và ra một mảng bạc phẳng lì. Nắp thật không vậy: nó hơi lõm và bóng, nên
   * soi cả bầu trời phía trên — mép xa sáng, mép gần tối dần. Chính dải chuyển
   * ấy làm mắt đọc ra mặt kim loại chứ không phải miếng bìa xám.
   */
  const moiTruong = 0.86 + 0.26 * (0.5 - v * 0.5);

  // Mép ghép mí: hai vòng, vòng ngoài hơi tối, đỉnh mí bắt sáng.
  if (rho > 0.975) return 0.86 * moiTruong;
  if (rho > 0.935) return 1.16 * moiTruong;
  // Rãnh chìm quanh nắp — vòng tối rõ nhất trên cả cái nắp.
  if (rho > 0.875) return 0.48 * moiTruong;
  if (rho > 0.84) return 1.02 * moiTruong;

  // Mặt nắp hơi lõm: giữa tối hơn rìa một chút.
  let sang = (0.78 + 0.2 * rho * rho) * moiTruong;
  // Vệt chói chéo, đứng yên theo màn hình.
  sang += 0.16 * Math.exp(-Math.pow((u * 0.7 + v * 0.7 + 0.25) * 2.4, 2));

  // Toạ độ vuông góc TRONG MẶT NẮP; khoen nằm dọc trục py, đuôi về phía dương.
  const px = rho * Math.sin(psi);
  const py = rho * Math.cos(psi);

  /*
   * Đường khắc hình giọt nước, nằm ở nửa đối diện với lỗ móc tay. Chỉ tô ĐƯỜNG
   * VIỀN chứ không tô ruột: trên nắp thật đó là một rãnh khắc chìm, không phải
   * một mảng khác màu.
   */
  const dKhac = Math.hypot(px / 0.85, (py + 0.28) / 1.15);
  if (py < -0.14 && Math.abs(dKhac - 0.32) < 0.026) sang *= 0.74;

  /*
   * Thân khoen: loe dần từ mũi ra đuôi, không phải một thanh đều. Nửa bề rộng
   * đi từ 0,095 ở mũi lên 0,21 ở đuôi — đó là cái làm nó ra hình cái khoen chứ
   * không phải cái que.
   */
  const trong = py > -0.5 && py < 0.76;
  if (trong) {
    const doc = (py + 0.5) / 1.26; // 0 ở mũi, 1 ở đuôi
    const nuaRong = 0.115 + 0.115 * doc * doc;
    const ngoaiRia = Math.abs(px) - nuaRong;
    if (ngoaiRia < 0) {
      sang *= 1.14;
      // Viền khoen dập nổi: một vạch mảnh tối chạy quanh mép.
      if (ngoaiRia > -0.022) sang *= 0.66;
    }
  }

  // Lỗ móc ngón tay ở đuôi khoen — nhìn xuyên xuống mặt nắp nên tối.
  const dLo = Math.hypot(px / 0.1, (py - 0.44) / 0.2);
  if (dLo < 1) sang *= dLo > 0.8 ? 0.62 : 0.4;

  // Đinh tán giữa nắp: núm nhôm dập nổi, bắt sáng rõ nhất trên cả cái nắp.
  const dTan = Math.hypot(px, py);
  if (dTan < 0.062) sang *= 1.3;
  else if (dTan < 0.086) sang *= 0.66;

  return sang;
}
