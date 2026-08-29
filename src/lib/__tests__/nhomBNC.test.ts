/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BỐN NHÓM CỦA BNC
 *
 * Phép kiểm quan trọng nhất ở đây: MỌI bộ phận của BNC trong danh mục phải rơi
 * vào đúng một nhóm, và 18 điểm bán mà bộ phận liệt kê phải nằm trong Nội bộ.
 * Kiểm bằng chính `INITIAL_PARTNERS` chứ không bằng danh sách tự bịa — chia
 * nhóm đúng trên dữ liệu giả mà sai trên danh mục thật thì vô nghĩa.
 */

import { INITIAL_PARTNERS } from "../../constants";
import {
  laBoPhanBNC,
  nhomCuaBoPhan,
  NHOM_BNC,
  phaiChonBoPhan,
  tenNhomBNC,
  tenNhomCuaBoPhan,
  type MaNhomBNC,
} from "../nhomBNC";

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
const dung = (ten: string, x: boolean) => eq(ten, x, true);

// ------------------------------------------------------------ dinh nghia nhom

eq("dung bon nhom", NHOM_BNC.length, 4);
eq(
  "dung thu tu Noi bo, Ngoai giao, HTKD, Chi phi khac",
  NHOM_BNC.map((n) => n.ten),
  ["Nội bộ", "Ngoại giao", "HTKD", "Chi phí khác"],
);
eq("ma nhom khong trung", new Set(NHOM_BNC.map((n) => n.ma)).size, 4);

// Chi Noi bo la phai chon tiep diem ban; ba nhom con lai bam la xong.
eq("Noi bo phai chon tiep diem ban", phaiChonBoPhan("NB"), true);
eq("Ngoai giao khong phai chon tiep", phaiChonBoPhan("NG"), false);
eq("HTKD khong phai chon tiep", phaiChonBoPhan("HTKD"), false);
eq("Chi phi khac khong phai chon tiep", phaiChonBoPhan("CPK"), false);

// Bo phan rieng cua ba nhom phai co that trong danh muc, khong thi bam vao la
// ghi giao dich cho mot doi tac khong ton tai.
NHOM_BNC.filter((n) => n.boPhan).forEach((n) => {
  dung(
    `bo phan ${n.boPhan} cua nhom ${n.ten} co trong danh muc`,
    INITIAL_PARTNERS.some((p) => p.id === n.boPhan),
  );
});

// ------------------------------------------------------------ tra nhom

eq("ngoai BNC thi khong co nhom", nhomCuaBoPhan("AC0107"), null);
eq("chuoi rong", nhomCuaBoPhan(""), null);
eq("BNC tron cung khong phai bo phan", nhomCuaBoPhan("AD0103"), null);
eq("Ngoai giao", nhomCuaBoPhan("AD0103-NG"), "NG");
eq("HTKD", nhomCuaBoPhan("AD0103-HTKD"), "HTKD");
eq("Chi phi khac", nhomCuaBoPhan("AD0103-CPK"), "CPK");
eq("diem ban la Noi bo", nhomCuaBoPhan("AD0103-1901"), "NB");
// Quan moi mo chua ai gan phai vao Noi bo, khong duoc roi ra ngoai bon nhom.
eq("bo phan la roi vao Noi bo", nhomCuaBoPhan("AD0103-QUANMOI"), "NB");

eq("ten nhom", tenNhomBNC("NG"), "Ngoại giao");
eq("ten nhom cua bo phan", tenNhomCuaBoPhan("AD0103-CV"), "Nội bộ");
eq("ngoai BNC thi ten rong", tenNhomCuaBoPhan("AC0107"), "");
eq("khong co nhom thi ten rong", tenNhomBNC(null), "");

// ------------------------------------------------------------ tren danh muc that

const boPhanBNC = INITIAL_PARTNERS.filter((p) => laBoPhanBNC(p.id));
eq("danh muc co 21 bo phan BNC", boPhanBNC.length, 21);

// Khong bo phan nao khong co nhom.
eq(
  "moi bo phan deu co nhom",
  boPhanBNC.filter((p) => !nhomCuaBoPhan(p.id)).map((p) => p.id),
  [],
);

// Dem theo nhom: 18 diem ban + moi nhom con lai dung mot bo phan.
const dem = new Map<MaNhomBNC, string[]>();
boPhanBNC.forEach((p) => {
  const n = nhomCuaBoPhan(p.id) as MaNhomBNC;
  dem.set(n, [...(dem.get(n) ?? []), p.name]);
});
eq("Noi bo co 18 diem ban", dem.get("NB")?.length, 18);
eq("Ngoai giao dung mot bo phan", dem.get("NG")?.length, 1);
eq("HTKD dung mot bo phan", dem.get("HTKD")?.length, 1);
eq("Chi phi khac dung mot bo phan", dem.get("CPK")?.length, 1);
eq(
  "cong bon nhom lai bang tong so bo phan",
  (dem.get("NB")?.length ?? 0) +
    (dem.get("NG")?.length ?? 0) +
    (dem.get("HTKD")?.length ?? 0) +
    (dem.get("CPK")?.length ?? 0),
  boPhanBNC.length,
);

// Dung 18 diem ban ma bo phan liet ke, khong thieu khong thua.
{
  const mong = [
    "1901",
    "Plaza",
    "Lễ Hội Bia",
    "4 Mùa",
    "Kavkaz",
    "Taiga",
    "Hội An",
    "Cổng Thành 1",
    "Sunbun Vạn Hoa",
    "Cầu Vàng",
    "Ga 10",
    "Rosa Gà Rán",
    "Shushi Rosa",
    "B8",
    "Lâu Đài",
    "Bulgogi",
    "Arapang",
    "Gastrobup",
  ];
  const thuc = (dem.get("NB") ?? []).map((t) => t.replace(/^BNC · /, ""));
  eq(
    "Noi bo dung 18 diem ban bo phan liet ke",
    [...thuc].sort((a, b) => a.localeCompare(b, "vi")),
    [...mong].sort((a, b) => a.localeCompare(b, "vi")),
  );
}

// Ba nhom kia khong duoc lot vao Noi bo — day la loi de xay ra nhat neu doi
// cach suy nhom, vi Ngoai giao/HTKD/CPK cung mang tien to AD0103-.
["AD0103-NG", "AD0103-HTKD", "AD0103-CPK"].forEach((id) => {
  eq(`${id} khong nam trong Noi bo`, nhomCuaBoPhan(id) === "NB", false);
});

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);
