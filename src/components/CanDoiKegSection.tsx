/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Scale, Trash2 } from "lucide-react";
import type { ImportSlip, KiemKeKegLit, Partner, Product, Transaction } from "../types";
import {
  canDoiKeg,
  kiemKeChotGanNhat,
  LOAI_SO_KEG,
  type DongSoKeg,
  type LoaiSoKeg,
} from "../lib/soKeg";
import { cn, formatNumber, homNayDiaPhuong } from "../lib/utils";
import { isoSangVn } from "../lib/oNgay";
import ONgay from "./ONgay";

/**
 * CÂN ĐỐI KEG: tổng keg sở hữu = keg có bia (kho, xưởng, đang chuyển, đi
 * đường) + keg ở ĐVTV + keg rỗng → suy ra keg rỗng. Kèm SỔ KEG (tồn đầu sở
 * hữu, tồn đầu tại ĐVTV, mua thêm, hỏng / mất) do admin / kế toán ghi.
 * Công thức ở `lib/soKeg.ts`.
 */
export default function CanDoiKegSection({
  soKeg,
  transactions,
  products,
  partners,
  slips,
  kiemKeKeg,
  canGhi,
  canXoa,
  busy,
  onThem,
  onXoa,
}: {
  soKeg: DongSoKeg[];
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  slips: ImportSlip[];
  kiemKeKeg: KiemKeKegLit[];
  canGhi: boolean;
  canXoa: boolean;
  busy: boolean;
  onThem: (d: Omit<DongSoKeg, "id" | "createdBy" | "createdAt" | "uid">) => Promise<boolean>;
  onXoa: (id: string) => Promise<void>;
}) {
  const homNay = homNayDiaPhuong();
  const ngayChot = kiemKeChotGanNhat(kiemKeKeg, "KHO_TONG", homNay)?.date.slice(0, 10) || homNay;
  const [ngay, setNgay] = useState(ngayChot);
  const kq = useMemo(
    () => canDoiKeg({ ngay, soKeg, transactions, products, partners, slips, kiemKeKeg }),
    [ngay, soKeg, transactions, products, partners, slips, kiemKeKeg],
  );

  const [loai, setLoai] = useState<LoaiSoKeg>("TON_DAU_SO_HUU");
  const [ngayGhi, setNgayGhi] = useState(homNay);
  const [soLuong, setSoLuong] = useState("");
  const [maDoiTac, setMaDoiTac] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const donViNhan = partners.filter((p) => p.type !== "SUPPLIER");

  const them = async () => {
    const n = Math.trunc(Number(soLuong) || 0);
    if (n <= 0 || busy) return;
    if (loai === "TON_DAU_DVTV" && !maDoiTac) return;
    const dt = partners.find((p) => p.id === maDoiTac);
    const ok = await onThem({
      ngay: ngayGhi,
      loai,
      soKeg: n,
      ...(loai === "TON_DAU_DVTV" ? { maDoiTac, tenDoiTac: dt?.name || maDoiTac } : {}),
      ghiChu: ghiChu.trim(),
    });
    if (ok) {
      setSoLuong("");
      setGhiChu("");
    }
  };

  const dong = (nhan: string, so: number | null, chu?: string, dam = false, dau = "−") => (
    <tr className={cn(dam && "bg-slate-50 font-black")}>
      <td className="py-2 px-4">
        <span className="inline-block w-4 font-mono text-slate-400">{dau}</span>
        {nhan}
        {chu && <span className="block pl-4 text-[10px] font-semibold text-slate-400">{chu}</span>}
      </td>
      <td className="py-2 px-4 text-right font-mono tabular-nums">{so === null ? "—" : formatNumber(so)}</td>
    </tr>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
            TỔNG KEG KHÔNG ĐỔI · MỖI KEG NẰM ĐÚNG MỘT CHỖ
          </span>
          <h2 className="text-base font-extrabold">Cân đối keg &amp; keg rỗng</h2>
        </div>
        <Scale className="w-5 h-5 text-amber-400" />
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày cân đối</p>
              <div className="w-44">
                <ONgay
                  aria-label="Ngày cân đối"
                  value={ngay}
                  onChange={(v) => v && setNgay(v)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none focus:border-amber-600"
                />
              </div>
            </div>
            {ngay !== ngayChot && (
              <button
                type="button"
                onClick={() => setNgay(ngayChot)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-extrabold text-slate-600 hover:bg-slate-50"
              >
                Về ngày chốt Kho tổng ({isoSangVn(ngayChot)})
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {dong("Tổng keg sở hữu", kq.tongSoHuu,
                  `Tồn đầu ${formatNumber(kq.tonDauSoHuu)} + mua thêm ${formatNumber(kq.muaThem)} − hỏng/mất ${formatNumber(kq.hongMat)}`, true, "")}
                {dong("Keg có bia tại Kho tổng", kq.khoTong?.soKeg ?? null,
                  kq.khoTong ? `Kiểm kê chốt ngày ${isoSangVn(kq.khoTong.ngayKiem)} (keg vơi tính 1)` : "Chưa có kiểm kê chốt")}
                {dong("Keg có bia tại Xưởng", kq.xuong?.soKeg ?? null,
                  kq.xuong ? `Kiểm kê chốt ngày ${isoSangVn(kq.xuong.ngayKiem)} (gồm phiếu còn chờ Rào 1)` : "Chưa có kiểm kê chốt")}
                {dong("Đang chuyển Xưởng → Kho tổng", kq.dangChuyenNhap, "Phiếu đã qua Rào 1, chờ Kho tổng ký nhận")}
                {dong("Xuất đi đường, chưa xác nhận", kq.diDuong)}
                {dong("Đang ở ĐVTV", kq.dangODVTV,
                  `Tồn đầu ${formatNumber(kq.tonDauDVTV)} + đã giao ${formatNumber(kq.daGiaoDVTV)} − đã thu về ${formatNumber(kq.daThuVe)}`)}
                <tr className={cn("font-black text-sm", kq.kegRong < 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>
                  <td className="py-3 px-4">
                    <span className="inline-block w-4 font-mono">=</span>Keg rỗng
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{formatNumber(kq.kegRong)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {kq.canhBao.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-1">
              {kq.canhBao.map((c) => (
                <p key={c} className="flex gap-2 text-[11px] font-bold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {c}
                </p>
              ))}
            </div>
          )}
          <p className="text-[10px] font-semibold leading-relaxed text-slate-400">
            Giao ĐVTV đếm keg theo từng lượt giao (keg lẻ làm tròn lên); trả bia về nhà máy không tính.
            Vỏ thu về không ghi đơn vị ({formatNumber(kq.thuVeKhongRoDonVi)} keg) vẫn trừ vào tổng keg ở ĐVTV.
          </p>

          {kq.dvtv.length > 0 && (
            <div className="rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Đơn vị</th>
                    <th className="py-2 px-2 text-right">Tồn đầu</th>
                    <th className="py-2 px-2 text-right">Đã giao</th>
                    <th className="py-2 px-2 text-right">Thu về</th>
                    <th className="py-2 px-3 text-right">Đang giữ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kq.dvtv.map((d) => (
                    <tr key={d.unitId}>
                      <td className="py-2 px-3 font-bold text-slate-800">{d.unitName}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNumber(d.tonDau)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNumber(d.daGiao)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNumber(d.daThuVe)}</td>
                      <td className={cn("py-2 px-3 text-right font-mono font-black", d.dangGiu < 0 && "text-rose-600")}>
                        {formatNumber(d.dangGiu)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Sổ keg</p>
          {canGhi && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3 grid grid-cols-2 gap-2">
              <select
                value={loai}
                onChange={(e) => setLoai(e.target.value as LoaiSoKeg)}
                className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
              >
                {(Object.keys(LOAI_SO_KEG) as LoaiSoKeg[]).map((k) => (
                  <option key={k} value={k}>
                    {LOAI_SO_KEG[k]}
                  </option>
                ))}
              </select>
              {loai === "TON_DAU_DVTV" && (
                <select
                  value={maDoiTac}
                  onChange={(e) => setMaDoiTac(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                >
                  <option value="">— Chọn đơn vị đang giữ keg —</option>
                  {donViNhan.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <ONgay
                aria-label="Ngày ghi sổ keg"
                value={ngayGhi}
                onChange={(v) => v && setNgayGhi(v)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none"
              />
              <input
                type="number"
                min="1"
                step="1"
                value={soLuong}
                onChange={(e) => setSoLuong(e.target.value)}
                placeholder="Số keg"
                className="px-3 py-2 rounded-xl border border-slate-300 text-right font-mono font-black text-sm bg-white outline-none"
              />
              <input
                type="text"
                value={ghiChu}
                maxLength={500}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Ghi chú (lý do hỏng, số hoá đơn mua...)"
                className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
              />
              <button
                type="button"
                disabled={busy || !(Number(soLuong) > 0) || (loai === "TON_DAU_DVTV" && !maDoiTac)}
                onClick={() => void them()}
                className="col-span-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-extrabold"
              >
                Ghi sổ keg
              </button>
            </div>
          )}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 max-h-[420px] overflow-y-auto">
            {soKeg.length === 0 ? (
              <p className="p-4 text-center text-xs font-bold text-slate-400">
                Chưa ghi gì. Bắt đầu bằng tồn đầu tổng keg sở hữu và số keg từng ĐVTV đang giữ.
              </p>
            ) : (
              [...soKeg]
                .sort((a, b) => (b.ngay + b.createdAt).localeCompare(a.ngay + a.createdAt))
                .map((d) => (
                  <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">
                        <span className="font-mono text-slate-400 mr-2">{isoSangVn(d.ngay)}</span>
                        {LOAI_SO_KEG[d.loai] || d.loai}
                        {d.tenDoiTac ? ` · ${d.tenDoiTac}` : ""}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">
                        {d.createdBy}
                        {d.ghiChu ? ` · ${d.ghiChu}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "font-mono font-black",
                          d.loai === "HONG_MAT" ? "text-rose-600" : "text-slate-900",
                        )}
                      >
                        {d.loai === "HONG_MAT" ? "−" : "+"}
                        {formatNumber(d.soKeg)}
                      </span>
                      {canXoa && (
                        <button
                          type="button"
                          onClick={() => void onXoa(d.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Xoá dòng sổ keg ghi nhầm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
