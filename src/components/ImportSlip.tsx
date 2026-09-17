import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  Upload,
  X,
  ImageOff,
  RotateCcw,
  RotateCw,
  ZoomIn,
} from "lucide-react";
import { format } from "date-fns";
import type {
  Transaction,
  Product,
  Partner,
  ImportSlip as ImportSlipType,
} from "../types";
import { cn, formatNumber } from "../lib/utils";
import { approvedSlipCodes, parseSlipCode } from "../lib/slip";

/**
 * PHIẾU NHẬP KHO — MỘT LƯỢT GIAO NHẬN LÀ MỘT PHIẾU
 *
 * Cách làm việc:
 *
 *   Sản xuất điền số vào app → kho đếm và đối chiếu → in phiếu ra giấy → hai
 *   bên ký tươi → chụp ảnh tờ đã ký đưa vào đây → HÀNG MỚI VÀO TỒN KHO.
 *
 * Chưa có ảnh ký thì số lượng chỉ nằm chờ: không cộng vào tồn, không lên báo
 * cáo, không xuất bán được. Chữ ký giấy vì vậy là cái khoá thật chứ không phải
 * thủ tục lưu trữ.
 *
 * Nội dung phiếu KHÔNG lưu riêng mà tính từ các `transactions` có cùng
 * `slipCode`, nên sửa giao dịch thì phiếu tự khớp theo. Chỉ trạng thái và ảnh
 * ký được lưu trong collection `slips`.
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
  /** Đã có ảnh ký = đã vào tồn kho. */
  approved: boolean;
}

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  slips: ImportSlipType[];
  canWrite: boolean;
  currentUserName: string;
  onMarkPrinted: (code: string, dateKey: string) => Promise<void>;
  onUploadSigned: (code: string, dateKey: string, files: FileList) => Promise<void>;
  /** Gỡ một ảnh đã tải nhầm khỏi phiếu. Không truyền thì không hiện nút gỡ. */
  onRemoveSigned?: (code: string, url: string) => Promise<void>;
  uploadingCode: string | null;
}

