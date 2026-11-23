import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  X,
  ImageOff,
  RotateCcw,
  RotateCw,
  ZoomIn,
  Trash2,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import type {
  ChuKyDienTu,
  Transaction,
  Product,
  Partner,
  ImportSlip as ImportSlipType,
} from "../types";
import { bamSha256, gioKy, maBamNgan, noiDungPhieuNhap, type ChuKyMau } from "../lib/chuKy";
import { HinhChuKy } from "./ChuKy";
import { cn, formatNumber } from "../lib/utils";
import { parseSlipCode, phieuDaVaoTon } from "../lib/slip";
import { quyDoiHienTrang } from "../lib/loBia";
import type { AnhChungTu } from "../anh/moHinh";
import OAnhLuoi from "../anh/OAnhLuoi";
import { quaTrungChuyen } from "../anh/duongDan";

/**
 * PHIẾU NHẬP KHO — MỘT LƯỢT GIAO NHẬN LÀ MỘT PHIẾU
 *
 * Cách làm việc:
 *
 *   Người nhập điền số và KÝ ĐIỆN TỬ trình phiếu → Quản lý xưởng ký duyệt
 *   (Rào 1) → Kho tổng ký nhận (Rào 2) → HÀNG MỚI VÀO TỒN KHO.
 *
 * Chưa có chữ ký Kho tổng thì số lượng chỉ nằm chờ: không cộng vào tồn, không
 * lên báo cáo, không xuất bán được. Mỗi chữ ký mang chữ ký mẫu vẽ tay, họ tên,
 * giờ ký (nhập PIN lúc ký) và mã băm nội dung — xem `lib/chuKy.ts`.
 *
 * Phiếu cũ trước 20/11/2026 ký giấy: ảnh tờ đã ký vẫn giữ làm chứng từ.
 *
 * Nội dung phiếu KHÔNG lưu riêng mà tính từ các `transactions` có cùng
 * `slipCode`, nên sửa giao dịch thì phiếu tự khớp theo. Trạng thái lưu ở
 * `slips`; ảnh ký nằm ở bảng ảnh chứng từ (src/anh), gắn theo mã phiếu.
 */

interface HandoverSlip {
  code: string;
  /** yyyy-MM-dd — ngày nhập kho, lấy từ chính mã phiếu. */
  dateKey: string;
  /** Lượt giao thứ mấy trong ngày. */
  seq: number;
  transactions: Transaction[];
  totalQuantity: number;
  totalLiters: number;
  meta?: ImportSlipType;
  /** Kho tổng đã ký nhận (hoặc phiếu giấy cũ có ảnh ký) = đã vào tồn kho. */
  approved: boolean;
}

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  slips: ImportSlipType[];
  canWrite: boolean;
  /** Chữ ký mẫu theo id — để vẽ chữ ký lên phiếu. */
  chuKyMau: Map<string, ChuKyMau>;
  /** Gỡ một ảnh đã tải nhầm khỏi phiếu. Không truyền thì không hiện nút gỡ. */
  onRemoveSigned?: (code: string, anh: AnhChungTu) => Promise<void>;
  /** Ảnh theo mã phiếu — ảnh hiện trạng, và ảnh tờ ký giấy của phiếu cũ. */
  anhTheoPhieu: Map<string, AnhChungTu[]>;
  /**
   * Xoá cả phiếu (nhập sai số lượng). Không truyền thì không có nút xoá.
   * Phiếu đã có ảnh ký chỉ hiện nút khi `xoaDuocPhieuDaKy` (admin).
   */
  onXoaPhieu?: (code: string) => Promise<void>;
  xoaDuocPhieuDaKy?: boolean;
  /**
   * Điền / sửa mã lô cho các dòng của một phiếu đã nhập. Nhận bảng
   * id giao dịch → mã lô (chuỗi rỗng = bỏ mã lô). Không truyền thì không hiện
   * nút. Mã lô chỉ để ghi nhận, không đổi số lượng hay tồn kho.
   */
  onLuuMaLo?: (maLoTheoDong: Record<string, string>) => Promise<void>;
  /** Tuỳ chọn mở sẵn tờ biểu mẫu điện tử từ bên ngoài (từ tab QL Xưởng / Kho tổng). */
  externalOpenCode?: string | null;
  onCloseExternal?: () => void;
}

