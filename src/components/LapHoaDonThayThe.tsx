/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KHUNG LẬP HÓA ĐƠN THAY THẾ — mở từ nút "Thay thế" của một tờ ở Tra cứu
 * hóa đơn đã xuất. Mỗi chuyến trong tờ sửa được đơn vị nhận, mặt hàng, số
 * lượng. Phép tính nằm ở `src/lib/hoaDonThayThe.ts`.
 */

import { useMemo, useState } from "react";
import { Plus, Replace, RotateCcw, X } from "lucide-react";
import type { Partner, Product } from "../types";
import { tenTrenHoaDon } from "../lib/congNo";
import { khoaHoaDon } from "../lib/hoaDon";
import { stableHash } from "../lib/hash";
import { ngayCham } from "../lib/oNgay";
import {
  chuyenCuaHoaDon,
  chuyenSuaTu,
  kiemTraThayThe,
  lapThayThe,
  tomTatSua,
  type ChuyenSua,
  type DonViDot,
  type GiaoDichChuyen,
  type KetQuaThayThe,
  type SoMoi,
  type ToHoaDon,
} from "../lib/hoaDonThayThe";
import { cn, formatNumber, homNayDiaPhuong } from "../lib/utils";
import ONgay from "./ONgay";

interface Props {
  goc: ToHoaDon;
  /** Tờ đang hiệu lực của (đợt × mã BP) — để biết đơn vị nhận đã có hóa đơn chưa. */
  toCua: (tuNgay: string, denNgay: string, maBp: string) => ToHoaDon | undefined;
  giaoDichTheoId: ReadonlyMap<string, GiaoDichChuyen>;
  partners: Partner[];
  products: Product[];
  soDaCo: ReadonlySet<string>;
  nguoi: string;
  onLuu: (kq: KetQuaThayThe) => Promise<boolean>;
  onDong: () => void;
}

const O =
  "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-bold outline-none focus:border-primary";
const NHAN = "text-[11px] font-black uppercase tracking-widest text-slate-400";

const giongNhau = (c: ChuyenSua) =>
  c.partnerIdCu === c.partnerIdMoi &&
  c.dongCu.length === c.dongMoi.length &&
  c.dongCu.every((x) =>
    c.dongMoi.some((y) => y.productId === x.productId && Number(y.soLuong) === Number(x.soLuong)),
  );

