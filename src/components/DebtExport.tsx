import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Receipt,
  AlertTriangle,
  Calculator,
  Plus,
  Trash2,
  CalendarRange,
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, Product, Partner } from "../types";
import { PRICE_TABLE, invoiceUnitOf } from "../lib/invoice";
import { dungBangCongNo, nhanNgayGiao, type DotChot } from "../lib/congNo";
import {
  dongCanDienHoaDon,
  bangHoaDon,
  type HoaDonGhiNhan,
} from "../lib/hoaDon";
import { stableHash } from "../lib/hash";
import { taoWorkbookCongNo } from "../lib/congNoExcel";
// Ghi bang XLSXDep chu khong phai `xlsx`: dung `xlsx` thi workbook da gan dinh
// dang van bi ghi ra trang tron, vi ban cong dong khong ghi thuoc tinh `s`.
import { XLSXDep } from "../lib/excelDep";
import {
  CAU_HINH_MAC_DINH,
  dungTepSap,
  kiemCanChungTu,
  type CauHinhSap,
  type DongHangSap,
} from "../lib/sapTemplate";
import { taoWorkbookTemplateSap } from "../lib/sapTemplateExcel";
import { cn, formatNumber } from "../lib/utils";

/**
 * CÔNG NỢ · HÓA ĐƠN
 *
 * Dựng đúng sheet "Chốt" của file công nợ tháng — xem `src/lib/congNo.ts` để
 * biết từng quy tắc lấy ra từ đâu trong file thật.
 *
 * Màn hình này làm hai việc, và việc thứ hai mới là việc chính:
 *
 *   1. Kết xuất file để phát hành hóa đơn.
 *   2. THEO DÕI: đợt nào đã chốt bao nhiêu, đơn vị nào nợ bao nhiêu, và quan
 *      trọng nhất — có bia nào đã giao mà rơi ra ngoài mọi đợt không. Đó là
 *      loại sai sót không ai phát hiện ra cho tới lúc đối chiếu cuối năm.
 *
 * ĐỢT CHỐT LƯU TRÊN MÁY NÀY (localStorage), không lưu lên hệ thống. Đợt là
 * lịch phát hành hóa đơn của kế toán, một người giữ; đẩy lên Firestore thì
 * phải thêm collection, thêm quyền, thêm một chỗ nữa để lệch nhau. Đổi máy
 * thì khai lại — mất chừng một phút.
 */

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  /** Hóa đơn đã phát hành, do người dùng điền lại. */
  hoaDon: HoaDonGhiNhan[];
  onSaveHoaDon: (ds: HoaDonGhiNhan[]) => Promise<void>;
}

const KHOA_LUU = "bcsx.congno.dot";
const KHOA_LUU_SO = "bcsx.congno.sohoadon";

function dotMacDinh(): DotChot[] {
  const now = new Date();
  const dau = new Date(now.getFullYear(), now.getMonth(), 1);
  return [
    {
      id: "d1",
      tuNgay: format(dau, "yyyy-MM-dd"),
      denNgay: format(now, "yyyy-MM-dd"),
      ngayHoaDon: format(now, "yyyy-MM-dd"),
    },
  ];
}

function docDotDaLuu(): DotChot[] {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    if (!raw) return dotMacDinh();
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || v.length === 0) return dotMacDinh();
    return v.filter(
      (d) => d && d.id && d.tuNgay && d.denNgay && d.ngayHoaDon,
    ) as DotChot[];
  } catch {
    return dotMacDinh();
  }
}

