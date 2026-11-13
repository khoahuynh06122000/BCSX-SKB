/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * THƯ VIỆN ẢNH — dựng lại trên bảng `anh_chung_tu` (13/11/2026).
 *
 * Mỗi tấm một ô. Lọc chiều nhập / xuất, khoảng ngày (mặc định 30 ngày gần
 * nhất), đơn vị (BNC gộp bốn phần, chọn một phần thì soi tiếp điểm bán). Tải
 * hàng loạt thành ZIP, soát mã lỗi thật, admin xoá vĩnh viễn từng tấm.
 */

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Download,
  ImageIcon,
  ImageOff,
  Loader2,
  Maximize2,
  Minimize2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import ONgay from "../components/ONgay";
import { cn, formatDate, formatNumber } from "../lib/utils";
import ChonNhieuDonVi from "./ChonNhieuDonVi";
import OAnhLuoi from "./OAnhLuoi";
import { anhThuNho } from "./duongDan";
import { traLuot, xinLuot } from "./hangDoi";
import { kiemTraKhoaXoa } from "./kho";
import type { AnhChungTu } from "./moHinh";
import { baoCao, nhanDinh, nhomCuaMa, tomTatSoat, type KetQuaMotTam, type TomTatSoat } from "./soat";
import { tenCaBo, taoZip } from "./taiVe";
import {
  danhSachDonVi,
  diemBanCuaPhan,
  dungOAnh,
  locTheoDonVi,
  locTheoNgay,
  type DongThuVien,
  type OAnh,
} from "./thuVien";

interface Props {
  anh: AnhChungTu[];
  giaoDich: DongThuVien[];
  laAdmin: boolean;
  /** Admin xoá vĩnh viễn một tấm. Trả về true khi đã xoá. */
  onXoa: (o: OAnh) => Promise<boolean>;
  bao: (chu: string, kieu?: "success" | "error") => void;
}

