import { useMemo, useState } from "react";
import {
  Printer,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  Upload,
  X,
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