export default function ImportSlipPanel({
  transactions,
  products,
  partners,
  slips,
  canWrite,
  chuKyMau,
  onRemoveSigned,
  anhTheoPhieu,
  onXoaPhieu,
  xoaDuocPhieuDaKy = false,
  onLuuMaLo,
  externalOpenCode,
  onCloseExternal,
}: Props) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  /** Phiếu đang mở khung điền mã lô. */
  const [maLoCode, setMaLoCode] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  /**
   * Đường dẫn ảnh tải không được.
   *
   * Ảnh nằm trên máy chủ ảnh của bên khác và đã có lần mất cả loạt: đường dẫn
   * còn nguyên trong sổ mà tệp thì không còn. Không bắt lỗi thì ô ảnh chỉ hiện
   * một khung trống — người dùng tưởng bấm không được, thay vì biết là ảnh đã
   * mất và cần đi tìm tờ giấy.
   */
  const [anhHong, setAnhHong] = useState<Set<string>>(new Set());
  /** Góc xoay ảnh đang xem: 0 · 90 · 180 · 270 độ. */
  const [gocXoay, setGocXoay] = useState(0);

  /** Mở một ảnh: luôn bắt đầu ở góc 0, không giữ góc của ảnh trước. */
  const moAnh = (url: string) => {
    setGocXoay(0);
    setPreviewPhoto(url);
  };

  /*
   * Bấm Esc để đóng.
   *
   * Khung ảnh phủ kín màn hình, mà chuột lúc đó thường đang ở giữa ảnh — với
   * người quen dùng bàn phím thì Esc nhanh hơn đi tìm nút Đóng.
   */
  useEffect(() => {
    if (!previewPhoto) return;
    const khiBam = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewPhoto(null);
    };
    window.addEventListener("keydown", khiBam);
    return () => window.removeEventListener("keydown", khiBam);
  }, [previewPhoto]);
  const danhDauHong = (url: string) =>
    setAnhHong((cu) => (cu.has(url) ? cu : new Set(cu).add(url)));

  const slipMetaByCode = useMemo(() => {
    const m = new Map<string, ImportSlipType>();
    slips.forEach((s) => m.set(s.code, s));
    return m;
  }, [slips]);

  const phieuCoAnh = useMemo(
    () => new Set([...anhTheoPhieu.entries()].filter(([, ds]) => ds.length).map(([c]) => c)),
    [anhTheoPhieu],
  );
  const approved = useMemo(
    () => phieuDaVaoTon(slips, phieuCoAnh),
    [slips, phieuCoAnh],
  );

  /**
   * Gộp giao dịch theo MÃ PHIẾU, không theo ngày.
   *
   * Chỉ giao dịch có `slipCode` mới hiện ở đây. Tồn đầu kỳ và số nhập từ file
   * Excel không có mã phiếu vì không có lượt giao nhận nào để hai bên ký —
   * chúng vào tồn ngay và không cần tờ giấy nào.
   */
  const handoverSlips = useMemo<HandoverSlip[]>(() => {
    const byCode = new Map<string, Transaction[]>();

    transactions
      .filter((t) => t.type === "IN" && t.slipCode)
      .forEach((t) => {
        const code = t.slipCode!;
        if (!byCode.has(code)) byCode.set(code, []);
        byCode.get(code)!.push(t);
      });

    return Array.from(byCode.entries())
      .map(([code, txs]) => {
        const parsed = parseSlipCode(code);
        const totalQuantity = txs.reduce((s, t) => s + (t.quantity || 0), 0);
        const totalLiters = txs.reduce((s, t) => {
          const p = products.find((x) => x.id === t.productId);
          const ml = p?.capacityPerUnit || 0;
          return s + (t.quantity || 0) * (ml / 1000);
        }, 0);
        return {
          code,
          // Mã phiếu hỏng thì lấy ngày của dòng đầu tiên để vẫn hiện ra được,
          // thà hiện sai ngày còn hơn để tờ phiếu biến mất khỏi danh sách.
          dateKey: parsed?.dateKey || format(new Date(txs[0].date), "yyyy-MM-dd"),
          seq: parsed?.seq || 0,
          transactions: txs.sort(
            (a, b) => +new Date(a.date) - +new Date(b.date),
          ),
          totalQuantity,
          totalLiters,
          meta: slipMetaByCode.get(code),
          approved: approved.has(code),
        };
      })
      .sort((a, b) => b.code.localeCompare(a.code));
  }, [transactions, products, slipMetaByCode, approved]);

  const pending = handoverSlips.filter((d) => !d.approved);
  const pendingLiters = pending.reduce((s, d) => s + d.totalLiters, 0);

  const activeOpenCode = externalOpenCode || openCode;
  const openSlip = handoverSlips.find((d) => d.code === activeOpenCode) || null;

  return (
    <div className="space-y-6">
      {/* ---------- Cảnh báo: phiếu chưa đủ chữ ký = hàng chưa vào tồn ---------- */}
      {pending.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 bg-amber-50 flex gap-3 print:hidden">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
              {pending.length} phiếu chưa vào tồn ·{" "}
              {formatNumber(pendingLiters)} lít
            </p>
            <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed">
              Số lượng trên các phiếu này <strong>chưa cộng vào tồn kho</strong>{" "}
              và chưa xuất bán được. Quản lý xưởng ký duyệt (Rào 1), rồi Kho
              tổng ký nhận (Rào 2) thì hàng mới vào tồn.
            </p>
            <p className="text-[11px] font-black text-amber-700/70 font-mono tracking-wide">
              {pending
                .slice(0, 8)
                .map((d) => d.code)
                .join(" · ")}
              {pending.length > 8 && ` +${pending.length - 8} phiếu nữa`}
            </p>
          </div>
        </div>
      )}

      {/* ---------- Danh sách phiếu theo lượt giao nhận ---------- */}
      <div className="space-y-3 print:hidden">
        {handoverSlips.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-12">
            Chưa có lượt nhập kho nào. Sang tab Nhập kho điền số, hệ thống sẽ
            tạo phiếu cho lượt giao đó.
          </p>
        ) : (
          handoverSlips.map((d) => {
            const anhKy = anhTheoPhieu.get(d.code) || [];
            const photos = anhKy.map((a) => a.url);
            return (
              <div key={d.code} className="space-y-0">
                <div
                  className={cn(
                    "p-4 rounded-2xl border bg-white flex flex-col lg:flex-row lg:items-center gap-4 justify-between",
                    d.approved
                      ? "border-slate-200"
                      : "border-amber-200 bg-amber-50/30",
                    d.approved && photos.length && "rounded-b-none border-b-0",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                        d.approved
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600",
                      )}
                    >
                      {d.approved ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 font-mono">
                        {d.code}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400">
                        {format(new Date(d.dateKey), "dd/MM/yyyy")}
                        {d.seq > 0 && ` · lượt ${d.seq}`} ·{" "}
                        {d.transactions.length} dòng hàng ·{" "}
                        {formatNumber(d.totalLiters)} lít
                      </p>
                      {(() => {
                        const coLo = d.transactions.filter((t) => t.batchNumber).length;
                        const cacLo = [
                          ...new Set(
                            d.transactions
                              .map((t) => t.batchNumber || "")
                              .filter(Boolean),
                          ),
                        ];
                        return (
                          <p
                            className={cn(
                              "text-[10px] font-bold",
                              coLo === d.transactions.length
                                ? "text-slate-500"
                                : "text-amber-600",
                            )}
                          >
                            {coLo === 0
                              ? "Chưa có mã lô"
                              : `Lô ${cacLo.slice(0, 3).join(", ")}${cacLo.length > 3 ? "…" : ""}` +
                                (coLo < d.transactions.length
                                  ? ` · còn ${d.transactions.length - coLo} dòng chưa có mã lô`
                                  : "")}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        d.approved
                          ? "bg-emerald-100 text-emerald-700"
                          : d.meta?.status === "cho_ql_xuong"
                            ? "bg-amber-100 text-amber-800"
                            : d.meta?.status === "cho_kho_tong"
                              ? "bg-sky-100 text-sky-800"
                              : d.meta?.status === "tra_lai"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {d.approved
                        ? "Đã vào tồn"
                        : d.meta?.status === "cho_ql_xuong"
                          ? "1/2 · Chờ QL Xưởng"
                          : d.meta?.status === "cho_kho_tong"
                            ? "2/2 · Chờ Kho Tổng"
                            : d.meta?.status === "tra_lai"
                              ? "Bị trả lại"
                              : "Chờ ký trình"}
                    </span>

                    <button
                      onClick={() => setOpenCode(d.code)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> BM-SKB-01
                    </button>

                    {canWrite && onLuuMaLo && (
                      <button
                        onClick={() => setMaLoCode(d.code)}
                        title="Điền hoặc sửa mã lô cho các dòng của phiếu này"
                        className="px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" /> Mã lô
                      </button>
                    )}

                    {/* XOÁ PHIẾU NHẬP SAI. Phiếu chưa ký: người nhập kho tự
                        xoá được. Phiếu đã ký ảnh: chỉ admin. */}
                    {onXoaPhieu && (photos.length === 0 || xoaDuocPhieuDaKy) && (
                      <button
                        onClick={() => onXoaPhieu(d.code)}
                        title="Xoá phiếu này (nhập sai) — xoá luôn các dòng hàng của phiếu"
                        className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xoá phiếu
                      </button>
                    )}
                  </div>
                </div>

                {/* Dải ảnh đã lưu — để người dùng thấy ngay mình đã tải đúng tờ nào */}
                {photos.length > 0 && (
                  <div className="px-4 py-3 border border-slate-200 border-t-0 rounded-b-2xl bg-slate-50/60 flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {photos.length} ảnh đã lưu
                    </span>
                    {photos.map((url, i) => (
                      <div key={url + i} className="relative group">
                        {/*
                          Ô ảnh phải NHÌN RA NGAY LÀ BẤM ĐƯỢC.

                          Trước đây chỉ là một ô 56px trơn, dấu hiệu duy nhất là
                          dòng chú thích hiện ra sau khi rê chuột và chờ — nên
                          nhiều người không biết bấm vào xem được ảnh lớn.

                          Nay ô to hơn, con trỏ đổi thành kính lúp, và khi rê
                          chuột lên thì phủ một lớp tối kèm icon phóng to.
                        */}
                        <button
                          onClick={() => moAnh(url)}
                          title="Bấm để xem ảnh lớn"
                          className="relative block w-[72px] h-[72px] rounded-xl overflow-hidden border border-slate-200 bg-white cursor-zoom-in hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all"
                        >
                          <OAnhLuoi
                            url={url}
                            alt={`Phiếu ${d.code} - ảnh ${i + 1}`}
                            rong={240}
                            onHong={() => danhDauHong(url)}
                            className="h-full w-full object-cover"
                          />
                          {!anhHong.has(url) && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/45 opacity-0 transition-opacity group-hover:opacity-100">
                              <ZoomIn className="h-5 w-5 text-white" />
                            </span>
                          )}
                        </button>
                        {canWrite && onRemoveSigned && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Gỡ ảnh này khỏi phiếu ${d.code}?\n\n` +
                                    "Ảnh là chứng từ của phiếu — chỉ gỡ khi tải nhầm.",
                                )
                              ) {
                                onRemoveSigned(d.code, anhKy[i]);
                              }
                            }}
                            title="Gỡ ảnh này"
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ---------- Khung điền mã lô cho phiếu đã nhập ---------- */}
      {maLoCode && onLuuMaLo && (() => {
        const phieu = handoverSlips.find((d) => d.code === maLoCode);
        if (!phieu) return null;
        return (
          <MaLoEditor
            key={phieu.code}
            slip={phieu}
            onClose={() => setMaLoCode(null)}
            onSave={async (bang) => {
              await onLuuMaLo(bang);
              setMaLoCode(null);
            }}
          />
        );
      })()}

      {/* ---------- Cửa sổ xem biểu mẫu điện tử BM-SKB-01 & in phiếu ---------- */}
      {openSlip && (
        <SlipPreview
          slip={openSlip}
          products={products}
          partners={partners}
          photos={anhTheoPhieu.get(openSlip.code) || []}
          chuKyMau={chuKyMau}
          onClose={() => {
            setOpenCode(null);
            onCloseExternal?.();
          }}
        />
      )}

      {/*
        KHUNG XEM ẢNH ĐƯA THẲNG RA `document.body` BẰNG PORTAL.

        Trước đây nó nằm ngay trong cây của bảng phiếu, và `position: fixed`
        không bám vào màn hình mà bám vào khung cha — lớp phủ chỉ trùm được
        vùng nội dung, ảnh rơi xuống dưới mép màn hình nên phải lăn chuột mới
        thấy. Bất kỳ tổ tiên nào có `transform`, `filter` hay `contain` đều gây
        ra chuyện đó, và cây giao diện thì còn sửa dài dài.

        Cắm thẳng vào `body` là hết hẳn loại lỗi này, không phải đi dò xem tổ
        tiên nào đang phá.
      */}
      {previewPhoto &&
        createPortal(
          <div
            onClick={() => setPreviewPhoto(null)}
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-3 bg-slate-900/85 p-4 backdrop-blur-sm print:hidden"
          >
            {anhHong.has(previewPhoto) ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-w-lg flex-col items-center justify-center gap-3 rounded-2xl bg-white px-6 py-16 text-center"
              >
                <ImageOff className="h-10 w-10 text-rose-400" />
                <p className="text-sm font-black text-slate-900">
                  Không tải được ảnh này
                </p>
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                  Đường dẫn vẫn còn trong sổ nhưng tệp ảnh không còn ở máy chủ
                  ảnh. Tờ phiếu giấy đã ký vẫn là chứng từ gốc — tra lại ở bản
                  lưu giấy.
                </p>
              </div>
            ) : (
              /*
                Ảnh co theo chỗ còn lại (`flex-1` + `min-h-0`) nên luôn nằm gọn
                trong màn hình, không đẩy hàng nút xuống dưới mép.

                XOAY 90 HAY 270 THÌ RÀNG BUỘC ĐỔI CHIỀU: sau khi xoay, bề ngang
                nhìn thấy chính là bề cao của ảnh. Nên lúc đó phải chặn bề ngang
                ảnh bằng chiều CAO màn hình, không thì ảnh thò ra hai bên.
              */
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
              >
                <img
                  src={quaTrungChuyen(previewPhoto)}
                  alt="Phiếu đã ký"
                  onError={() => danhDauHong(previewPhoto)}
                  style={{ transform: `rotate(${gocXoay}deg)` }}
                  className={cn(
                    "rounded-2xl bg-white object-contain transition-transform duration-200",
                    /*
                      CHẶN KÍCH THƯỚC THEO MÀN HÌNH, KHÔNG THEO KHUNG CHA.
                      `max-h-full` là 100% chiều cao của khung cha, mà khung cha
                      lại co theo chính tấm ảnh — vòng tròn, nên trình duyệt bỏ
                      qua ràng buộc và ảnh hiện nguyên cỡ thật. Đó là lý do ảnh
                      cao 1.200px thò xuống dưới mép màn hình.

                      `7rem` chừa cho lề trên dưới và hàng nút bên dưới ảnh.
                    */
                    gocXoay % 180 === 0
                      ? "max-h-[calc(100vh-7rem)] max-w-[calc(100vw-2rem)]"
                      : // Xoay 90 hay 270 thì bề ngang nhìn thấy chính là bề
                        // CAO của ảnh, nên hai ràng buộc phải đổi chỗ cho nhau.
                        "max-h-[calc(100vw-2rem)] max-w-[calc(100vh-7rem)]",
                  )}
                />
              </div>
            )}

            <div
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 flex-wrap items-center justify-center gap-2"
            >
              {!anhHong.has(previewPhoto) && (
                <>
                  <button
                    onClick={() => setGocXoay((g) => (g + 270) % 360)}
                    title="Xoay trái 90 độ"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Xoay trái
                  </button>
                  <button
                    onClick={() => setGocXoay((g) => (g + 90) % 360)}
                    title="Xoay phải 90 độ"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/20"
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Xoay phải
                  </button>
                </>
              )}
              <a
                href={quaTrungChuyen(previewPhoto)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/20"
              >
                Mở ảnh gốc
              </a>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all hover:brightness-95"
              >
                <X className="h-3.5 w-3.5" /> Đóng
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ========================================================================== */

/**
 * ĐIỀN MÃ LÔ CHO PHIẾU ĐÃ NHẬP.
 *
 * Giống bảng nhập kho: "mã lô chung" là giá trị mặc định cho mọi dòng để
 * trống, dòng nào gõ riêng thì số riêng thắng. Chỉ ghi trường `batchNumber`
 * của các dòng có thay đổi — số lượng, ảnh ký, trạng thái phiếu giữ nguyên.
 */
function MaLoEditor({
  slip,
  onClose,
  onSave,
}: {
  slip: HandoverSlip;
  onClose: () => void;
  onSave: (maLoTheoDong: Record<string, string>) => Promise<void>;
}) {
  const [rieng, setRieng] = useState<Record<string, string>>(() =>
    Object.fromEntries(slip.transactions.map((t) => [t.id, t.batchNumber || ""])),
  );
  const [chung, setChung] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  const hieuLuc = (id: string) => (rieng[id] || "").trim() || chung.trim();
  const thayDoi = slip.transactions.filter(
    (t) => hieuLuc(t.id) !== (t.batchNumber || ""),
  );

  const luu = async () => {
    if (!thayDoi.length) return onClose();
    setDangLuu(true);
    try {
      await onSave(Object.fromEntries(thayDoi.map((t) => [t.id, hieuLuc(t.id)])));
    } catch {
      // Lỗi đã được báo ở nơi lưu; giữ khung mở để người dùng thử lại.
    } finally {
      setDangLuu(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Mã lô · phiếu
            </p>
            <p className="text-sm font-black text-slate-900 font-mono">{slip.code}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="flex items-center gap-2 shrink-0 text-[10px] font-black text-amber-800 uppercase tracking-widest">
                <Layers className="w-4 h-4 text-amber-600" /> Mã lô chung
              </span>
              <input
                value={chung}
                onChange={(e) => setChung(e.target.value)}
                placeholder="Cả phiếu cùng một lô thì điền một lần ở đây"
                className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold outline-none focus:border-amber-500 transition-all"
              />
            </div>
            <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
              Tự điền cho các dòng đang để trống. Dòng nào khác lô thì gõ riêng ở
              dòng đó. Chỉ đổi mã lô — số lượng và tồn kho giữ nguyên.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {slip.transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 truncate">
                    {t.productName}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {formatNumber(t.quantity)} · {t.category}
                  </p>
                </div>
                <input
                  value={rieng[t.id] || ""}
                  onChange={(e) =>
                    setRieng((cu) => ({ ...cu, [t.id]: e.target.value }))
                  }
                  placeholder={chung.trim() || "—"}
                  className="w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-500">
            {thayDoi.length
              ? `${thayDoi.length} dòng sẽ đổi mã lô`
              : "Chưa có thay đổi"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:border-slate-300"
            >
              Huỷ
            </button>
            <button
              onClick={luu}
              disabled={dangLuu || !thayDoi.length}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-40 flex items-center gap-1.5"
            >
              {dangLuu && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Lưu mã lô
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ========================================================================== */

export function BieuMauDienTuModal({
  code,
  transactions,
  products,
  partners,
  slips,
  anhTheoPhieu,
  chuKyMau,
  onClose,
}: {
  code: string;
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  slips: ImportSlipType[];
  anhTheoPhieu: Map<string, AnhChungTu[]>;
  chuKyMau: Map<string, ChuKyMau>;
  onClose: () => void;
}) {
  const txs = transactions.filter((t) => t.type === "IN" && t.slipCode === code);
  if (!txs.length) return null;
  const parsed = parseSlipCode(code);
  const totalQuantity = txs.reduce((s, t) => s + (t.quantity || 0), 0);
  const totalLiters = txs.reduce((s, t) => {
    const p = products.find((x) => x.id === t.productId);
    return s + (t.quantity || 0) * ((p?.capacityPerUnit || 0) / 1000);
  }, 0);
  const dateKey = parsed?.dateKey || format(new Date(txs[0].date), "yyyy-MM-dd");
  const meta = slips.find((s) => s.code === code);
  const slip: HandoverSlip = {
    code,
    dateKey,
    seq: parsed?.seq || 0,
    transactions: txs,
    totalQuantity,
    totalLiters,
    meta,
    approved: meta?.status === "signed",
  };
  return (
    <SlipPreview
      slip={slip}
      products={products}
      partners={partners}
      photos={anhTheoPhieu.get(code) || []}
      chuKyMau={chuKyMau}
      onClose={onClose}
    />
  );
}

function SlipPreview({
  slip,
  products,
  partners,
  photos,
  chuKyMau,
  onClose,
}: {
  slip: HandoverSlip;
  products: Product[];
  partners: Partner[];
  photos: AnhChungTu[];
  chuKyMau: Map<string, ChuKyMau>;
  onClose: () => void;
}) {
  const rows = slip.transactions.map((t) => {
    const p = products.find((x) => x.id === t.productId);
    const partner = partners.find((x) => x.id === t.partnerId);
    const liters = ((p?.capacityPerUnit || 0) / 1000) * (t.quantity || 0);
    return {
      name: t.productName || p?.name || "—",
      unit: p?.unit || "—",
      batch: t.batchNumber || "—",
      kegText: quyDoiHienTrang(p, t.quantity || 0),
      partner: t.partnerName || partner?.name || "—",
      quantity: t.quantity || 0,
      liters,
      time: format(new Date(t.date), "HH:mm"),
    };
  });

  const totalLiters = rows.reduce((s, r) => s + r.liters, 0);
  const creatorSig = slip.meta?.creatorSig;
  const managerSig = slip.meta?.managerSig;
  const warehouseSig = slip.meta?.warehouseSig;
  const laPaperless = !!(
    creatorSig ||
    managerSig ||
    warehouseSig ||
    slip.meta?.status === "cho_ql_xuong" ||
    slip.meta?.status === "cho_kho_tong" ||
    slip.meta?.status === "tra_lai"
  );

  /*
   * Băm lại nội dung HIỆN TẠI của phiếu để so với mã băm lúc từng người ký:
   * khác là có người sửa số liệu sau khi ký.
   */
  const [bamHienTai, setBamHienTai] = useState("");
  const ngayPhieu = slip.meta?.date || slip.dateKey;
  const noiDung = noiDungPhieuNhap(
    slip.code,
    ngayPhieu,
    slip.transactions.map((t) => ({ productId: t.productId, quantity: Number(t.quantity) || 0 })),
  );
  useEffect(() => {
    let huy = false;
    void bamSha256(noiDung).then((b) => !huy && setBamHienTai(b));
    return () => {
      huy = true;
    };
  }, [noiDung]);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-0 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible print:static">
      {/* Nền mờ - ẩn khi in */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"
      />

      <div className="relative z-10 w-full max-w-[840px] my-0 sm:my-6 print:my-0 print:max-w-none anim-modal-enter">
        {/* Thanh công cụ - ẩn khi in */}
        <div className="flex items-center justify-between gap-3 p-4 bg-[#141A23] text-white rounded-t-2xl print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
              BM-SKB-01
            </span>
            <p className="text-xs font-black uppercase tracking-widest">
              Biểu mẫu điện tử · {slip.code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Xuất PDF / In
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/*
          TỜ BIỂU MẪU CHUẨN PAPERLESS BÀ NÀ HILLS.
        */}
        <div
          id="slip-print-area"
          className="bg-white text-black p-6 sm:p-10 rounded-b-2xl print:rounded-none print:p-0 shadow-2xl print:shadow-none space-y-6"
          style={{ colorScheme: "light" }}
        >
          {/* Đầu phiếu chuẩn Công ty CP Dịch vụ Cáp treo Bà Nà */}
          <div className="flex justify-between items-start gap-6 pb-4 border-b-2 border-black">
            <div className="text-[11px] leading-relaxed">
              <p className="font-black uppercase text-[#8B1E1E]">Sun World Ba Na Hills</p>
              <p className="font-bold">Xưởng Sản Xuất Bia — Sun KraftBeer</p>
              <p>Số hiệu biểu mẫu: <strong className="font-mono">BM-SKB-01</strong></p>
            </div>
            <div className="text-[11px] text-right leading-relaxed">
              <p className="font-black uppercase">CÔNG TY CỔ PHẦN DỊCH VỤ CÁP TREO BÀ NÀ</p>
              <p>Thôn An Sơn, Xã Bà Nà, TP. Đà Nẵng</p>
              <p>
                Số chứng từ: <span className="font-bold font-mono">{slip.code}</span>
                {slip.seq > 0 && ` · Lượt ${slip.seq}`}
              </p>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-wide">
              Phiếu bàn giao &amp; nhập kho tổng theo lô
            </h1>
            <p className="text-[12px] mt-1">
              Ngày {format(new Date(slip.dateKey), "dd")} tháng{" "}
              {format(new Date(slip.dateKey), "MM")} năm{" "}
              {format(new Date(slip.dateKey), "yyyy")}
            </p>
          </div>

          {/* Bảng hàng hoá */}
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                {[
                  "STT",
                  "Tên hàng hoá",
                  "ĐVT",
                  "Số lô",
                  "Hiện trạng",
                  "Giờ",
                  "Số lượng",
                  "Quy đổi (lít)",
                ].map((h) => (
                  <th
                    key={h}
                    className="border border-black px-2 py-1.5 font-bold text-center"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {i + 1}
                  </td>
                  <td className="border border-black px-2 py-1.5 font-semibold">{r.name}</td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.unit}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">
                    {r.batch}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-mono">
                    {r.kegText}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.time}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right font-bold font-mono">
                    {formatNumber(r.quantity)}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right font-mono">
                    {formatNumber(r.liters)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td
                  colSpan={7}
                  className="border border-black px-2 py-1.5 text-right font-bold uppercase"
                >
                  Tổng cộng quy đổi
                </td>
                <td className="border border-black px-2 py-1.5 text-right font-bold font-mono">
                  {formatNumber(totalLiters)} L
                </td>
              </tr>
            </tbody>
          </table>

          {/* Ảnh hiện trạng đính kèm */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase">
                Bằng chứng ảnh chụp hiện trạng giao nhận ({photos.length} ảnh):
              </p>
              <div className="grid grid-cols-2 gap-3">
                {photos.map((ph, idx) => (
                  <div key={ph.id} className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                    <OAnhLuoi
                      url={ph.url}
                      alt={`Ảnh hiện trạng ${idx + 1}`}
                      rong={800}
                      className="w-full h-44 object-contain bg-slate-950"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Khối chữ ký điện tử (3 ô), hoặc ghi chú phiếu ký giấy cũ */}
          {laPaperless ? (
            <div className="space-y-2" style={{ breakInside: "avoid" }}>
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                {[
                  { title: "Người trình (Sản xuất)", sig: creatorSig },
                  { title: "Quản lý xưởng (Rào 1)", sig: managerSig },
                  { title: "Kho tổng nhận (Rào 2)", sig: warehouseSig },
                ].map((cell) => (
                  <OKy
                    key={cell.title}
                    title={cell.title}
                    sig={cell.sig}
                    mau={cell.sig?.chuKyId ? chuKyMau.get(cell.sig.chuKyId) : undefined}
                    bamHienTai={bamHienTai}
                    nhay={cell.title.startsWith("Quản lý xưởng") ? slip.meta?.nhaySig : undefined}
                    mauNhay={slip.meta?.nhaySig?.chuKyId ? chuKyMau.get(slip.meta.nhaySig.chuKyId) : undefined}
                  />
                ))}
              </div>
              <p className="text-[9px] leading-relaxed text-slate-500">
                Chứng từ điện tử ký trên hệ thống BCSX-SKB. Mỗi chữ ký: người ký đăng nhập Google
                (email đã xác minh) và nhập lại mã PIN cá nhân lúc ký; chữ ký mẫu do chính người ký
                đăng ký, không sửa / xoá được. Mã băm SHA-256 ghi nhận nội dung lúc ký — nội dung
                hiện tại {bamHienTai ? <span className="font-mono font-bold">{maBamNgan(bamHienTai)}</span> : "…"}.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-slate-400 text-[11px] text-center text-slate-600" style={{ breakInside: "avoid" }}>
              Phiếu ký giấy (trước khi app dùng chữ ký điện tử) — chứng từ gốc là ảnh tờ phiếu đã ký
              đính kèm ở trên và bản giấy lưu tại kho.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * MỘT Ô CHỮ KÝ trên biểu mẫu: chữ ký mẫu vẽ tay + họ tên + giờ ký + cách xác
 * thực, và dấu soát nội dung (băm lúc ký so với nội dung hiện tại).
 */
function OKy({
  title,
  sig,
  mau,
  bamHienTai,
  nhay,
  mauNhay,
}: {
  title: string;
  sig?: ChuKyDienTu;
  mau?: ChuKyMau;
  bamHienTai: string;
  /** Ký nháy của admin (chỉ ở ô Quản lý xưởng). */
  nhay?: ChuKyDienTu;
  mauNhay?: ChuKyMau;
}) {
  const oNhay = nhay ? (
    <div
      className={cn(
        "mt-1 pt-1 border-t border-dashed text-[9px] text-slate-600 flex items-center justify-center gap-1.5",
        nhay.bamNoiDung && bamHienTai && nhay.bamNoiDung !== bamHienTai ? "border-rose-400 text-rose-700" : "border-slate-300",
      )}
      title="Ký nháy: admin đã xác nhận số trên phiếu"
    >
      <span className="font-bold uppercase">Ký nháy</span>
      {mauNhay && <HinhChuKy mau={mauNhay} className="h-6 w-16" />}
      <span className="font-bold">{nhay.name}</span>
      {nhay.maNv && <span>Mã NV: {nhay.maNv}</span>}
      <span className="font-mono">{gioKy(nhay.signedAt)}</span>
      {nhay.bamNoiDung && bamHienTai && nhay.bamNoiDung !== bamHienTai && <span className="font-black">⚠ số đã đổi</span>}
    </div>
  ) : null;
  if (!sig) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-slate-400 text-center flex flex-col justify-center min-h-[130px]">
        <p className="font-bold uppercase text-[10px] text-slate-600">{title}</p>
        <p className="text-[10px] text-slate-400 mt-2">Chưa ký</p>
        {oNhay}
      </div>
    );
  }
  const khop = !sig.bamNoiDung || !bamHienTai ? null : sig.bamNoiDung === bamHienTai;
  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 text-center space-y-0.5",
        khop === false ? "border-rose-600 bg-rose-50/50" : "border-emerald-600 bg-emerald-50/30",
      )}
    >
      <p className="font-bold uppercase text-[10px]">{title}</p>
      {mau ? (
        <HinhChuKy mau={mau} className="mx-auto h-16 w-full" />
      ) : (
        <p className="py-4 font-black text-emerald-700">✓ Đã ký điện tử</p>
      )}
      <p className="font-black text-slate-900">{sig.name}</p>
      {sig.maNv && <p className="text-[10px] font-bold text-slate-700">Mã NV: {sig.maNv}</p>}
      <p className="text-[10px] font-bold text-slate-700">Ký lúc: {gioKy(sig.signedAt)}</p>
      {sig.emailCty && <p className="text-[9px] text-slate-600 break-all">{sig.emailCty}</p>}
      <p className="font-mono text-[9px] text-slate-500">
        {sig.xacThuc ? `Xác thực: ${sig.xacThuc === "GOOGLE+PIN" ? "Google + PIN" : sig.xacThuc}` : "Ký điện tử"} · Mã {sig.token}
      </p>
      {khop === true && (
        <p className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700">
          <ShieldCheck className="w-3 h-3" /> Nội dung nguyên vẹn từ lúc ký
        </p>
      )}
      {khop === false && (
        <p className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700">
          <ShieldAlert className="w-3 h-3" /> Nội dung ĐÃ ĐỔI sau khi ký
        </p>
      )}
      {oNhay}
    </div>
  );
}
