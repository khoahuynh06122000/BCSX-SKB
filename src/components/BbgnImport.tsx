import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Product, Partner } from "../types";
import { cn, formatNumber } from "../lib/utils";

/**
 * NẠP NHANH DỮ LIỆU XUẤT KHO TỪ FILE BBGN
 *
 * File "BBGN Beer 2026 T08.xlsx" của bộ phận là BẢNG CHÉO: mỗi dòng là một
 * lần giao, còn các loại bia nằm ngang thành cột. Một dòng giao 5 loại bia
 * tương ứng 5 giao dịch xuất kho trong app.
 *
 * Cấu trúc file (đọc từ file thật, không phải phỏng đoán):
 *
 *   dòng tiêu đề 1 :  ... | Địa điểm | Note | BB | Ngày giao | Tên | <tổng>...
 *   dòng mã vật tư :                                              | 10168107 | 10174040 | ...
 *   dòng tên hàng  :                                              | Bia Golden Bridge ... | ...
 *   dòng dữ liệu   :  ... | BNC | BNC | đã có bbgn | 01.08.26 | NH 1901 | 432,6 | 412 | ...
 *
 * Cách dò không cứng nhắc theo số thứ tự dòng/cột, mà tìm theo dấu hiệu:
 * dòng nào có từ 3 ô mã vật tư 8 chữ số trở lên thì đó là dòng mã; các cột
 * mô tả tìm theo chữ trong tiêu đề. Nhờ vậy file tháng sau có xê dịch vài
 * dòng vẫn đọc được.
 *
 * NẠP XONG CHƯA GHI NGAY: bảng xem trước để người dùng soát rồi mới bấm tạo.
 */

export interface BbgnDraft {
  /** yyyy-MM-dd */
  dateKey: string;
  partnerId: string;
  partnerName: string;
  productId: string;
  productName: string;
  quantity: number;
  /** Điểm nhận (NH 1901, Cầu Vàng...) — ghi vào ghi chú của giao dịch. */
  outlet: string;
  /** Cột Note trong file, chỉ giữ khi khác với địa điểm. */
  note: string;
}

/** Dòng đọc được từ file nhưng chưa biết thuộc đơn vị nào. */
interface PendingRow {
  key: string;
  rawUnit: string;
  dateKey: string;
  outlet: string;
  note: string;
  items: { productId: string; productName: string; quantity: number }[];
}

interface ParseResult {
  sheetName: string;
  drafts: BbgnDraft[];
  pending: PendingRow[];
  unknownCodes: { code: string; name: string; rows: number }[];
  skippedRows: number;
}

interface Props {
  products: Product[];
  partners: Partner[];
  onCreate: (drafts: BbgnDraft[]) => Promise<void>;
  busy: boolean;
}

