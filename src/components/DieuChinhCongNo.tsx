/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐIỀU CHỈNH CÔNG NỢ — hàng xuất nhầm đơn vị mà hóa đơn đã phát hành.
 *
 * Ghi một cặp dòng âm / dương vào lượt hóa đơn kế tiếp. Toàn bộ quy tắc và lý
 * do ở `src/lib/dieuChinhCongNo.ts`; màn hình này chỉ thu dữ liệu, xem trước,
 * và liệt kê các lần đã điều chỉnh.
 */

import { useMemo, useState } from "react";
import { ArrowRight, Plus, Scale, Trash2, X } from "lucide-react";
import type { Partner, Product, Transaction } from "../types";
import type { DotChot } from "../lib/congNo";
import type { HoaDonGhiNhan } from "../lib/hoaDon";
import {
  dotCuaNgay,
  kiemTraDieuChinh,
  lapDongDieuChinh,
  laDongDieuChinh,
  type DongGhiDieuChinh,
  type YeuCauDieuChinh,
} from "../lib/dieuChinhCongNo";
import { stableHash } from "../lib/hash";
import { ngayCham } from "../lib/oNgay";
import { cn, formatNumber } from "../lib/utils";
import ONgay from "./ONgay";

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  dot: DotChot[];
  hoaDon: HoaDonGhiNhan[];
  /** Không truyền = chỉ xem (vai trò không ghi được). */
  onGhi?: (dong: DongGhiDieuChinh[]) => Promise<boolean>;
  /** Xoá cả cặp của một lần điều chỉnh. Không truyền = không xoá được. */
  onXoa?: (nhom: string) => Promise<void>;
}

const O =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold outline-none focus:border-primary";

