import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Product, Partner } from "../types";
import { cn, formatNumber } from "../lib/utils";
import {
  buildBbgnLookups,
  buildBbgnTemplateRows,
  parseBbgnSheet,
  type BbgnDraft,
  type BbgnParseResult,
} from "../lib/bbgn";

/**
 * NẠP NHANH DỮ LIỆU XUẤT KHO TỪ FILE BBGN
 *
 * File "BBGN Beer 2026 T08.xlsx" của bộ phận là BẢNG CHÉO: mỗi dòng là một
 * lần giao, còn các loại bia nằm ngang thành cột. Một dòng giao 5 loại bia
 * tương ứng 5 giao dịch xuất kho trong app.
 *
 * File này chỉ lo GIAO DIỆN. Phép đọc file và phép dựng file mẫu nằm ở
 * `src/lib/bbgn.ts` để chạy thử được bằng dữ liệu giả — quan trọng nhất là kiểm
 * được rằng file mẫu tải về đọc lại được, hai thứ đó mà lệch nhau thì người
 * dùng điền số vào mẫu rồi nạp lên sẽ nhận lỗi.
 *
 * NẠP XONG CHƯA GHI NGAY: bảng xem trước để người dùng soát rồi mới bấm tạo.
 */

export type { BbgnDraft };

interface Props {
  products: Product[];
  partners: Partner[];
  onCreate: (drafts: BbgnDraft[]) => Promise<void>;
  busy: boolean;
}

export default function BbgnImport({
  products,
  partners,
  onCreate,
  busy,
}: Props) {
  const [result, setResult] = useState<BbgnParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const lookups = useMemo(
    () => buildBbgnLookups(products, partners),
    [products, partners],
  );

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
      let best: BbgnParseResult | null = null;
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], {
          header: 1,
          raw: true,
          defval: "",
          blankrows: true,
        });
        const parsed = parseBbgnSheet(rows, name, lookups);
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

  /**
   * Xuất file mẫu đúng dạng bảng chéo mà hàm đọc nhận ra được.
   *
   * Nội dung do lib/bbgn.ts dựng từ danh mục thật (mã vật tư, tên đơn vị) nên
   * mẫu tải về là nạp lại được ngay, không phải mẫu chép tay rồi lệch mã.
   */
  const downloadTemplate = () => {
    try {
      const tpl = buildBbgnTemplateRows(products, partners);
      setError(null);

      const ws = XLSX.utils.aoa_to_sheet(tpl.rows);
      ws["!cols"] = tpl.colWidths;

      // Hướng dẫn để ở sheet riêng: sheet này không có dòng mã vật tư nên hàm
      // đọc bỏ qua, không sợ lẫn vào dữ liệu.
      const guide = XLSX.utils.aoa_to_sheet(tpl.guideRows);
      guide["!cols"] = [{ wch: 78 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BBGN");
      XLSX.utils.book_append_sheet(wb, guide, "Huong dan");
      XLSX.writeFile(wb, `Mau-BBGN-${format(new Date(), "yyyyMM")}.xlsx`);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
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
          mới bấm tạo. Chưa có file của bộ phận thì bấm{" "}
          <strong>Tải file mẫu</strong> — mẫu dựng sẵn theo mã vật tư và đơn vị
          trong danh mục nên điền số vào là nạp lại được ngay.
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
        <button
          type="button"
          onClick={downloadTemplate}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4 text-primary" /> Tải file mẫu
        </button>
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