export default function ThuVienAnh({ anh, giaoDich, laAdmin, onXoa, bao }: Props) {
  const [loai, setLoai] = useState<"NHAP" | "XUAT">("NHAP");
  const [tu, setTu] = useState(() => format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd"));
  const [den, setDen] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [donVi, setDonVi] = useState<string[]>([]);
  const [diemBan, setDiemBan] = useState("");
  const [dangXem, setDangXem] = useState<OAnh | null>(null);
  const [coThat, setCoThat] = useState(false);
  const [dangXoa, setDangXoa] = useState(false);
  const [tai, setTai] = useState({ tong: 0, xong: 0 });
  const [soat, setSoat] = useState({ tong: 0, xong: 0 });
  const [ketQuaSoat, setKetQuaSoat] = useState<TomTatSoat | null>(null);
  const [khoaXoa, setKhoaXoa] = useState<{ ok: boolean; loi?: string } | null>(null);

  useEffect(() => setCoThat(false), [dangXem?.id]);

  // Admin: thử khoá xoá ảnh một lần — khoá sai thì báo ngay, không đợi lúc xoá thật.
  const thuKhoa = () =>
    kiemTraKhoaXoa()
      .then(() => setKhoaXoa({ ok: true }))
      .catch((e) => setKhoaXoa({ ok: false, loi: e instanceof Error ? e.message : String(e) }));
  useEffect(() => {
    if (laAdmin) void thuKhoa();
  }, [laAdmin]);

  const tatCaChieu = useMemo(() => dungOAnh({ anh, giaoDich, loai }), [anh, giaoDich, loai]);
  const theoNgay = useMemo(() => locTheoNgay(tatCaChieu, tu, den), [tatCaChieu, tu, den]);
  const dsDonVi = useMemo(() => danhSachDonVi(theoNgay), [theoNgay]);
  const theoDonVi = useMemo(() => locTheoDonVi(theoNgay, donVi), [theoNgay, donVi]);
  const dsDiemBan = useMemo(() => diemBanCuaPhan(theoDonVi, donVi), [theoDonVi, donVi]);
  const dangHien = useMemo(
    () => (diemBan ? theoDonVi.filter((o) => o.donVi === diemBan) : theoDonVi),
    [theoDonVi, diemBan],
  );

  // Ô đang xem đã bị xoá / đổi thì đóng khung.
  useEffect(() => {
    if (dangXem && !anh.some((a) => a.id === dangXem.id)) setDangXem(null);
  }, [anh, dangXem]);

  const doiLoai = (l: "NHAP" | "XUAT") => {
    setLoai(l);
    setDonVi([]);
    setDiemBan("");
  };

  const taiTatCa = async () => {
    if (tai.tong || !dangHien.length) return;
    if (dangHien.length > 300 && !confirm(`Sắp tải ${dangHien.length} ảnh vào một tệp ZIP, có thể mất vài phút. Tiếp tục?`)) return;
    const ds = dangHien;
    const ten = tenCaBo(
      ds.map((o) => ({ url: o.url, date: o.date, donVi: o.donVi, diemNhan: o.diemNhan, maPhieu: loai === "NHAP" ? o.chungTu : "" })),
    );
    setTai({ tong: ds.length, xong: 0 });
    const tep: { ten: string; duLieu: Uint8Array }[] = [];
    let hong = 0;
    let tongByte = 0;
    let ke = 0;
    let tran = false;
    const chay = async () => {
      while (ke < ds.length && !tran) {
        const k = ke++;
        try {
          const r = await fetch(ds[k].url);
          if (!r.ok) throw new Error(String(r.status));
          const du = new Uint8Array(await r.arrayBuffer());
          tongByte += du.length;
          if (tongByte > 800 * 1024 * 1024) tran = true;
          else tep.push({ ten: ten[k], duLieu: du });
        } catch {
          hong++;
        }
        setTai((t) => ({ ...t, xong: t.xong + 1 }));
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(4, ds.length) }, chay));
      if (tran) return bao("Bộ ảnh quá lớn (trên 800 MB). Thu hẹp khoảng ngày rồi tải lại.", "error");
      if (!tep.length) return bao("Không tải được tấm nào. Kiểm tra lại mạng.", "error");
      tep.sort((a, b) => a.ten.localeCompare(b.ten));
      const url = URL.createObjectURL(taoZip(tep));
      const a = document.createElement("a");
      a.href = url;
      a.download = `thu-vien-anh-${loai === "NHAP" ? "nhap-kho" : "xuat-kho"}${tu || den ? `-${tu || "dau"}-den-${den || "nay"}` : ""}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      bao(hong ? `Đã tải ${tep.length} ảnh, ${hong} tấm không lấy được` : `Đã tải ${tep.length} ảnh`, hong ? "error" : "success");
    } finally {
      setTai({ tong: 0, xong: 0 });
    }
  };

  /** Soát cả khoảng ngày (mọi đơn vị) để thấy quy luật hỏng, không theo đơn vị đang lọc. */
  const soatAnh = async () => {
    if (soat.tong || !theoNgay.length) return;
    setKetQuaSoat(null);
    setSoat({ tong: theoNgay.length, xong: 0 });
    const ra: KetQuaMotTam[] = [];
    for (const o of theoNgay) {
      await xinLuot();
      let ma = 0;
      let loi = "";
      try {
        const r = await fetch(anhThuNho(o.url, 64), { cache: "no-store" });
        await r.arrayBuffer().catch(() => undefined);
        ma = r.status;
        loi = r.headers.get("x-cld-error") || "";
        // Bản thu nhỏ bị từ chối thì hỏi luôn ảnh gốc: phân biệt hết hạn mức biến đổi với mất tệp.
        if (nhomCuaMa(ma) !== "duoc") {
          const g = await fetch(o.url, { method: "HEAD", cache: "no-store" });
          if (g.ok) {
            ma = g.status;
            loi = "";
          }
        }
      } catch (e) {
        loi = e instanceof Error ? e.message : String(e);
      } finally {
        traLuot();
      }
      ra.push({ url: o.url, date: o.date, donVi: o.donVi || "(không rõ)", ma, loi });
      setSoat((t) => ({ ...t, xong: t.xong + 1 }));
    }
    setKetQuaSoat(tomTatSoat(ra));
    setSoat({ tong: 0, xong: 0 });
  };

  const xoa = async (o: OAnh) => {
    if (!laAdmin || dangXoa) return;
    setDangXoa(true);
    try {
      if (await onXoa(o)) setDangXem(null);
    } finally {
      setDangXoa(false);
    }
  };

  const nutO = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-black focus:outline-none focus:border-primary shadow-sm text-slate-700";

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="shrink-0">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic font-serif uppercase">
            THƯ VIỆN ẢNH {loai === "NHAP" ? "NHẬP KHO" : "XUẤT KHO"}
          </h2>
          <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-[0.18em]">
            {loai === "NHAP" ? "Ảnh tờ phiếu nhập kho đã ký" : "Ảnh biên bản giao hàng"} · đang xem{" "}
            {formatNumber(dangHien.length)}/{formatNumber(tatCaChieu.length)} ảnh
          </p>
          {tatCaChieu.length > theoNgay.length && (tu || den) && (
            <button onClick={() => (setTu(""), setDen(""))} className="mt-2 text-[11px] font-black text-primary hover:underline">
              {formatNumber(tatCaChieu.length - theoNgay.length)} tấm nằm ngoài khoảng ngày đang chọn — bấm để xem tất cả
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 lg:w-40">
              <ONgay aria-label="Từ ngày" className={nutO} value={tu} max={den || undefined} onChange={(v: string) => setTu(v)} />
            </div>
            <span className="text-slate-300 font-black shrink-0">—</span>
            <div className="flex-1 lg:w-40">
              <ONgay aria-label="Đến ngày" className={nutO} value={den} min={tu || undefined} onChange={(v: string) => setDen(v)} />
            </div>
            <button
              onClick={() => (setTu(""), setDen(""))}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary shrink-0"
            >
              Tất cả
            </button>
          </div>

          <div className="flex bg-slate-100/50 p-1.5 rounded-2xl w-full md:w-auto border border-slate-200/50 shadow-inner">
            {(["NHAP", "XUAT"] as const).map((l) => (
              <button
                key={l}
                onClick={() => doiLoai(l)}
                className={cn(
                  "flex-1 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  loai === l
                    ? cn("bg-white shadow-xl border border-slate-100", l === "NHAP" ? "text-amber-600" : "text-rose-600")
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {l === "NHAP" ? "Nhập kho" : "Xuất kho"}
              </button>
            ))}
          </div>

          {loai === "XUAT" && (
            <ChonNhieuDonVi ds={dsDonVi} dangChon={donVi} onDoi={(v) => (setDonVi(v), setDiemBan(""))} />
          )}

          {loai === "XUAT" && dsDiemBan.length > 0 && (
            <div className="relative w-full lg:w-52 shrink-0">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                aria-label="Lọc theo điểm bán"
                value={diemBan}
                onChange={(e) => setDiemBan(e.target.value)}
                className="w-full appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-black shadow-sm uppercase tracking-widest text-slate-700"
              >
                <option value="">{`Tất cả điểm bán (${formatNumber(dsDiemBan.length)})`}</option>
                {dsDiemBan.map((d) => (
                  <option key={d} value={d}>
                    {d.replace(/^BNC · /, "")}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={taiTatCa}
            disabled={tai.tong > 0 || !dangHien.length}
            className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            {tai.tong ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải {formatNumber(tai.xong)}/{formatNumber(tai.tong)}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Tải tất cả ({formatNumber(dangHien.length)})
              </>
            )}
          </button>

          <button
            onClick={soatAnh}
            disabled={soat.tong > 0 || !theoNgay.length}
            title={`Hỏi thử ${theoNgay.length} tấm trong khoảng ngày này và đọc mã trả về thật của máy chủ ảnh`}
            className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary disabled:opacity-40"
          >
            {soat.tong ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang soát {formatNumber(soat.xong)}/{formatNumber(soat.tong)}
              </>
            ) : (
              <>
                <ImageOff className="w-4 h-4" /> Soát ảnh ({formatNumber(theoNgay.length)})
              </>
            )}
          </button>
        </div>
      </div>

      {ketQuaSoat && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Kết quả soát · {formatNumber(ketQuaSoat.tong)} tấm, hỏng {formatNumber(ketQuaSoat.hong)}
              </p>
              <p className="text-[13px] font-bold text-slate-700 mt-1 leading-relaxed">{nhanDinh(ketQuaSoat)}</p>
            </div>
            <button
              onClick={() =>
                navigator.clipboard
                  ?.writeText(baoCao(ketQuaSoat))
                  .then(() => bao("Đã sao chép báo cáo"))
                  .catch(() => bao("Không sao chép được", "error"))
              }
              className="shrink-0 px-3 py-2 rounded-lg bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200"
            >
              Sao chép
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[
              { ten: "Theo nguyên nhân", ds: ketQuaSoat.theoNhom },
              { ten: "Theo tháng", ds: ketQuaSoat.theoThang },
              { ten: "Theo đơn vị", ds: ketQuaSoat.theoDonVi },
            ].map((b) => (
              <div key={b.ten} className="rounded-xl border border-slate-200 overflow-hidden">
                <p className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">{b.ten}</p>
                <div className="max-h-56 overflow-y-auto">
                  {b.ds.map((o) => (
                    <div key={o.ten} className="px-3 py-1.5 flex justify-between gap-2 text-[11px] font-bold">
                      <span className="truncate text-slate-600">{o.ten}</span>
                      <span className={cn("tabular-nums", !o.hong ? "text-emerald-600" : o.hong === o.tong ? "text-rose-600" : "text-amber-600")}>
                        {o.hong}/{o.tong}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {laAdmin && khoaXoa && !khoaXoa.ok && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-rose-800 leading-relaxed">
              <strong>Chưa xoá được ảnh trên Cloudinary.</strong> Xoá dữ liệu lúc này thì ảnh còn nằm lại. {khoaXoa.loi}
            </p>
            <button onClick={thuKhoa} className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-[10px] font-black uppercase tracking-widest text-rose-700">
              Kiểm tra lại
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
        {dangHien.length ? (
          dangHien.map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => setDangXem(o)}
              className={cn(
                "group text-left bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                o.chungTuDaXoa ? "border-rose-300" : "border-slate-200/70 hover:border-slate-300",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                <OAnhLuoi url={o.url} alt={o.tieuDe} className="w-full h-full object-cover" />
                <span
                  className={cn(
                    "absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-black tabular-nums shadow-sm",
                    loai === "NHAP" ? "text-amber-700" : "text-rose-700",
                  )}
                >
                  {formatDate(o.date)}
                </span>
              </div>
              <div className="px-3 py-2.5 space-y-1">
                <p className={cn("text-[12px] font-bold leading-snug line-clamp-2 min-h-[2.1em]", o.chungTuDaXoa ? "text-rose-600" : "text-slate-800")}>
                  {o.tieuDe}
                </p>
                <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400 truncate">
                  <Users className="w-3 h-3 shrink-0" />
                  <span className="truncate">{o.phu}</span>
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center text-center space-y-4 border-dashed border-2 bg-slate-50/50 rounded-3xl">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl text-slate-300">
              <ImageIcon className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-900 uppercase">Trống</h4>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest px-4">
              {tatCaChieu.length
                ? `Không có ảnh nào trong bộ lọc đang chọn. Toàn bộ có ${formatNumber(tatCaChieu.length)} ảnh — nới ngày ra hoặc bấm "Tất cả".`
                : loai === "NHAP"
                  ? "Chưa có ảnh phiếu nhập kho nào. Ảnh vào đây sau khi đưa ảnh tờ phiếu đã ký ở tab Phiếu nhập."
                  : "Chưa có ảnh biên bản xuất kho nào."}
            </p>
          </div>
        )}
      </div>

      {dangXem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5">
          <div onClick={() => setDangXem(null)} className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" />
          <div className="relative w-full max-w-5xl h-full flex flex-col gap-3">
            <div className="shrink-0 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-white font-black text-base sm:text-xl uppercase tracking-tighter truncate">{dangXem.tieuDe}</h3>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1 truncate">
                  {formatDate(dangXem.date)} • {dangXem.phu} • {dangXem.chungTu}
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3 shrink-0">
                <button
                  onClick={() => setCoThat((v) => !v)}
                  title={coThat ? "Vừa khung" : "Cỡ thật"}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl flex items-center justify-center border border-white/10"
                >
                  {coThat ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                {laAdmin && (
                  <button
                    onClick={() => xoa(dangXem)}
                    disabled={dangXoa}
                    title="Xoá vĩnh viễn — xoá cả tệp trên Cloudinary (chỉ admin)"
                    className="w-11 h-11 sm:w-12 sm:h-12 bg-white/10 hover:bg-rose-600 text-white rounded-2xl flex items-center justify-center border border-white/10 disabled:opacity-40"
                  >
                    {dangXoa ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  </button>
                )}
                <a
                  href={dangXem.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Mở ảnh gốc"
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl flex items-center justify-center border border-white/10"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setDangXem(null)}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto rounded-3xl flex">
              <img
                src={dangXem.url}
                onClick={() => setCoThat((v) => !v)}
                className={cn("m-auto rounded-3xl shadow-2xl", coThat ? "w-full h-auto cursor-zoom-out" : "max-w-full max-h-full object-contain cursor-zoom-in")}
                alt={dangXem.tieuDe}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
