import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Save,
} from "lucide-react";
import type { Product, Partner } from "../types";
import { cn, formatNumber } from "../lib/utils";
import {
  buildDiemBanLookup,
  type DiemBanEntry,
} from "../lib/diemBan";
import {
  parseTkhoNhap,
  parseTkhoXuat,
  type TkhoNhapDraft,
  type TkhoNhapResult,
  type TkhoParseResult,
} from "../lib/tkhoXuat";

/**
 * NẠP XUẤT KHO TỪ FILE BBGN CỦA BỘ PHẬN
 *
 * Nạp thẳng tệp gốc "BBGN Bia T5,-T6-T7 - T8 - 2026.xlsx", không phải tệp mẫu
 * chép tay lại. Tệp đó có nhiều sheet; phần dùng được là các sheet "T Kho",
 * mỗi sheet một tháng, mỗi ô là một lần xuất (mặt hàng × ngày × điểm bán).
 *
 * File này chỉ lo GIAO DIỆN. Phép đọc nằm ở `src/lib/tkhoXuat.ts` để chạy thử
 * được bằng dữ liệu giả, không cần mở app.
 *
 * HAI CHỖ CỐ Ý KHÔNG TỰ ĐỘNG:
 *
 * 1. Điểm bán lạ thì KHÔNG đoán. Tên trong sheet là chữ viết tắt tự do
 *    ("MFV", "SBVH", "BIA PLAZA") — đoán một cái tên lạ là gán cả tấn hàng cho
 *    nhầm khách. Người dùng gán, app nhớ lại cho tháng sau.
 *
 * 2. Nạp xong CHƯA ghi ngay. Bảng xem trước để soát rồi mới bấm tạo.
 */

interface Props {
  products: Product[];
  partners: Partner[];
  /** Phần gán điểm bán đã lưu, ghép đè lên bảng gán sẵn trong code. */
  diemBanOverrides: DiemBanEntry[];
  onSaveDiemBan: (entries: DiemBanEntry[]) => Promise<void>;
  /** Ghi tồn đầu kỳ + hàng nhập, trả về các lô vừa tạo cho FIFO của phần xuất. */
  onCreateNhap: (
    drafts: TkhoNhapDraft[],
  ) => Promise<{ productId: string; batchNumber: string; quantity: number; date: string }[]>;
  onCreate: (
    drafts: { dateKey: string; partnerId: string; partnerName: string; productId: string; productName: string; quantity: number; outlet: string; note: string }[],
    loMoi?: { productId: string; batchNumber: string; quantity: number; date: string }[],
  ) => Promise<void>;
  busy: boolean;
}

/**
 * Sheet nào dùng được — thử ĐỌC chứ không đoán theo tên.
 *
 * Trước đây lọc theo tên chứa "T Kho". Nhưng bộ phận còn gửi bảng xuất kho rút
 * gọn để trong sheet tên "Sheet1", và lọc theo tên thì app báo "tệp này không
 * có sheet T Kho nào" trong khi dữ liệu đọc được hoàn toàn bình thường.
 *
 * Nên cứ thử đọc từng sheet: đọc ra được dòng nào, hoặc ra được điểm bán chưa
 * gán, thì đó là bảng xuất kho.
 */
function timSheetDungDuoc(
  wb: XLSX.WorkBook,
  products: Product[],
  bang: Map<string, DiemBanEntry>,
): string[] {
  return wb.SheetNames.filter((n) => {
    const ws = wb.Sheets[n];
    if (!ws) return false;
    try {
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, {
        header: 1,
        raw: true,
        defval: null,
      });
      const r = parseTkhoXuat(rows, n, products, bang);
      return r.drafts.length > 0 || r.unknownOutlets.length > 0;
    } catch {
      return false;
    }
  });
}