export default function ImportSlipPanel({
  transactions,
  products,
  partners,
  slips,
  canWrite,
  currentUserName,
  onMarkPrinted,
  onUploadSigned,
  onRemoveSigned,
  uploadingCode,
}: Props) {
  const [openCode, setOpenCode] = useState<string | null>(null);
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

  const approved = useMemo(() => approvedSlipCodes(slips), [slips]);

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

  const openSlip = handoverSlips.find((d) => d.code === openCode) || null;

  return (
    <div className="space-y-6">
      {/* ---------- Cảnh báo: phiếu chưa có ảnh ký = hàng chưa vào tồn ---------- */}
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
              và chưa xuất bán được. In phiếu ra, hai bên ký, rồi đưa ảnh tờ đã
              ký vào đúng phiếu đó.
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
            const photos = d.meta?.signedPhotoUrls || [];
            const printed = !!d.meta?.printedAt;
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        d.approved
                          ? "bg-emerald-100 text-emerald-700"
                          : printed
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {d.approved
                        ? "Đã vào tồn"
                        : printed
                          ? "Đã in · chờ ký"
                          : "Chờ in"}
                    </span>

                    <button
                      onClick={() => setOpenCode(d.code)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Xem &amp; in
                    </button>

                    {/*
                      Hai lối đưa ảnh vào, cố ý tách riêng: thuộc tính `capture`
                      trên điện thoại BẮT BUỘC mở camera, không cho chọn ảnh có
                      sẵn. Người dùng máy bàn quét phiếu bằng máy scan hoặc đã
                      chụp sẵn thì cần lối thứ hai không có `capture`.
                    */}
                    {canWrite && (
                      <>
                        <label
                          className={cn(
                            "px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5",
                            d.approved
                              ? "border-slate-200 hover:border-primary"
                              : "border-primary bg-primary text-white hover:brightness-110",
                            uploadingCode === d.code &&
                              "opacity-60 pointer-events-none",
                          )}
                        >
                          {uploadingCode === d.code ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Camera className="w-3.5 h-3.5" />
                          )}
                          Chụp ảnh
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            disabled={uploadingCode === d.code}
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                onUploadSigned(
                                  d.code,
                                  d.dateKey,
                                  e.target.files,
                                );
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>

                        <label
                          className={cn(
                            "px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-primary transition-all flex items-center gap-1.5",
                            uploadingCode === d.code &&
                              "opacity-60 pointer-events-none",
                          )}
                        >
                          {uploadingCode === d.code ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          Tải ảnh lên
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingCode === d.code}
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                onUploadSigned(
                                  d.code,
                                  d.dateKey,
                                  e.target.files,
                                );
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </>
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
                          {anhHong.has(url) ? (
                            <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-rose-50 px-1 text-center">
                              <ImageOff className="h-4 w-4 text-rose-400" />
                              <span className="text-[8px] font-black uppercase leading-tight tracking-tight text-rose-500">
                                Ảnh hỏng
                              </span>
                            </span>
                          ) : (
                            <>
                              <img
                                src={url}
                                alt={`Phiếu ${d.code} - ảnh ${i + 1}`}
                                loading="lazy"
                                onError={() => danhDauHong(url)}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45 opacity-0 transition-opacity group-hover:opacity-100">
                                <ZoomIn className="h-5 w-5 text-white" />
                              </span>
                            </>
                          )}
                        </button>
                        {canWrite && onRemoveSigned && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Gỡ ảnh này khỏi phiếu ${d.code}?\n\n` +
                                    (photos.length === 1
                                      ? `Đây là ảnh ký duy nhất — gỡ nó thì ${formatNumber(d.totalLiters)} lít trên phiếu sẽ RA KHỎI TỒN KHO.`
                                      : "Ảnh là chứng từ đã ký — chỉ gỡ khi tải nhầm."),
                                )
                              ) {
                                onRemoveSigned(d.code, url);
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

      {/* ---------- Cửa sổ xem & in phiếu ---------- */}
      {openSlip && (
        <SlipPreview
          slip={openSlip}
          products={products}
          partners={partners}
          currentUserName={currentUserName}
          onClose={() => setOpenCode(null)}
          onPrint={async () => {
            await onMarkPrinted(openSlip.code, openSlip.dateKey);
            window.print();
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
                  src={previewPhoto}
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
                href={previewPhoto}
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

function SlipPreview({
  slip,
  products,
  partners,
  currentUserName,
  onClose,
  onPrint,
}: {
  slip: HandoverSlip;
  products: Product[];
  partners: Partner[];
  currentUserName: string;
  onClose: () => void;
  onPrint: () => void;
}) {
  const rows = slip.transactions.map((t) => {
    const p = products.find((x) => x.id === t.productId);
    const partner = partners.find((x) => x.id === t.partnerId);
    const liters = ((p?.capacityPerUnit || 0) / 1000) * (t.quantity || 0);
    return {
      name: t.productName || p?.name || "—",
      unit: p?.unit || "—",
      batch: "—",
      partner: t.partnerName || partner?.name || "—",
      quantity: t.quantity || 0,
      liters,
      time: format(new Date(t.date), "HH:mm"),
    };
  });

  const totalLiters = rows.reduce((s, r) => s + r.liters, 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-0 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible print:static">
      {/* Nền mờ - ẩn khi in */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm print:hidden"
      />

      <div className="relative z-10 w-full max-w-[820px] my-0 sm:my-6 print:my-0 print:max-w-none">
        {/* Thanh công cụ - ẩn khi in */}
        <div className="flex items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-t-2xl print:hidden">
          <p className="text-xs font-black uppercase tracking-widest">
            Xem trước phiếu · {slip.code}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> In phiếu
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
          TỜ PHIẾU A4 DỌC.
          Ép nền trắng chữ đen kể cả khi app đang ở chế độ tối, vì đây là thứ
          sẽ in ra giấy.
        */}
        <div
          id="slip-print-area"
          className="bg-white text-black p-8 sm:p-12 rounded-b-2xl print:rounded-none print:p-0 shadow-2xl print:shadow-none"
          style={{ colorScheme: "light" }}
        >
          {/* Đầu phiếu */}
          <div className="flex justify-between items-start gap-6 mb-6">
            <div className="text-[11px] leading-relaxed">
              <p className="font-bold uppercase">Sun World Ba Na Hills</p>
              <p>Nhà máy bia Bà Nà — SUNCRAFT Brewery</p>
              <p>Bộ phận: Kho bia</p>
            </div>
            <div className="text-[11px] text-right leading-relaxed">
              <p>Mẫu số: 01-VT</p>
              <p>
                Số phiếu: <span className="font-bold">{slip.code}</span>
              </p>
              {slip.seq > 0 && <p>Lượt giao thứ {slip.seq} trong ngày</p>}
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold uppercase tracking-wide">
              Phiếu nhập kho
            </h1>
            <p className="text-[12px] mt-1">
              Ngày {format(new Date(slip.dateKey), "dd")} tháng{" "}
              {format(new Date(slip.dateKey), "MM")} năm{" "}
              {format(new Date(slip.dateKey), "yyyy")}
            </p>
          </div>

          {/* Bảng hàng hoá */}
          <table className="w-full border-collapse text-[11px] mb-8">
            <thead>
              <tr>
                {[
                  "STT",
                  "Tên hàng hoá",
                  "Đơn vị",
                  "Số lô",
                  "Nguồn nhập",
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
                  <td className="border border-black px-2 py-1.5">{r.name}</td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.unit}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.batch}
                  </td>
                  <td className="border border-black px-2 py-1.5">
                    {r.partner}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.time}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right font-bold">
                    {formatNumber(r.quantity)}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right">
                    {formatNumber(r.liters)}
                  </td>
                </tr>
              ))}
              {/* Chừa vài dòng trống để viết tay bổ sung nếu cần */}
              {Array.from({ length: Math.max(0, 3) }).map((_, i) => (
                <tr key={"blank-" + i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td
                      key={j}
                      className="border border-black px-2 py-1.5">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td
                  colSpan={7}
                  className="border border-black px-2 py-1.5 text-right font-bold uppercase"
                >
                  Tổng cộng quy đổi
                </td>
                <td className="border border-black px-2 py-1.5 text-right font-bold">
                  {formatNumber(totalLiters)} L
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-[11px] mb-10">
            Tổng số dòng hàng: <strong>{rows.length}</strong>. Số liệu trên được
            kết xuất từ hệ thống quản lý kho lúc{" "}
            {format(new Date(), "HH:mm dd/MM/yyyy")}. Hai bên ký xác nhận số
            lượng thực giao; ảnh tờ phiếu đã ký được lưu vào hệ thống làm căn cứ
            ghi tăng tồn kho.
          </p>

          {/* Chân ký */}
          <div className="grid grid-cols-4 gap-4 text-[11px] text-center">
            {[
              "Bên giao (Sản xuất)",
              "Bên nhận (Thủ kho)",
              "Kế toán",
              "Trưởng bộ phận",
            ].map((role, i) => (
              <div key={role}>
                <p className="font-bold uppercase">{role}</p>
                <p className="italic text-[10px]">(Ký, ghi rõ họ tên)</p>
                <div className="h-20" />
                {i === 0 && <p>{currentUserName}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
