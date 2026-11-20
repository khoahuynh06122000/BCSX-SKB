import {
  bamSha256,
  chuKyDuNet,
  idChuKyMau,
  laMauCua,
  maBamNgan,
  mauMoiNhat,
  netTuDiem,
  noiDungKiemKeBon,
  noiDungKiemKeKeg,
  noiDungPhieuNhap,
  type ChuKyMau,
} from "../chuKy";

let pass = 0;
let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: duoc ${JSON.stringify(a)}, mong ${JSON.stringify(b)}`);
  }
};

(async () => {
  // --- id mẫu
  const id = idChuKyMau("abcUID123", new Date(2026, 10, 20, 8, 5, 9));
  eq("id mau dung khuon", id, "abcUID123_20261120080509");
  eq("mau cua dung nguoi", laMauCua(id, "abcUID123"), true);
  eq("mau cua nguoi khac", laMauCua(id, "abcUID12"), false);
  eq("id sai duoi", laMauCua("abcUID123_2026", "abcUID123"), false);
  eq("uid rong", laMauCua(id, ""), false);

  // --- nét vẽ
  eq(
    "net SVG lam tron 1 so le",
    netTuDiem([[{ x: 1.234, y: 2 }, { x: 3, y: 4.56 }]]),
    "M1.2 2L3 4.6",
  );
  eq("cham don thanh vach ngan", netTuDiem([[{ x: 5, y: 5 }]]), "M5 5L5.5 5");
  eq("bo net rong", netTuDiem([[], [{ x: 1, y: 1 }, { x: 2, y: 2 }]]), "M1 1L2 2");
  const net = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 50 }));
  eq("chu ky du net", chuKyDuNet([net], 600), true);
  eq("it diem qua", chuKyDuNet([net.slice(0, 5)], 600), false);
  eq("gach ngan qua", chuKyDuNet([net.map((p) => ({ ...p, x: p.x / 10 }))], 600), false);

  // --- mẫu mới nhất
  const m = (i: string, uid: string): ChuKyMau => ({
    id: i, uid, email: "", ten: "", net: "", rong: 1, cao: 1, bam: "", taoLuc: "",
  });
  const ds = [
    m("u1_20261101000000", "u1"),
    m("u1_20261120000000", "u1"),
    m("u2_20261130000000", "u2"),
    m("u2_20261201000000", "u1"), // id của u2 nhưng ghi uid u1: không nhận
  ];
  eq("mau moi nhat u1", mauMoiNhat(ds, "u1")?.id, "u1_20261120000000");
  eq("chua co mau", mauMoiNhat(ds, "u3"), null);

  // --- nội dung phiếu
  const a = noiDungPhieuNhap("PN-261120-01", "2026-11-20T08:00", [
    { productId: "p2", quantity: 10 },
    { productId: "p1", quantity: 20.6 },
  ]);
  const b = noiDungPhieuNhap("PN-261120-01", "2026-11-20", [
    { productId: "p1", quantity: 20.6 },
    { productId: "p2", quantity: 10 },
  ]);
  eq("thu tu dong khong doi noi dung", a, b);
  eq("noi dung dang chuan", b, "PHIEU_NHAP|PN-261120-01|2026-11-20|p1=20.6;p2=10");
  const c = noiDungPhieuNhap("PN-261120-01", "2026-11-20", [
    { productId: "p1", quantity: 20.6 },
    { productId: "p2", quantity: 11 },
  ]);
  const ba = await bamSha256(a);
  const bc = await bamSha256(c);
  eq("bam 64 ky tu hex", /^[0-9a-f]{64}$/.test(ba), true);
  eq("sua so luong thi doi bam", ba === bc, false);
  eq("bam on dinh", ba, await bamSha256(b));
  eq(
    "sha256 chuan (abc)",
    await bamSha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  eq("ma bam ngan", maBamNgan("ba7816bf8f01cfea41"), "BA78-16BF-8F01-CFEA");

  // --- biên bản kiểm kê
  const kk = {
    id: "kk-keg-kho_tong-2026-11-20-1", date: "2026-11-20", location: "KHO_TONG",
    shiftOrPeriod: "CHỐT THÁNG · Tại Kho tổng", totalKegs: 21,
    items: [{ productId: "p2", quantity: 48, kienDem: 2 }, { productId: "p1", quantity: 422.9, leDem: 10.9 }],
  };
  eq(
    "noi dung kiem ke keg (bo truong phu, xep mat hang)",
    noiDungKiemKeKeg(kk),
    "KIEM_KE_KEG|kk-keg-kho_tong-2026-11-20-1|2026-11-20|KHO_TONG|CHỐT THÁNG · Tại Kho tổng|21|p1=422.9;p2=48",
  );
  eq(
    "sua so keg thi doi noi dung",
    noiDungKiemKeKeg({ ...kk, totalKegs: 20 }) === noiDungKiemKeKeg(kk),
    false,
  );
  eq(
    "noi dung kiem ke bon",
    noiDungKiemKeBon({ id: "kk-2026-11-FST01-1", month: "2026-11", tankId: "FST01", productId: "p1", batchNumber: " L1 ", liters: 1200 }),
    "KIEM_KE_BON|kk-2026-11-FST01-1|2026-11|FST01|p1|L1|1200",
  );

  console.log(`=========== ${pass} DUNG / ${fail} SAI ===========`);
  if (fail) process.exit(1);
})();
