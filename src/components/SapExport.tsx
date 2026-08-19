import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Ban,
  Clock,
  FileJson,
  Server,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatNumber } from "../lib/utils";
import {
  alreadySentIds,
  pickRowsForPeriod,
  SAP_JOB_STATUS_LABEL,
  summarizeSapRows,
  type SapJob,
  type SapJobStatus,
  type SapSourceRow,
} from "../lib/sapExport";

/**
 * XUẤT HÓA ĐƠN LÊN SAP — bảng điều khiển
 *
 * Đây là phần trong app. Phần thật sự nạp số lên SAP là một script chạy trên
 * máy có SAP, vì trình duyệt bị cách ly khỏi máy: nó không mở được SAP GUI,
 * không gọi được COM. App chỉ dựng LỆNH XUẤT và kết xuất tệp `.json` cho script
 * đọc.
 *
 * Nút Duyệt trên SAP CỐ Ý không tự động. Hóa đơn đã phát hành là đã lên cơ quan
 * thuế, hủy phải làm biên bản — nên bước đó phải do người bấm, và app chỉ ghi
 * lại ai xác nhận, lúc nào.
 */

const STATUS_TONE: Record<SapJobStatus, string> = {
  queued: "bg-slate-100 text-slate-600",
  running: "bg-blue-100 text-blue-700",
  awaiting_approval: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-400",
};

interface Props {
  /** Toàn bộ dòng có thể lên hóa đơn (đã chuyển sang kiểu chung). */
  rows: SapSourceRow[];
  jobs: SapJob[];
  /** Chỉ chủ sở hữu mới tạo được lệnh. */
  canRun: boolean;
  busy: boolean;
  onCreate: (from: string, to: string, rows: SapSourceRow[]) => Promise<void>;
  onDownload: (job: SapJob) => void;
  onChangeStatus: (
    job: SapJob,
    next: SapJobStatus,
    note?: string,
  ) => Promise<void>;
}

/** Mặc định lấy tháng trước — kỳ hay xuất hóa đơn nhất. */
function defaultPeriod(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: format(first, "yyyy-MM-dd"),
    to: format(last, "yyyy-MM-dd"),
  };
}

