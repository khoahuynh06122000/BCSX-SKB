import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  FileDown,
  FileUp,
  RotateCcw,
  Search,
  CheckCircle2,
} from "lucide-react";
import type { Product, InventoryItem } from "../types";
import { cn, formatNumber } from "../lib/utils";
import { MAU, taoSheetDep, XLSXDep } from "../lib/excelDep";

/**
 * BẢNG NHẬP NHANH CẢ DANH MỤC
 *
 * Kho có hơn chục loại bia, mỗi lần nhập lại phải bấm "thêm dòng" rồi chọn
 * sản phẩm trong danh sách thả xuống — chậm và dễ bỏ sót. Bảng này liệt kê
 * sẵn toàn bộ danh mục, ai nhận loại nào thì điền số vào loại đó. Dòng nào
 * để trống coi như không nhập.
 *
 * KHÔNG CÒN SỐ LÔ. Kho đã bỏ theo dõi theo lô, nên bảng này chỉ còn hai thứ
 * phải điền: chọn loại bia và gõ số lượng.
 */

export interface BulkRow {
  productId: string;
  quantity: number;
}

interface Props {
  products: Product[];
  inventory: InventoryItem[];
  /** Các dòng đã có sẵn (khi chuyển từ chế độ nhập từng dòng sang). */
  initialRows?: BulkRow[];
  onChange: (rows: BulkRow[]) => void;
}

