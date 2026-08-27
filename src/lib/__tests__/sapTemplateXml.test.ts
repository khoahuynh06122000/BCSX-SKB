/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRÊN CHÍNH TỆP MẪU THẬT, không dựng XML giả.
 *
 * Cả việc này chỉ có một yêu cầu: tệp xuất ra phải giống tệp mẫu ở mọi thứ trừ
 * phần dữ liệu. Kiểm bằng XML tự bịa thì không chứng minh được điều đó. Ở đây
 * đọc thẳng `src/assets/mau-template-sap.xlsx` rồi so từng ô.
 */

import fs from "node:fs";
import { CAU_HINH_MAC_DINH, dungTepSap, MA_TRUONG_SAP, type DongHangSap } from "../sapTemplate";
import { boCalcChain, HANG_DAU_DU_LIEU, suaSheetVaChu, tenCot } from "../sapTemplateXml";
import { docZip, giaiNen, suaXlsx } from "../zipXlsx";

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

// ------------------------------------------------------------ ten cot

eq("cot dau", tenCot(0), "A");
eq("cot Z", tenCot(25), "Z");
eq("cot AA", tenCot(26), "AA");
eq("cot AB", tenCot(27), "AB");
eq("cot BSCHL o vi tri 13", tenCot(13), "N");
eq("cot cuoi cua tep mau", tenCot(115), "DL");

// ------------------------------------------------------------ bo calcChain

{
  const ct =
    '<Types><Override PartName="/xl/calcChain.xml" ContentType="a"/><Override PartName="/xl/styles.xml" ContentType="b"/></Types>';
  const rels =
    '<Relationships><Relationship Id="rId3" Target="calcChain.xml"/><Relationship Id="rId4" Target="styles.xml"/></Relationships>';
  const ra = boCalcChain(ct, rels);
  dung("bo khai bao calcChain o Content_Types", !ra.contentTypes.includes("calcChain"));
  dung("giu lai khai bao khac", ra.contentTypes.includes("styles.xml"));
  dung("bo khai bao calcChain o rels", !ra.rels.includes("calcChain"));
  dung("giu lai quan he khac", ra.rels.includes("styles.xml"));
}

// ------------------------------------------------------------ sua tep mau that

const goc = new Uint8Array(fs.readFileSync("src/assets/mau-template-sap.xlsx"));
const muc = docZip(goc);
const doc = async (ten: string) => {
  const m = muc.find((x) => x.ten === ten);
  if (!m) throw new Error(`thieu ${ten}`);
  return new TextDecoder().decode(await giaiNen(m));
};

dung("tep mau doc duoc, co du muc", muc.length >= 10);
dung("co sheet1.xml", muc.some((m) => m.ten === "xl/worksheets/sheet1.xml"));

const sheetGoc = await doc("xl/worksheets/sheet1.xml");
const chuGoc = await doc("xl/sharedStrings.xml");

const dong: DongHangSap[] = [
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Golden Bridge", soLuong: 100.5, dvt: "LIT", thanhTien: 3015000 },
  { maBp: "AC0107", donVi: "FV", tenHangHoa: "Bia Wings Dark Lager", soLuong: 82.4, dvt: "LIT", thanhTien: 2472000 },
];
const tep = dungTepSap({ dong, ngayChungTu: "2026-08-27", cauHinh: CAU_HINH_MAC_DINH });
const { sheetXml, chuXml } = suaSheetVaChu(sheetGoc, chuGoc, tep);

const hangCuoi = HANG_DAU_DU_LIEU + tep.oDong.length - 1;

// Nam hang tieu de phai con y nguyen tung byte.
for (let r = 1; r <= 5; r++) {
  const lay = (x: string) =>
    new RegExp(`<row r="${r}"[^>]*>.*?</row>`, "s").exec(x)?.[0] ?? "";
  eq(`hang tieu de ${r} khong doi mot byte`, lay(sheetXml), lay(sheetGoc));
}

// Moi thu ngoai vung du lieu chi duoc doi so hang cuoi.
{
  const ngoai = (x: string) =>
    x.slice(0, x.indexOf("<sheetData>")) +
    x.slice(x.indexOf("</sheetData>") + "</sheetData>".length);
  const a = ngoai(sheetGoc)
    .replace(/<dimension ref="[^"]*"/, "D")
    .replace(/<autoFilter ref="[^"]*"/, "F");
  const b = ngoai(sheetXml)
    .replace(/<dimension ref="[^"]*"/, "D")
    .replace(/<autoFilter ref="[^"]*"/, "F");
  eq("gop o, vung in, khung, co, khoa dong deu khong doi", b, a);
  // Chi doi so hang; chu cot phai giu nguyen cua tep mau (DM cho dimension,
  // DL cho vung loc — hai cai nay khac nhau san trong tep mau).
  eq(
    "dimension chi doi so hang",
    /<dimension ref="[^"]*"/.exec(sheetXml)?.[0],
    `<dimension ref="A1:DM${hangCuoi}"`,
  );
  eq(
    "vung loc chi doi so hang, giu cot DL",
    /<autoFilter ref="[^"]*"/.exec(sheetXml)?.[0],
    `<autoFilter ref="A5:DL${hangCuoi}"`,
  );
}

