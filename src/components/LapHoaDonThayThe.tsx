/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KHUNG LẬP HÓA ĐƠN THAY THẾ — mở từ nút "Thay thế" của một tờ ở Tra cứu
 * hóa đơn đã xuất. Phép tính nằm ở `src/lib/hoaDonThayThe.ts`.
 */

import { useMemo, useState } from "react";
import { Replace, X } from "lucide-react";
import type { Partner } from "../types";
import { tenTrenHoaDon } from "../lib/congNo";
import { khoaHoaDon } from "../lib/hoaDon";
import { stableHash } from "../lib/hash";
import { ngayCham } from "../lib/oNgay";
import {
  chuyenCuaHoaDon,
  kiemTraThayThe,
  lapThayThe,
  oCanDien,
  type GiaoDichChuyen,
  type KetQuaThayThe,
  type ToHoaDon,
} from "../lib/hoaDonThayThe";
import { cn, formatNumber, homNayDiaPhuong } from "../lib/utils";
import ONgay from "./ONgay";

interface Props {
  goc: ToHoaDon;
  /** Tờ đang hiệu lực của (đợt × mã BP) — để biết đơn vị đúng đã có hóa đơn chưa. */
  toCua: (tuNgay: string, denNgay: string, maBp: string) => ToHoaDon | undefined;
  giaoDichTheoId: ReadonlyMap<string, GiaoDichChuyen>;
  partners: Partner[];
  soDaCo: ReadonlySet<string>;
  nguoi: string;
  onLuu: (kq: KetQuaThayThe) => Promise<boolean>;
  onDong: () => void;
}

const O =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold outline-none focus:border-primary";
const NHAN = "text-[11px] font-black uppercase tracking-widest text-slate-400";

