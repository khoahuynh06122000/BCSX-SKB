/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA PHÉP TÍNH LON XOAY
 *
 * Thứ phải giữ bằng mọi giá: nhãn là một VÒNG TRÒN LIỀN, nên xoay bao nhiêu
 * vòng cũng phải về đúng chỗ cũ, và không góc nào rơi ra ngoài ô nhãn. Đó
 * chính là điều mà cách dùng hai ảnh chụp không làm được — chỗ nối hai ảnh
 * không có dữ liệu nên nhoè.
 */

import {
  COS_NGHIENG,
  GOC_SANG,
  MEP_MIENG,
  NHAN_CUOI,
  NHAN_DAU,
  NGHIENG,
  RANH_DUOI,
  SIN_NGHIENG,
  TRAN_DGOC,
  VANH_DUOI,
  VANH_TREN,
  banKinhTheoHang,
  coNhan,
  cotNhan,
  doSang,
  dungBangS,
  napLon,
  sangDauLon,
} from "../lonXoay";

let pass = 0;
let fail = 0;
const eq = (ten: string, a: unknown, b: unknown) => {
  const s = (x: unknown) => JSON.stringify(x);
  if (s(a) === s(b)) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${s(a)}\n     mong doi: ${s(b)}`);
  }
};
const gan = (ten: string, a: number, b: number, sai = 1e-9) => {
  if (Math.abs(a - b) <= sai) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${a}\n     mong doi: ${b} (+-${sai})`);
  }
};
const dung = (ten: string, x: boolean) => eq(ten, x, true);

const PI = Math.PI;

// ------------------------------------------------------------- độ sáng

gan("dinh sang dung tai huong nguon sang", doSang(GOC_SANG), 1);
dung("do sang luon duong", doSang(0) > 0 && doSang(PI) > 0);
dung("quay lung lai thi toi nhat", doSang(GOC_SANG + PI) < doSang(GOC_SANG));
dung("chinh dien sang hon nghieng 60 do", doSang(0) > doSang(PI / 3));
// Nền môi trường 0,3 nên mặt khuất vẫn không đen kịt — lon không thủng lỗ.
dung("mat khuat van con anh sang nen", doSang(PI) > 0.1);

// ------------------------------------------------- nhãn là một vòng tròn

eq("goc 0 roi vao giua o nhan", cotNhan(0), 0.5);
gan("nua vong roi vao mep", cotNhan(PI), 0);
gan("quay tron mot vong ve cho cu", cotNhan(2 * PI), 0.5);
gan("quay ba vong van ve cho cu", cotNhan(6 * PI), 0.5, 1e-12);
gan("quay nguoc mot vong ve cho cu", cotNhan(-2 * PI), 0.5, 1e-12);
gan("mot phan tu vong", cotNhan(PI / 2), 0.75);
gan("nguoc mot phan tu vong", cotNhan(-PI / 2), 0.25);

// Không góc nào rơi ra ngoài ô nhãn — đây là điều kiện để không có chỗ nào
// thiếu dữ liệu, tức không có chỗ nào nhoè.
{
  let ngoai = 0;
  for (let i = -720; i <= 720; i++) {
    const u = cotNhan((i / 40) * PI);
    if (!(u >= 0 && u < 1)) ngoai++;
  }
  eq("moi goc deu roi trong o nhan", ngoai, 0);
}

// ------------------------------------------------------- dáng hình lon

// Mốc cao độ phải xếp đúng thứ tự từ đỉnh xuống đáy.
dung(
  "moc cao do dung thu tu",
  0 < MEP_MIENG &&
    MEP_MIENG < VANH_TREN &&
    VANH_TREN < NHAN_DAU &&
    NHAN_DAU < NHAN_CUOI &&
    NHAN_CUOI < RANH_DUOI &&
    RANH_DUOI < VANH_DUOI &&
    VANH_DUOI < 1,
);

// Nhãn cao 107mm trên lon cao 115,2mm.
gan("nhan chiem dung 107/115,2 chieu cao", NHAN_CUOI - NHAN_DAU, 107 / 115.2, 1e-9);

eq("dinh lon khong co nhan", coNhan(0), false);
eq("giua than co nhan", coNhan(0.5), true);
eq("day lon khong co nhan", coNhan(0.999), false);

