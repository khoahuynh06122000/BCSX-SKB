/**
 * Chay thu quyet dinh ghi gi / xoa gi khi nap file doanh thu.
 *
 * Goi TRUC TIEP planRevenueImport + resolveRevenueImport ma App.tsx dung, chu
 * khong chep lai logic - chep lai thi test va code that de lech nhau am tham.
 *
 * Diem quan trong nhat: khi thay noi dung mot hoa don cu, dong KHONG DOI cua
 * hoa don do khong duoc bi xoa mat.
 */
import { revenueDocId } from "../revenueKey";
import {
  planRevenueImport,
  resolveRevenueImport,
  type ParsedRevenueRow,
} from "../revenueImport";
import type { RevenueRecord } from "../../types";

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  const s = (x: any) => JSON.stringify(x);
  if (s(a) === s(b)) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}:\n         duoc ${s(a)}\n         mong ${s(b)}`);
  }
};

type Row = RevenueRecord;

const mk = (o: Partial<Row>): Row => {
  const base = {
    date: "2026-05-14",
    invoiceNumber: "HD01",
    productName: "Bia A",
    materialCode: "M1",
    partnerName: "BNC",
    quantity: 10,
    unitPrice: 30000,
    totalAmount: 300000,
    ...o,
  };
  return { ...base, id: revenueDocId(base) } as Row;
};

/**
 * Chay dung duong di ma App.tsx dung: bo trung trong file -> planRevenueImport
 * -> resolveRevenueImport, roi dung lai trang thai DB sau khi nap de kiem tra
 * khong dong nao bi mat.
 */
const classify = (inDb: Row[], inFile: Row[], replaceConflicts: boolean) => {
  // Buoc bo dong lap ngay trong file (App.tsx lam khi doc tung dong Excel)
  const parsedRows: ParsedRevenueRow[] = [];
  const seenInFile = new Set<string>();
  let dupInFileCount = 0;
  inFile.forEach((r) => {
    if (seenInFile.has(r.id)) {
      dupInFileCount++;
      return;
    }
    seenInFile.add(r.id);
    parsedRows.push({
      id: r.id,
      invoiceKey: String(r.invoiceNumber || "").trim().toUpperCase(),
      record: r,
    });
  });

  const plan = planRevenueImport(inDb, parsedRows);
  const { toWrite, toDelete } = resolveRevenueImport(
    inDb,
    parsedRows,
    plan,
    replaceConflicts,
  );

  // Trang thai DB sau khi nap
  const after = new Map(inDb.map((r) => [r.id, r]));
  toDelete.forEach((id) => after.delete(id));
  toWrite.forEach((w) => after.set(w.id, w.record));

  return {
    identical: plan.identical.length,
    conflicting: plan.conflicting.length,
    fresh: plan.fresh.length,
    dupInFileCount,
    written: toWrite.length,
    deleted: toDelete.length,
    after: Array.from(after.values()),
  };
};

console.log("\n1. Nap lai NGUYEN file cu -> khong sinh ban thu hai");
{
  const a = mk({ productName: "Bia A", materialCode: "M1" });
  const b = mk({ productName: "Bia B", materialCode: "M2", quantity: 20 });
  const r = classify([a, b], [a, b], false);
  eq("khong ghi gi", r.written, 0);
  eq("khong xoa gi", r.deleted, 0);
  eq("2 dong da co y nguyen", r.identical, 2);
  eq("DB van dung 2 dong", r.after.length, 2);
}

console.log("\n2. File co dong lap ben trong");
{
  const a = mk({ materialCode: "M1" });
  const r = classify([], [a, a, a], false);
  eq("bo 2 dong lap", r.dupInFileCount, 2);
  eq("chi ghi 1 dong", r.written, 1);
}

console.log("\n3. Bo sung dong MOI vao hoa don DA CO (ban cu bo qua ca to)");
{
  const a = mk({ materialCode: "M1" });
  const bNew = mk({ materialCode: "M2", productName: "Bia B", quantity: 5 });
  const r = classify([a], [a, bNew], false);
  // bNew cung so HD nen bi xep vao conflicting -> can chon thay the
  eq("dong moi bi coi la lech noi dung", r.conflicting, 1);

  const r2 = classify([a], [a, bNew], true);
  eq("chon thay the thi ghi dong moi", r2.written, 1);
  eq("KHONG xoa dong cu khong doi", r2.deleted, 0);
  eq("DB co du 2 dong", r2.after.length, 2);
  eq(
    "dong cu con nguyen",
    r2.after.some((x) => x.id === a.id),
    true,
  );
}

console.log("\n4. Hoa don sua so luong mot dong (day la cho tung mat so)");
{
  const a = mk({ materialCode: "M1" }); // khong doi
  const bOld = mk({ materialCode: "M2", productName: "Bia B", quantity: 20, totalAmount: 600000 });
  const bFixed = mk({ materialCode: "M2", productName: "Bia B", quantity: 18, totalAmount: 540000 });

  const keep = classify([a, bOld], [a, bFixed], false);
  eq("khong thay: khong ghi", keep.written, 0);
  eq("khong thay: DB giu nguyen 2 dong cu", keep.after.length, 2);

  const rep = classify([a, bOld], [a, bFixed], true);
  eq("thay: ghi 1 dong da sua", rep.written, 1);
  eq("thay: xoa 1 dong cu sai", rep.deleted, 1);
  eq("thay: DB con dung 2 dong", rep.after.length, 2);
  eq(
    "thay: dong khong doi VAN CON (khong bi mat so)",
    rep.after.some((x) => x.id === a.id),
    true,
  );
  eq(
    "thay: dong da sua co trong DB",
    rep.after.some((x) => x.id === bFixed.id),
    true,
  );
  eq(
    "thay: dong cu sai da bi go",
    rep.after.some((x) => x.id === bOld.id),
    false,
  );
}

console.log("\n5. Hoa don moi bot mot dong -> dong bo di phai bi go");
{
  const a = mk({ materialCode: "M1" });
  const b = mk({ materialCode: "M2", productName: "Bia B", quantity: 20 });
  const cNew = mk({ materialCode: "M3", productName: "Bia C", quantity: 7 });
  // File moi chi con a va cNew, khong con b
  const rep = classify([a, b], [a, cNew], true);
  eq("xoa dong b da bi bo khoi hoa don", rep.deleted, 1);
  eq("DB con a va cNew", rep.after.length, 2);
  eq(
    "b khong con",
    rep.after.some((x) => x.id === b.id),
    false,
  );
}

console.log("\n6. Dong khong co so hoa don");
{
  const a = mk({ invoiceNumber: "", materialCode: "M1" });
  const r1 = classify([], [a], false);
  eq("lan dau: ghi 1", r1.written, 1);
  const r2 = classify([a], [a], false);
  eq("nap lai: khong nhan doi", r2.written, 0);
  eq("nap lai: DB van 1 dong", r2.after.length, 1);
}

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);