export default function LapHoaDonThayThe({
  goc,
  toCua,
  giaoDichTheoId,
  partners,
  soDaCo,
  nguoi,
  onLuu,
  onDong,
}: Props) {
  const g = goc.ban;
  const homNay = homNayDiaPhuong();
  const chuyen = useMemo(
    () => chuyenCuaHoaDon(goc.dong, giaoDichTheoId),
    [goc.dong, giaoDichTheoId],
  );
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [sangId, setSangId] = useState("");
  const [soGoc, setSoGoc] = useState("");
  const [ngayGoc, setNgayGoc] = useState(homNay);
  const [soSang, setSoSang] = useState("");
  const [ngaySang, setNgaySang] = useState(homNay);
  const [lyDo, setLyDo] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  const khoaChuyen = (c: { ma: string; partnerId: string }) => `${c.ma}|${c.partnerId}`;
  const chuyenChon = chuyen.filter((c) => chon.has(khoaChuyen(c)));

  /* Đơn vị đúng: có mã BP, không phải nhà cung cấp, khác mã BP tờ gốc. */
  const donViDung = useMemo(
    () =>
      partners
        .filter((p) => p.type !== "SUPPLIER" && p.sapCode && p.sapCode !== g.maBp)
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [partners, g.maBp],
  );
  const pSang = donViDung.find((p) => p.id === sangId);
  const sang = pSang
    ? {
        partnerId: pSang.id,
        maBp: pSang.sapCode,
        donVi: tenTrenHoaDon(pSang.name),
        khoa: khoaHoaDon(g.tuNgay, g.denNgay, pSang.sapCode, stableHash),
        to: toCua(g.tuNgay, g.denNgay, pSang.sapCode),
      }
    : undefined;

  const yc = {
    goc,
    chuyen: chuyenChon,
    sang,
    soMoiGoc: soGoc,
    ngayMoiGoc: ngayGoc,
    soMoiSang: soSang,
    ngayMoiSang: ngaySang,
    lyDo,
    soDaCo,
    luc: new Date().toISOString(),
    boi: nguoi,
    bam: stableHash,
    tenDoiTac: (id: string) =>
      tenTrenHoaDon(partners.find((p) => p.id === id)?.name || id),
    ngayCham,
  };
  const can = oCanDien(yc);
  const loi = kiemTraThayThe(yc);
  const tongGoc = goc.dong.reduce((s, d) => s + d.soLuong, 0);
  const tongChuyen = chuyenChon.reduce((s, c) => s + c.tongSoLuong, 0);
  const tongSangCu = sang?.to ? sang.to.dong.reduce((s, d) => s + d.soLuong, 0) : 0;

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
            {ngayCham(g.ngayHoaDon)} · {formatNumber(tongGoc)} SL
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

      {/* --------------------------------------------- chuyến ghi nhầm */}
      <div className="space-y-2">
        <p className={NHAN}>Chuyến ghi nhầm đơn vị (nếu có)</p>
        <p className="text-[12px] font-medium text-slate-500 leading-snug">
          Tích chuyến bị ghi sai tên đơn vị: hàng và ảnh của chuyến sẽ chuyển sang đơn vị
          đúng. Sai chỗ khác (ngày, thông tin) thì để trống — chỉ cấp số mới.
        </p>
        <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {chuyen.length === 0 && (
            <p className="px-3 py-3 text-[12px] font-bold text-slate-400">
              Không dựng được chuyến nào từ tờ này.
            </p>
          )}
          {chuyen.map((c) => {
            const k = khoaChuyen(c);
            return (
              <label
                key={k}
                className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={chon.has(k)}
                  onChange={() =>
                    setChon((cu) => {
                      const m = new Set(cu);
                      if (m.has(k)) m.delete(k);
                      else m.add(k);
                      return m;
                    })
                  }
                  className="mt-1"
                />
                <span className="min-w-0 text-[12px] font-bold text-slate-700">
                  <span className="font-mono text-slate-900">{ngayCham(c.ngay)}</span> ·{" "}
                  {c.tenDoiTac}{" "}
                  <span className="font-mono text-[11px] text-slate-400">{c.ma}</span>
                  <span className="block text-slate-500 font-medium">
                    {c.dong.map((x) => `${x.ten} × ${formatNumber(x.soLuong)}`).join(" · ")}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {chuyenChon.length > 0 && (
        <div className="space-y-1.5">
          <p className={cn(NHAN, "text-emerald-600")}>Đơn vị đúng</p>
          <select value={sangId} onChange={(e) => setSangId(e.target.value)} className={O}>
            <option value="">— Chọn —</option>
            {donViDung.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sapCode}
              </option>
            ))}
          </select>
          {sang && (
            <p className="text-[12px] font-bold text-slate-500">
              {sang.to
                ? `Đợt này ${sang.donVi} đã có hóa đơn ${sang.to.ban.soHoaDon} (${formatNumber(tongSangCu)} SL) — tờ đó cũng phải thay thế: ${formatNumber(tongSangCu)} → ${formatNumber(tongSangCu + tongChuyen)} SL.`
                : `Đợt này ${sang.donVi} chưa có hóa đơn — ${formatNumber(tongChuyen)} SL chuyển sang.`}
            </p>
          )}
          <p className="text-[12px] font-bold text-slate-500">
            Tờ {g.donVi}: {formatNumber(tongGoc)} → {formatNumber(tongGoc - tongChuyen)} SL
            {!can.conHangGoc && " — hết hàng: tờ của đơn vị đúng chính là tờ thay thế."}
          </p>
        </div>
      )}

      {/* --------------------------------------------- số hóa đơn mới */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {can.soGoc && (
          <div className="space-y-1.5">
            <p className={NHAN}>Số HĐ thay thế · {g.donVi}</p>
            <div className="flex gap-2">
              <input
                value={soGoc}
                onChange={(e) => setSoGoc(e.target.value)}
                placeholder="C26TKB#…"
                className={cn(O, "font-mono")}
              />
              <ONgay value={ngayGoc} onChange={(v: string) => setNgayGoc(v)} className={cn(O, "w-44")} />
            </div>
          </div>
        )}
        {can.soSang !== "khong" && sang && (
          <div className="space-y-1.5">
            <p className={NHAN}>
              Số HĐ · {sang.donVi}
              {can.soSang === "tuyChon" ? " (để trống = về Chưa xuất hóa đơn)" : ""}
            </p>
            <div className="flex gap-2">
              <input
                value={soSang}
                onChange={(e) => setSoSang(e.target.value)}
                placeholder="C26TKB#…"
                className={cn(O, "font-mono")}
              />
              <ONgay value={ngaySang} onChange={(v: string) => setNgaySang(v)} className={cn(O, "w-44")} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className={NHAN}>Lý do thay thế</p>
        <input
          value={lyDo}
          onChange={(e) => setLyDo(e.target.value)}
          placeholder="VD: Chuyến VINACS 30.09 của SPA, ghi nhầm BNC Ngoại giao"
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