// Vành miệng phải hẹp hơn thân rõ rệt — lon 330ml that la 26,1 / 33,1.
dung("vanh mieng hep hon than", banKinhTheoHang(0.004) < 0.85);
gan("giua than la ban kinh day du", banKinhTheoHang(0.5), 1, 1e-9);
dung("day lon thop lai", banKinhTheoHang(0.999) < 0.75);

// Bán kính không bao giờ vượt thân: vượt là lon phình ra ngoài khung vẽ.
{
  let vuot = 0;
  let am = 0;
  for (let i = 0; i <= 2000; i++) {
    const r = banKinhTheoHang(i / 2000);
    if (r > 1.000001) vuot++;
    if (r <= 0) am++;
  }
  eq("ban kinh khong vuot than", vuot, 0);
  eq("ban kinh luon duong", am, 0);
}

/*
 * Bóng lon phải LIỀN, không nhảy bậc: nhảy một cái là thấy ngay lúc quay.
 *
 * Chừa hai phần nghìn cuối: đáy lon cuộn theo một cung tròn nên ở đúng mép
 * dưới cùng, tiếp tuyến dựng đứng và bán kính tụt rất nhanh. Đó là hình dáng
 * thật của đáy lon chứ không phải chỗ đứt, nên kiểm riêng bên dưới.
 */
{
  let nhay = 0;
  let truoc = banKinhTheoHang(0);
  for (let i = 1; i <= 3990; i++) {
    const r = banKinhTheoHang(i / 4000);
    if (Math.abs(r - truoc) > 0.02) nhay++;
    truoc = r;
  }
  eq("bong lon khong nhay bac", nhay, 0);
}

// Đáy cuộn vào một chiều, không phình ra rồi thót lại.
{
  let phinh = 0;
  let truoc = banKinhTheoHang(VANH_DUOI);
  for (let i = 1; i <= 200; i++) {
    const t = VANH_DUOI + ((1 - VANH_DUOI) * i) / 200;
    const r = banKinhTheoHang(t);
    if (r > truoc + 1e-9) phinh++;
    truoc = r;
  }
  eq("day chi cuon vao, khong phinh ra", phinh, 0);
}

// ------------------------------------------------- dải sáng hai đầu lon

gan("than lon khong bi to them", sangDauLon(0.5), 1, 1e-9);
dung("mep mieng toi", sangDauLon(0.002) < 0.5);
dung("vanh mieng sang hon mep", sangDauLon(VANH_TREN * 0.6) > sangDauLon(0.002));
dung("ranh duoi vanh toi lai", sangDauLon((VANH_TREN + NHAN_DAU) / 2) < 0.5);
dung("ranh day toi", sangDauLon((NHAN_CUOI + RANH_DUOI) / 2) < 0.5);
dung(
  "vanh day sang hon ranh day",
  sangDauLon((RANH_DUOI + VANH_DUOI) / 2) > sangDauLon((NHAN_CUOI + RANH_DUOI) / 2),
);
dung("mep duoi cung toi nhat", sangDauLon(1) < 0.15);
// Vành đáy hướng xuống nên không được chói bằng vành miệng.
dung(
  "vanh day diu hon vanh mieng",
  sangDauLon((RANH_DUOI + VANH_DUOI) / 2) <
    sangDauLon((MEP_MIENG + VANH_TREN) / 2),
);
{
  let am = 0;
  for (let i = 0; i <= 2000; i++) if (sangDauLon(i / 2000) <= 0) am++;
  eq("he so sang luon duong", am, 0);
}

// ----------------------------------------------------------- bảng tra

{
  const b = dungBangS(1024);
  eq("bang du bac", b.beta.length, 1024);
  gan("mep trai la -90 do", b.beta[0], -PI / 2, 1e-6);
  gan("giua la 0 do", b.beta[512], Math.asin(1 / 1023), 1e-6);
  gan("mep phai la +90 do", b.beta[1023], PI / 2, 1e-6);

  // Góc phải tăng đều từ trái sang phải, không được quay ngược.
  let lui = 0;
  for (let i = 1; i < 1024; i++) if (b.beta[i] < b.beta[i - 1]) lui++;
  eq("goc tang deu tu trai sang phai", lui, 0);

  // Độ sáng trong bảng phải khớp `doSang` của chính góc đó.
  let lech = 0;
  for (let i = 0; i < 1024; i += 7) {
    if (Math.abs(b.sang[i] - doSang(b.beta[i])) > 1e-6) lech++;
  }
  eq("do sang trong bang khop doSang", lech, 0);

  /*
   * dβ/ds = 1/√(1−s²): ở giữa bằng 1, ra mép tiến ra vô cùng nên phải bị chặn.
   * Không chặn thì bề rộng lấy mẫu vọt lên vô hạn và vòng vẽ chạy mãi.
   */
  gan("giua lon khong nen", b.dGoc[512], 1, 0.01);
  eq("hai mep bi chan tran", [b.dGoc[0], b.dGoc[1023]], [TRAN_DGOC, TRAN_DGOC]);
  let qua = 0;
  for (let i = 0; i < 1024; i++) if (b.dGoc[i] > TRAN_DGOC + 1e-6) qua++;
  eq("khong bac nao vuot tran", qua, 0);
  // Càng ra mép càng nén — đó là lý do phải lấy trung bình cả khoảng.
  dung("cang ra mep cang nen", b.dGoc[1000] > b.dGoc[700] && b.dGoc[700] > b.dGoc[512]);
}