// Dinh dang tung o cua dong du lieu phai lay dung tu hang mau cua tep mau.
{
  const kieu = (x: string, r: number) => {
    const m = new RegExp(`<row r="${r}"([^>]*)>(.*?)</row>`, "s").exec(x);
    if (!m) return null;
    return {
      thuocTinh: m[1].replace(/\s*spans="[^"]*"/, ""),
      o: [...m[2].matchAll(/<c r="([A-Z]+)\d+"(?: s="(\d+)")?/g)].map(
        (c) => `${c[1]}:${c[2] ?? ""}`,
      ),
    };
  };
  const mauNo = kieu(sheetGoc, 6);
  const mauCo = kieu(sheetGoc, 7);
  eq("hang mau No cua tep mau du 116 o", mauNo?.o.length, 116);
  eq("hang mau Co cua tep mau du 116 o", mauCo?.o.length, 116);
  dung("hai hang mau to khac nhau", JSON.stringify(mauNo?.o) !== JSON.stringify(mauCo?.o));

  // Dong nao la No thi doc tu chinh du lieu, khong doan theo so hang.
  const cotBschl = MA_TRUONG_SAP.indexOf("BSCHL");
  tep.oDong.forEach((d, i) => {
    const r = HANG_DAU_DU_LIEU + i;
    const k = kieu(sheetXml, r);
    eq(`hang ${r} du 116 o ke san`, k?.o.length, 116);
    const mau = String(d[cotBschl]?.v) === "01" ? mauNo : mauCo;
    eq(`hang ${r} dinh dang giong hang mau cua tep mau`, k, {
      thuocTinh: mau?.thuocTinh,
      o: mau?.o,
    });
  });
  eq("khong sinh them hang nao", kieu(sheetXml, hangCuoi + 1), null);
}

// Bang chu dung chung: chi them, khong sua chu cu, va dem lai cho dung.
{
  const soCu = Number(/uniqueCount="(\d+)"/.exec(chuGoc)?.[1]);
  const soMoi = Number(/uniqueCount="(\d+)"/.exec(chuXml)?.[1]);
  dung("them chu moi vao bang chu", soMoi > soCu);
  const si = (x: string) => (x.match(/<si>/g) || []).length;
  eq("so muc <si> khop uniqueCount", si(chuXml), soMoi);
  dung("giu nguyen toan bo chu cu", chuXml.includes(chuGoc.slice(chuGoc.indexOf("<si>"), chuGoc.indexOf("</sst>"))));
  dung("chu tieng Viet co dau vao duoc", chuXml.includes("Bia Wings Dark Lager"));
}

// Khong con cong thuc nao trong vung du lieu, vi da bo calcChain.
dung(
  "khong de lai cong thuc sau khi bo calcChain",
  !sheetXml.slice(sheetXml.indexOf(`<row r="${HANG_DAU_DU_LIEU}"`)).includes("<f "),
);

// ------------------------------------------------------------ dong lai tep zip

// Dong lai ma khong sua gi thi tung muc phai con nguyen: neu buoc dong ZIP lam
// hong du chi mot byte, Excel bao tep loi ma khong noi loi o dau.
{
  const blob = await suaXlsx(goc, {});
  const lai = docZip(new Uint8Array(await blob.arrayBuffer()));
  eq("dong lai du so muc", lai.length, muc.length);
  eq("dung thu tu muc", lai.map((m) => m.ten), muc.map((m) => m.ten));
  let giong = 0;
  for (let i = 0; i < muc.length; i++) {
    const a = await giaiNen(muc[i]);
    const b = await giaiNen(lai[i]);
    if (a.length === b.length && a.every((v, k) => v === b[k])) giong++;
  }
  eq("noi dung moi muc khong doi mot byte", giong, muc.length);

  const boBot = await suaXlsx(goc, {}, ["xl/calcChain.xml"]);
  const conLai = docZip(new Uint8Array(await boBot.arrayBuffer()));
  dung("bo duoc mot muc khoi tep", !conLai.some((m) => m.ten === "xl/calcChain.xml"));
  eq("bo mot muc thi con lai du", conLai.length, muc.length - 1);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);