/** Bỏ dấu, bỏ khoảng trắng thừa để so tên đơn vị cho khớp. */
function normalize(s: string): string {
  // \p{M} = dau thanh/dau mu tach ra sau khi normalize NFD
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Đọc ô ngày: có thể là Date, số sê-ri Excel, hoặc chuỗi dd.MM.yy. */
function parseDateCell(cell: any): string | null {
  if (cell instanceof Date && !isNaN(+cell)) {
    return format(cell, "yyyy-MM-dd");
  }
  if (typeof cell === "number" && cell > 20000 && cell < 80000) {
    // Số sê-ri Excel tính từ 30/12/1899
    const ms = Math.round((cell - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(+d) ? null : format(d, "yyyy-MM-dd");
  }
  const text = String(cell || "").trim();
  const m = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!m) return null;
  const day = +m[1];
  const month = +m[2];
  let year = +m[3];
  if (year < 100) year += year < 70 ? 2000 : 1900;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toNumber(cell: any): number {
  if (typeof cell === "number") return cell;
  const text = String(cell ?? "").trim();
  if (!text) return 0;
  // File dùng dấu phẩy thập phân ở một số ô
  const n = Number(text.replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export default function BbgnImport({
  products,
  partners,
  onCreate,
  busy,
}: Props) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const partnerByName = useMemo(() => {
    const m = new Map<string, Partner>();
    partners.forEach((p) => {
      m.set(normalize(p.name), p);
      if (p.sapCode) m.set(normalize(p.sapCode), p);
    });
    return m;
  }, [partners]);

  const productByCode = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => {
      if (p.materialCode) m.set(String(p.materialCode).trim(), p);
    });
    return m;
  }, [products]);

  /** Đọc một sheet thành các dòng nháp; trả null nếu sheet không đúng dạng. */
  const parseSheet = (
    rows: any[][],
    sheetName: string,
  ): ParseResult | null => {
    // 1. Tìm dòng mã vật tư: dòng nào có >= 3 ô là số 8 chữ số
    let codeRowIdx = -1;
    const limit = Math.min(rows.length, 12);
    for (let r = 0; r < limit; r++) {
      const hits = (rows[r] || []).filter((c) =>
        /^\d{8}$/.test(String(c ?? "").trim()),
      );
      if (hits.length >= 3) {
        codeRowIdx = r;
        break;
      }
    }
    if (codeRowIdx < 0) return null;

    const codeRow = rows[codeRowIdx] || [];
    const nameRow = rows[codeRowIdx + 1] || [];
    const codeCols: { col: number; code: string; name: string }[] = [];
    codeRow.forEach((c, i) => {
      const code = String(c ?? "").trim();
      if (/^\d{8}$/.test(code)) {
        codeCols.push({
          col: i,
          code,
          // Bỏ ký tự BOM lẫn trong tên hàng của file gốc
          name: String(nameRow[i] ?? "").replace(/﻿/g, "").trim(),
        });
      }
    });

    // 2. Tìm các cột mô tả trong những dòng phía trên
    const findCol = (...keywords: string[]): number => {
      for (let r = 0; r <= codeRowIdx; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const text = normalize(String(row[c] ?? ""));
          if (text && keywords.some((k) => text === k || text.startsWith(k))) {
            return c;
          }
        }
      }
      return -1;
    };

    const colUnit = findCol("dia diem");
    const colNote = findCol("note", "ghi chu");
    const colDate = findCol("ngay giao");
    const colOutlet = findCol("ten");

    if (colDate < 0) return null;

    // 3. Duyệt dữ liệu
    const drafts: BbgnDraft[] = [];
    const pending: PendingRow[] = [];
    const unknown = new Map<string, { name: string; rows: number }>();
    let skipped = 0;

    for (let r = codeRowIdx + 2; r < rows.length; r++) {
      const row = rows[r] || [];
      const dateKey = parseDateCell(row[colDate]);
      if (!dateKey) continue;

      const rawUnit = String(colUnit >= 0 ? row[colUnit] ?? "" : "").trim();
      const outlet = String(
        colOutlet >= 0 ? row[colOutlet] ?? "" : "",
      ).trim();
      const rawNote = String(colNote >= 0 ? row[colNote] ?? "" : "").trim();
      const note = normalize(rawNote) === normalize(rawUnit) ? "" : rawNote;

      const items: {
        productId: string;
        productName: string;
        quantity: number;
      }[] = [];

      for (const cc of codeCols) {
        const qty = toNumber(row[cc.col]);
        if (qty <= 0) continue;
        const product = productByCode.get(cc.code);
        if (!product) {
          const prev = unknown.get(cc.code);
          unknown.set(cc.code, {
            name: cc.name,
            rows: (prev?.rows || 0) + 1,
          });
          continue;
        }
        items.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
        });
      }

      if (!items.length) {
        skipped++;
        continue;
      }

      const partner = partnerByName.get(normalize(rawUnit));
      if (partner) {
        items.forEach((it) =>
          drafts.push({
            dateKey,
            partnerId: partner.id,
            partnerName: partner.name,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            outlet,
            note,
          }),
        );
      } else {
        pending.push({
          key: `r${r}`,
          rawUnit,
          dateKey,
          outlet,
          note,
          items,
        });
      }
    }

    return {
      sheetName,
      drafts,
      pending,
      unknownCodes: Array.from(unknown.entries()).map(([code, v]) => ({
        code,
        name: v.name,
        rows: v.rows,
      })),
      skippedRows: skipped,
    };
  };

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setAssigned({});
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });

      // Thử từng sheet, lấy sheet cho ra nhiều dòng nhất — file của bộ phận có
      // nhiều sheet phụ (Tkho, file đc, Đơn treo) không phải bảng giao hàng.
      let best: ParseResult | null = null;
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], {
          header: 1,
          raw: true,
          defval: "",
          blankrows: true,
        });
        const parsed = parseSheet(rows, name);
        if (
          parsed &&
          (!best ||
            parsed.drafts.length + parsed.pending.length >
              best.drafts.length + best.pending.length)
        ) {
          best = parsed;
        }
      }

      if (!best || best.drafts.length + best.pending.length === 0) {
        setError(
          "Không tìm thấy bảng giao hàng trong file. File cần có một dòng chứa mã vật tư 8 chữ số và một cột 'Ngày giao'.",
        );
        return;
      }
      setResult(best);
    } catch (e: any) {
      setError("Không đọc được file: " + (e?.message || String(e)));
    }
  };

  /** Các dòng chưa rõ đơn vị nhưng người dùng đã chỉ định thủ công. */
  const resolvedDrafts = useMemo<BbgnDraft[]>(() => {
    if (!result) return [];
    const extra: BbgnDraft[] = [];
    result.pending.forEach((p) => {
      const partnerId = assigned[p.key];
      if (!partnerId) return;
      const partner = partners.find((x) => x.id === partnerId);
      if (!partner) return;
      p.items.forEach((it) =>
        extra.push({
          dateKey: p.dateKey,
          partnerId: partner.id,
          partnerName: partner.name,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          outlet: p.outlet,
          note: p.note,
        }),
      );
    });
    return [...result.drafts, ...extra];
  }, [result, assigned, partners]);

  const summary = useMemo(() => {
    const days = new Set(resolvedDrafts.map((d) => d.dateKey));
    const units = new Set(resolvedDrafts.map((d) => d.partnerName));
    const total = resolvedDrafts.reduce((s, d) => s + d.quantity, 0);
    return { days: days.size, units: units.size, total };
  }, [resolvedDrafts]);

  const reset = () => {
    setResult(null);
    setError(null);
    setFileName("");
    setAssigned({});
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <FileSpreadsheet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          Nạp thẳng file <strong>BBGN Beer</strong> của bộ phận. Mỗi dòng trong
          file là một lần giao, các loại bia nằm ngang thành cột — app tự tách
          thành từng giao dịch xuất kho. Điểm nhận (NH 1901, Cầu Vàng...) được
          ghi vào ghi chú của giao dịch.{" "}
          <strong>Đọc xong chưa ghi ngay</strong> — anh soát bảng bên dưới rồi
          mới bấm tạo.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label
          className={cn(
            "px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:brightness-110 transition-all flex items-center gap-2",
            busy && "opacity-60 pointer-events-none",
          )}
        >
          <Upload className="w-4 h-4" /> Chọn file BBGN
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
        {fileName && (
          <span className="text-[11px] font-bold text-slate-400 truncate max-w-[280px]">
            {fileName}
            {result && ` · sheet "${result.sheetName}"`}
          </span>
        )}
        {result && (
          <button
            onClick={reset}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-all flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Bỏ
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl border border-rose-300 bg-rose-50 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {result && (
        <>
          {/* ----- Tổng kết ----- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Dòng xuất kho", value: formatNumber(resolvedDrafts.length) },
              { label: "Ngày giao", value: formatNumber(summary.days) },
              { label: "Đơn vị nhận", value: formatNumber(summary.units) },
              { label: "Tổng số lượng", value: formatNumber(summary.total) },
            ].map((s) => (
              <div
                key={s.label}
                className="p-3 rounded-xl bg-white border border-slate-200"
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {s.label}
                </p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ----- Mã vật tư lạ ----- */}
          {result.unknownCodes.length > 0 && (
            <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 space-y-2">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                    {result.unknownCodes.length} mã vật tư chưa có trong danh
                    mục — đã bỏ qua
                  </p>
                  <p className="text-[11px] font-bold text-amber-700/80 mt-1 leading-relaxed">
                    Những mã này có số lượng trong file nhưng app chưa biết là
                    bia gì. Báo tôi để bổ sung vào danh mục rồi nạp lại.
                  </p>
                </div>
              </div>
              <div className="pl-8 space-y-0.5">
                {result.unknownCodes.map((u) => (
                  <p
                    key={u.code}
                    className="text-[11px] font-bold text-amber-800"
                  >
                    <span className="font-mono">{u.code}</span>
                    {u.name && ` · ${u.name}`} · {u.rows} dòng
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* ----- Dòng chưa rõ đơn vị ----- */}
          {result.pending.length > 0 && (
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 space-y-3">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-blue-800 uppercase tracking-wider">
                    {result.pending.length} dòng chưa rõ đơn vị nhận
                  </p>
                  <p className="text-[11px] font-bold text-blue-700/80 mt-1 leading-relaxed">
                    Cột "Địa điểm" trong file để trống hoặc ghi tên app chưa
                    biết. Chọn đơn vị cho từng dòng, dòng nào để trống thì
                    không tạo.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 pl-8">
                {result.pending.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-blue-900"
                  >
                    <span className="font-mono">
                      {format(new Date(p.dateKey), "dd/MM")}
                    </span>
                    <span className="truncate max-w-[200px]">
                      {p.outlet || "(không tên)"}
                    </span>
                    {p.rawUnit && (
                      <span className="text-blue-500">"{p.rawUnit}"</span>
                    )}
                    <span className="text-blue-500">
                      {p.items.length} loại bia
                    </span>
                    <select
                      value={assigned[p.key] || ""}
                      onChange={(e) =>
                        setAssigned((prev) => ({
                          ...prev,
                          [p.key]: e.target.value,
                        }))
                      }
                      className="px-2 py-1 rounded-lg border border-blue-200 bg-white text-[11px] font-bold text-slate-900"
                    >
                      <option value="">— Bỏ qua —</option>
                      {partners.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----- Bảng xem trước ----- */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {["Ngày", "Đơn vị", "Điểm nhận", "Mặt hàng", "Số lượng"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {resolvedDrafts.slice(0, 200).map((d, i) => (
                    <tr
                      key={i}
                      className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono">
                        {format(new Date(d.dateKey), "dd/MM/yyyy")}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-slate-900">
                        {d.partnerName}
                      </td>
                      <td className="px-3 py-1.5">{d.outlet || "—"}</td>
                      <td className="px-3 py-1.5">{d.productName}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap text-slate-900">
                        {formatNumber(d.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {resolvedDrafts.length > 200 && (
              <p className="px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-50 border-t border-slate-100">
                Đang xem 200 dòng đầu trong tổng số{" "}
                {formatNumber(resolvedDrafts.length)} dòng. Bấm tạo sẽ ghi đủ
                tất cả.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onCreate(resolvedDrafts)}
              disabled={busy || resolvedDrafts.length === 0}
              className="px-5 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Tạo {formatNumber(resolvedDrafts.length)} giao dịch xuất kho
            </button>
            {result.skippedRows > 0 && (
              <span className="text-[11px] font-bold text-slate-400">
                Bỏ qua {result.skippedRows} dòng không có số lượng
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