export default function TkhoImport({
  products,
  partners,
  diemBanOverrides,
  onSaveDiemBan,
  onCreateNhap,
  onCreate,
  busy,
}: Props) {
  const [book, setBook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheet, setSheet] = useState("");
  const [result, setResult] = useState<TkhoParseResult | null>(null);
  const [nhap, setNhap] = useState<TkhoNhapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Gán tạm trên màn hình: khoá chuẩn hoá -> { partnerId, note }. */
  const [gan, setGan] = useState<Record<string, { partnerId: string; note: string }>>({});
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const buyers = useMemo(
    () => partners.filter((p) => p.type !== "SUPPLIER"),
    [partners],
  );
  const partnerById = useMemo(() => {
    const m = new Map<string, Partner>();
    partners.forEach((p) => m.set(p.id, p));
    return m;
  }, [partners]);

  /** Bảng tra hiện tại = bảng gốc + phần đã lưu + phần vừa gán trên màn hình. */
  const bangDiemBan = useMemo(() => {
    const tamThoi: DiemBanEntry[] = Object.entries(gan)
      .filter(([, v]) => v.partnerId)
      .map(([ten, v]) => ({ ten, partnerId: v.partnerId, note: v.note }));
    return buildDiemBanLookup([...diemBanOverrides, ...tamThoi]);
  }, [diemBanOverrides, gan]);

  const doc = (wb: XLSX.WorkBook, ten: string) => {
    const ws = wb.Sheets[ten];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
    });
    const r = parseTkhoXuat(rows, ten, products, bangDiemBan);
    setResult(r);
    setNhap(parseTkhoNhap(rows, ten, products));
    if (!r.drafts.length && !r.unknownOutlets.length) {
      setError(
        `Sheet "${ten}" không đọc được phần Xuất kho. Kiểm tra xem sheet có ô "MÃ HÀNG" và ô "Xuất kho" ở hàng tiêu đề không.`,
      );
    } else {
      setError(null);
    }
  };

  const chonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setResult(null);
    setError(null);
    setGan({});

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ds = timSheetDungDuoc(wb, products, bangDiemBan);
        if (!ds.length) {
          setBook(null);
          setSheetNames([]);
          setError(
            `Không sheet nào trong tệp đọc ra được bảng xuất kho. ` +
              `Bảng cần có ô "MÃ HÀNG", một hàng ngày dạng 01.08.26 và hàng ` +
              `điểm bán ngay dưới đó.\n\nCác sheet đang có: ${wb.SheetNames.join(", ")}`,
          );
          return;
        }
        setBook(wb);
        setSheetNames(ds);
        // Mặc định lấy sheet cuối — tháng mới nhất thường nằm cuối tệp
        const mac = ds[ds.length - 1];
        setSheet(mac);
        doc(wb, mac);
      } catch (err: any) {
        setError("Không đọc được tệp: " + err.message);
      }
    };
    reader.readAsBinaryString(f);
  };

  const doiSheet = (ten: string) => {
    setSheet(ten);
    setGan({});
    if (book) doc(book, ten);
  };

  const docLai = () => {
    if (book && sheet) doc(book, sheet);
  };

  const chuaGan = result?.unknownOutlets ?? [];
  const daGanDu =
    chuaGan.length > 0 &&
    chuaGan.every((u) => gan[u.ten]?.partnerId);

  const luuGan = async () => {
    const entries: DiemBanEntry[] = Object.entries(gan)
      .filter(([, v]) => v.partnerId)
      .map(([ten, v]) => ({ ten, partnerId: v.partnerId, note: v.note }));
    if (!entries.length) return;
    setSaving(true);
    try {
      await onSaveDiemBan(entries);
      docLai();
    } finally {
      setSaving(false);
    }
  };

  const tongSoLuong = (result?.drafts ?? []).reduce(
    (s, d) => s + d.quantity,
    0,
  );
  const tongTonDau = (nhap?.drafts ?? [])
    .filter((d) => d.type === "OPENING")
    .reduce((s, d) => s + d.quantity, 0);
  const tongNhap = (nhap?.drafts ?? [])
    .filter((d) => d.type === "IN")
    .reduce((s, d) => s + d.quantity, 0);
  const tonCuoi =
    Math.round((tongTonDau + tongNhap - tongSoLuong) * 100) / 100;
  const theoGhiChu = useMemo(() => {
    const m = new Map<string, number>();
    (result?.drafts ?? []).forEach((d) => {
      const k = d.note || "Bán thường";
      m.set(k, (m.get(k) || 0) + d.quantity);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [result]);

  /*
   * Ghi theo đúng thứ tự nghiệp vụ: tồn đầu kỳ và hàng nhập TRƯỚC, hàng xuất
   * SAU. Xuất trừ tồn theo lô, mà lô chỉ sinh ra từ nhập — làm ngược thì mọi
   * dòng xuất đều báo vượt tồn.
   *
   * Các lô vừa tạo được chuyển thẳng sang phần xuất, không chờ Firestore bắn
   * dữ liệu về: trong cùng một lượt chạy thì state chưa kịp đổi.
   */
  const taoGiaoDich = async () => {
    if (!result?.drafts.length) return;
    const loMoi = nhap?.drafts.length ? await onCreateNhap(nhap.drafts) : [];
    await onCreate(
      result.drafts.map((d) => ({
        ...d,
        partnerName: partnerById.get(d.partnerId)?.name || d.partnerId,
      })),
      loMoi,
    );
    setResult(null);
    setNhap(null);
    setBook(null);
    setFileName("");
    setSheetNames([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={chonFile}
      />

      {/* ---------- Chọn tệp ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
        >
          <Upload className="w-4 h-4" /> Chọn tệp BBGN
        </button>
        {fileName && (
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            {fileName}
          </span>
        )}
      </div>

      <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
        Chọn thẳng tệp gốc của bộ phận. App đọc các sheet <b>T Kho</b> — mỗi ô
        trong bảng là một lần xuất: mặt hàng × ngày × điểm bán.
      </p>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* ---------- Chọn tháng ---------- */}
      {sheetNames.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Nạp sheet nào
          </p>
          <div className="flex flex-wrap gap-2">
            {sheetNames.map((n) => (
              <button
                key={n}
                onClick={() => doiSheet(n)}
                disabled={busy}
                className={cn(
                  "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all",
                  n === sheet
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-primary",
                )}
              >
                {n.trim()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Điểm bán chưa gán ---------- */}
      {chuaGan.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-widest">
                {chuaGan.length} điểm bán chưa biết thuộc đối tác nào
              </p>
              <p className="text-[11px] font-bold text-amber-700 mt-1 leading-relaxed">
                Hàng của những điểm này <b>chưa được tạo giao dịch</b>. Gán xong
                bấm lưu, app nhớ lại cho các tháng sau.
              </p>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-amber-100">
            {chuaGan.map((u) => (
              <div
                key={u.ten}
                className="px-5 py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3 sm:items-center"
              >
                <div>
                  <p className="text-xs font-black text-slate-900">{u.ten}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {u.soO} ô · {formatNumber(u.soLuong)}
                  </p>
                </div>
                <select
                  value={gan[u.ten]?.partnerId || ""}
                  onChange={(e) =>
                    setGan((g) => ({
                      ...g,
                      [u.ten]: {
                        partnerId: e.target.value,
                        note: g[u.ten]?.note || "",
                      },
                    }))
                  }
                  className="px-3 py-2 rounded-xl border border-amber-200 bg-white text-[11px] font-bold text-slate-900 min-w-44"
                >
                  <option value="">— chọn đối tác —</option>
                  {buyers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  value={gan[u.ten]?.note || ""}
                  onChange={(e) =>
                    setGan((g) => ({
                      ...g,
                      [u.ten]: {
                        partnerId: g[u.ten]?.partnerId || "",
                        note: e.target.value,
                      },
                    }))
                  }
                  placeholder="Ghi chú (Ngoại giao, HTKD…)"
                  className="px-3 py-2 rounded-xl border border-amber-200 bg-white text-[11px] font-bold text-slate-900 min-w-44"
                />
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-amber-100/60 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              {daGanDu ? "Đã gán đủ" : "Gán xong mới tạo được đủ giao dịch"}
            </p>
            <button
              onClick={luuGan}
              disabled={saving || busy}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Lưu gán
            </button>
          </div>
        </div>
      )}

      {/* ---------- Cảnh báo khác ---------- */}
      {result && result.unknownCodes.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-1">
          <p className="text-[11px] font-black text-rose-700 uppercase tracking-widest">
            {result.unknownCodes.length} mã vật tư không có trong danh mục
          </p>
          {result.unknownCodes.map((c) => (
            <p key={c.code} className="text-[11px] font-bold text-rose-600">
              {c.code} · {c.ten} · {formatNumber(c.soLuong)}
            </p>
          ))}
        </div>
      )}

      {result && result.totalChecks.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-1">
          <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest">
            Cột &quot;Tổng Xuất&quot; trong tệp không khớp bảng chi tiết
          </p>
          <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
            App lấy theo bảng chi tiết. Lệch là do công thức trong tệp, nên báo
            bộ phận kéo lại.
          </p>
          {result.totalChecks.map((t) => (
            <p key={t.code} className="text-[11px] font-bold text-amber-700">
              {t.code}: chi tiết {formatNumber(t.tuBangCheo)} · cột tổng{" "}
              {formatNumber(t.tuCotTong)} · lệch {formatNumber(t.lech)}
            </p>
          ))}
        </div>
      )}

      {result && result.oThieuNgay > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <p className="text-[11px] font-bold text-rose-700">
            {result.oThieuNgay} ô có số lượng nhưng cột đó không có ngày — đã bỏ
            qua.
          </p>
        </div>
      )}

      {/* ---------- Xem trước ---------- */}
      {result && result.drafts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                {formatNumber(result.drafts.length)} giao dịch xuất kho
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {result.dateRange
                  ? `${result.dateRange.from} → ${result.dateRange.to}`
                  : ""}{" "}
                · tổng {formatNumber(tongSoLuong)}
              </p>
            </div>
          </div>

          <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 border-b border-slate-100">
            {theoGhiChu.map(([k, v]) => (
              <span key={k} className="text-[11px] font-bold text-slate-500">
                {k}:{" "}
                <span className="text-slate-900">{formatNumber(v)}</span>
              </span>
            ))}
          </div>

          {/*
            Tồn đầu kỳ và hàng nhập cũng lấy từ chính sheet này. Không có chúng
            thì mọi dòng xuất đều báo vượt tồn — lô chỉ sinh ra từ nhập.
          */}
          {nhap && nhap.drafts.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 bg-blue-50/40">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">
                Ghi trước phần nhập
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-[11px] font-bold text-slate-500">
                  Tồn đầu kỳ:{" "}
                  <span className="text-slate-900">
                    {nhap.tonDauCount} dòng · {formatNumber(tongTonDau)}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Nhập trong kỳ:{" "}
                  <span className="text-slate-900">
                    {nhap.nhapCount} dòng · {formatNumber(tongNhap)}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Tồn cuối dự tính:{" "}
                  <span
                    className={cn(
                      tonCuoi < 0 ? "text-rose-600" : "text-emerald-700",
                    )}
                  >
                    {formatNumber(tonCuoi)}
                  </span>
                </span>
              </div>
              {tonCuoi < 0 && (
                <p className="text-[11px] font-bold text-rose-600 mt-1">
                  Tồn cuối âm — sheet này xuất nhiều hơn tồn đầu cộng nhập. Kiểm
                  lại trước khi ghi.
                </p>
              )}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50/50 sticky top-0">
                <tr>
                  {["Ngày", "Đối tác", "Điểm bán", "Mặt hàng", "Số lượng", "Ghi chú"].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-black text-[9px] text-slate-400 uppercase tracking-widest py-2 px-3"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.drafts.slice(0, 200).map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-600">
                      {d.dateKey}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {partnerById.get(d.partnerId)?.name || d.partnerId}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{d.outlet}</td>
                    <td className="py-2 px-3 text-slate-500">
                      {d.productName}
                    </td>
                    <td className="py-2 px-3 font-mono font-black text-slate-900 text-right">
                      {formatNumber(d.quantity)}
                    </td>
                    <td className="py-2 px-3 font-bold text-amber-600">
                      {d.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.drafts.length > 200 && (
              <p className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Chỉ hiện 200 dòng đầu · sẽ tạo đủ{" "}
                {formatNumber(result.drafts.length)} dòng
              </p>
            )}
          </div>

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Số lượng sẽ trừ vào tồn kho theo lô nhập trước xuất trước
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setResult(null);
                  setBook(null);
                  setFileName("");
                  setSheetNames([]);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest"
              >
                <X className="w-3.5 h-3.5" /> Bỏ
              </button>
              <button
                onClick={taoGiaoDich}
                disabled={busy}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Tạo {formatNumber(result.drafts.length)} giao dịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