export default function SapExportPanel({
  rows,
  jobs,
  canRun,
  busy,
  onCreate,
  onDownload,
  onChangeStatus,
}: Props) {
  const init = defaultPeriod();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);

  const sent = useMemo(() => alreadySentIds(jobs), [jobs]);

  const picked = useMemo(
    () => pickRowsForPeriod(rows, from, to, sent),
    [rows, from, to, sent],
  );

  const summary = useMemo(() => summarizeSapRows(picked.rows), [picked.rows]);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [jobs],
  );

  const periodValid = !!from && !!to && from <= to;
  const blocked = summary.missingMaterialCode > 0;

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
      {/* ---------- Đầu khối ---------- */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Xuất hóa đơn lên SAP
            </h3>
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed max-w-2xl">
              App dựng lệnh xuất và kết xuất tệp cho máy có SAP đọc. Trình duyệt
              không chạm được vào SAP nên phần nạp số do một script trên máy làm,
              và <strong>nút Duyệt trên SAP vẫn do anh bấm</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Chưa có script: nói rõ đang thiếu gì ---------- */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <FileJson className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-[11px] font-bold text-slate-500 leading-relaxed space-y-1">
          <p>
            <strong>Đang thiếu script trên máy.</strong> Tạo lệnh thì app vẫn kết
            xuất được tệp <code className="font-mono">.json</code>, nhưng chưa có
            gì đọc tệp đó để nạp lên SAP.
          </p>
          <p>
            Cần một tệp mẫu thật mà anh vẫn nạp vào SAP, để dựng đúng khuôn — để
            vào thư mục <code className="font-mono">sap-mau/</code> trong dự án.
          </p>
        </div>
      </div>

      {/* ---------- Chọn kỳ ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Từ ngày
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Đến ngày
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            disabled={
              !canRun || busy || !periodValid || picked.rows.length === 0 || blocked
            }
            onClick={() => onCreate(from, to, picked.rows)}
            className="px-6 py-3 rounded-2xl bg-violet-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-violet-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 flex items-center gap-2"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Tạo lệnh &amp; tải tệp
          </button>
        </div>
      </div>

      {!periodValid && (
        <p className="text-[11px] font-black text-rose-600 uppercase tracking-wider">
          Ngày bắt đầu phải trước ngày kết thúc.
        </p>
      )}

      {/* ---------- Xem trước số sẽ xuất ---------- */}
      {periodValid && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Số dòng", value: formatNumber(summary.count) },
            { label: "Khách hàng", value: formatNumber(summary.partnerCount) },
            {
              label: "Trước thuế",
              value: formatNumber(summary.totalBeforeVat) + " đ",
            },
            { label: "Thuế", value: formatNumber(summary.totalVat) + " đ" },
            {
              label: "Sau thuế",
              value: formatNumber(summary.totalAfterVat) + " đ",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {s.label}
              </p>
              <p className="text-sm font-black text-slate-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chặn thật: SAP khớp mặt hàng bằng mã vật tư, không bằng tên. */}
      {blocked && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
            <strong>
              {summary.missingMaterialCode} dòng thiếu mã vật tư
            </strong>{" "}
            — SAP khớp mặt hàng bằng mã chứ không bằng tên, nên những dòng này sẽ
            bị từ chối. Sửa mã ở bảng doanh thu bên dưới rồi quay lại.
          </p>
        </div>
      )}

      {picked.skipped.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3">
          <Ban className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
            <strong>{picked.skipped.length} dòng đã bỏ qua</strong> vì đã nằm
            trong một lệnh xuất trước đó. Xuất trùng là phát hành hai hóa đơn cho
            cùng một lần bán — muốn xuất lại thì huỷ lệnh cũ trước.
          </p>
        </div>
      )}

      {periodValid && picked.rows.length === 0 && picked.skipped.length === 0 && (
        <p className="text-center text-xs font-bold text-slate-400 py-6">
          Kỳ này chưa có dòng doanh thu nào để xuất.
        </p>
      )}

      {/* ---------- Lịch sử lệnh xuất ---------- */}
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Lệnh xuất đã tạo
        </p>

        {sortedJobs.length === 0 ? (
          <p className="text-[11px] font-bold text-slate-400 py-4">
            Chưa có lệnh nào.
          </p>
        ) : (
          sortedJobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center gap-3 justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      STATUS_TONE[job.status],
                    )}
                  >
                    {SAP_JOB_STATUS_LABEL[job.status]}
                  </span>
                  <span className="text-[11px] font-black text-slate-900 font-mono">
                    {job.period.from} → {job.period.to}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400">
                  {formatNumber(job.summary.count)} dòng ·{" "}
                  {formatNumber(job.summary.totalBeforeVat)} đ trước thuế · tạo{" "}
                  {job.createdAt
                    ? format(new Date(job.createdAt), "HH:mm dd/MM/yyyy")
                    : "—"}
                  {job.createdBy ? ` · ${job.createdBy}` : ""}
                </p>
                {job.approvedAt && (
                  <p className="text-[11px] font-bold text-emerald-600">
                    Đã duyệt {format(new Date(job.approvedAt), "HH:mm dd/MM/yyyy")}
                    {job.approvedBy ? ` · ${job.approvedBy}` : ""}
                  </p>
                )}
                {job.note && (
                  <p className="text-[11px] font-bold text-slate-500 italic">
                    {job.note}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => onDownload(job)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Tải lại tệp
                </button>

                {canRun && job.status === "queued" && (
                  <>
                    <button
                      onClick={() =>
                        onChangeStatus(job, "awaiting_approval")
                      }
                      className="px-3 py-2 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" /> Đã nạp lên SAP
                    </button>
                    <button
                      onClick={() => {
                        const note = window.prompt(
                          "Huỷ lệnh này? Các dòng trong lệnh sẽ được chọn lại ở lần xuất sau.\n\nLý do huỷ (không bắt buộc):",
                          "",
                        );
                        if (note === null) return;
                        onChangeStatus(job, "cancelled", note || undefined);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:border-rose-300 hover:text-rose-600 transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Huỷ
                    </button>
                  </>
                )}

                {canRun && job.status === "awaiting_approval" && (
                  <>
                    <button
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Xác nhận đã bấm Duyệt trên SAP cho ${formatNumber(job.summary.count)} dòng, ${formatNumber(job.summary.totalBeforeVat)} đ trước thuế?\n\nSau bước này lệnh chốt lại, không huỷ được — vì hóa đơn ngoài SAP không biến mất theo trạng thái trong app.`,
                          )
                        )
                          return;
                        onChangeStatus(job, "done");
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt xong
                    </button>
                    <button
                      onClick={() => {
                        const note = window.prompt(
                          "SAP báo lỗi gì? Ghi lại để lần sau sửa được:",
                          "",
                        );
                        if (note === null) return;
                        onChangeStatus(job, "failed", note || undefined);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:border-rose-300 hover:text-rose-600 transition-all flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Báo lỗi
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