export default function LapHoaDonThayThe({
  goc,
  toCua,
  giaoDichTheoId,
  partners,
  products,
  soDaCo,
  nguoi,
  onLuu,
  onDong,
}: Props) {
  const g = goc.ban;
  const homNay = homNayDiaPhuong();
  const banDau = useMemo(
    () => chuyenCuaHoaDon(goc.dong, giaoDichTheoId),
    [goc.dong, giaoDichTheoId],
  );
  const [chuyen, setChuyen] = useState<ChuyenSua[]>(() => banDau.map(chuyenSuaTu));
  const [soGoc, setSoGoc] = useState<SoMoi>({ so: "", ngay: homNay });
  const [soDich, setSoDich] = useState<Record<string, SoMoi>>({});
  const [lyDo, setLyDo] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  const donViDung = useMemo(
    () =>
      partners
        .filter((p) => p.type !== "SUPPLIER" && p.sapCode)
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [partners],
  );
  const matHang = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [products],
  );
  const tenSp = (id: string) => products.find((p) => p.id === id)?.name || id;
  const dvtSp = (id: string) => (products.find((p) => p.id === id)?.category === "Lon" ? "lon" : "lít");

  const donViCua = (partnerId: string): DonViDot | undefined => {
    const p = donViDung.find((x) => x.id === partnerId);
    if (!p) return undefined;
    return {
      maBp: p.sapCode,
      donVi: tenTrenHoaDon(p.name),
      khoa: khoaHoaDon(g.tuNgay, g.denNgay, p.sapCode, stableHash),
      to: toCua(g.tuNgay, g.denNgay, p.sapCode),
    };
  };

  const yc = {
    goc,
    chuyen,
    donViCua,
    soMoiGoc: soGoc,
    soMoiDich: soDich,
    lyDo,
    soDaCo,
    luc: new Date().toISOString(),
    boi: nguoi,
    bam: stableHash,
    ngayCham,
  };
  const tt = tomTatSua(yc);
  const loi = kiemTraThayThe(yc);

  const sua = (i: number, f: (c: ChuyenSua) => ChuyenSua) =>
    setChuyen((ds) => ds.map((c, j) => (j === i ? f(c) : c)));

  const luu = async () => {
    if (loi || dangLuu) return;
    const kq = lapThayThe({ ...yc, luc: new Date().toISOString() });
    if (
      !window.confirm(
        `${kq.tomTat}.\n\nTờ cũ chuyển sang "bị thay thế", hết hiệu lực. Không hoàn tác trên giao diện. Tiếp tục?`,
      )
    )
      return;
    setDangLuu(true);
    try {
      if (await onLuu(kq)) onDong();
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-black text-slate-900 flex items-center gap-2">
            <Replace className="w-4 h-4 text-amber-600" />
            Lập hóa đơn thay thế cho{" "}
            <span className="font-mono text-rose-600">{g.soHoaDon}</span>
          </p>
          <p className="text-[12px] font-bold text-slate-500 mt-1">
            {g.donVi} · {g.maBp} · đợt {ngayCham(g.tuNgay)} – {ngayCham(g.denNgay)} · ngày HĐ{" "}
            {ngayCham(g.ngayHoaDon)} · {formatNumber(tt.tongCu)} SL
          </p>
        </div>
        <button
          onClick={onDong}
          aria-label="Đóng"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* --------------------------------------------- nội dung đúng */}
      <div className="space-y-2">
        <p className={NHAN}>Nội dung đúng của từng chuyến</p>
        <p className="text-[12px] font-medium text-slate-500 leading-snug">
          Sửa thẳng chỗ sai: đơn vị nhận, mặt hàng, số lượng (đơn giá theo bảng giá chung).
          Đổi đơn vị thì hàng và ảnh chuyến sang tờ của đơn vị đó; đổi số lượng / mặt hàng thì
          số xuất kho sửa theo, tồn kho đổi theo. Không sai gì về hàng thì để nguyên — chỉ cấp
          số mới.
        </p>
        {chuyen.length === 0 && (
          <p className="px-3 py-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-400">
            Không dựng được chuyến nào từ tờ này.
          </p>
        )}
        {chuyen.map((c, i) => {
          const doi = !giongNhau(c);
          return (
            <div
              key={`${c.ma}|${c.partnerIdCu}`}
              className={cn(
                "rounded-xl border bg-white p-3 space-y-2",
                doi ? "border-amber-400" : "border-slate-200",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-black text-slate-900">{ngayCham(c.ngay)}</span>
                <span className="font-mono text-[11px] text-slate-400">{c.ma}</span>
                {doi && (
                  <>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[10px] font-black text-amber-800 uppercase">
                      đã sửa
                    </span>
                    <button
                      onClick={() => sua(i, (x) => ({ ...x, partnerIdMoi: x.partnerIdCu, dongMoi: x.dongCu.map((d) => ({ ...d })) }))}
                      title="Trả chuyến này về như cũ"
                      className="p-1 rounded text-slate-400 hover:text-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <select
                  value={c.partnerIdMoi}
                  onChange={(e) => sua(i, (x) => ({ ...x, partnerIdMoi: e.target.value }))}
                  className={cn(O, "sm:w-80 sm:ml-auto", c.partnerIdMoi !== c.partnerIdCu && "border-emerald-400 text-emerald-700")}
                  aria-label="Đơn vị nhận"
                >
                  {!donViDung.some((p) => p.id === c.partnerIdMoi) && (
                    <option value={c.partnerIdMoi}>— Chọn đơn vị —</option>
                  )}
                  {donViDung.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.sapCode}
                    </option>
                  ))}
                </select>
              </div>
              {c.dongMoi.map((x, k) => {
                const cu = c.dongCu.find((d) => d.productId === x.productId);
                return (
                  <div key={k} className="flex items-center gap-2">
                    <select
                      value={x.productId}
                      onChange={(e) =>
                        sua(i, (y) => ({
                          ...y,
                          dongMoi: y.dongMoi.map((d, j) => (j === k ? { ...d, productId: e.target.value } : d)),
                        }))
                      }
                      className={O}
                      aria-label="Mặt hàng"
                    >
                      <option value="">— Mặt hàng —</option>
                      {matHang.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={Number.isFinite(x.soLuong) && x.soLuong !== 0 ? x.soLuong : ""}
                      onChange={(e) =>
                        sua(i, (y) => ({
                          ...y,
                          dongMoi: y.dongMoi.map((d, j) =>
                            j === k ? { ...d, soLuong: parseFloat(e.target.value) || 0 } : d,
                          ),
                        }))
                      }
                      className={cn(
                        O,
                        "w-32 text-right tabular-nums",
                        cu && Number(cu.soLuong) !== Number(x.soLuong) && "border-amber-400 text-amber-800",
                      )}
                      aria-label="Số lượng"
                    />
                    <span className="w-24 text-[11px] font-bold text-slate-400 shrink-0">
                      {x.productId ? dvtSp(x.productId) : ""}
                      {cu && Number(cu.soLuong) !== Number(x.soLuong) && ` (cũ ${formatNumber(cu.soLuong)})`}
                      {x.productId && !cu && " (mới)"}
                    </span>
                    <button
                      onClick={() => sua(i, (y) => ({ ...y, dongMoi: y.dongMoi.filter((_, j) => j !== k) }))}
                      aria-label="Bỏ dòng"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {c.dongCu
                .filter((d) => !c.dongMoi.some((x) => x.productId === d.productId))
                .map((d) => (
                  <p key={d.productId} className="text-[11px] font-bold text-rose-600 line-through">
                    {tenSp(d.productId)} × {formatNumber(d.soLuong)}
                  </p>
                ))}
              <button
                onClick={() => sua(i, (y) => ({ ...y, dongMoi: [...y.dongMoi, { productId: "", soLuong: 0 }] }))}
                className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-primary"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mặt hàng
              </button>
            </div>
          );
        })}
      </div>

      {/* --------------------------------------------- tờ bị ảnh hưởng + số mới */}
      <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-3">
        <p className="text-[12px] font-bold text-slate-600">
          Tờ {g.donVi}: {formatNumber(tt.tongCu)} → {formatNumber(tt.tongGocMoi)} SL
          {!tt.conHangGoc && " — hết hàng: tờ của đơn vị nhận chính là tờ thay thế."}
          {Math.abs(tt.chenhTonKho) > 1e-9 && (
            <span className="text-amber-700">
              {" "}· Xuất kho {tt.chenhTonKho > 0 ? "tăng" : "giảm"} {formatNumber(Math.abs(tt.chenhTonKho))} — tồn kho đổi theo
            </span>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tt.conHangGoc && (
            <div className="space-y-1.5">
              <p className={NHAN}>Số HĐ thay thế · {g.donVi}</p>
              <div className="flex gap-2">
                <input
                  value={soGoc.so}
                  onChange={(e) => setSoGoc({ ...soGoc, so: e.target.value })}
                  placeholder="C26TKB#…"
                  className={cn(O, "font-mono")}
                />
                <ONgay
                  value={soGoc.ngay}
                  onChange={(v: string) => setSoGoc({ ...soGoc, ngay: v })}
                  className={cn(O, "w-44")}
                />
              </div>
            </div>
          )}
          {tt.dich.map((d) => {
            const sm = soDich[d.maBp] || { so: "", ngay: homNay };
            const dat = (v: SoMoi) => setSoDich((cu) => ({ ...cu, [d.maBp]: v }));
            return (
              <div key={d.maBp} className="space-y-1.5">
                <p className={NHAN}>
                  Số HĐ · {d.donVi}
                  {d.to
                    ? ` (thay thế ${d.to.ban.soHoaDon})`
                    : d.batBuoc
                      ? ""
                      : " (để trống = về Chưa xuất hóa đơn)"}
                </p>
                <div className="flex gap-2">
                  <input
                    value={sm.so}
                    onChange={(e) => dat({ ...sm, so: e.target.value })}
                    placeholder="C26TKB#…"
                    className={cn(O, "font-mono")}
                  />
                  <ONgay value={sm.ngay} onChange={(v: string) => dat({ ...sm, ngay: v })} className={cn(O, "w-44")} />
                </div>
                <p className="text-[11px] font-bold text-slate-400">
                  {d.to
                    ? `Đợt này đã có ${d.to.ban.soHoaDon} — nhận thêm ${formatNumber(d.tongSoLuong)} SL nên phải thay thế.`
                    : `Đợt này chưa có hóa đơn — nhận ${formatNumber(d.tongSoLuong)} SL.`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className={NHAN}>Lý do thay thế</p>
        <input
          value={lyDo}
          onChange={(e) => setLyDo(e.target.value)}
          placeholder="VD: Chuyến 05.11 giao 100 lon, ghi nhầm 120; chuyến VINACS của SPA ghi nhầm BNG"
          className={O}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-[12px] font-bold", loi ? "text-rose-600" : "text-emerald-700")}>
          {loi || "Đủ thông tin — bấm để lập."}
        </p>
        <button
          onClick={luu}
          disabled={!!loi || dangLuu}
          className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-[12px] font-black uppercase tracking-widest hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {dangLuu ? "Đang lưu…" : "Lập hóa đơn thay thế"}
        </button>
      </div>
    </div>
  );
}