// ------------------------------------------- nhìn chếch từ trên xuống

gan("sin khop goc chech", SIN_NGHIENG, Math.sin(NGHIENG), 1e-12);
gan("cos khop goc chech", COS_NGHIENG, Math.cos(NGHIENG), 1e-12);
/*
 * Phải chếch THẬT nhưng đừng nhiều. Bằng 0 thì nắp nằm đúng cạnh, không tài
 * nào thấy cái khoen — đúng cái tật khiến đỉnh lon trông như bị cắt cụt. Quá
 * 30° thì thành nhìn từ trên xuống, thân lon bị bóp ngắn và nhãn mất chỗ.
 */
dung("goc chech nam trong khoang dung", NGHIENG > 0.2 && NGHIENG < 0.55);

// ---------------------------------------------------------- nắp lon

/*
 * Ánh sáng trên nắp phải theo TOẠ ĐỘ MÀN HÌNH, còn chi tiết dập nổi theo toạ
 * độ trong mặt nắp. Lấy nhầm hệ thì vệt sáng bám dính lấy cái khoen và quay
 * vòng vòng cùng nó, nhìn rất giả.
 */
dung(
  "mep xa sang hon mep gan",
  napLon(0.5, 2.2, 0, -0.5) > napLon(0.5, 2.2, 0, 0.5),
);
// Cùng một chỗ trên màn hình, xoay lon đi thì chi tiết đổi — khoen quay theo.
dung(
  "chi tiet dap noi xoay theo lon",
  Math.abs(napLon(0.45, 0, 0, 0.45) - napLon(0.45, PI, 0, 0.45)) > 0.05,
);
/*
 * Rãnh chìm quanh nắp phải tối hơn cả mặt nắp lẫn mép ghép mí.
 *
 * Lấy điểm so sánh ở psi = π/2, tức lệch hẳn sang bên — chỗ đó là mặt nắp
 * trơn. Lấy psi = 0 thì rơi trúng cái khoen, và tệ hơn là trúng lỗ móc ngón
 * tay, vốn cố ý tối.
 */
dung(
  "ranh chim toi hon mat nap",
  napLon(0.9, PI / 2, 0.9, 0) < napLon(0.6, PI / 2, 0.6, 0),
);
dung(
  "ranh chim toi hon mep ghep mi",
  napLon(0.9, PI / 2, 0.9, 0) < napLon(0.95, PI / 2, 0.95, 0),
);
// Đinh tán giữa nắp là chỗ bắt sáng rõ nhất.
dung(
  "dinh tan sang hon than khoen",
  napLon(0.02, 0, 0, 0.02) > napLon(0.3, 0, 0, 0.3),
);
// Lỗ móc ngón tay nhìn xuyên xuống nên tối hơn thân khoen.
dung(
  "lo moc tay toi hon than khoen",
  napLon(0.44, 0, 0, 0.44) < napLon(0.2, 0, 0, 0.2),
);
{
  let am = 0;
  let vot = 0;
  for (let i = 0; i <= 60; i++) {
    for (let j = 0; j < 24; j++) {
      const rho = i / 60;
      const psi = (j / 24) * 2 * PI;
      const h = napLon(rho, psi, rho * Math.sin(psi), rho * Math.cos(psi));
      if (!(h > 0)) am++;
      if (h > 2) vot++;
    }
  }
  eq("he so sang cua nap luon duong", am, 0);
  eq("he so sang cua nap khong vot qua cao", vot, 0);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);