export default function DebtExport({
  transactions,
  products,
  partners,
  hoaDon,
  onSaveHoaDon,
}: Props) {
  const [dot, setDot] = useState<DotChot[]>(docDotDaLuu);
  const [tienTo, setTienTo] = useState("C26TKB#");
  const [soBatDau, setSoBatDau] = useState<number>(() => {
    const v = Number(localStorage.getItem(KHOA_LUU_SO));
    return Number.isFinite(v) && v > 0 ? v : 1;
  });

  useEffect(() => {
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(dot));
    } catch {
      /* hết chỗ lưu thì thôi, không chặn việc kết xuất */
    }
  }, [dot]);

  /** Số hóa đơn thật đã lưu, tra theo `<tuNgay>|<denNgay>|<maBp>`. */
  const hoaDonThat = useMemo(() => {
    const m = new Map<string, { soHoaDon: string; ngayHoaDon: string }>();
    hoaDon.forEach((h) => {
      if (!h.soHoaDon) return;
      m.set([h.tuNgay, h.denNgay, h.maBp].join("|"), {
        soHoaDon: h.soHoaDon,
        ngayHoaDon: h.ngayHoaDon,
      });
    });
    return m;
  }, [hoaDon]);

  const bang = useMemo(
    () =>
      dungBangCongNo({
        transactions,
        products,
        partners,
        dot,
        tienToHoaDon: tienTo,
        soHoaDonBatDau: soBatDau,
        hoaDonThat,
      }),
    [transactions, products, partners, dot, tienTo, soBatDau, hoaDonThat],
  );

  /*
   * Danh sách hóa đơn cần điền: mỗi (đợt × đơn vị) một dòng.
   *
   * Kèm tổng tiền để người điền đối chiếu với tờ hóa đơn đang cầm trước khi gõ
   * số vào — gõ nhầm số sang đơn vị khác thì đối chiếu thuế sau này mới lộ.
   */
  const daGhi = useMemo(() => bangHoaDon(hoaDon), [hoaDon]);
  const canDien = useMemo(
    () =>
      dongCanDienHoaDon(
        bang.dong,
        dot.map((d) => ({
          tuNgay: d.tuNgay,
          denNgay: d.denNgay,
          nhan: nhanNgayGiao(d.tuNgay, d.denNgay),
        })),
        daGhi,
        stableHash,
      ),
    [bang.dong, dot, daGhi],
  );

  /** Chữ đang gõ trong bảng, chưa bấm lưu. */
  const [nhap, setNhap] = useState<
    Record<string, { soHoaDon: string; ngayHoaDon: string }>
  >({});
  const [dangLuu, setDangLuu] = useState(false);

  const oCuaDong = (d: (typeof canDien)[0]) =>
    nhap[d.khoa] ?? { soHoaDon: d.soDaGhi, ngayHoaDon: d.ngayDaGhi };

  const suaO = (
    khoa: string,
    truong: "soHoaDon" | "ngayHoaDon",
    giaTri: string,
    d: (typeof canDien)[0],
  ) =>
    setNhap((t) => ({
      ...t,
      [khoa]: { ...oCuaDongTrong(t, d), [truong]: giaTri },
    }));

  const oCuaDongTrong = (
    t: Record<string, { soHoaDon: string; ngayHoaDon: string }>,
    d: (typeof canDien)[0],
  ) => t[d.khoa] ?? { soHoaDon: d.soDaGhi, ngayHoaDon: d.ngayDaGhi };

  /** Điền sẵn số app gợi ý vào những ô còn trống, chạy tuần tự. */
  const dienGoiY = () => {
    const t = { ...nhap };
    canDien.forEach((d) => {
      const o = oCuaDongTrong(t, d);
      if (!o.soHoaDon.trim()) {
        t[d.khoa] = {
          soHoaDon: d.soGoiY,
          ngayHoaDon: o.ngayHoaDon || d.denNgay,
        };
      }
    });
    setNhap(t);
  };

  const luuHoaDon = async () => {
    const ds: HoaDonGhiNhan[] = canDien
      .map((d) => {
        const o = oCuaDong(d);
        return { d, o };
      })
      .filter(({ d, o }) => {
        const doi =
          o.soHoaDon.trim() !== d.soDaGhi ||
          (o.ngayHoaDon || "") !== d.ngayDaGhi;
        return doi && o.soHoaDon.trim();
      })
      .map(({ d, o }) => ({
        id: d.khoa,
        tuNgay: d.tuNgay,
        denNgay: d.denNgay,
        maBp: d.maBp,
        donVi: d.donVi,
        soHoaDon: o.soHoaDon.trim(),
        ngayHoaDon: o.ngayHoaDon || d.denNgay,
      }));

    if (!ds.length) {
      alert("Không có ô nào thay đổi.");
      return;
    }
    setDangLuu(true);
    try {
      await onSaveHoaDon(ds);
      setNhap({});
    } finally {
      setDangLuu(false);
    }
  };

  const themDot = () => {
    const cuoi = dot[dot.length - 1];
    const sau = cuoi
      ? format(
          new Date(new Date(cuoi.denNgay + "T00:00:00").getTime() + 86400000),
          "yyyy-MM-dd",
        )
      : format(new Date(), "yyyy-MM-dd");
    setDot([
      ...dot,
      {
        id: `d${Date.now()}`,
        tuNgay: sau,
        denNgay: sau,
        ngayHoaDon: sau,
      },
    ]);
  };

  const suaDot = (id: string, truong: keyof DotChot, giaTri: string) =>
    setDot(dot.map((d) => (d.id === id ? { ...d, [truong]: giaTri } : d)));

  const xoaDot = (id: string) => setDot(dot.filter((d) => d.id !== id));

  const handleDownload = () => {
    if (!bang.dong.length) return;
    const matHang = products
      .filter((p) => p.materialCode)
      .map((p) => ({
        maVatTu: p.materialCode as string,
        ten: p.name,
        dvt: invoiceUnitOf(p.category),
      }));
    // Danh mục đơn vị cho sheet "Đơn giá": mỗi mã SAP một dòng, vì 20 bộ phận
    // BNC dùng chung một mã và hóa đơn chỉ biết mã.
    const theoMa = new Map<string, string>();
    partners
      .filter((p) => p.sapCode && p.type !== "SUPPLIER")
      .forEach((p) => {
        const ten = p.name.split("·")[0].trim();
        if (!theoMa.has(p.sapCode)) theoMa.set(p.sapCode, ten);
      });
    const donVi = Array.from(theoMa.entries())
      .map(([maSap, ten]) => ({ ten, maSap }))
      .sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

    const wb = taoWorkbookCongNo(bang, matHang, donVi);
    const dauKy = dot.reduce((a, d) => (d.tuNgay < a ? d.tuNgay : a), dot[0].tuNgay);
    XLSXDep.writeFile(wb, `Cong no ${format(new Date(dauKy + "T00:00:00"), "MM.yyyy")}.xlsx`);
    // Số hóa đơn kế tiếp nhớ lại cho lần sau, khỏi phải tra sổ.
    try {
      localStorage.setItem(KHOA_LUU_SO, String(bang.soHoaDonTiepTheo));
    } catch {
      /* không lưu được thì kế toán tự điền */
    }
  };

  /* -------- Tệp TEMPLATE để xuất hóa đơn trên hệ thống khác -------- */

  const [ngayChungTu, setNgayChungTu] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [cauHinhSap, setCauHinhSap] = useState<CauHinhSap>(CAU_HINH_MAC_DINH);
  const [moCauHinh, setMoCauHinh] = useState(false);

  /*
   * Dòng hàng cho tệp TEMPLATE, lấy thẳng từ bảng Chốt.
   *
   * Không tính lại tiền: bảng Chốt đã là số đi phát hành hóa đơn, nên hai tệp
   * bắt buộc phải khớp nhau từng đồng. Tính lại ở đây là mở đường cho hai con
   * số khác nhau cùng nói về một lần bán.
   */
  const tepSap = useMemo(() => {
    const dong: DongHangSap[] = bang.dong.map((r) => ({
      khoaDot: r.ngayGiaoBia,
      maBp: r.maBp,
      donVi: r.donVi,
      tenHangHoa: r.tenHangHoa,
      dvt: r.dvt,
      soLuong: r.soLuong,
      thanhTien: r.thanhTienSkb,
    }));
    return dungTepSap({ dong, ngayChungTu, cauHinh: cauHinhSap });
  }, [bang.dong, ngayChungTu, cauHinhSap]);

  const taiTepSap = () => {
    if (!tepSap.oDong.length) return;
    const lech = kiemCanChungTu(tepSap);
    if (lech.length) {
      alert(
        `Có ${lech.length} chứng từ không cân (Nợ khác Có). Không tải xuống để tránh hệ thống bên kia từ chối cả tệp.`,
      );
      return;
    }
    XLSXDep.writeFile(
      taoWorkbookTemplateSap(tepSap),
      `TEMPLATE xuat hoa don ${ngayChungTu}.xlsx`,
    );
  };

  const suaCauHinh = (truong: keyof CauHinhSap, giaTri: string) =>
    setCauHinhSap((c) => ({ ...c, [truong]: giaTri }));

  const tien = (n: number) => formatNumber(Math.round(n));
  const nghiemTrong = (loai: string) =>
    loai === "ngoai_dot" || loai === "thieu_ma_vat_tu" || loai === "thieu_ma_bp";

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <Receipt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          Dựng đúng sheet <strong>Chốt</strong> của file công nợ tháng: 18 cột,
          hai chặng giá cạnh nhau, một số hóa đơn cho mỗi{" "}
          <strong>đợt × đơn vị</strong>. Hai mươi bộ phận BNC gộp về một dòng
          theo mã BP <strong>AD0103</strong>, vì hóa đơn xuất cho pháp nhân chứ
          không xuất cho từng quán.
        </p>
      </div>

      {/* ----- Đợt chốt ----- */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Đợt chốt hóa đơn
            </p>
          </div>
          <button
            onClick={themDot}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Thêm đợt
          </button>
        </div>

        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
          Một tháng thường chốt nhiều đợt dài ngắn khác nhau. Khai đủ các đợt thì
          app kiểm được có ngày xuất kho nào rơi ra ngoài không.
        </p>

        <div className="space-y-2">
          {dot.map((d, i) => (
            <div
              key={d.id}
              className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center"
            >
              <span className="text-[10px] font-black text-slate-300 w-5 text-center">
                {i + 1}
              </span>
              {(
                [
                  ["tuNgay", "Từ ngày"],
                  ["denNgay", "Đến ngày"],
                  ["ngayHoaDon", "Ngày hóa đơn"],
                ] as [keyof DotChot, string][]
              ).map(([truong, nhan]) => (
                <label key={truong} className="block">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {nhan}
                  </span>
                  <input
                    type="date"
                    value={d[truong] as string}
                    onChange={(e) => suaDot(d.id, truong, e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900"
                  />
                </label>
              ))}
              <button
                onClick={() => xoaDot(d.id)}
                disabled={dot.length <= 1}
                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                title="Xóa đợt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          <label className="block">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Tiền tố số hóa đơn
            </span>
            <input
              value={tienTo}
              onChange={(e) => setTienTo(e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900 font-mono"
            />
          </label>
          <label className="block">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Số hóa đơn đầu kỳ
            </span>
            <input
              type="number"
              min={1}
              value={soBatDau}
              onChange={(e) => setSoBatDau(Number(e.target.value) || 1)}
              className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900 tabular-nums"
            />
          </label>
        </div>
      </div>

      {/* ----- Cảnh báo ----- */}
      {bang.canhBao.length > 0 && (
        <div className="space-y-2">
          {bang.canhBao.map((c, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-2xl border flex gap-3",
                nghiemTrong(c.loai)
                  ? "border-amber-300 bg-amber-50"
                  : "border-blue-200 bg-blue-50",
              )}
            >
              <AlertTriangle
                className={cn(
                  "w-5 h-5 shrink-0 mt-0.5",
                  nghiemTrong(c.loai) ? "text-amber-600" : "text-blue-600",
                )}
              />
              <p
                className={cn(
                  "text-[11px] font-bold leading-relaxed",
                  nghiemTrong(c.loai) ? "text-amber-800" : "text-blue-800",
                )}
              >
                {c.moTa} — <strong>{c.soDong} dòng</strong>,{" "}
                {formatNumber(c.soLuong)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ----- Tổng kỳ ----- */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        {[
          { label: "Số dòng", value: formatNumber(bang.tong.soDong) },
          { label: "Số lượng", value: formatNumber(bang.tong.soLuong) },
          { label: "SKB→DNC", value: tien(bang.tong.thanhTienSkb) },
          { label: "Sau thuế", value: tien(bang.tong.sauThueSkb) },
          { label: "Thuế TTĐB", value: tien(bang.tong.thueTtdb) },
          { label: "Doanh thu 511", value: tien(bang.tong.doanhThu511) },
        ].map((s) => (
          <div
            key={s.label}
            className="p-3 rounded-xl bg-white border border-slate-200"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
            <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ----- Thống kê theo đợt ----- */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Theo đợt
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                {[
                  "Ngày giao bia",
                  "Ngày hóa đơn",
                  "Dòng",
                  "Đơn vị",
                  "Số HĐ",
                  "Số lượng",
                  "Thành tiền",
                  "Sau thuế",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bang.theoDot.map((d) => (
                <tr
                  key={d.dotId}
                  className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                >
                  <td className="px-3 py-1.5 text-slate-900">
                    {d.nhanNgayGiao}
                  </td>
                  <td className="px-3 py-1.5">{d.ngayHoaDon}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soDong}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soDonVi}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soHoaDon}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                    {formatNumber(d.soLuong)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {tien(d.thanhTienSkb)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {tien(d.sauThueSkb)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----- Điền số hóa đơn thật ----- */}
      {canDien.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Số hóa đơn đã phát hành · {canDien.length} hóa đơn
              </p>
              <div className="flex gap-2">
                <button
                  onClick={dienGoiY}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200"
                >
                  Điền số gợi ý
                </button>
                <button
                  onClick={luuHoaDon}
                  disabled={dangLuu}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-125 disabled:opacity-40"
                >
                  {dangLuu ? "Đang lưu..." : "Lưu số hóa đơn"}
                </button>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
              Phát hành hóa đơn xong thì điền số và ngày thật vào đây. Số app tự
              đánh chỉ là gợi ý — ghi một số không có thật vào sổ thì đối chiếu
              với cơ quan thuế sau này không lần ra được gì.
            </p>
          </div>

          {bang.chuaCoSoThat > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
              <p className="text-[11px] font-bold text-amber-800">
                <strong>{bang.chuaCoSoThat}</strong> hóa đơn chưa có số thật —
                file kết xuất đang dùng số app tự đánh cho những dòng đó.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr>
                  {[
                    "Đợt",
                    "Đơn vị",
                    "Mã BP",
                    "Dòng",
                    "Thành tiền",
                    "Số hóa đơn",
                    "Ngày hóa đơn",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {canDien.map((d) => {
                  const o = oCuaDong(d);
                  const chuaCo = !o.soHoaDon.trim();
                  return (
                    <tr
                      key={d.khoa}
                      className={cn(
                        "border-t border-slate-100 text-[11px] font-bold text-slate-600",
                        chuaCo && "bg-amber-50/40",
                      )}
                    >
                      <td className="px-3 py-1.5">{d.nhanDot}</td>
                      <td className="px-3 py-1.5 text-slate-900">{d.donVi}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400">
                        {d.maBp}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {d.soDong}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                        {tien(d.thanhTien)}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={o.soHoaDon}
                          onChange={(e) =>
                            suaO(d.khoa, "soHoaDon", e.target.value, d)
                          }
                          placeholder={d.soGoiY}
                          className={cn(
                            "w-44 px-2 py-1.5 rounded-lg border bg-white text-[12px] font-black font-mono outline-none focus:border-primary",
                            chuaCo
                              ? "border-amber-300 placeholder:text-amber-400"
                              : "border-slate-200",
                          )}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="date"
                          value={o.ngayHoaDon}
                          onChange={(e) =>
                            suaO(d.khoa, "ngayHoaDon", e.target.value, d)
                          }
                          className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ----- Thống kê theo đơn vị ----- */}
      {bang.theoDonVi.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Theo đơn vị · cả kỳ
            </p>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <tbody>
                {bang.theoDonVi.map((u) => (
                  <tr
                    key={u.maBp || u.donVi}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600 first:border-t-0"
                  >
                    <td className="px-3 py-1.5 text-slate-900">{u.donVi}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-400">
                      {u.maBp}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {u.soDong} dòng
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {formatNumber(u.soLuong)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(u.thanhTienSkb)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(u.sauThueSkb)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----- Bảng giá ----- */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-slate-400" />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Đơn giá đang áp dụng
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
          <p>
            Bia hơi (LIT): SKB→DNC{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LIT.skbToDnc)}
            </span>{" "}
            · DNC→ĐVTV{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LIT.dncToMember)}
            </span>
          </p>
          <p>
            Bia lon (LON): SKB→DNC{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LON.skbToDnc)}
            </span>{" "}
            · DNC→ĐVTV{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LON.dncToMember)}
            </span>
          </p>
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed">
          VAT 10% cả hai chặng. Thuế TTĐB 65% và Doanh thu 511 chỉ hiện trên màn
          hình — file T8 của bộ phận không còn hai cột đó nên bảng kết xuất cũng
          không có. Giá đổi thì báo tôi sửa trong src/lib/invoice.ts.
        </p>
      </div>

      {/* ----- Xem trước ----- */}
      {bang.dong.length === 0 ? (
        <p className="text-center text-xs font-bold text-slate-400 py-10">
          Không có giao dịch xuất kho nào trong các đợt đã khai.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {[
                    "STT",
                    "Ngày giao",
                    "Đơn vị",
                    "Mã vật tư",
                    "Tên hàng hóa",
                    "ĐVT",
                    "Số lượng",
                    "Đơn giá",
                    "Thành tiền",
                    "VAT",
                    "Số hóa đơn",
                    "Mã BP",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bang.dong.map((r) => (
                  <tr
                    key={r.stt}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                  >
                    <td className="px-3 py-1.5 text-slate-400">{r.stt}</td>
                    <td className="px-3 py-1.5">{r.ngayGiaoBia}</td>
                    <td className="px-3 py-1.5 text-slate-900">{r.donVi}</td>
                    <td className="px-3 py-1.5 font-mono">{r.maVatTu}</td>
                    <td className="px-3 py-1.5">{r.tenHangHoa}</td>
                    <td className="px-3 py-1.5">{r.dvt}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {formatNumber(r.soLuong)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(r.donGiaSkb)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {tien(r.thanhTienSkb)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(r.vatSkb)}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px]">
                      {r.soHoaDon}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{r.maBp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----- Tệp TEMPLATE để xuất hóa đơn trên hệ thống khác ----- */}
      {tepSap.oDong.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Tệp TEMPLATE xuất hóa đơn · {tepSap.tong.soChungTu} chứng từ ·{" "}
              {tepSap.oDong.length} dòng
            </p>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
              Tệp bút toán đúng khuôn mẫu bộ phận gửi, để nạp lên hệ thống kế
              toán. Mỗi <strong>đợt × đơn vị</strong> là một chứng từ: một dòng
              Nợ phải thu, mỗi mặt hàng một dòng doanh thu, và một dòng thuế
              GTGT. Số lấy thẳng từ bảng Chốt ở trên nên hai tệp luôn khớp nhau.
            </p>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Ngày chứng từ
                </span>
                <input
                  type="date"
                  value={ngayChungTu}
                  onChange={(e) => setNgayChungTu(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
                />
                <span className="block text-[9px] font-bold text-slate-400 mt-1">
                  Ngày hạch toán, không phải ngày giao bia
                </span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Tiêu đề chứng từ
                </span>
                <input
                  value={cauHinhSap.tieuDeChungTu}
                  onChange={(e) => suaCauHinh("tieuDeChungTu", e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900 font-mono"
                />
                <span className="block text-[9px] font-bold text-slate-400 mt-1">
                  Nối thêm tên đơn vị: {cauHinhSap.tieuDeChungTu}BNC
                </span>
              </label>
            </div>

            <button
              onClick={() => setMoCauHinh(!moCauHinh)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary"
            >
              {moCauHinh ? "Ẩn" : "Sửa"} mã cố định (tài khoản, mã thuế, công ty)
            </button>

            {moCauHinh && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                {(
                  [
                    ["docType", "Doc. type"],
                    ["compCode", "Comp. Code"],
                    ["currency", "Currency"],
                    ["businessPlace", "Business Place"],
                    ["taxCode", "Tax Code"],
                    ["paymentTerm", "Payment Term"],
                    ["profitCenter", "Profit Center"],
                    ["taiKhoanPhaiThu", "TK phải thu"],
                    ["taiKhoanDoanhThu", "TK doanh thu"],
                    ["taiKhoanThue", "TK thuế GTGT"],
                  ] as [keyof CauHinhSap, string][]
                ).map(([k, nhan]) => (
                  <label key={k} className="block">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {nhan}
                    </span>
                    <input
                      value={cauHinhSap[k]}
                      onChange={(e) => suaCauHinh(k, e.target.value)}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold font-mono text-slate-900"
                    />
                  </label>
                ))}
                {/* Chú thích ở sheet 1 ghi TO2 còn tệp mẫu ghi O2 — nói ra chứ
                    không tự chọn hộ. */}
                <p className="col-span-2 sm:col-span-4 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                  Mã thuế: tệp mẫu ghi <strong>O2</strong>, còn chú thích ở
                  sheet 1 ghi <strong>TO2</strong>. Em để mặc định theo tệp mẫu
                  vì đó là tệp đã dùng được — anh xem lại rồi sửa nếu cần.
                </p>
              </div>
            )}

            {/* Bảng tóm tắt từng chứng từ để soát trước khi tải. */}
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Chứng từ",
                      "Mã BP",
                      "Mặt hàng",
                      "Trước thuế",
                      "VAT",
                      "Tổng cộng",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tepSap.chungTu.map((x, i) => (
                    <tr
                      key={`${x.maBp}-${i}`}
                      className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                    >
                      <td className="px-3 py-1.5 text-slate-900 font-mono text-[10px]">
                        {x.tieuDe}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-slate-400">
                        {x.maBp}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {x.soDongHang}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {tien(x.truocThue)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {tien(x.vat)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                        {tien(x.tongCong)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 text-[11px] font-black text-slate-900 bg-slate-50">
                    <td className="px-3 py-1.5" colSpan={3}>
                      Tổng
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(tepSap.tong.truocThue)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(tepSap.tong.vat)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(tepSap.tong.tongCong)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {tepSap.vuotDoDai.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                  {tepSap.vuotDoDai.length} tên hàng dài hơn 25 ký tự, mà cột
                  Header Text khai C(25). Tệp mẫu của anh cũng vậy và vẫn dùng
                  được nên em giữ nguyên, không cắt.
                </p>
              </div>
            )}

            <button
              onClick={taiTepSap}
              className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Tải tệp TEMPLATE (
              {tepSap.tong.soChungTu} chứng từ)
            </button>
          </div>
        </div>
      )}


      <button
        onClick={handleDownload}
        disabled={bang.dong.length === 0}
        className="px-5 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" /> Tải file công nợ ({bang.tong.soDong}{" "}
        dòng · {dot.length} đợt)
      </button>
    </div>
  );
}
