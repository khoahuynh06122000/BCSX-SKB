import { useMemo, useState } from "react";
import {
  Printer,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  ScanLine,
  Upload,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type {
  Transaction,
  Product,
  Partner,
  ImportSlip as ImportSlipType,
  SlipVerification,
} from "../types";
import { cn, formatNumber } from "../lib/utils";

/**
 * PHIẾU NHẬP KHO
 *
 * Cách làm việc mới: số liệu nhập trên hệ thống trước, cuối ngày in phiếu ra,
 * ký tươi, chụp ảnh phiếu đã ký lưu lại làm bằng chứng.
 *
 * Nội dung phiếu KHÔNG lưu riêng mà tính từ `transactions` type IN trong ngày,
 * nên sửa giao dịch thì phiếu tự khớp theo. Chỉ trạng thái và ảnh ký được lưu
 * trong collection `slips`.
 */

/** Mã phiếu theo ngày: PN-YYMMDD */
export function slipCodeForDate(dateISO: string): string {
  const d = new Date(dateISO);
  return "PN-" + format(d, "yyMMdd");
}

interface DaySlip {
  code: string;
  /** yyyy-MM-dd */
  dateKey: string;
  transactions: Transaction[];
  totalQuantity: number;
  totalLiters: number;
  meta?: ImportSlipType;
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
  /** Gửi ảnh phiếu đã ký cho AI đối soát với số liệu trong hệ thống. */
  onVerify: (
    code: string,
    dateKey: string,
    rows: { name: string; unit: string; batch: string; quantity: number }[],
  ) => Promise<void>;
  verifyingCode: string | null;
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
  onVerify,
  verifyingCode,
}: Props) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const slipMetaByCode = useMemo(() => {
    const m = new Map<string, ImportSlipType>();
    slips.forEach((s) => m.set(s.code, s));
    return m;
  }, [slips]);

  /** Gộp toàn bộ giao dịch nhập theo từng ngày thành một phiếu. */
  const daySlips = useMemo<DaySlip[]>(() => {
    const byDay = new Map<string, Transaction[]>();

    transactions
      .filter((t) => t.type === "IN" || t.type === "OPENING")
      .forEach((t) => {
        const dateKey = format(new Date(t.date), "yyyy-MM-dd");
        if (!byDay.has(dateKey)) byDay.set(dateKey, []);
        byDay.get(dateKey)!.push(t);
      });

    return Array.from(byDay.entries())
      .map(([dateKey, txs]) => {
        const totalQuantity = txs.reduce((s, t) => s + (t.quantity || 0), 0);
        const totalLiters = txs.reduce((s, t) => {
          const p = products.find((x) => x.id === t.productId);
          const ml = p?.capacityPerUnit || 0;
          return s + (t.quantity || 0) * (ml / 1000);
        }, 0);
        const code = slipCodeForDate(dateKey);
        return {
          code,
          dateKey,
          transactions: txs.sort(
            (a, b) => +new Date(a.date) - +new Date(b.date),
          ),
          totalQuantity,
          totalLiters,
          meta: slipMetaByCode.get(code),
        };
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [transactions, products, slipMetaByCode]);

  const missingSignature = daySlips.filter(
    (d) => !d.meta?.signedPhotoUrls?.length,
  );

  const openSlip = daySlips.find((d) => d.code === openCode) || null;

  return (
    <div className="space-y-6">
      {/* ---------- Đối soát: phiếu chưa có ảnh ký ---------- */}
      {missingSignature.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 bg-amber-50 flex gap-3 print:hidden">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
              {missingSignature.length} phiếu chưa có ảnh ký
            </p>
            <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed">
              {missingSignature
                .slice(0, 6)
                .map((d) => d.code)
                .join(" · ")}
              {missingSignature.length > 6 &&
                ` và ${missingSignature.length - 6} phiếu khác`}
            </p>
          </div>
        </div>
      )}

      {/* ---------- Danh sách phiếu theo ngày ---------- */}
      <div className="space-y-3 print:hidden">
        {daySlips.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-12">
            Chưa có giao dịch nhập kho nào.
          </p>
        ) : (
          daySlips.map((d) => {
            const photos = d.meta?.signedPhotoUrls || [];
            const signed = photos.length > 0;
            const printed = !!d.meta?.printedAt;
            const hasFooter = signed || !!d.meta?.verification;
            return (
              <div key={d.code} className="space-y-0">
              <div
                className={cn(
                  "p-4 rounded-2xl border border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center gap-4 justify-between",
                  hasFooter && "rounded-b-none border-b-0",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                      signed
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {signed ? (
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
                      {format(new Date(d.dateKey), "dd/MM/yyyy")} ·{" "}
                      {d.transactions.length} dòng hàng ·{" "}
                      {formatNumber(d.totalLiters)} lít
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      signed
                        ? "bg-emerald-100 text-emerald-700"
                        : printed
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {signed ? "Đã ký" : printed ? "Đã in" : "Nháp"}
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
                          "px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-primary transition-all flex items-center gap-1.5",
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
                              onUploadSigned(d.code, d.dateKey, e.target.files);
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
                              onUploadSigned(d.code, d.dateKey, e.target.files);
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </>
                  )}

                  {canWrite && signed && (
                    <button
                      onClick={() =>
                        onVerify(
                          d.code,
                          d.dateKey,
                          d.transactions.map((t) => {
                            const p = products.find(
                              (x) => x.id === t.productId,
                            );
                            return {
                              name: t.productName || p?.name || "",
                              unit: p?.unit || "",
                              batch: t.batchNumber || "",
                              quantity: t.quantity || 0,
                            };
                          }),
                        )
                      }
                      disabled={verifyingCode === d.code}
                      className="px-4 py-2 rounded-xl border border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {verifyingCode === d.code ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ScanLine className="w-3.5 h-3.5" />
                      )}
                      Đối soát
                    </button>
                  )}
                </div>
              </div>

              {/* Dải ảnh đã lưu — để người dùng thấy ngay mình đã tải đúng tờ nào */}
              {signed && (
                <div
                  className={cn(
                    "px-4 py-3 border border-slate-200 border-t-0 bg-slate-50/60 flex items-center gap-3 flex-wrap",
                    d.meta?.verification
                      ? "border-b-0"
                      : "rounded-b-2xl",
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {photos.length} ảnh đã lưu
                  </span>
                  {photos.map((url, i) => (
                    <div key={url + i} className="relative group">
                      <button
                        onClick={() => setPreviewPhoto(url)}
                        title="Bấm để xem ảnh lớn"
                        className="block w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-primary transition-all"
                      >
                        <img
                          src={url}
                          alt={`Phiếu ${d.code} - ảnh ${i + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      {canWrite && onRemoveSigned && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Gỡ ảnh này khỏi phiếu ${d.code}?\n\nẢnh là chứng từ đã ký — chỉ gỡ khi tải nhầm.`,
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

              {d.meta?.verification && (
                <VerificationResult v={d.meta.verification} />
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

      {/* ---------- Xem ảnh phiếu đã ký cỡ lớn ---------- */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-full flex flex-col gap-3"
          >
            <img
              src={previewPhoto}
              alt="Phiếu đã ký"
              className="w-full max-h-[80vh] object-contain rounded-2xl bg-white"
            />
            <div className="flex items-center justify-center gap-2">
              <a
                href={previewPhoto}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
              >
                Mở ảnh gốc
              </a>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:brightness-95 transition-all flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */

/** Hiển thị kết quả AI đối soát ảnh phiếu ký với số liệu trong hệ thống. */
function VerificationResult({ v }: { v: SlipVerification }) {
  const tone =
    v.verdict === "ok"
      ? {
          box: "border-emerald-300 bg-emerald-50",
          text: "text-emerald-800",
          sub: "text-emerald-700/80",
          Icon: CheckCircle2,
        }
      : v.verdict === "unsigned"
        ? {
            box: "border-slate-300 bg-slate-50",
            text: "text-slate-700",
            sub: "text-slate-500",
            Icon: AlertTriangle,
          }
        : {
            box: "border-rose-300 bg-rose-50",
            text: "text-rose-800",
            sub: "text-rose-700/80",
            Icon: AlertTriangle,
          };

  const { Icon } = tone;

  return (
    <div
      className={cn(
        "p-4 rounded-2xl rounded-t-none border border-t-0 space-y-2.5 print:hidden",
        tone.box,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", tone.text)} />
        <div className="space-y-1 min-w-0">
          <p className={cn("text-[11px] font-black uppercase tracking-wider", tone.text)}>
            {v.verdict === "ok"
              ? "Đã ký · Số liệu khớp"
              : v.verdict === "unsigned"
                ? "Chưa thấy chữ ký trên phiếu"
                : v.alterationSuspected
                  ? "Nghi có sửa số trên phiếu"
                  : `Lệch số ở ${v.mismatchCount} dòng hàng`}
          </p>

          {v.signaturePresent && v.signedBoxes?.length ? (
            <p className={cn("text-[11px] font-bold", tone.sub)}>
              Đã ký ở: {v.signedBoxes.join(", ")}
            </p>
          ) : null}

          {v.alterationSuspected && v.alterationNotes && (
            <p className={cn("text-[11px] font-bold leading-relaxed", tone.sub)}>
              {v.alterationNotes}
            </p>
          )}

          {v.mismatchCount > 0 && (
            <ul className="space-y-0.5 mt-1">
              {(v.rows || [])
                .filter((r) => !r.matched)
                .map((r, i) => (
                  <li
                    key={i}
                    className={cn("text-[11px] font-bold", tone.sub)}
                  >
                    {r.name}: hệ thống{" "}
                    <strong>{formatNumber(r.expectedQuantity)}</strong> · trên
                    giấy <strong>{formatNumber(r.paperQuantity)}</strong>
                  </li>
                ))}
            </ul>
          )}

          {v.imageQualityNote && (
            <p className={cn("text-[10px] font-bold italic", tone.sub)}>
              {v.imageQualityNote}
            </p>
          )}

          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-1">
            AI đối soát lúc {format(new Date(v.checkedAt), "HH:mm dd/MM/yyyy")} ·
            Kết quả mang tính cảnh báo, cần người kiểm tra lại
          </p>
        </div>
      </div>
    </div>
  );
}

function SlipPreview({
  slip,
  products,
  partners,
  currentUserName,
  onClose,
  onPrint,
}: {
  slip: DaySlip;
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
      batch: t.batchNumber || "—",
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
            {format(new Date(), "HH:mm dd/MM/yyyy")}.
          </p>

          {/* Chân ký */}
          <div className="grid grid-cols-4 gap-4 text-[11px] text-center">
            {[
              "Người lập phiếu",
              "Thủ kho",
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