export default function BulkImportGrid({
  products,
  inventory,
  initialRows = [],
  onChange,
}: Props) {
  // Trạng thái nội bộ giữ TẤT CẢ sản phẩm; chỉ dòng có số lượng > 0 mới được
  // báo ngược lên form cha.
  const [rows, setRows] = useState<Record<string, BulkRow>>(() => {
    const init: Record<string, BulkRow> = {};
    products.forEach((p) => {
      const existing = initialRows.find((r) => r.productId === p.id);
      init[p.id] = {
        productId: p.id,
        quantity: existing?.quantity || 0,
      };
    });
    return init;
  });

  const [search, setSearch] = useState("");
  const [importNote, setImportNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const phatLen = (next: Record<string, BulkRow>) => {
    onChange(Object.values(next).filter((r) => r.quantity && r.quantity > 0));
  };

  const push = (next: Record<string, BulkRow>) => {
    setRows(next);
    phatLen(next);
  };

  const update = (productId: string, patch: Partial<BulkRow>) => {
    push({ ...rows, [productId]: { ...rows[productId], ...patch } });
  };

  const clearAll = () => {
    const next: Record<string, BulkRow> = {};
    products.forEach((p) => {
      next[p.id] = { productId: p.id, quantity: 0 };
    });
    setImportNote("");
    push(next);
  };

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const filledCount = Object.values(rows).filter((r) => r.quantity > 0).length;
  const totalLiters = Object.values(rows).reduce((s, r) => {
    const p = products.find((x) => x.id === r.productId);
    return s + (r.quantity || 0) * ((p?.capacityPerUnit || 0) / 1000);
  }, 0);

  /* ---------------- Excel ---------------- */

  const downloadTemplate = () => {
    /*
     * Tệp mẫu để bộ phận điền tay rồi nạp lại. Ô "Số lượng" bỏ trống, tô vàng
     * để nhìn là biết chỗ nào phải điền — mẫu trắng trơn thì người nhận không
     * biết được phép sửa cột nào.
     */
    const hang = products.map((p) => [p.name, p.unit, ""]);

    /*
     * CỐ Ý KHÔNG có dòng tiêu đề phụ phía trên.
     *
     * `handleUpload` bên dưới đọc bằng `sheet_to_json`, vốn coi HÀNG ĐẦU TIÊN
     * là tên cột. Thêm một dòng tên báo cáo ở trên cho đẹp thì tệp mẫu này nạp
     * lại không ra dòng nào — đẹp mà không dùng được thì tệ hơn xấu.
     */
    const ws = taoSheetDep({
      tieuDe: ["Tên sản phẩm", "Đơn vị", "Số lượng"],
      cot: [{ rong: 42 }, { rong: 10, kieu: "giua" }, { rong: 14, kieu: "so" }],
      hang,
    });

    // Tô vàng hai cột cần điền để mắt bắt được ngay.
    for (let i = 0; i < hang.length; i++) {
      const r = i + 1;
      for (const c of [2]) {
        const dc = XLSXDep.utils.encode_cell({ c, r });
        const o = ws[dc];
        if (o) o.s = { ...o.s, fill: { patternType: "solid", fgColor: { rgb: MAU.canhBao } } };
      }
    }

    const wb = XLSXDep.utils.book_new();
    XLSXDep.utils.book_append_sheet(wb, ws, "Nhap kho");
    XLSXDep.writeFile(wb, "Mau-nhap-kho.xlsx");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(sheet);

      const next = { ...rows };
      let matched = 0;
      const unmatched: string[] = [];

      json.forEach((r) => {
        const rawName = String(
          r["Tên sản phẩm"] ?? r["Ten san pham"] ?? r["Sản phẩm"] ?? "",
        ).trim();
        if (!rawName) return;

        const qty = Number(
          String(r["Số lượng"] ?? r["So luong"] ?? 0)
            .toString()
            .replace(/,/g, "."),
        );
        // Khớp tên không phân biệt hoa thường và khoảng trắng thừa
        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
        const p = products.find((x) => norm(x.name) === norm(rawName));

        if (!p) {
          if (qty > 0) unmatched.push(rawName);
          return;
        }
        if (!qty || qty <= 0) return;

        next[p.id] = { productId: p.id, quantity: qty };
        matched++;
      });

      push(next);
      setImportNote(
        unmatched.length
          ? `Đã nạp ${matched} dòng. Không khớp tên: ${unmatched.slice(0, 3).join(", ")}${unmatched.length > 3 ? ` và ${unmatched.length - 3} dòng khác` : ""}.`
          : `Đã nạp ${matched} dòng từ Excel. Vui lòng rà lại trước khi lưu.`,
      );
    } catch (err: any) {
      setImportNote("Không đọc được tệp Excel: " + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ---------------- Giao diện ---------------- */

  return (
    <div className="space-y-4">
      {/* Thanh công cụ */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lọc nhanh tên bia..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadTemplate}
            className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" /> Tải mẫu Excel
          </button>

          <label className="px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-1.5 cursor-pointer">
            <FileUp className="w-3.5 h-3.5" /> Nạp Excel
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={clearAll}
            className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 hover:border-rose-200 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Xoá hết
          </button>
        </div>
      </div>

      {importNote && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
          {importNote}
        </div>
      )}

      {/* Bảng danh mục */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Loại bia
                </th>
                <th className="py-3 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Tồn hiện tại
                </th>
                <th className="py-3 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[130px]">
                  Số lượng
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => {
                const row = rows[p.id] || { productId: p.id, quantity: 0 };
                const stock =
                  inventory.find((i) => i.productId === p.id)?.stock || 0;
                const active = row.quantity > 0;

                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-t border-slate-100 transition-colors",
                      active && "bg-emerald-50/40",
                    )}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {active && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 truncate">
                            {p.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {p.category} · {p.unit}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[12px] font-mono font-bold text-slate-400">
                        {formatNumber(stock)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={row.quantity || ""}
                        onChange={(e) =>
                          update(p.id, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-right outline-none focus:border-primary transition-all"
                      />
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tổng kết */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-bold text-slate-500">
          Đã điền <strong className="text-slate-900">{filledCount}</strong> /{" "}
          {products.length} loại
        </p>
        <p className="text-[11px] font-bold text-slate-500">
          Tổng quy đổi:{" "}
          <strong className="text-slate-900">{formatNumber(totalLiters)} L</strong>
        </p>
      </div>
    </div>
  );
}