const homNay = () => {
  const d = new Date();
  const h = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${h(d.getMonth() + 1)}-${h(d.getDate())}`;
};

const trong = (): YeuCauDieuChinh => ({
  ngayGoc: "",
  ngayGhi: homNay(),
  tuDoiTac: "",
  sangDoiTac: "",
  lyDo: "",
  dong: [{ productId: "", soLuong: 0 }],
});

export default function DieuChinhCongNo({
  transactions,
  products,
  partners,
  dot,
  hoaDon,
  onGhi,
  onXoa,
}: Props) {
  const [yc, setYc] = useState<YeuCauDieuChinh>(trong);
  const [dangGhi, setDangGhi] = useState(false);
  const sua = (p: Partial<YeuCauDieuChinh>) => setYc((c) => ({ ...c, ...p }));

  const tenDoiTac = (id: string) => partners.find((p) => p.id === id)?.name || id;
  const maBpCua = (id: string) => partners.find((p) => p.id === id)?.sapCode || "";
  const daKhoa = (d: DotChot, maBp: string) =>
    hoaDon.some(
      (h) =>
        h.tuNgay === d.tuNgay &&
        h.denNgay === d.denNgay &&
        h.maBp === maBp &&
        (String(h.ngayKetXuat || "").trim() || String(h.soHoaDon || "").trim()),
    );

  const loi = kiemTraDieuChinh(yc, { dot, maBpCua, daKhoa });
  const dotNhan = yc.ngayGhi ? dotCuaNgay(dot, yc.ngayGhi) : null;

  /*
   * GỢI Ý TỪ ĐƠN GỐC: chọn ngày giao + đơn vị nhầm là hiện ngay những gì đã
   * xuất cho đơn vị đó ngày đó — bấm một cái là thêm đúng mặt hàng, đúng số,
   * khỏi gõ tay lệch số với đơn gốc.
   */
  const donGoc = useMemo(() => {
    if (!yc.ngayGoc || !yc.tuDoiTac) return [];
    const m = new Map<string, { productId: string; ten: string; soLuong: number }>();
    transactions.forEach((t) => {
      if (
        t.type !== "OUT" ||
        laDongDieuChinh(t) ||
        t.partnerId !== yc.tuDoiTac ||
        String(t.date).slice(0, 10) !== yc.ngayGoc
      )
        return;
      const cu = m.get(t.productId) || { productId: t.productId, ten: t.productName, soLuong: 0 };
      cu.soLuong += Number(t.quantity) || 0;
      m.set(t.productId, cu);
    });
    return [...m.values()];
  }, [transactions, yc.ngayGoc, yc.tuDoiTac]);

  /** Các lần đã điều chỉnh, gom theo cặp. */
  const daGhi = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    transactions.forEach((t) => {
      if (!laDongDieuChinh(t) || !t.referenceGroupId) return;
      m.set(t.referenceGroupId, [...(m.get(t.referenceGroupId) || []), t]);
    });
    return [...m.entries()]
      .map(([nhom, ds]) => ({ nhom, ds, dau: ds[0].dieuChinh!, ngay: String(ds[0].date).slice(0, 10) }))
      .sort((a, b) => b.ngay.localeCompare(a.ngay));
  }, [transactions]);

  const ghi = async () => {
    if (loi || !onGhi || dangGhi) return;
    const dong = lapDongDieuChinh(yc, { bam: stableHash, tenDoiTac, ngayCham });
    const daCo = new Set(transactions.map((t) => t.id));
    if (dong.every((d) => daCo.has(d.id))) {
      alert("Điều chỉnh này đã ghi rồi (cùng ngày, cùng đơn vị, cùng số lượng).");
      return;
    }
    const tom = yc.dong
      .filter((d) => d.productId)
      .map(
        (d) =>
          `· ${products.find((p) => p.id === d.productId)?.name || d.productId}: ${formatNumber(d.soLuong)}`,
      )
      .join("\n");
    if (
      !window.confirm(
        `Ghi điều chỉnh công nợ?\n\n` +
          `Đơn giao ${ngayCham(yc.ngayGoc)}\n` +
          `GIẢM: ${tenDoiTac(yc.tuDoiTac)}\nTĂNG: ${tenDoiTac(yc.sangDoiTac)}\n${tom}\n\n` +
          (dotNhan
            ? `Vào đợt hóa đơn ${ngayCham(dotNhan.tuNgay)} – ${ngayCham(dotNhan.denNgay)}.`
            : `Ngày ${ngayCham(yc.ngayGhi)} chưa thuộc đợt nào — sẽ vào đợt anh khai sau.`) +
          `\nTồn kho không đổi.`,
      )
    )
      return;
    setDangGhi(true);
    try {
      if (await onGhi(dong)) setYc(trong());
    } finally {
      setDangGhi(false);
    }
  };

  const dsDoiTac = [...partners].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <details className="rounded-2xl border border-slate-200 bg-white overflow-hidden group">
      <summary className="px-4 py-3.5 cursor-pointer list-none flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
        <span className="flex items-center gap-2 text-[13px] font-black text-slate-700 tracking-tight">
          <Scale className="w-4 h-4 text-primary" />
          Điều chỉnh công nợ · xuất nhầm đơn vị
          {daGhi.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500">
              {daGhi.length} lần
            </span>
          )}
        </span>
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-open:hidden">
          Bung ra
        </span>
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 hidden group-open:inline">
          Thu lại
        </span>
      </summary>

      <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-4">
        <p className="text-[12px] font-bold text-slate-500 leading-relaxed">
          Hóa đơn đã phát hành thì không sửa lại. Ghi điều chỉnh vào{" "}
          <strong>lượt hóa đơn kế tiếp</strong>: trừ số lượng ở đơn vị đã xuất
          nhầm, cộng đúng số đó cho đơn vị đúng. Tồn kho không đổi.
        </p>

        {onGhi && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ngày giao gốc (đơn bị nhầm)
                </span>
                <ONgay value={yc.ngayGoc} onChange={(v) => sua({ ngayGoc: v })} className={O} />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ngày ghi điều chỉnh
                </span>
                <ONgay value={yc.ngayGhi} onChange={(v) => sua({ ngayGhi: v })} className={O} />
                <span className="block text-[11px] font-bold text-slate-400">
                  {yc.ngayGhi
                    ? dotNhan
                      ? `Vào đợt ${ngayCham(dotNhan.tuNgay)} – ${ngayCham(dotNhan.denNgay)}`
                      : "Chưa thuộc đợt nào — vào đợt khai sau"
                    : ""}
                </span>
              </label>
            </div>

            <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                  Đơn vị đã xuất nhầm · giảm
                </span>
                <select value={yc.tuDoiTac} onChange={(e) => sua({ tuDoiTac: e.target.value })} className={O}>
                  <option value="">— Chọn —</option>
                  {dsDoiTac.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.sapCode ? ` (${p.sapCode})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <ArrowRight className="hidden sm:block w-5 h-5 text-slate-300 mb-3" />
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Đơn vị đúng · tăng
                </span>
                <select value={yc.sangDoiTac} onChange={(e) => sua({ sangDoiTac: e.target.value })} className={O}>
                  <option value="">— Chọn —</option>
                  {dsDoiTac.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.sapCode ? ` (${p.sapCode})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {yc.tuDoiTac &&
              yc.sangDoiTac &&
              maBpCua(yc.tuDoiTac) &&
              maBpCua(yc.tuDoiTac) === maBpCua(yc.sangDoiTac) && (
                <p className="text-[11px] font-bold text-amber-600">
                  Hai đơn vị cùng mã BP {maBpCua(yc.tuDoiTac)} — hóa đơn không đổi, chỉ sửa
                  số theo dõi từng bộ phận.
                </p>
              )}

            {donGoc.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">
                  Đã xuất cho đơn vị này ngày {ngayCham(yc.ngayGoc)}:
                </span>
                {donGoc.map((g) => (
                  <button
                    key={g.productId}
                    type="button"
                    onClick={() =>
                      sua({
                        dong: [
                          ...yc.dong.filter((d) => d.productId && d.productId !== g.productId),
                          { productId: g.productId, soLuong: g.soLuong },
                        ],
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-black text-slate-600 hover:border-primary hover:text-primary"
                  >
                    + {g.ten} · {formatNumber(g.soLuong)}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {yc.dong.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={d.productId}
                    onChange={(e) =>
                      sua({ dong: yc.dong.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)) })
                    }
                    className={cn(O, "flex-1")}
                  >
                    <option value="">— Mặt hàng —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={d.soLuong || ""}
                    placeholder="Số lượng"
                    onChange={(e) =>
                      sua({
                        dong: yc.dong.map((x, j) =>
                          j === i ? { ...x, soLuong: Number(e.target.value) } : x,
                        ),
                      })
                    }
                    className={cn(O, "w-32 text-right tabular-nums")}
                  />
                  <button
                    type="button"
                    onClick={() => sua({ dong: yc.dong.filter((_, j) => j !== i) })}
                    aria-label="Bỏ dòng"
                    className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => sua({ dong: [...yc.dong, { productId: "", soLuong: 0 }] })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mặt hàng
              </button>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Lý do
              </span>
              <input
                value={yc.lyDo}
                onChange={(e) => sua({ lyDo: e.target.value })}
                placeholder="VD: VINACS Hà Nội của SPA, đã xuất nhầm cho BNC Ngoại giao"
                className={O}
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              {loi && <p className="mr-auto text-[11px] font-bold text-rose-600">{loi}</p>}
              <button
                onClick={ghi}
                disabled={!!loi || dangGhi}
                className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-125 disabled:opacity-40"
              >
                {dangGhi ? "Đang ghi..." : "Ghi điều chỉnh"}
              </button>
            </div>
          </div>
        )}

        {daGhi.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-[12px] font-bold text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr>
                  {["Ngày ghi", "Giao gốc", "Giảm", "Tăng", "Mặt hàng", "Lý do", ""].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daGhi.map((g) => {
                  const d = dotCuaNgay(dot, g.ngay);
                  const khoa =
                    !!d &&
                    [g.dau.tuDoiTac, g.dau.sangDoiTac].some((p) => daKhoa(d, maBpCua(p)));
                  return (
                    <tr key={g.nhom} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono">{ngayCham(g.ngay)}</td>
                      <td className="px-3 py-2 font-mono">{ngayCham(g.dau.ngayGoc)}</td>
                      <td className="px-3 py-2 text-rose-600">{tenDoiTac(g.dau.tuDoiTac)}</td>
                      <td className="px-3 py-2 text-emerald-700">{tenDoiTac(g.dau.sangDoiTac)}</td>
                      <td className="px-3 py-2 text-slate-900">
                        {g.ds
                          .filter((t) => t.quantity > 0)
                          .map((t) => `${t.productName} · ${formatNumber(t.quantity)}`)
                          .join(", ")}
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-normal min-w-[180px]">{g.dau.lyDo}</td>
                      <td className="px-3 py-2 text-right">
                        {khoa ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Đã vào hóa đơn
                          </span>
                        ) : (
                          onXoa && (
                            <button
                              onClick={() => onXoa(g.nhom)}
                              title="Xoá lần điều chỉnh này"
                              className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
