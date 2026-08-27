/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, ReactNode, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Building2,
  LayoutDashboard,
  PlusCircle,
  MinusCircle,
  Package,
  Users,
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  User,
  Download,
  LogOut,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Menu,
  X,
  CheckCircle,
  Truck,
  Camera,
  Image as ImageIcon,
  ImageOff,
  FileSpreadsheet,
  Layers,
  FileText,
  AlertTriangle,
  DollarSign,
  HandCoins,
  Trash2,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Package2,
  FileUp,
  Beer,
  Sun,
  Moon,
  Lock,
  FlaskConical,
  Receipt,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

import {
  isValid,
  parse,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  format,
  differenceInDays,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  Transaction,
  Product,
  Partner,
  InventoryItem,
  TransactionType,
  Category,
  BatchInfo,
  RevenueRecord,
  UserRole,
  UserProfile,
  ImportSlip,
} from "./types";
import { INITIAL_PRODUCTS, INITIAL_PARTNERS } from "./constants";
import { cn, formatDate, formatNumber } from "./lib/utils";
import { useTheme } from "./lib/useTheme";
import { matchRevenueProduct, revenueRowLiters } from "./lib/reconcile";
import { revenueFromStockOut } from "./lib/revenueFromStock";
import {
  approvedSlipCodes,
  nextSlipCode,
  pendingSlipTransactions,
  pendingStockByProduct,
  stockTransactions,
} from "./lib/slip";
import {
  billableTransactions,
  buildSapJobFile,
  canTransition,
  transactionToSapRow,
  sapJobFileName,
  sapJobId,
  summarizeSapRows,
  SAP_JOB_STATUS_LABEL,
  type SapJob,
  type SapJobStatus,
  type SapSourceRow,
} from "./lib/sapExport";
import SapExportPanel from "./components/SapExport";

import {
  db,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocFromServer,
  getDoc,
  getDocs,
  writeBatch,
} from "./firebase";
import { uploadToCloudinary } from "./lib/cloudinary";
import {
  hashPin,
  verifyPin,
  isValidPinFormat,
  PIN_SESSION_KEY,
} from "./lib/pin";
import ImportSlipPanel from "./components/ImportSlip";
import { compressFile } from "./lib/image";
import BulkImportGrid from "./components/BulkImportGrid";
import KiemTraQuyen from "./components/KiemTraQuyen";
import ChuyenAnhCu from "./components/ChuyenAnhCu";
import {
  danhSachBoPhanBNC,
  danhSachDonVi,
  dungAnhThuVien,
  locTheoDonVi,
  lyDoAnhLoi,
  tenLocDonVi,
  type AnhThuVien,
} from "./lib/thuVienAnh";
import { taoZip, tenTrongZip } from "./lib/taiHangLoat";
import { taoSheetDep, XLSXDep, type BangDep } from "./lib/excelDep";
import TkhoImport from "./components/TkhoImport";
import { normalizeDiemBan, type DiemBanEntry } from "./lib/diemBan";
import {
  laBoPhanBNC,
  nhomCuaBoPhan,
  NHOM_BNC,
  type MaNhomBNC,
} from "./lib/nhomBNC";
import { stableHash } from "./lib/hash";
import type { TkhoNhapDraft } from "./lib/tkhoXuat";
import { danhKhoaBbgn, type BbgnDraft } from "./lib/bbgn";
import DebtExport from "./components/DebtExport";
import DonBNC from "./components/DonBNC";
import ManHinhDangNhap from "./components/ManHinhDangNhap";
import type { HoaDonGhiNhan } from "./lib/hoaDon";

/**
 * Email chu so huu GOC - tai khoan khong bao gio bi khoa ra ngoai.
 *
 * Day KHONG con la chu so huu duy nhat: chu so huu goc dat vai tro OWNER cho
 * nguoi khac trong muc Nguoi dung, va nguoi do co dung nhung quyen nhu minh.
 * Vai tro OWNER cap kieu do luu o users/{uid} va co hieu luc that - xem
 * isOwner() trong firestore.rules.
 *
 * Rieng tai khoan nay thi khong ai ha quyen hay xoa duoc (chan ca o giao dien
 * lan o firestore.rules), de khong bao gio xay ra canh het sach nguoi co quyen
 * duyet nguoi dung.
 *
 * Gia tri nay phai trung voi ownerEmail() trong firestore.rules - do moi la
 * noi thuc su chan quyen; khai bao o day chi de giao dien hien dung.
 */
const OWNER_EMAIL = "khoa.huynh.06.12.2000@gmail.com";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}


// --- Components ---

const parseDateSafe = (dateStr: any): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;

  const trimmed = String(dateStr).trim();

  // Try ISO first
  const isoDate = parseISO(trimmed);
  if (isValid(isoDate)) return isoDate;

  // Common formats in Vietnam
  const formats = [
    "dd/MM/yyyy",
    "dd.MM.yyyy",
    "dd-MM-yyyy",
    "yyyy-MM-dd",
    "dd/MM/yy",
    "d/M/yyyy",
  ];
  for (const fmt of formats) {
    const parsedDate = parse(trimmed, fmt, new Date());
    if (isValid(parsedDate)) return parsedDate;
  }

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : new Date();
};


const parseExcelNumberSafe = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  const trimmed = String(val).trim().replace(/\s/g, "");
  if (!trimmed) return 0;

  let isNegative = false;
  let clean = trimmed;
  if (clean.startsWith("(") && clean.endsWith(")")) {
    isNegative = true;
    clean = clean.slice(1, -1);
  } else if (clean.startsWith("-")) {
    isNegative = true;
    clean = clean.slice(1);
  }

  if (clean.includes(".") && clean.includes(",")) {
    if (clean.indexOf(".") < clean.indexOf(",")) {
      clean = clean.replace(/\./g, "").replace(/,/g, ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    const parts = clean.split(",");
    if (parts.length > 2) {
      clean = clean.replace(/,/g, "");
    } else {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3 && parts[0] !== "0") {
        clean = clean.replace(/,/g, "");
      } else {
        clean = clean.replace(/,/g, ".");
      }
    }
  } else if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length > 2) {
      clean = clean.replace(/\./g, "");
    } else {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3 && parts[0] !== "0") {
        clean = clean.replace(/\./g, "");
      }
    }
  }

  const parsed = parseFloat(clean);
  const finalVal = isNaN(parsed) ? 0 : parsed;
  return isNegative ? -finalVal : finalVal;
};

/**
 * Định mức tồn tối thiểu dùng chung cho sản phẩm chưa đặt định mức riêng.
 * Bằng đúng con số 10 mà thẻ "Cảnh báo cạn kho" vẫn dùng từ trước.
 */
const DEFAULT_MIN_STOCK = 10;

/**
 * Gọi endpoint AI kèm chứng minh đăng nhập.
 *
 * Hai endpoint `/api/gemini/*` giờ bắt buộc có Firebase ID token (xem
 * api/_auth.ts), nếu không sẽ trả 401. Token chỉ sống khoảng một giờ nên phải
 * lấy mới ở mỗi lần gọi thay vì giữ lại — `getIdToken()` tự làm mới khi cần.
 */
async function callAiApi(path: string, body: unknown): Promise<Response> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error("Chưa đăng nhập nên không dùng được tính năng AI.");
  }
  const token = await current.getIdToken();
  return fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const formatDisplayDate = (dateStr: string) => {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      // Try to return as-is if it looks like a date string already
      return dateStr;
    }
    return format(date, "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
};

const Card = ({
  children,
  className,
  title,
  noPadding,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  noPadding?: boolean;
  key?: any;
}) => (
  <div
    className={cn(
      // Dung border-slate-200 (thay vi border-white) de vien hien dung o ca
      // che do sang lan toi, vi thang slate duoc dao chieu trong index.css.
      // Dung mot ban kinh bo goc duy nhat (16px) cho moi khung the, de khop
      // voi the tai khoan va cac muc menu ben trai (12px) - khung to bo goc
      // to hon muc nho ben trong, giu thu bac ro rang.
      "bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl overflow-hidden premium-shadow transition-none",
      className,
    )}
  >
    {title && (
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
        <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.14em]">
          {title}
        </h3>
      </div>
    )}
    <div className={noPadding ? "" : "px-4 py-4 sm:px-6 sm:py-5"}>
      {children}
    </div>
  </div>
);

const StatCard = ({
  title,
  value,
  unit,
  icon: Icon,
  color = "primary",
  subtitle,
  target,
  trend,
  chartData,
}: any) => (
  <Card className="relative group overflow-hidden border-none ring-1 ring-slate-100/50 pb-0 transition-all duration-300 hover:-translate-y-0.5 hover:ring-amber-500/30 hover:shadow-[0_12px_28px_-8px_rgba(217,119,6,0.18)]">
    {/* Vach mau tren dau the - chi tiet nhan dien hoc tu app mau */}
    <div
      className={cn(
        "absolute top-0 left-0 right-0 h-1",
        color === "primary"
          ? "bg-gradient-to-r from-amber-500 to-amber-600"
          : color === "green"
            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : color === "amber"
              ? "bg-gradient-to-r from-amber-400 to-yellow-500"
              : "bg-gradient-to-r from-rose-500 to-rose-400",
      )}
    />
    <div className="flex items-center justify-between mb-2 sm:mb-4">
      <div
        className={cn(
          "w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm",
          color === "primary"
            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/25"
            : color === "green"
              ? "bg-emerald-500 text-white shadow-emerald-500/25"
              : color === "amber"
                ? "bg-amber-500 text-white shadow-amber-500/25"
                : "bg-rose-500 text-white shadow-rose-500/25",
        )}
      >
        {Icon && <Icon className="w-4 h-4 sm:w-6 sm:h-6" />}
      </div>
      {trend && (
        <div
          className={cn(
            "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm border",
            trend.startsWith("+")
              ? "bg-emerald-50 border-emerald-100 text-emerald-600"
              : "bg-rose-50 border-rose-100 text-rose-600",
          )}
        >
          {trend.startsWith("+") ? (
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          )}
          {trend}
        </div>
      )}
    </div>

    <div className="flex flex-col mb-2 sm:mb-4">
      <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.25em] mb-0.5">
        {title}
      </p>
      <h4 className="text-lg sm:text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5 sm:gap-2">
        <span className="font-mono leading-none">{value}</span>
        {unit && (
          <span className="text-[8px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
            {unit}
          </span>
        )}
      </h4>
      {target && (
        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 mt-0.5 sm:mt-1 uppercase tracking-wider uppercase tracking-wider">
          Mục tiêu: {target}
        </p>
      )}
      {subtitle && (
        <p className="text-[9px] sm:text-xs font-bold text-slate-500 mt-1.5 sm:mt-3 italic flex items-center gap-1 sm:gap-1.5 font-sans">
          {!trend && (
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
          )}
          {subtitle}
        </p>
      )}
    </div>

    {chartData && (
      <div className="h-16 w-full -mx-8 mt-2 overflow-hidden">
        {/* Dung chieu cao co dinh (khong dung "100%") de Recharts khong do ra -1
            roi ve lai lien tuc gay rung man hinh. */}
        <ResponsiveContainer width="100%" height={64} minWidth={0}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient
                id={`gradient-${color}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={
                    color === "primary"
                      ? "#d97706"
                      : color === "green"
                        ? "#10b981"
                        : color === "amber"
                          ? "#f59e0b"
                          : "#f43f5e"
                  }
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor={
                    color === "primary"
                      ? "#d97706"
                      : color === "green"
                        ? "#10b981"
                        : color === "amber"
                          ? "#f59e0b"
                          : "#f43f5e"
                  }
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={
                color === "primary"
                  ? "#d97706"
                  : color === "green"
                    ? "#10b981"
                    : color === "amber"
                      ? "#f59e0b"
                      : "#f43f5e"
              }
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${color})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}

    <div
      className={cn(
        "absolute bottom-0 right-0 w-32 h-32 blur-[60px] opacity-10 rounded-full -mr-12 -mb-12 transition-all duration-700 group-hover:opacity-20 group-hover:scale-125",
        color === "primary"
          ? "bg-primary"
          : color === "green"
            ? "bg-emerald-500"
            : color === "amber"
              ? "bg-amber-500"
              : "bg-rose-500",
      )}
    />
  </Card>
);

const Button = ({
  children,
  className,
  variant = "primary",
  loading,
  ...props
}: any) => {
  const variants = {
    // Luu y: truoc day dung "hover:bg-primary-dark" nhung mau primary-dark
    // chua bao gio duoc dinh nghia nen di chuot vao nut khong doi mau.
    primary:
      "bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/25 active:scale-[0.97]",
    secondary:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.97]",
    outline:
      "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-primary/40 active:scale-[0.97]",
    danger:
      "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/25 active:scale-[0.97]",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  };
  return (
    <button
      className={cn(
        "px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl font-black transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant as keyof typeof variants],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5 sm:space-y-2 w-full">
    {label && (
      <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
    )}
    <input
      className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50/50 border border-slate-200 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all outline-none placeholder:text-slate-400"
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1.5 sm:space-y-2 w-full">
    {label && (
      <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
    )}
    <div className="relative">
      <select
        className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50/50 border border-slate-200 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all outline-none appearance-none"
        {...props}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 rotate-90" />
      </div>
    </div>
  </div>
);

// --- Main Application ---

export default function App() {
  const { toggleTheme, isDark } = useTheme();

  /**
   * Bang mau cho bieu do.
   *
   * Recharts ve bang thuoc tinh fill/stroke tren the SVG nen KHONG an theo
   * thang mau cua Tailwind - phai tu doi tay theo che do sang/toi. Neu bo qua,
   * cac mau dam (vi du #0f172a) se chim hoan toan tren nen toi.
   *
   * Nguyen tac: che do toi dung ban mau sang hon va bot bao hoa de do doc.
   */
  const chartColors = useMemo(
    () => ({
      grid: isDark ? "#2f3949" : "#E2E8F0",
      axis: isDark ? "#8592a6" : "#64748b",
      // Day mau cho bieu do tron / nhieu chuoi du lieu
      series: isDark
        ? ["#fbbf24", "#60a5fa", "#34d399", "#f472b6", "#c084fc"]
        : ["#0f172a", "#2563eb", "#10b981", "#f59e0b", "#ec4899"],
      blue: isDark ? "#60a5fa" : "#2563eb",
      rose: isDark ? "#fb7185" : "#f43f5e",
      emerald: isDark ? "#34d399" : "#10b981",
      // Mau nhan manh: nen toi dung ho phach thay cho navy gan nhu den
      accent: isDark ? "#fbbf24" : "#0f172a",
      tooltipBg: isDark ? "#1e2531" : "#ffffff",
      tooltipText: isDark ? "#eef2f7" : "#0f172a",
      tooltipBorder: isDark ? "1px solid #2f3949" : "none",
    }),
    [isDark],
  );

  // Phien dang nhap do Firebase Auth quan ly (xem useEffect onAuthStateChanged).
  // Ban cu doc vai tro tu localStorage - ai cung sua duoc bang cong cu trinh
  // duyet de tu nang minh len OWNER.
  const [user, setUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("PENDING");
  /**
   * Đọc hồ sơ hỏng — KHÁC hẳn với "chưa được duyệt".
   *
   * Giữ riêng một trạng thái để không bao giờ lẫn hai việc: không biết vai trò
   * thì phải nói là không biết, chứ hạ người ta xuống PENDING là báo sai.
   */
  const [loiHoSo, setLoiHoSo] = useState("");

  /**
   * Những kho dữ liệu đang không đọc được, gom vào MỘT chỗ.
   *
   * Trước đây mỗi kho hỏng là một thông báo đỏ bật lên riêng. Phân quyền máy
   * chủ cũ thì cả năm kho cùng hỏng — năm thông báo chồng nhau, che mất màn
   * hình, mà nội dung na ná nhau. Nói một lần, kèm tên từng kho, là đủ.
   *
   * Đọc được thì tự xoá khỏi danh sách, nên dán lại phân quyền xong là dải
   * cảnh báo biến mất mà không phải tải lại trang.
   */
  const [loiDoc, setLoiDoc] = useState<Record<string, string>>({});
  const ghiNhanLoiDoc = (kho: string, loi: string | null) =>
    setLoiDoc((truoc) => {
      if (loi === null) {
        if (!(kho in truoc)) return truoc;
        const sau = { ...truoc };
        delete sau[kho];
        return sau;
      }
      if (truoc[kho] === loi) return truoc;
      return { ...truoc, [kho]: loi };
    });
  const isOwner = userRole === "OWNER";
  /** Da dang nhap Google nhung chu so huu chua duyet. */
  const isPending = !!user && userRole === "PENDING";
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [allUserProfiles, setAllUserProfiles] = useState<UserProfile[]>([]);
  const [slips, setSlips] = useState<ImportSlip[]>([]);
  const [uploadingSlipCode, setUploadingSlipCode] = useState<string | null>(
    null,
  );
  /**
   * Hóa đơn ĐÃ PHÁT HÀNH, do người dùng điền lại số và ngày thật.
   *
   * Đây là bước cuối của quy trình: nạp đơn đã giao → app tính công nợ từng
   * đơn vị → cầm số đó đi phát hành hóa đơn ngoài app → quay lại điền số thật.
   * Xem `src/lib/hoaDon.ts`.
   */
  const [hoaDon, setHoaDon] = useState<HoaDonGhiNhan[]>([]);
  const [sapJobs, setSapJobs] = useState<SapJob[]>([]);
  const [sapBusy, setSapBusy] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  /**
   * Đối tác lấy từ Firestore. Khởi tạo RỖNG, không lấy INITIAL_PARTNERS.
   *
   * Trước đây khởi tạo bằng danh sách cứng nên giao diện hiện sẵn cả chục đối
   * tác *không tồn tại trong Firestore*: chọn một trong số đó để xuất kho thì
   * giao dịch trỏ tới `partnerId` không có thật, rồi file công nợ và bảng đối
   * soát lệch mà không ai hiểu vì sao. Nó cũng làm khối "Danh sách Đối tác đang
   * trống" không bao giờ hiện, tức là cái nút khôi phục nằm đó mà không ai thấy.
   *
   * INITIAL_PARTNERS giờ chỉ dùng cho nút khôi phục (handleRestorePartners),
   * nơi nó được ghi thành tài liệu Firestore thật.
   */
  const [partners, setPartners] = useState<Partner[]>([]);
  // Danh muc san pham hien lay cung tu constants.ts (chua co giao dien sua).
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  /**
   * DOANH THU — SỐ TÍNH RA TỪ XUẤT KHO, KHÔNG PHẢI DỮ LIỆU LƯU.
   *
   * Trước đây doanh thu là một collection riêng, nạp vào bằng file Excel hàng
   * tháng. Bỏ hẳn cách đó: xuất kho là gốc, doanh thu suy ra từ nó. Kho và
   * doanh thu vì vậy không còn hai nguồn để lệch nhau.
   *
   * Hệ quả phải nhớ: sửa một phiếu xuất là doanh thu kỳ đó đổi theo ngay, và
   * không sửa tay được một dòng doanh thu lẻ nào — muốn đổi thì sửa phiếu xuất.
   *
   * Giá và thuế nằm ở `src/lib/invoice.ts`, phép dựng ở
   * `src/lib/revenueFromStock.ts`.
   */
  const revenueBuild = useMemo(
    () => revenueFromStockOut({ transactions, products, partners }),
    [transactions, products, partners],
  );
  const revenueData = useMemo(
    () =>
      revenueBuild.records.map((r) => ({
        ...r,
        _parsedDate: parseDateSafe(r.date),
      })),
    [revenueBuild],
  );

  const [activeTab, setActiveTab] = useState("dashboard");
  /**
   * Tab con trong mục Báo cáo. Ba giá trị này đúng với ba nút trên giao diện.
   *
   * Bản cũ khai là "overview" | "detailed" | "inventory" — không khớp giá trị
   * nào mà giao diện thực sự dùng, và khởi tạo bằng "overview" nên mở tab Báo
   * cáo lên là không thấy nội dung nào (khối Tổng hợp chỉ hiện khi bằng
   * "summary") và cũng không nút nào sáng.
   */
  const [reportSubTab, setReportSubTab] = useState<"summary" | "in" | "out">(
    "summary",
  );

  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [batchSearchQuery, setBatchSearchQuery] = useState("");
  const [revenuePartnerSearch, setRevenuePartnerSearch] = useState("");
  const [reportPartnerSearch, setReportPartnerSearch] = useState("");

  const [galleryFilter, setGalleryFilter] = useState<"IN" | "OUT">("IN");
  /*
   * Khoảng ngày của thư viện ảnh.
   *
   * Mặc định 30 ngày gần nhất chứ không phải "tất cả": ảnh cần tra gần như
   * luôn là ảnh mới, còn tải hết vài nghìn tấm về máy điện thoại thì vừa chậm
   * vừa tốn 4G. Muốn xem xa hơn thì kéo ngày bắt đầu lùi lại.
   */
  const [galleryTuNgay, setGalleryTuNgay] = useState(() =>
    format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd"),
  );
  const [galleryDenNgay, setGalleryDenNgay] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [gallerySearchQuery, setGallerySearchQuery] = useState("");
  /**
   * Giao dịch đang xem ảnh minh chứng ở chế độ toàn màn hình.
   *
   * Bản cũ khai là `string | null` nhưng chỗ mở modal lại truyền cả giao dịch
   * vào, rồi modal đọc `.productName` / `.date` / `.evidencePhotoUrl` — chạy
   * được nhưng kiểu sai nên TypeScript không còn bắt được lỗi tên trường.
   */
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<AnhThuVien | null>(null);
  /**
   * Tiến trình tải hàng loạt ảnh thư viện.
   *
   * `tong` là 0 khi không tải gì. Phải hiện được số đã xong: gói vài trăm tấm
   * mất cả phút, không có gì nhúc nhích thì người dùng tưởng treo và bấm lại.
   */
  /** Đơn vị đang lọc ở thư viện ảnh chiều xuất. Rỗng là xem hết. */
  const [galleryDonVi, setGalleryDonVi] = useState("");
  /**
   * Điểm bán của BNC đang lọc thêm, chỉ dùng khi đang lọc một phần của BNC.
   *
   * Phần Nội bộ có 17 điểm bán nên chọn phần rồi vẫn còn quá nhiều ảnh; ô thứ
   * hai này để soi tiếp một quán. Ba phần còn lại chỉ có một bộ phận nên ô
   * không hiện ra.
   */
  const [galleryBoPhan, setGalleryBoPhan] = useState("");
  /**
   * Những tấm trình duyệt tải không được, ghi theo khoá ảnh.
   *
   * Trước đây tấm nào lỗi thì ô ảnh trắng trơn, không nói gì — nhìn vào tưởng
   * app lọc sai hoặc mất ảnh. Ghi lại để ô ảnh hiện đúng lý do, và để đếm ra
   * một dòng cảnh báo phía trên lưới.
   */
  const [anhLoi, setAnhLoi] = useState<Set<string>>(new Set());
  const ghiAnhLoi = (id: string) =>
    setAnhLoi((cu) => (cu.has(id) ? cu : new Set(cu).add(id)));
  const [tienTrinhTaiAnh, setTienTrinhTaiAnh] = useState({
    tong: 0,
    xong: 0,
    hong: 0,
  });
  // Danh sach so hoa don dang bung chi tiet o so chi tiet doanh thu.
  // Truoc day khai bao la Set nhung cho dung lai goi .includes()/.filter() nen
  // bam vao dong hoa don la loi ngay - gio dung mang cho khop voi cho dung.
  const [expandedInvoices, setExpandedInvoices] = useState<string[]>([]);

  /**
   * Phần gán điểm bán do người dùng thêm, lưu ở collection `diem_ban`.
   *
   * Bảng gán sẵn trong code chỉ phủ tháng 8. Mỗi tháng bộ phận lại mở điểm bán
   * mới — T5, T6, T7 mỗi tháng gần 30 tên lạ. Không lưu lại thì tháng nào cũng
   * phải gán lại từ đầu.
   */
  const [diemBanOverrides, setDiemBanOverrides] = useState<DiemBanEntry[]>([]);



  const [isScanning, setIsScanning] = useState(false);
  const [scannedInvoiceDate, setScannedInvoiceDate] = useState<string | null>(
    null,
  );
  const [matchedProductIds, setMatchedProductIds] = useState<Set<string>>(
    new Set(),
  );

  /**
   * Bộ lọc thời gian dùng chung cho Tổng quan / Tồn kho / Báo cáo / Doanh thu.
   *
   * Năm giá trị này đúng với năm nút trên thanh lọc. Bản cũ khai
   * "today" | "yesterday" | "custom" — không có giá trị nào được dùng thật,
   * nên mọi phép so sánh với "day"/"year" đều bị TypeScript coi là vô nghĩa và
   * không còn ai canh giúp khi gõ sai tên bộ lọc.
   */
  const [timeFilter, setTimeFilter] = useState<
    "all" | "day" | "week" | "month" | "year"
  >("all");

  /**
   * Mốc thời gian đang xem. Là Date vì mọi nơi đều đưa thẳng vào date-fns
   * (startOfDay, subMonths, format...). Bản cũ khởi tạo bằng chuỗi
   * "yyyy-MM-dd" rồi các nút lại gán Date vào — chạy được nhờ date-fns tự đổi
   * chuỗi thành Date, nhưng kiểu thì sai và rất dễ vỡ về sau.
   */
  const [filterBaseDate, setFilterBaseDate] = useState<Date>(new Date());
  const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<
    string | null
  >(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  // Cac o nhap mat khau / PIN da duoc go bo: viec xac thuc nay do Google lo.

  const showNotification = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  /**
   * THEO DOI PHIEN DANG NHAP
   *
   * Firebase Auth tu nho phien nen khong can luu gi trong localStorage nhu
   * ban cu (vua khong an toan vua de gia mao bang cach sua localStorage).
   *
   * Luong: dang nhap Google -> neu chua co ho so thi tao moi o trang thai
   * PENDING -> chu so huu duyet -> vao duoc app.
   */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setUserRole("PENDING");
        setCurrentUserProfile(null);
        setLoading(false);
        return;
      }

      const uid = fbUser.uid;
      const emailLower = (fbUser.email || "").toLowerCase();
      setUser(fbUser.displayName || fbUser.email || "Người dùng");

      try {
        const ref = doc(db, "users", uid);

        /*
         * ĐỌC HỒ SƠ: MÁY CHỦ TRƯỚC, BẢN ĐỆM SAU.
         *
         * `getDocFromServer` bắt buộc phải đi ra mạng, KHÔNG có đường lùi về
         * bản đệm. Trên điện thoại sóng yếu hoặc 4G chập chờn — đúng cảnh dùng
         * app ngoài kho — lệnh này hỏng thường xuyên, trong khi cùng tài khoản
         * đó trên máy tính nối wifi thì chạy ngon.
         *
         * Bản trước hỏng là rơi thẳng vào nhánh bắt lỗi rồi ĐẶT VAI TRÒ THÀNH
         * PENDING. Người đang là quản trị bỗng thành tài khoản chờ duyệt: mất
         * hết tab, không lên dữ liệu, mà lỗi thì chỉ nằm im trong console. Suy
         * ra một vai trò thấp hơn từ một lần mạng hỏng là đoán bừa về quyền —
         * thà nói không đọc được còn hơn.
         *
         * Nay hỏng thì thử tiếp bản đệm trong máy (`getDoc`). Vẫn hỏng thì báo
         * ra màn hình cho người dùng thử lại, không tự hạ vai trò của ai.
         */
        let snap;
        try {
          snap = await getDocFromServer(ref);
        } catch (loiMang) {
          console.warn("Doc ho so tu may chu that bai, thu ban dem:", loiMang);
          snap = await getDoc(ref);
        }

        if (!snap.exists()) {
          // Lan dau dang nhap: tao ho so cho duyet.
          // Quy tac Firestore chi cho tao voi role PENDING nen khong the
          // tu nang quyen tu day.
          const fresh: UserProfile = {
            uid,
            email: emailLower,
            name: fbUser.displayName || undefined,
            photoURL: fbUser.photoURL || undefined,
            role: "PENDING",
            createdAt: new Date().toISOString(),
          };
          await setDoc(ref, fresh);
          setCurrentUserProfile(fresh);
          setUserRole(emailLower === OWNER_EMAIL ? "OWNER" : "PENDING");
        } else {
          const data = snap.data() as UserProfile;
          setCurrentUserProfile(data);
          // Chu so huu duoc nhan dien bang email, khong phu thuoc du lieu
          // trong Firestore - trung khop voi firestore.rules.
          setUserRole(
            emailLower === OWNER_EMAIL ? "OWNER" : data.role || "PENDING",
          );
        }
      } catch (err: any) {
        console.error("Khong doc duoc ho so nguoi dung:", err);
        if (emailLower === OWNER_EMAIL) {
          // Chủ sở hữu gốc nhận diện bằng email nên không cần hồ sơ.
          setUserRole("OWNER");
        } else {
          setLoiHoSo(
            err?.code === "permission-denied"
              ? "Máy chủ từ chối đọc hồ sơ của tài khoản này."
              : "Không tải được hồ sơ người dùng. Mạng đang chập chờn.",
          );
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // FIRESTORE SYNC
  useEffect(() => {
    if (!user) return;

    // Test connection as required by security guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // Sync Transactions
    const qTransactions = query(
      collection(db, "transactions"),
      orderBy("date", "desc"),
    );
    const unsubTransactions = onSnapshot(
      qTransactions,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id }) as Transaction,
        );
        // Firestore tra ve rong thi de rong luon - truoc day roi ve
        // INITIAL_TRANSACTIONS nhung mang do von rong nen khong khac gi.
        setTransactions(data);
        ghiNhanLoiDoc("transactions", null);
      },
      (error) => {
        ghiNhanLoiDoc(
          "transactions",
          handleFirestoreError(error, OperationType.GET, "transactions"),
        );
      },
    );

    // Sync Partners
    const qPartners = query(collection(db, "partners"));
    const unsubPartners = onSnapshot(
      qPartners,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id }) as Partner,
        );
        // Firestore rỗng thì để rỗng, đừng thay bằng danh sách cứng — đối tác
        // hiện trên giao diện phải là đối tác có thật để chọn xong dùng được.
        setPartners(data);
        ghiNhanLoiDoc("partners", null);
      },
      (error) => {
        ghiNhanLoiDoc(
          "partners",
          handleFirestoreError(error, OperationType.GET, "partners"),
        );
      },
    );

    // Doanh thu KHÔNG còn đọc từ Firestore. Nó suy ra từ chính `transactions`
    // — xem `revenueData` bên dưới và `src/lib/revenueFromStock.ts`. Nhờ vậy
    // mỗi lần mở app bớt hẳn một collection phải tải, và kho với doanh thu
    // không bao giờ lệch nhau được nữa.

    // Sync phieu nhap kho (chi trang thai + anh ky, noi dung suy tu transactions)
    const unsubSlips = onSnapshot(
      collection(db, "slips"),
      (snapshot) => {
        setSlips(
          snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as ImportSlip),
        );
        ghiNhanLoiDoc("slips", null);
      },
      (error) => {
        ghiNhanLoiDoc(
          "slips",
          handleFirestoreError(error, OperationType.GET, "slips"),
        );
      },
    );

    /*
     * Bảng gán điểm bán -> đối tác.
     *
     * Nhỏ (vài chục tài liệu) nên tải trọn không đáng kể, và phải có SẴN trước
     * khi người dùng chọn tệp: thiếu nó thì mọi điểm bán đã gán tháng trước lại
     * hiện ra như chưa gán.
     */
    const unsubDiemBan = onSnapshot(
      collection(db, "diem_ban"),
      (snapshot) => {
        setDiemBanOverrides(
          snapshot.docs.map((d) => d.data() as DiemBanEntry),
        );
        ghiNhanLoiDoc("diem_ban", null);
      },
      (error) => {
        ghiNhanLoiDoc(
          "diem_ban",
          handleFirestoreError(error, OperationType.GET, "diem_ban"),
        );
      },
    );

    const unsubHoaDon = onSnapshot(
      collection(db, "hoa_don"),
      (snapshot) => {
        setHoaDon(
          snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as HoaDonGhiNhan),
        );
        ghiNhanLoiDoc("hoa_don", null);
      },
      (error) => {
        ghiNhanLoiDoc(
          "hoa_don",
          handleFirestoreError(error, OperationType.GET, "hoa_don"),
        );
      },
    );

    // Sync User Configs (Only for OWNER)
    let unsubUsers = () => {};
    if (userRole === "OWNER") {
      unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        setAllUserProfiles(
          snapshot.docs.map((d) => ({ ...d.data(), uid: d.id }) as UserProfile),
        );
      });
    }

    // Lenh xuat hoa don SAP: chi CHU SO HUU. Rules cung chi cho OWNER doc, nen
    // dang ky cho ca STAFF se chi sinh loi permission-denied trong console chu
    // khong duoc gi.
    let unsubSapJobs = () => {};
    // Kế toán cũng theo dõi lệnh xuất hóa đơn, không riêng chủ sở hữu.
    if (userRole === "OWNER" || userRole === "KE_TOAN") {
      unsubSapJobs = onSnapshot(
        collection(db, "sap_jobs"),
        (snapshot) => {
          setSapJobs(
            snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as SapJob),
          );
          ghiNhanLoiDoc("sap_jobs", null);
        },
        (error) => {
          ghiNhanLoiDoc(
            "sap_jobs",
            handleFirestoreError(error, OperationType.GET, "sap_jobs"),
          );
        },
      );
    }

    return () => {
      unsubTransactions();
      unsubPartners();
      unsubSlips();
      unsubDiemBan();
      unsubHoaDon();
      unsubUsers();
      unsubSapJobs();
    };
  }, [user, userRole]);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  // --- Lop khoa man hinh bang ma PIN -------------------------------------
  // Chi mo khoa trong pham vi tab hien tai (sessionStorage): dong tab la
  // phai nhap lai. Day la khoa man hinh cho may dung chung, khong phai lop
  // xac thuc thay the dang nhap Google.
  const [pinUnlocked, setPinUnlocked] = useState(
    () => sessionStorage.getItem(PIN_SESSION_KEY) === "1",
  );
  const [pinInput, setPinInput] = useState("");
  const [pinConfirmInput, setPinConfirmInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);

  const unlockSession = () => {
    sessionStorage.setItem(PIN_SESSION_KEY, "1");
    setPinUnlocked(true);
    setPinInput("");
    setPinConfirmInput("");
    setPinError("");
    setPinAttempts(0);
  };

  /** Lan dau: nguoi dung tu dat ma PIN 6 so cho tai khoan cua minh. */
  const handleCreatePin = async () => {
    if (pinBusy) return;
    setPinError("");

    if (!isValidPinFormat(pinInput)) {
      setPinError("Mã PIN phải gồm đúng 6 chữ số.");
      return;
    }
    if (pinInput !== pinConfirmInput) {
      setPinError("Hai lần nhập chưa khớp nhau.");
      return;
    }
    // Chan vai to hop qua de doan
    if (/^(\d)\1{5}$/.test(pinInput) || pinInput === "123456") {
      setPinError("Mã PIN quá dễ đoán. Anh/chị chọn dãy số khác nhé.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setPinError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setPinBusy(true);
    try {
      const pinHash = await hashPin(pinInput, uid);
      await updateDoc(doc(db, "users", uid), {
        pinHash,
        pinUpdatedAt: new Date().toISOString(),
      });
      setCurrentUserProfile((p) => (p ? { ...p, pinHash } : p));
      unlockSession();
      showNotification("Đã thiết lập mã PIN bảo vệ");
    } catch (e: any) {
      setPinError("Không lưu được mã PIN: " + e.message);
    } finally {
      setPinBusy(false);
    }
  };

  const handleVerifyPin = async () => {
    if (pinBusy) return;
    setPinError("");

    const uid = auth.currentUser?.uid;
    const stored = currentUserProfile?.pinHash;
    if (!uid || !stored) return;

    setPinBusy(true);
    try {
      const ok = await verifyPin(pinInput, uid, stored);
      if (ok) {
        unlockSession();
      } else {
        const n = pinAttempts + 1;
        setPinAttempts(n);
        setPinInput("");
        if (n >= 5) {
          // Nhap sai nhieu lan: buoc dang xuat de tranh do PIN
          setPinError("Sai quá 5 lần. Đang đăng xuất để bảo vệ tài khoản...");
          setTimeout(() => handleLogout(), 1200);
        } else {
          setPinError(`Mã PIN không đúng. Còn ${5 - n} lần thử.`);
        }
      }
    } finally {
      setPinBusy(false);
    }
  };

  /**
   * Dang nhap bang tai khoan Google.
   *
   * App khong con giu mat khau nao: Google lo phan xac thuc. Sau khi dang
   * nhap, onAuthStateChanged (o useEffect ben duoi) se lo phan tao ho so va
   * xac dinh vai tro.
   */
  const handleGoogleLogin = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // Nguoi dung tu dong cua so - khong phai loi.
      } else if (code === "auth/unauthorized-domain") {
        setAuthError(
          "Tên miền này chưa được cấp phép trong Firebase. Vào Firebase Console > Authentication > Settings > Authorized domains để thêm.",
        );
      } else if (code === "auth/operation-not-allowed") {
        setAuthError(
          "Chưa bật đăng nhập bằng Google. Vào Firebase Console > Authentication > Sign-in method để bật.",
        );
      } else {
        setAuthError("Đăng nhập thất bại: " + (e?.message || code));
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Loi dang xuat:", e);
    }
    sessionStorage.removeItem(PIN_SESSION_KEY);
    setPinUnlocked(false);
    setUser(null);
    setUserRole("PENDING");
    setCurrentUserProfile(null);
  };

  /* ---------------- Du lieu thu nghiem ---------------- */

  /**
   * Tao du lieu mau de chay thu quy trinh nhap kho -> in phieu -> ky -> duyet.
   *
   * Moi ban ghi deu mang tien to "demo-" trong ma va ghi chu danh dau, nen
   * nut xoa ben duoi go duoc chinh xac va sach se, khong the dung nham vao
   * so lieu that sau nay.
   */
  const DEMO_PREFIX = "demo-";
  const DEMO_NOTE = "DỮ LIỆU THỬ NGHIỆM";
  /**
   * Anh "phieu da ky" cho du lieu thu.
   *
   * Dung anh mau cong khai cua Cloudinary chu khong tai anh that len: du lieu
   * thu se bi xoa, khong nen de lai tep rac tren tai khoan Cloudinary.
   */
  const DEMO_SLIP_PHOTO =
    "https://res.cloudinary.com/demo/image/upload/sample.jpg";
  const [demoBusy, setDemoBusy] = useState(false);

  const demoTransactionCount = useMemo(
    () =>
      transactions.filter((t) => t.id?.startsWith(DEMO_PREFIX)).length +
      revenueData.filter((r) => r.id?.startsWith(DEMO_PREFIX)).length,
    [transactions, revenueData],
  );

  const handleGenerateDemoData = async () => {
    if (!isOwner || demoBusy) return;
    if (
      !confirm(
        "Tạo dữ liệu thử nghiệm: nhập kho 5 ngày gần nhất, kèm phiếu xuất và hóa đơn 3 ngày gần nhất để chạy thử bảng Đối soát?\n\nDữ liệu này được đánh dấu riêng và có thể xoá sạch bằng một nút.",
      )
    )
      return;

    setDemoBusy(true);
    try {
      const supplier =
        partners.find((p) => p.type === "SUPPLIER") || partners[0];
      const batch = writeBatch(db);
      let created = 0;

      /*
       * Ma phieu cua du lieu thu phai KHONG trung ma dang co, ke ca ma tren
       * cac giao dich chua duoc in thanh phieu. Cong don vao mang nay sau moi
       * lan cap de hai ngay lien tiep khong nhan cung mot ma.
       */
      const usedSlipCodes: string[] = [
        ...slips.map((s) => s.code),
        ...transactions.map((t) => t.slipCode || ""),
      ];

      // 5 ngay gan nhat, moi ngay mot luot giao 3-5 loai bia
      for (let dayBack = 4; dayBack >= 0; dayBack--) {
        const day = new Date();
        day.setDate(day.getDate() - dayBack);
        day.setHours(8 + (dayBack % 3), 15, 0, 0);

        const dayStamp = format(day, "ddMM");
        const dateKey = format(day, "yyyy-MM-dd");
        const slipCode = nextSlipCode(dateKey, usedSlipCodes);
        usedSlipCodes.push(slipCode);

        /*
         * Bon ngay truoc da ky -> hang nam trong ton kho, du de chay thu phan
         * xuat kho. HOM NAY co y de CHUA KY, de nhin thay ngay canh "da dien
         * nhung chua vao ton" that su hoat dong.
         */
        const signed = dayBack > 0;
        batch.set(doc(db, "slips", slipCode), {
          id: slipCode,
          code: slipCode,
          date: dateKey,
          status: signed ? "signed" : "printed",
          printedAt: day.toISOString(),
          ...(signed
            ? {
                signedPhotoUrls: [DEMO_SLIP_PHOTO],
                signedAt: day.toISOString(),
                signedBy: currentUserProfile?.email || user || "Demo",
              }
            : {}),
          note: DEMO_NOTE,
          updatedAt: new Date().toISOString(),
        });

        const picked = [...products]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3 + (dayBack % 3));

        picked.forEach((p, idx) => {
          // Bia hoi tinh theo lit, bia lon tinh theo lon
          const qty =
            p.category === "Lít"
              ? Math.round((60 + Math.random() * 240) / 10) * 10
              : Math.round((48 + Math.random() * 200) / 24) * 24;

          const id = `${DEMO_PREFIX}in-${format(day, "yyyyMMdd")}-${p.id}-${idx}`;
          batch.set(doc(db, "transactions", id), {
            id,
            date: day.toISOString(),
            type: "IN",
            productId: p.id,
            productName: p.name,
            category: p.category,
            quantity: qty,
            partnerId: supplier?.id || "",
            partnerName: supplier?.name || "",
            batchNumber: `LOT-${dayStamp}-${p.category === "Lít" ? "H" : "L"}`,
            notes: DEMO_NOTE,
            createdBy: currentUserProfile?.name || user || "Demo",
            status: "completed",
            slipCode,
          });
          created++;
        });
      }

      /* ---- Phiếu xuất + hóa đơn để chạy thử bảng ĐỐI SOÁT ----
       *
       * Cố ý dựng đủ các trạng thái để nhìn là biết bảng có chạy đúng không:
       *   SP thứ 1: xuất và ra hóa đơn khớp        -> "Khớp"
       *   SP thứ 2: hóa đơn chỉ 85% lượng xuất     -> "Thiếu hóa đơn"
       *   SP thứ 3: xuất mà không có hóa đơn nào   -> "Chưa có hóa đơn"
       *   thêm 1 hóa đơn tên hàng không có trong danh mục -> "Chưa khớp danh mục"
       */
      const buyer =
        partners.find((p) => p.type === "AGENT" || p.type === "RESTAURANT") ||
        partners.find((p) => p.type !== "SUPPLIER") ||
        partners[0];

      // Chỉ xuất những sản phẩm có dung tích, để số lít có nghĩa
      const sellable = products.filter((p) => (p.capacityPerUnit || 0) > 0);

      for (let dayBack = 2; dayBack >= 0; dayBack--) {
        const day = new Date();
        day.setDate(day.getDate() - dayBack);
        day.setHours(14, 30, 0, 0);
        const stamp = format(day, "yyyyMMdd");

        sellable.slice(0, 3).forEach((p, idx) => {
          const qty =
            p.category === "Lít"
              ? Math.round((40 + Math.random() * 120) / 10) * 10
              : Math.round((24 + Math.random() * 96) / 24) * 24;

          const txId = `${DEMO_PREFIX}out-${stamp}-${p.id}-${idx}`;
          batch.set(doc(db, "transactions", txId), {
            id: txId,
            date: day.toISOString(),
            type: "OUT",
            productId: p.id,
            productName: p.name,
            category: p.category,
            quantity: qty,
            partnerId: buyer?.id || "",
            partnerName: buyer?.name || "",
            notes: DEMO_NOTE,
            createdBy: currentUserProfile?.name || user || "Demo",
            status: "completed",
          });
          created++;
        });
      }

      /*
       * Không sinh dòng doanh thu thử nghiệm nữa.
       *
       * Doanh thu nay tính thẳng từ xuất kho, nên chỉ cần các giao dịch OUT ở
       * trên là bảng doanh thu tự có số. Ghi thêm tài liệu vào collection
       * `revenue` chỉ tạo ra rác không ai đọc.
       */

      await batch.commit();
      showNotification(`Đã tạo ${created} giao dịch thử nghiệm`);
    } catch (e: any) {
      alert("Không tạo được dữ liệu thử: " + e.message);
    } finally {
      setDemoBusy(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!isOwner || demoBusy) return;

    const demoTx = transactions.filter((t) => t.id?.startsWith(DEMO_PREFIX));
    /*
     * Nhan dien phieu thu bang GHI CHU danh dau va bang chinh ma phieu tren
     * cac giao dich thu — khong nhan dien theo NGAY nua. Truoc day loc theo
     * ngay: neu ngay do co ca hang that thi nut xoa se xoa luon anh ky cua
     * hang that, tuc la lam hang that roi khoi ton kho.
     */
    const demoSlipCodes = new Set(
      demoTx.map((t) => t.slipCode).filter((c): c is string => !!c),
    );
    const demoSlips = slips.filter(
      (s) => s.note === DEMO_NOTE || demoSlipCodes.has(s.code),
    );

    if (demoTx.length === 0 && demoSlips.length === 0) {
      showNotification("Không có dữ liệu thử nghiệm nào để xoá");
      return;
    }

    if (
      !confirm(
        `Xoá ${demoTx.length} giao dịch thử nghiệm và ${demoSlips.length} phiếu liên quan?\n\nDữ liệu thật KHÔNG bị ảnh hưởng.`,
      )
    )
      return;

    setDemoBusy(true);
    try {
      const batch = writeBatch(db);
      demoTx.forEach((t) => batch.delete(doc(db, "transactions", t.id)));
      demoSlips.forEach((s) => batch.delete(doc(db, "slips", s.id)));
      await batch.commit();
      showNotification("Đã xoá sạch dữ liệu thử nghiệm");
    } catch (e: any) {
      alert("Không xoá được: " + e.message);
    } finally {
      setDemoBusy(false);
    }
  };

  const handleHardReset = async () => {
    if (!isOwner) return;

    const confirmReset = window.confirm(
      `Xoá sạch ${transactions.length} giao dịch và ${slips.length} phiếu nhập kho (kèm ảnh phiếu đã ký)?\n\nĐối tác và danh mục sản phẩm được giữ lại.\n\nKhông khôi phục lại được.`,
    );

    if (!confirmReset) return;

    try {
      setLoading(true);

      /*
       * XOÁ CẢ PHIẾU NHẬP KHO, không riêng giao dịch.
       *
       * Bản trước chỉ xoá `transactions`, để nguyên `slips`. Mà ảnh tờ phiếu
       * đã ký lại nằm ở `slips`, nên "dọn sạch" xong thư viện ảnh vẫn đầy ảnh
       * nhập kho, và tab Phiếu nhập còn lại một đống phiếu mồ côi không còn
       * dòng hàng nào bên dưới. Sạch một nửa còn khó hiểu hơn không dọn.
       *
       * Ảnh trên Cloudinary CỐ Ý không xoá theo: đó là chứng từ đã ký, giữ lại
       * còn dấu vết nếu sau này cần tra. Chỉ bỏ liên kết trong cơ sở dữ liệu.
       */
      const canXoa: [string, string][] = [
        ...transactions.filter((t) => t.id).map((t) => ["transactions", t.id] as [string, string]),
        ...slips.filter((s) => s.id).map((s) => ["slips", s.id] as [string, string]),
      ];

      if (canXoa.length === 0) {
        showNotification("Hệ thống hiện tại đã ở trạng thái sạch.");
        setLoading(false);
        return;
      }

      /*
       * Chia lô 400. Một `writeBatch` chỉ nhận tối đa 500 thao tác — nhồi hết
       * vào một lô thì kho đã chạy vài tháng là lệnh dọn hỏng thẳng, đúng lúc
       * người dùng tin là nó đã chạy.
       */
      const CHUNK = 400;
      for (let i = 0; i < canXoa.length; i += CHUNK) {
        const batch = writeBatch(db);
        canXoa.slice(i, i + CHUNK).forEach(([kho, id]) => {
          batch.delete(doc(db, kho, id));
        });
        await batch.commit();
      }

      /*
       * Không xoá doanh thu ở đây: doanh thu là số tính từ giao dịch, xoá hết
       * giao dịch ở trên là doanh thu về 0 theo. Số cũ còn sót lại từ thời nạp
       * file Excel thì dọn bằng nút "Dọn số cũ" trong tab Doanh thu.
       */

      setLoading(false);
      showNotification(
        `Đã xoá ${transactions.length} giao dịch và ${slips.length} phiếu`,
      );
    } catch (error) {
      console.error("Hard Reset Error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("unavailable")) {
        alert(
          "LỖI KẾT NỐI: Tin không thể kết nối tới máy chủ Firestore. Anh hãy thử tải lại trang (F5) hoặc kiểm tra lại mạng nhé.",
        );
      } else {
        alert(
          "Có lỗi xảy ra khi dọn dẹp. Anh kiểm tra lại xem đã đăng nhập đúng chưa nhé.",
        );
      }
      setLoading(false);
    }
  };

  const handleRestorePartners = async () => {
    if (!isOwner) return;

    if (
      !window.confirm(
        "Tin Tin sẽ giúp anh khôi phục lại toàn bộ danh sách Đối tác (SKB, APC, BNG, Capella...) vào hệ thống. Anh đồng ý chứ?",
      )
    )
      return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      INITIAL_PARTNERS.forEach((p) => {
        batch.set(doc(db, "partners", p.id), p);
      });
      await batch.commit();
      setLoading(false);
      showNotification("Khôi phục danh sách Đối tác thành công");
    } catch (error) {
      alert(handleFirestoreError(error, OperationType.WRITE, "partners"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * ĐỒNG BỘ DANH MỤC ĐƠN VỊ TỪ CODE VÀO FIRESTORE.
   *
   * Danh mục đơn vị sống ở Firestore, còn `INITIAL_PARTNERS` trong code là bản
   * chuẩn. Sửa code mà không ghi xuống thì app hiện đơn vị không có thật, và
   * mã bộ phận SAP tra ra rỗng khi kết xuất file công nợ.
   *
   * Chỉ GHI THÊM và GHI ĐÈ, không xoá gì: đơn vị cũ có thể đang được giao dịch
   * đã lưu trỏ tới, xoá đi là báo cáo mất tên đối tác mà không có gì báo. Đơn
   * vị lạ còn lại thì liệt kê ra để người dùng tự quyết.
   */
  const handleSyncPartners = async () => {
    if (!isOwner) {
      alert("Chỉ chủ sở hữu mới cập nhật được danh mục đơn vị ạ!");
      return;
    }
    const la = partners.filter(
      (p) => !INITIAL_PARTNERS.some((q) => q.id === p.id),
    );
    if (
      !window.confirm(
        `Cập nhật ${INITIAL_PARTNERS.length} đơn vị từ danh mục chuẩn vào hệ thống?\n\n` +
          `${donViThieu.length} đơn vị còn thiếu sẽ được thêm.\n` +
          (la.length
            ? `${la.length} đơn vị không có trong danh mục chuẩn sẽ được GIỮ NGUYÊN: ${la.map((p) => p.name).join(", ")}`
            : `Không có đơn vị lạ nào.`),
      )
    )
      return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      INITIAL_PARTNERS.forEach((p) => batch.set(doc(db, "partners", p.id), p));
      await batch.commit();
      showNotification(
        `Đã cập nhật ${INITIAL_PARTNERS.length} đơn vị vào hệ thống`,
      );
    } catch (e: any) {
      alert(handleFirestoreError(e, OperationType.WRITE, "partners"));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Nap nhanh xuat kho tu file BBGN ---------------- */

  /**
   * Ghi TỒN ĐẦU KỲ và HÀNG NHẬP đọc được từ sheet "T Kho".
   *
   * Phải chạy TRƯỚC phần xuất trong cùng một lượt: xuất trừ tồn theo lô, mà lô
   * chỉ sinh ra từ giao dịch nhập. Nạp mỗi phần xuất thì mọi dòng đều báo vượt
   * tồn — đúng cảnh gặp khi dữ liệu vừa bị dọn sạch.
   *
   * Hai loại này CỐ Ý không cần chữ ký (không gán `slipCode`): tồn đầu kỳ là số
   * khai lúc dựng sổ, còn số nhập từ file là việc đồng bộ số liệu — cả hai đều
   * không có lượt giao nhận nào để hai bên ký. Xem `src/lib/slip.ts`.
   *
   * Khoá cũng suy từ nội dung như phần xuất, nên nạp lại cùng một sheet là ghi
   * đè chứ không cộng thêm.
   */
  const handleCreateNhapFromTkho = async (
    drafts: TkhoNhapDraft[],
  ): Promise<{ productId: string; batchNumber: string; quantity: number; date: string }[]> => {
    if (!drafts.length) return [];

    const khoa = (d: TkhoNhapDraft) =>
      "tkho-" +
      stableHash([d.dateKey, d.type, d.productId].join("|"));

    const prefixes = new Set(drafts.map((d) => khoa(d)));
    const canXoa = transactions.filter((t) =>
      [...prefixes].some((p) => t.id === p),
    );

    const CHUNK = 400;
    let batch = writeBatch(db);
    let opCount = 0;
    const nhaCungCap =
      partners.find((p) => p.type === "SUPPLIER") || partners[0];

    for (const t of canXoa) {
      batch.delete(doc(db, "transactions", t.id));
      opCount++;
      if (opCount >= CHUNK) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    const loMoi: { productId: string; batchNumber: string; quantity: number; date: string }[] = [];

    for (const d of drafts) {
      const product = products.find((p) => p.id === d.productId);
      if (!product) continue;
      const id = khoa(d);
      const date = `${d.dateKey}T07:00:00.000Z`;
      const transaction: Transaction = {
        id,
        date,
        type: d.type,
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: d.quantity,
        partnerId: nhaCungCap?.id || "",
        partnerName: nhaCungCap?.name || "",
        notes:
          d.type === "OPENING"
            ? "Tồn đầu kỳ · nạp từ file BBGN"
            : "Nhập kho · nạp từ file BBGN",
        batchNumber: d.batchNumber,
        evidencePhotoUrls: [],
        createdBy: user || "Guest",
        status: "completed",
      };
      batch.set(doc(db, "transactions", id), transaction);
      loMoi.push({
        productId: product.id,
        batchNumber: d.batchNumber,
        quantity: d.quantity,
        date,
      });
      opCount++;
      if (opCount >= CHUNK) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    if (opCount > 0) await batch.commit();
    return loMoi;
  };

  /**
   * Lưu phần gán điểm bán để tháng sau khỏi gán lại.
   *
   * Khoá tài liệu là TÊN ĐÃ CHUẨN HOÁ, không phải khoá tự sinh: gán lại cùng
   * một điểm bán thì ghi đè lên chính nó, không đẻ ra bản thứ hai trỏ tới hai
   * đối tác khác nhau.
   */
  const handleSaveDiemBan = async (entries: DiemBanEntry[]) => {
    if (!entries.length) return;
    try {
      const batch = writeBatch(db);
      entries.forEach((e) => {
        const key = normalizeDiemBan(e.ten);
        if (!key) return;
        batch.set(doc(db, "diem_ban", key), {
          ten: e.ten,
          partnerId: e.partnerId,
          note: e.note || "",
          updatedAt: new Date().toISOString(),
          updatedBy: currentUserProfile?.email || user || "",
        });
      });
      await batch.commit();
      showNotification(`Đã lưu ${entries.length} điểm bán`);
    } catch (e: any) {
      alert(handleFirestoreError(e, OperationType.WRITE, "diem_ban"));
    }
  };

  /**
   * Ghi hang loat giao dich xuat kho doc duoc tu file BBGN cua bo phan.
   *
   * Van chay qua FIFO nhu nhap tay tung dong, khong di duong tat: neu bo qua
   * buoc nay thi so lo tren giao dich se trong, va bao cao ton theo lo se
   * lech ngay. Moi (ngay + don vi) duoc coi la mot phieu -> chung mot
   * referenceGroupId, dung nhu khi nhap tay nhieu mat hang cung luc.
   *
   * MAC DINH DUA QUA DON DI DUONG (`in_transit`).
   *
   * Truoc day ghi thang 'completed' voi ly do file BBGN la bien ban da ky. Nay
   * quy trinh doi: nap file xong thi don nam cho o tab Don di duong, nguoi phu
   * trach tai anh bien ban len roi bam hoan tat, luc do moi ghi nhan vao xuat
   * kho. Giong het duong dien tay, chi khac la so lieu den tu file.
   *
   * TON KHO VAN TRU NGAY tu luc nap, khong cho anh: hang roi kho la roi kho.
   * Rieng doanh thu va cong no thi chua tinh, vi `billableTransactions()` bo
   * qua don dang di duong - dung nghia, chua giao xong thi chua phai mot lan
   * ban.
   *
   * `quaDiDuong=false` thi ghi thang nhu cu, dung khi nap bu ky da chot xong.
   */
  const handleCreateFromBbgn = async (
    drafts: BbgnDraft[],
    /** Lô nhập vừa ghi trong cùng lần chạy, FIFO phải thấy chúng. */
    loMoi: { productId: string; batchNumber: string; quantity: number; date: string }[] = [],
    quaDiDuong: boolean = true,
  ) => {
    if (!drafts.length || loading) return;

    // Đếm trước số dòng của lần nạp trước sẽ bị ghi đè, để người bấm biết đây
    // là nạp lại hay nạp mới — con số này là khác biệt giữa "cộng thêm" và
    // "thay thế", và nhầm chỗ đó là tồn kho sai gấp đôi.
    const daCoTruoc = transactions.filter((t) =>
      drafts.some((d) =>
        t.id?.startsWith(
          "bbgn-" +
            stableHash(
              [d.dateKey, d.partnerId, d.productId, d.outlet || ""].join("|"),
            ) +
            "-",
        ),
      ),
    ).length;

    const soDon = new Set(drafts.map((d) => `${d.dateKey}|${d.partnerId}`)).size;

    if (
      !window.confirm(
        `Nạp ${drafts.length} dòng xuất kho từ file BBGN, gom thành ${soDon} đơn?\n\n` +
          (quaDiDuong
            ? `${soDon} đơn sẽ nằm ở tab ĐƠN ĐI ĐƯỜNG. Tải ảnh biên bản rồi bấm hoàn tất thì mới ghi nhận vào xuất kho.\n\n`
            : `Ghi thẳng vào xuất kho, không qua bước ảnh.\n\n`) +
          `Số lượng trừ vào tồn kho ngay, theo lô nhập trước xuất trước.\n\n` +
          (daCoTruoc
            ? `${daCoTruoc} dòng của lần nạp trước sẽ được GHI ĐÈ, không cộng thêm.`
            : `Chưa có dòng nào của kỳ này trên hệ thống.`),
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // Ban sao ton theo lo de FIFO "nhin thay" phan da bi tru trong cung lan chay
      const localBatches = batches.map((b) => ({ ...b }));

      /*
       * Ghép lô vừa nhập trong CÙNG lần chạy vào bản sao tồn theo lô.
       *
       * Không chờ được Firestore bắn dữ liệu về: tồn theo lô suy từ state, mà
       * state chỉ đổi ở lần dựng lại sau. Nếu chỉ dựa vào nó thì nạp cả tháng
       * trong một lượt sẽ thấy tồn bằng 0 và báo vượt tồn toàn bộ.
       */
      loMoi.forEach((lo) => {
        const co = localBatches.find(
          (bb) => bb.batchNumber === lo.batchNumber && bb.productId === lo.productId,
        );
        if (co) co.stock += lo.quantity;
        else {
          const sp = products.find((pp) => pp.id === lo.productId);
          localBatches.push({
            batchNumber: lo.batchNumber,
            productId: lo.productId,
            productName: sp?.name || lo.productId,
            category: sp?.category || "Lít",
            stock: lo.quantity,
            importDate: lo.date,
          });
        }
      });
      localBatches.sort((x, y) => (x.importDate || "").localeCompare(y.importDate || ""));
      const groupIds = new Map<string, string>();
      let seq = 0;
      let shortfall = 0;

      /*
       * KHOA GIAO DICH SUY TU NOI DUNG, KHONG TU Date.now().
       *
       * Ban cu dat khoa la `bbgn-${Date.now()}-${seq}`, nen nap lai dung mot
       * tep la sinh ra mot bo giao dich hoan toan moi: ton kho bi tru hai lan,
       * va vi doanh thu nay sinh tu xuat kho nen doanh thu cung nhan doi.
       */
      const khoaGoc = (d: BbgnDraft) =>
        "bbgn-" +
        stableHash(
          [d.dateKey, d.partnerId, d.productId, d.outlet || ""].join("|"),
        );

      /*
       * MOT DIEM BAN CO THE NHAN NHIEU LAN TRONG CUNG MOT NGAY.
       *
       * Truoc day o day tin rang moi (ngay, diem ban, mat hang) chi co dung
       * MOT o trong sheet. Khong dung: tep "BBGN Bia T8" co "NH 1901" nam o
       * hai cot khac nhau cung ngay 21.08 - hai chuyen giao rieng. Bon truong
       * tren sinh ra khoa GIONG HET NHAU, nen dong sau ghi de dong truoc va
       * so lieu am tham bay mat. Rieng tep T8: 7 o trung, mat 762,2 lit tren
       * tong 6.882,2 - hon 11%, ma khong co canh bao nao.
       *
       * Nay them so lan xuat hien vao khoa. Thu tu cac o do `parseTkhoXuat`
       * duyet tu trai sang phai nen on dinh: nap lai cung tep ra dung khoa cu,
       * van khong nhan doi.
       *
       * Van xoa duoc dong cu: phan don o duoi xoa theo tien to `khoaGoc(d)-`,
       * ma tien to do bao trum moi so lan.
       */
      // Bộ khoá dựng sẵn cho cả lượt, bằng `danhKhoaBbgn()` trong lib để chạy
      // thử được — chính chỗ này từng làm mất 11% số liệu nên không để logic
      // nằm chìm trong màn hình nữa.
      const khoaDong = danhKhoaBbgn(drafts, stableHash);
      let viTri = -1;

      // Các chuyến của từng (ngày × đơn vị), xếp theo thứ tự cột trong sheet.
      const chuyenTrongNgay = new Map<string, number[]>();
      drafts.forEach((d) => {
        const k = `${d.dateKey}|${d.partnerId}`;
        const ds = chuyenTrongNgay.get(k) || [];
        if (!ds.includes(d.cot ?? -1)) {
          ds.push(d.cot ?? -1);
          ds.sort((a, b) => a - b);
        }
        chuyenTrongNgay.set(k, ds);
      });

      /*
       * Doi khi tep duoc sua lai roi nap de. Mot lan xuat co the tach thanh so
       * lo khac lan truoc (3 lo -> 2 lo), va dong lo thu ba cua lan truoc se
       * nam lai lam ton kho bi tru thua. Nen phai don sach cac dong cu cua
       * chinh nhung lan xuat sap ghi, truoc khi ghi.
       */
      const prefixes = new Set(drafts.map((d) => khoaGoc(d) + "-"));
      const canXoa = transactions.filter((t) =>
        [...prefixes].some((p) => t.id?.startsWith(p)),
      );

      // Firestore gioi han 500 thao tac moi batch — chia lo de khong vuot
      const CHUNK = 400;
      let batch = writeBatch(db);
      let opCount = 0;

      for (const t of canXoa) {
        batch.delete(doc(db, "transactions", t.id));
        opCount++;
        if (opCount >= CHUNK) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      for (const d of drafts) {
        // Tăng trước mọi nhánh thoát, để chỉ số luôn khớp với `khoaDong`.
        viTri++;
        const product = products.find((p) => p.id === d.productId);
        if (!product) continue;

        // MỘT CHUYẾN GIAO LÀ MỘT ĐƠN. Cột trong sheet chính là chuyến: cùng
        // ngày mà một điểm bán nhận hai chuyến thì sheet ghi hai cột, và đó là
        // hai biên bản riêng, hai lần ký riêng — phải tải được ảnh riêng.
        const groupKey = `${d.dateKey}|${d.partnerId}|${d.cot ?? -1}`;
        if (!groupIds.has(groupKey)) {
          groupIds.set(groupKey, "multi-" + stableHash(groupKey));
        }
        const referenceGroupId = groupIds.get(groupKey)!;

        /*
         * Đánh số chuyến khi một điểm bán nhận nhiều lần trong cùng ngày.
         *
         * Không có số này thì hai đơn của "BNC · 1901" ngày 21.08 hiện ra
         * giống hệt nhau trên tab Đơn đi đường — cùng ngày, cùng đơn vị, cùng
         * ghi chú — và người tải ảnh không biết tờ biên bản trong tay là của
         * đơn nào. Chỉ đánh số khi thật sự có nhiều hơn một chuyến, để ngày
         * bình thường không bị thêm chữ thừa.
         */
        const soChuyen = chuyenTrongNgay.get(`${d.dateKey}|${d.partnerId}`)!;
        const thuTuChuyen = soChuyen.indexOf(d.cot ?? -1) + 1;

        const noteParts = [
          soChuyen.length > 1
            ? `Chuyến ${thuTuChuyen}/${soChuyen.length}`
            : "",
          d.outlet ? `Điểm nhận: ${d.outlet}` : "",
          d.note,
          "Nạp từ file BBGN",
        ].filter(Boolean);

        const allocations = getFIFOAllocations(
          product.id,
          d.quantity,
          localBatches,
        );

        for (let i = 0; i < allocations.length; i++) {
          const alloc = allocations[i];
          if (alloc.batchNumber === "VUOT_DINH_MUC") shortfall++;

          const id = `${khoaDong[viTri]}-${i}`;
          seq++;
          const transaction: Transaction = {
            id,
            date: `${d.dateKey}T08:00:00.000Z`,
            type: "OUT",
            productId: product.id,
            productName: product.name,
            category: product.category,
            quantity: alloc.quantity,
            partnerId: d.partnerId,
            partnerName: d.partnerName,
            notes:
              allocations.length > 1
                ? `[Lô ${i + 1}/${allocations.length}] ${noteParts.join(" · ")}`
                : noteParts.join(" · "),
            batchNumber: alloc.batchNumber,
            evidencePhotoUrls: [],
            createdBy: user || "Guest",
            referenceGroupId,
            status: quaDiDuong ? "in_transit" : "completed",
            originalQuantity: alloc.quantity,
          };

          batch.set(doc(db, "transactions", id), transaction);
          opCount++;
          if (opCount >= CHUNK) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      if (opCount > 0) await batch.commit();

      // Đưa thẳng người dùng tới nơi có việc phải làm tiếp, không để họ tự dò.
      if (quaDiDuong) {
        setActiveTab("in-transit");
        showNotification(
          `Đã nạp ${seq} dòng thành ${soDon} đơn — đang chờ ảnh ở tab Đơn đi đường`,
        );
      } else {
        showNotification(`Đã ghi ${seq} dòng thẳng vào xuất kho`);
      }
      if (shortfall > 0) {
        alert(
          `Đã ghi xong, nhưng có ${shortfall} dòng xuất vượt tồn kho hiện có ` +
            `(đánh dấu lô VUOT_DINH_MUC).\n\nThường là do chưa nhập kho phần ` +
            `hàng tương ứng. Anh kiểm tra lại phần nhập trước rồi sửa các dòng này.`,
        );
      }
      setActiveTab("history");
    } catch (e: any) {
      alert(handleFirestoreError(e, OperationType.WRITE, "transactions"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ghi lại số hóa đơn thật cho một hoặc nhiều (đợt × đơn vị).
   *
   * Khoá tài liệu suy từ biên đợt và mã BP nên điền lại là ghi đè lên chính
   * nó, không sinh bản trùng. Ghi cả tên đơn vị lúc điền để sau này đọc sổ
   * không phải tra ngược mã.
   */
  const handleSaveHoaDon = async (ds: HoaDonGhiNhan[]) => {
    if (!ds.length) return;
    try {
      const batch = writeBatch(db);
      const luc = new Date().toISOString();
      ds.forEach((h) => {
        batch.set(
          doc(db, "hoa_don", h.id),
          {
            ...h,
            updatedAt: luc,
            updatedBy: currentUserProfile?.email || user || "",
          },
          { merge: true },
        );
      });
      await batch.commit();
      showNotification(`Đã lưu ${ds.length} số hóa đơn`);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "hoa_don"));
    }
  };

  /* ---------------- Phieu nhap kho ---------------- */

  /** Danh dau phieu da duoc in (de biet phieu nao dang cho ky). */
  const handleMarkSlipPrinted = async (code: string, dateKey: string) => {
    try {
      const existing = slips.find((s) => s.code === code);
      await setDoc(
        doc(db, "slips", code),
        {
          id: code,
          code,
          date: dateKey,
          // Da co anh ky roi thi giu nguyen trang thai, in lai khong ha cap
          status: existing?.signedPhotoUrls?.length ? "signed" : "printed",
          printedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (e) {
      /*
       * KHÔNG chặn việc in — giấy vẫn phải ra để hai bên ký. Nhưng PHẢI nói.
       *
       * Bản trước chỉ ghi vào console rồi thôi. Người dùng in xong, tưởng hệ
       * thống đã biết phiếu này đang chờ ký, trong khi Firestore chưa nhận gì
       * cả. Việc âm thầm không lưu được mà vẫn để người ta đi tiếp là kiểu sai
       * khó lần ra nhất.
       */
      showNotification(
        `In được nhưng CHƯA ghi được trạng thái phiếu ${code}. ` +
          handleFirestoreError(e, OperationType.WRITE, "slips"),
        "error",
      );
    }
  };

  /** Tai anh to phieu da ky tuoi len Cloudinary roi gan vao phieu. */
  const handleUploadSignedSlip = async (
    code: string,
    dateKey: string,
    files: FileList,
  ) => {
    if (uploadingSlipCode) return;
    setUploadingSlipCode(code);

    /*
     * HAI BƯỚC, HAI NHÁNH BẮT LỖI RIÊNG.
     *
     * Bước 1 đẩy ảnh lên Cloudinary, bước 2 ghi liên kết vào Firestore. Trước
     * đây cả hai nằm chung một `try` và mọi lỗi đều báo "Không tải được ảnh
     * phiếu" — kể cả khi ảnh đã lên Cloudinary thành công và chỉ có bước ghi
     * Firestore bị từ chối quyền. Hai sự cố khác hẳn nhau, cách xử lý cũng
     * khác hẳn, mà lại đọc ra cùng một câu.
     *
     * Đây là bước DUYỆT SỐ LIỆU: có ảnh ký thì hàng mới vào tồn kho. Ghi hỏng
     * mà báo mơ hồ thì người dùng tưởng đã duyệt xong.
     */
    let urls: string[];
    try {
      urls = [];
      for (const file of Array.from(files)) {
        // Nen truoc khi day len: anh dien thoai 4-8 MB deu ve vai tram KB,
        // van du net doc chu so viet tay ma tiet kiem dung luong Cloudinary.
        const compressed = await compressFile(file, 2000, 2000, 0.85);
        urls.push(await uploadToCloudinary(compressed));
      }
    } catch (e: any) {
      setUploadingSlipCode(null);
      alert(
        "Không tải được ảnh lên kho ảnh (Cloudinary): " +
          (e?.message || "lỗi không rõ"),
      );
      return;
    }

    try {
      const existing = slips.find((s) => s.code === code);
      const merged = [...(existing?.signedPhotoUrls || []), ...urls];

      await setDoc(
        doc(db, "slips", code),
        {
          id: code,
          code,
          date: dateKey,
          status: "signed",
          signedPhotoUrls: merged,
          signedAt: new Date().toISOString(),
          signedBy: currentUserProfile?.email || user || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      showNotification(`Đã lưu ảnh phiếu ${code} — hàng đã vào tồn kho`);
    } catch (e: any) {
      alert(
        `Ảnh đã lên kho ảnh nhưng CHƯA ghi được vào phiếu ${code}, nên hàng chưa vào tồn kho.\n\n` +
          handleFirestoreError(e, OperationType.WRITE, "slips"),
      );
    } finally {
      setUploadingSlipCode(null);
    }
  };

  /**
   * Go mot anh da tai nham khoi phieu.
   *
   * Anh ky la chung tu duyet so lieu, nen go anh la viec he trong: go het anh
   * thi phieu quay ve chua duyet, va toan bo so luong tren phieu do RA KHOI
   * ton kho ngay lap tuc. Chi lam khi tai nham to phieu.
   *
   * Chi xoa lien ket trong Firestore, KHONG xoa file tren Cloudinary — de con
   * dau vet neu can tra lai ve sau.
   */
  const handleRemoveSignedSlipPhoto = async (code: string, url: string) => {
    const existing = slips.find((s) => s.code === code);
    if (!existing) return;

    const remaining = (existing.signedPhotoUrls || []).filter((u) => u !== url);

    try {
      await updateDoc(doc(db, "slips", code), {
        signedPhotoUrls: remaining,
        status: remaining.length ? "signed" : existing.printedAt ? "printed" : "draft",
        updatedAt: new Date().toISOString(),
      });
      showNotification(
        remaining.length
          ? `Đã gỡ 1 ảnh khỏi phiếu ${code}`
          : `Phiếu ${code} không còn ảnh ký — hàng trên phiếu đã ra khỏi tồn kho`,
      );
    } catch (e: any) {
      alert(handleFirestoreError(e, OperationType.WRITE, "slips"));
    }
  };

  /* ---------------- Xuat hoa don len SAP ---------------- */

  /**
   * Cac dong co the len hoa don.
   *
   * Nguon la XUAT KHO chu khong phai bang doanh thu: xuat kho la goc, doanh thu
   * sinh ra tu do. Lay tu bang doanh thu thi thanh vong tron - doanh thu la ket
   * qua cua viec xuat hoa don, khong phai dau vao.
   */
  const sapSourceRows = useMemo<SapSourceRow[]>(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    return billableTransactions(transactions).map((t) =>
      transactionToSapRow(t, productMap.get(t.productId)),
    );
  }, [transactions, products]);

  /** Tai tep .json cho script tren may doc. */
  const downloadSapJobFile = (job: SapJob) => {
    const byId = new Map(sapSourceRows.map((r) => [r.id, r]));
    const rows = job.sourceIds
      .map((id) => byId.get(id))
      .filter((r): r is SapSourceRow => !!r);

    if (rows.length !== job.sourceIds.length) {
      // Dong goc bi xoa sau khi tao lenh. Van cho tai phan con lai, nhung phai
      // noi ro, vi tep thieu dong thi hoa don xuat ra cung thieu.
      const missing = job.sourceIds.length - rows.length;
      if (
        !window.confirm(
          `${missing} dòng trong lệnh này không còn trong dữ liệu doanh thu (đã bị xoá hoặc sửa khoá).\n\nTệp tải về sẽ THIẾU ${missing} dòng so với lúc tạo lệnh. Vẫn tải?`,
        )
      )
        return;
    }

    const file = buildSapJobFile({
      jobId: job.id,
      createdAt: job.createdAt,
      createdBy: job.createdBy,
      from: job.period.from,
      to: job.period.to,
      rows,
    });

    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = job.fileName || sapJobFileName(job.id, job.period.from, job.period.to);
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Tao mot lenh xuat.
   *
   * Khoa tai lieu suy ra tu chinh tap dong (xem sapJobId) nen bam hai lan lien
   * tiep khong tao hai lenh — lan thu hai ghi vao dung tai lieu cu. Neu de
   * Firestore tu sinh khoa thi mot cai bam doi se thanh hai lenh, va hai lenh do
   * cung xuat mot tap dong ra hai bo hoa don.
   */
  const handleCreateSapJob = async (
    from: string,
    to: string,
    rows: SapSourceRow[],
  ) => {
    if (!isOwner || sapBusy || rows.length === 0) return;

    const summary = summarizeSapRows(rows);
    if (summary.missingMaterialCode > 0) {
      alert(
        `${summary.missingMaterialCode} dòng thiếu mã vật tư. SAP khớp mặt hàng bằng mã chứ không bằng tên, nên phải sửa trước khi xuất.`,
      );
      return;
    }

    if (
      !window.confirm(
        `Tạo lệnh xuất hóa đơn cho kỳ ${from} → ${to}?\n\n` +
          `${formatNumber(summary.count)} dòng xuất kho · ${formatNumber(summary.partnerCount)} khách hàng\n` +
          `Tiền tạm tính theo giá danh mục: ${formatNumber(summary.totalBeforeVat)} đ\n` +
          `(SAP tính lại theo giá hợp đồng và tự tính thuế)\n\n` +
          `App chỉ tạo lệnh và tải tệp về máy. Việc nạp lên SAP và bấm Duyệt vẫn do anh làm.`,
      )
    )
      return;

    setSapBusy(true);
    try {
      const sourceIds = rows.map((r) => r.id);
      const id = sapJobId(sourceIds);
      const now = new Date().toISOString();
      const job: SapJob = {
        id,
        status: "queued",
        createdAt: now,
        createdBy: currentUserProfile?.email || user || "",
        updatedAt: now,
        period: { from, to },
        sourceIds,
        summary,
        fileName: sapJobFileName(id, from, to),
      };

      await setDoc(doc(db, "sap_jobs", id), job);
      downloadSapJobFile(job);
      showNotification(
        `Đã tạo lệnh ${formatNumber(summary.count)} dòng và tải tệp về máy`,
      );
    } catch (e: any) {
      alert(handleFirestoreError(e, OperationType.WRITE, "sap_jobs"));
    } finally {
      setSapBusy(false);
    }
  };

  /**
   * Doi trang thai mot lenh xuat.
   *
   * Chan bang canTransition chu khong tin vao viec giao dien co hien nut hay
   * khong: nut co the bam nhanh hai lan, hoac hai nguoi mo cung mot man hinh.
   */
  const handleChangeSapJobStatus = async (
    job: SapJob,
    next: SapJobStatus,
    note?: string,
  ) => {
    if (!isOwner || sapBusy) return;

    if (!canTransition(job.status, next)) {
      alert(
        `Không chuyển được lệnh này từ "${job.status}" sang "${next}". Có thể ai đó vừa cập nhật, thử tải lại trang.`,
      );
      return;
    }

    setSapBusy(true);
    try {
      const patch: Record<string, unknown> = {
        status: next,
        updatedAt: new Date().toISOString(),
      };
      if (note !== undefined) patch.note = note;
      if (next === "done") {
        patch.approvedBy = currentUserProfile?.email || user || "";
        patch.approvedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, "sap_jobs", job.id), patch);
      showNotification(`Lệnh xuất: ${SAP_JOB_STATUS_LABEL[next]}`);
    } catch (e: any) {
      alert(handleFirestoreError(e, OperationType.WRITE, "sap_jobs"));
    } finally {
      setSapBusy(false);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  /*
   * Xuất báo cáo ra Excel — dùng `taoSheetDep` để có kẻ ô, tô màu, bề rộng cột
   * và dòng tổng. Trước đây dùng `json_to_sheet` trơn nên tệp tải về trắng
   * trơn, cột hẹp tới mức số tiền hiện thành `####`.
   *
   * Số đưa vào là SỐ THẬT, không tự định dạng thành chuỗi "1.234.567": chuỗi
   * thì Excel không cộng, không lọc, không sắp xếp được.
   */
  const handleExportReportToExcel = () => {
    let sheetName = "Report";
    let bang: BangDep;

    if (reportSubTab === "summary") {
      const tieuDe = [
        "Sản phẩm",
        "Quy cách",
        "Đơn vị",
        "Tồn đầu",
        "Tổng nhập",
        "Tổng xuất",
        "Hao hụt",
        "Tồn cuối",
        "Giá trị nhập",
        "Giá trị xuất",
      ];
      const hang = flowSummary.map((item) => [
        item.productName,
        item.category,
        item.unit,
        item.openingStock,
        item.in,
        item.out,
        item.loss,
        item.closingStock,
        item.inValue,
        item.outValue,
      ]);
      const cong = (i: number) =>
        hang.reduce((s, h) => s + (Number(h[i]) || 0), 0);
      bang = {
        tieuDeTren: [
          "BÁO CÁO NHẬP XUẤT TỒN",
          `Kỳ: ${timeFilter === "all" ? "Tất cả" : timeFilter} · Xuất lúc ${format(new Date(), "HH:mm dd/MM/yyyy")}`,
        ],
        tieuDe,
        cot: [
          { rong: 38 },
          { rong: 10, kieu: "giua" },
          { rong: 9, kieu: "giua" },
          { rong: 12, kieu: "so" },
          { rong: 12, kieu: "so" },
          { rong: 12, kieu: "so" },
          { rong: 11, kieu: "so" },
          { rong: 12, kieu: "so" },
          { rong: 16, kieu: "tien" },
          { rong: 16, kieu: "tien" },
        ],
        hang,
        dongTong: [
          "TỔNG CỘNG",
          "",
          "",
          cong(3),
          cong(4),
          cong(5),
          cong(6),
          cong(7),
          cong(8),
          cong(9),
        ],
      };
      sheetName = "Tong hop kho";
    } else {
      const typeLabel = reportSubTab === "in" ? "Nhap" : "Xuat";
      const targets = filteredTransactionsForReport.filter((t) => {
        if (reportSubTab === "in")
          return t.type === "IN" || t.type === "OPENING";
        return t.type === "OUT" && t.status !== "in_transit";
      });

      if (targets.length === 0) {
        showNotification(`Không có dữ liệu ${typeLabel} để xuất.`, "error");
        return;
      }

      const tieuDe = [
        "Ngày",
        "Loại",
        "Sản phẩm",
        "Số lượng",
        "Đối tác",
        "Số lô",
        "Ghi chú",
      ];
      const hang = targets.map((t) => [
        format(parseISO(t.date), "dd/MM/yyyy"),
        t.type,
        t.productName,
        t.quantity,
        t.partnerName,
        t.batchNumber || "",
        t.notes || "",
      ]);
      bang = {
        tieuDeTren: [
          `BÁO CÁO ${reportSubTab === "in" ? "NHẬP KHO" : "XUẤT KHO"}`,
          `${targets.length} dòng · Xuất lúc ${format(new Date(), "HH:mm dd/MM/yyyy")}`,
        ],
        tieuDe,
        cot: [
          { rong: 12, kieu: "giua" },
          { rong: 10, kieu: "giua" },
          { rong: 38 },
          { rong: 12, kieu: "so" },
          { rong: 24 },
          { rong: 16 },
          { rong: 44 },
        ],
        hang,
        dongTong: [
          "TỔNG CỘNG",
          "",
          "",
          hang.reduce((s, h) => s + (Number(h[3]) || 0), 0),
          "",
          "",
          "",
        ],
      };
      sheetName = `Bao cao ${typeLabel}`;
    }

    const wb = XLSXDep.utils.book_new();
    XLSXDep.utils.book_append_sheet(wb, taoSheetDep(bang), sheetName);
    XLSXDep.writeFile(
      wb,
      `${sheetName} ${format(new Date(), "ddMMyyyy_HHmm")}.xlsx`,
    );
  };

  /**
   * DỌN DỮ LIỆU DOANH THU CŨ — việc làm MỘT LẦN.
   *
   * Doanh thu nay tính thẳng từ xuất kho nên collection `revenue` không còn ai
   * đọc. Nhưng số cũ nạp từ file Excel vẫn nằm đó, chiếm dung lượng và dễ gây
   * hiểu nhầm cho người mở Firebase Console sau này.
   *
   * Cố ý đọc thẳng collection bằng `getDocs` chứ không dựa vào `revenueData`:
   * `revenueData` giờ là số tính từ xuất kho, khoá của nó (`dt-...`) không phải
   * khoá của tài liệu cũ — lấy nó đi xoá thì không trúng gì cả.
   */
  const clearOldRevenueDocs = async () => {
    if (!isOwner) {
      alert("Chỉ chủ sở hữu mới dọn được dữ liệu doanh thu cũ ạ!");
      return;
    }
    if (
      !window.confirm(
        "Xoá toàn bộ dữ liệu doanh thu CŨ đã nạp từ file Excel?\n\n" +
          "Doanh thu hiện đã tính thẳng từ xuất kho nên số cũ không còn được " +
          "dùng ở đâu. Xoá rồi không lấy lại được.",
      )
    )
      return;

    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "revenue"));
      if (snap.empty) {
        showNotification("Không còn dữ liệu doanh thu cũ nào để dọn.");
        return;
      }
      // Chia lô 400: một writeBatch của Firestore tối đa 500 thao tác.
      const ids = snap.docs.map((d) => d.id);
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        ids.slice(i, i + 400).forEach((id) => {
          batch.delete(doc(db, "revenue", id));
        });
        await batch.commit();
      }
      showNotification(`Đã dọn ${ids.length} dòng doanh thu cũ.`);
    } catch (err) {
      console.error(err);
      showNotification("Lỗi khi dọn dữ liệu doanh thu cũ.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportRevenueToExcel = () => {
    if (revenueData.length === 0) {
      showNotification("Không có dữ liệu doanh thu để xuất.", "error");
      return;
    }

    const tieuDe = [
      "Ngày xuất hóa đơn",
      "Số hóa đơn",
      "Đơn vị thụ hưởng",
      "Mã vật tư",
      "Tên hàng hóa",
      "ĐVT",
      "Số lượng",
      "Đơn giá",
      "Thành tiền",
      "VAT",
      "Thành tiền sau thuế",
      "Mã BP",
    ];
    const hang = filteredRevenueByTime.map((r) => [
      // parseDateSafe thay cho parseISO: dòng nào ngày không đúng chuẩn ISO thì
      // parseISO trả Invalid Date và format() ném lỗi, mất cả file xuất.
      format(parseDateSafe(r.date), "dd/MM/yyyy"),
      r.invoiceNumber || "",
      r.partnerName,
      r.materialCode || "",
      r.productName,
      r.unit || "",
      r.quantity,
      r.unitPrice,
      r.amountBeforeVat ?? r.totalAmount,
      r.vatAmount ?? 0,
      r.amountAfterVat ?? (r.totalAmount || 0) + (r.vatAmount || 0),
      r.deptCode || "",
    ]);
    const cong = (i: number) => hang.reduce((s, h) => s + (Number(h[i]) || 0), 0);

    const wb = XLSXDep.utils.book_new();
    XLSXDep.utils.book_append_sheet(
      wb,
      taoSheetDep({
        tieuDeTren: [
          "BÁO CÁO DOANH THU",
          `${hang.length} dòng · Xuất lúc ${format(new Date(), "HH:mm dd/MM/yyyy")}`,
        ],
        tieuDe,
        cot: [
          { rong: 15, kieu: "giua" },
          { rong: 20 },
          { rong: 24 },
          { rong: 13, kieu: "giua" },
          { rong: 38 },
          { rong: 7, kieu: "giua" },
          { rong: 12, kieu: "so" },
          { rong: 12, kieu: "tien" },
          { rong: 17, kieu: "tien" },
          { rong: 15, kieu: "tien" },
          { rong: 19, kieu: "tien" },
          { rong: 10, kieu: "giua" },
        ],
        hang,
        dongTong: [
          "TỔNG CỘNG",
          "",
          "",
          "",
          "",
          "",
          cong(6),
          "",
          cong(8),
          cong(9),
          cong(10),
          "",
        ],
      }),
      "Doanh thu",
    );
    XLSXDep.writeFile(
      wb,
      `Bao cao doanh thu ${format(new Date(), "ddMMyyyy_HHmm")}.xlsx`,
    );
  };

  // Error Handling Helper
  /** Tên việc đang làm, để ghép vào câu báo lỗi cho người đọc hiểu. */
  const TEN_VIEC: Record<string, string> = {
    create: "tạo",
    update: "sửa",
    delete: "xóa",
    list: "xem danh sách",
    get: "đọc",
    write: "lưu",
  };

  /**
   * Diễn giải lỗi Firestore thành câu người dùng đọc được.
   *
   * TRẢ VỀ một chuỗi và KHÔNG BAO GIỜ NÉM.
   *
   * Bản trước ném một Error mới ngay BÊN TRONG nhánh bắt lỗi. Mà mọi nơi gọi
   * hàm này đều đang ở trong `catch` hoặc trong hàm báo lỗi của `onSnapshot`,
   * và ngay dưới lời gọi là dòng `alert(...)` hay `showNotification(...)` —
   * cú ném làm những dòng đó KHÔNG BAO GIỜ CHẠY. Kết quả: người dùng bấm nút,
   * không lưu được gì, và màn hình tuyệt đối im lặng. Không thông báo, không
   * gợi ý, không biết hỏi ai. Đúng cái cảnh "bấm mà không thấy gì xảy ra".
   *
   * Lỗi thiếu quyền phải nói thẳng là THIẾU QUYỀN, không được gói vào câu
   * "kiểm tra lại kết nối" — đổ cho đường truyền thì người dùng đi khởi động
   * lại wifi, còn nguyên nhân thật nằm ở phân quyền thì không ai đụng tới.
   */
  const handleFirestoreError = (
    err: any,
    operation: "create" | "update" | "delete" | "list" | "get" | "write",
    path: string | null = null,
  ): string => {
    const ma = err?.code || "";
    const viec = TEN_VIEC[operation] || operation;
    console.error(`Firestore [${operation}] ${path ?? ""}`, {
      code: ma,
      message: err?.message,
      uid: auth.currentUser?.uid || "(chưa đăng nhập)",
      email: auth.currentUser?.email || "(không rõ)",
      emailVerified: auth.currentUser?.emailVerified ?? false,
    });

    const thieuQuyen =
      ma === "permission-denied" ||
      !!err?.message?.includes("Missing or insufficient permissions");

    if (thieuQuyen) {
      /*
       * NÓI LUÔN VAI TRÒ ĐANG CÓ. Chỉ thiếu chi tiết đó thôi là hai nguyên
       * nhân hoàn toàn khác nhau nhìn giống hệt nhau, và phải đoán mò:
       *
       *   vai trò VIEWER/PENDING → chưa được cấp quyền, sửa trong mục Người dùng
       *   vai trò STAFF/OWNER    → lẽ ra ghi được, nên vướng ở firestore.rules
       *
       * Người dùng chụp màn hình gửi lên là biết ngay phải làm gì.
       */
      const nhanVaiTro: Record<string, string> = {
        OWNER: "OWNER (toàn quyền)",
        KE_TOAN: "KẾ TOÁN (làm được mọi việc)",
        STAFF: "STAFF (nhập/xuất kho)",
        VIEWER: "VIEWER (chỉ xem)",
        PENDING: "PENDING (chờ duyệt)",
      };
      const duocGhi = userRole !== "PENDING";
      return (
        `Tài khoản ${auth.currentUser?.email || "này"} chưa đủ quyền ${viec}` +
        `${path ? ` mục "${path}"` : ""}.\n\n` +
        `Vai trò hiện tại: ${nhanVaiTro[userRole] || userRole}\n\n` +
        (duocGhi
          ? "Vai trò này lẽ ra ghi được, nên vướng ở phân quyền của máy chủ.\n\n" +
            "Chủ sở hữu vào Firebase Console → Firestore Database → tab Rules, " +
            "dán lại nội dung tệp firestore.rules mới nhất rồi bấm Publish. " +
            "Xong thì đăng xuất rồi đăng nhập lại."
          : "Vai trò này không được ghi dữ liệu.\n\n" +
            "Chủ sở hữu vào mục Người dùng duyệt tài khoản này (chọn KẾ TOÁN " +
            "nếu cần làm mọi việc). Đổi xong thì đăng xuất rồi đăng nhập lại.")
      );
    }

    if (ma === "unavailable" || ma === "deadline-exceeded") {
      return `Không kết nối được máy chủ nên chưa ${viec} được. Kiểm tra mạng rồi thử lại.`;
    }

    return `Không ${viec} được: ${err?.message || "lỗi không rõ"}`;
  };

  const handleImportInventoryExcel = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Bắt đầu nhập dữ liệu Tồn kho từ file Excel?")) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        let successCount = 0;
        const syncBy = `User Upload (${user})`;
        const syncDate = new Date().toISOString();

        const docsToSave: { docRef: any; data: any }[] = [];
        let idxCounter = 0;

        // Deep clone batches to track allocation through the loop
        let runningBatches = batches.map((b) => ({ ...b }));

        for (const row of jsonData) {
          const productName = row["Sản phẩm"] || row["Product"] || "";
          const totalImport = parseExcelNumberSafe(
            row["Tổng Nhập"] || row["Total Import"] || "0",
          );
          const totalExport = parseExcelNumberSafe(
            row["Tổng Xuất"] || row["Total Export"] || "0",
          );
          const openingStock = parseExcelNumberSafe(
            row["Tồn Đầu"] || row["Opening Stock"] || "0",
          );
          const unit = row["Đơn vị"] || row["Unit"] || "";

          if (!productName) continue;

          const product = products.find(
            (p) =>
              p.name?.toLowerCase().trim() === productName.toLowerCase().trim(),
          );

          if (product) {
            let finalIn = totalImport + openingStock;
            let finalOut = totalExport;

            const unitStr = String(unit).toLowerCase().trim();
            if (
              product.category === "Lon" &&
              unitStr === "lon"
            ) {
              finalIn = finalIn / (product.conversionFactor || 1);
              finalOut = finalOut / (product.conversionFactor || 1);
            }

            if (finalIn > 0) {
              idxCounter++;
              const importId = `import-in-${product.id}-${Date.now()}-${idxCounter}-${Math.random().toString(36).substr(2, 4)}`;
              const docRef = doc(db, "transactions", importId);
              docsToSave.push({
                docRef,
                data: {
                  id: importId,
                  date: syncDate,
                  type: "IN",
                  productId: product.id,
                  productName: product.name,
                  quantity: finalIn,
                  partnerId: "SYSTEM_SYNC",
                  partnerName: "Excel Import",
                  category: product.category,
                  createdBy: syncBy,
                  batchNumber: `IMPORT-${format(new Date(), "ddMM")}`,
                },
              });
            }

            if (finalOut > 0) {
              const allocations = getFIFOAllocations(
                product.id,
                finalOut,
                runningBatches,
              );
              for (const alloc of allocations) {
                idxCounter++;
                const exportId = `import-out-${product.id}-${Date.now()}-${idxCounter}-${Math.random().toString(36).substr(2, 4)}`;
                const docRef = doc(db, "transactions", exportId);
                docsToSave.push({
                  docRef,
                  data: {
                    id: exportId,
                    date: syncDate,
                    type: "OUT",
                    productId: product.id,
                    productName: product.name,
                    quantity: alloc.quantity,
                    partnerId: "SYSTEM_SYNC",
                    partnerName: "Excel Import",
                    category: product.category,
                    createdBy: syncBy,
                    batchNumber: alloc.batchNumber,
                  },
                });
              }
            }
            successCount++;
          }
        }

        if (docsToSave.length > 0) {
          const CHUNK_SIZE = 40; // Safely below standard network congestion and rate limits
          for (let i = 0; i < docsToSave.length; i += CHUNK_SIZE) {
            const chunk = docsToSave.slice(i, i + CHUNK_SIZE);
            await Promise.all(
              chunk.map(({ docRef, data }) => setDoc(docRef, data))
            );
          }
        }
        setLoading(false);
        showNotification("Hệ thống cập nhật data thành công");
      } catch (err) {
        console.error(err);
        setLoading(false);
        showNotification(
          "Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.",
          "error",
        );
      } finally {
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // FIFO Helper for auto-allocation
  const compressImage = (
    base64Str: string,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.6,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(base64Str); // Fallback to original
    });
  };

  // Đọc file thành data URI base64 (giữ nguyên cách FileReader cũ, gói lại cho gọn).
  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Nén ảnh rồi upload lên Cloudinary, trả về URL (thay cho việc lưu base64 vào DB).
  const compressAndUploadPhoto = async (
    base64: string,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.6,
  ): Promise<string> => {
    const compressed = await compressImage(base64, maxWidth, maxHeight, quality);
    return uploadToCloudinary(compressed);
  };

  const getFIFOAllocations = (
    productId: string,
    quantity: number,
    currentBatches: BatchInfo[],
  ) => {
    const allocations: {
      batchNumber: string;
      quantity: number;
      category?: string;
    }[] = [];
    let remaining = quantity;

    // Process batches for this product that have stock
    const relevant = currentBatches
      .filter((b) => b.productId === productId && b.stock > 0)
      .sort((a, b) => {
        const timeA = new Date(a.importDate).getTime();
        const timeB = new Date(b.importDate).getTime();
        return timeA - timeB;
      });

    for (const b of relevant) {
      if (remaining <= 0) break;
      const taken = Math.min(b.stock, remaining);
      allocations.push({
        batchNumber: b.batchNumber,
        quantity: taken,
        category: b.category,
      });
      remaining -= taken;
      // Update local copy so subsequent items in the same sync loop see updated state
      b.stock -= taken;
    }

    if (remaining > 0) {
      allocations.push({
        batchNumber: "VUOT_DINH_MUC",
        quantity: remaining,
        category: "?",
      });
    }
    return allocations;
  };

  // Form states
  interface TransactionItem {
    productId: string;
    quantity: number;
    batchNumber: string;
    /**
     * Lượng bia hao hụt của lần xuất này — KHÔNG ghi vào công nợ.
     *
     * Hàng ra khỏi kho gồm hai phần: phần ghi công nợ cho đối tác, và phần hao
     * hụt mình chịu. Trường hợp thường gặp nhất là làm tròn keg — một keg bia
     * hơi giao thực tế 20,6 lít nhưng biên bản ghi tròn 20 lít, 0,6 lít còn
     * lại là hao hụt.
     *
     * Ghi thành giao dịch `LOSS` riêng: tồn kho trừ cả hai phần, còn công nợ
     * và hóa đơn chỉ lấy phần trên.
     *
     * Cố ý ĐIỀN TAY chứ không tự tính: số keg thật chỉ người giao biết, và
     * không phải lần nào cũng tròn keg.
     */
    lossQuantity?: number;
  }

  /** Một keg bia hơi giao thực tế 20,6 L nhưng biên bản ghi tròn 20 L. */
  const LIT_MOI_KEG_THUC = 20.6;
  const LIT_MOI_KEG_GHI = 20;

  /**
   * Giá trị tạm cho ô chọn đơn vị khi mới chọn BNC mà chưa chọn bộ phận.
   *
   * KHÔNG phải một đối tác thật — không có tài liệu nào mang khoá này. Nó chỉ
   * tồn tại trong ô chọn, và phép kiểm trước khi lưu chặn nó lại. Cố ý không
   * mặc định sẵn một bộ phận: đoán sai là ghi sản lượng vào nhóm sai.
   */
  const NHOM_BNC_TAM = "__BNC__";

  /**
   * DANH MỤC ĐƠN VỊ DÙNG CHO Ô CHỌN — ghép code với Firestore, CODE ƯU TIÊN.
   *
   * `partners` đọc từ Firestore, còn `INITIAL_PARTNERS` trong code chỉ là bản
   * mồi cho nút khôi phục. Hai bên vì vậy trôi xa nhau: thêm 20 bộ phận của BNC
   * vào code mà Firestore không có thì ô chọn hiện "BNC" nhưng bên dưới không
   * có bộ phận nào để bấm — đúng lỗi đã gặp.
   *
   * Ghép ở đây để giao diện dùng được ngay, không phải chờ đồng bộ. Nhưng đơn
   * vị chỉ có trong code thì CHƯA có tài liệu Firestore, nên mã bộ phận SAP tra
   * ra rỗng ở file công nợ — vì thế bên dưới có cảnh báo kèm nút đồng bộ, chứ
   * không im lặng.
   */
  const donVi = useMemo(() => {
    const trongCode = new Set(INITIAL_PARTNERS.map((p) => p.id));
    return [
      ...INITIAL_PARTNERS,
      ...partners.filter(
        (p) =>
          !trongCode.has(p.id) &&
          // Bỏ đơn vị "BNC" trơn còn sót trong Firestore: nay BNC đã tách
          // thành các bộ phận AD0103-*, để cả hai thì ô chọn có hai dòng BNC
          // và không ai biết chọn dòng nào.
          p.id !== "AD0103",
      ),
    ];
  }, [partners]);

  /** Đơn vị có trong code mà Firestore chưa có — cần bấm đồng bộ. */
  const donViThieu = useMemo(
    () => INITIAL_PARTNERS.filter((p) => !partners.some((q) => q.id === p.id)),
    [partners],
  );

  const [newTransaction, setNewTransaction] = useState<{
    type: TransactionType;
    partnerId: string;
    notes: string;
    evidencePhotoUrl: string;
    evidencePhotoUrls: string[];
    date: string;
    isInTransit: boolean;
    items: TransactionItem[];
  }>({
    type: "IN",
    partnerId: partners[0]?.id || "",
    notes: "",
    evidencePhotoUrl: "",
    evidencePhotoUrls: [],
    date: format(new Date(), "yyyy-MM-dd"),
    isInTransit: false,
    items: [{ productId: products[0]?.id || "", quantity: 0, batchNumber: "" }],
  });

  /**
   * Phần của BNC đang chọn ở ô thứ hai.
   *
   * Phải giữ riêng chứ không suy hết từ `partnerId`: chọn "Nội bộ" thì chưa có
   * bộ phận nào, `partnerId` còn là giá trị tạm, mà tầng điểm bán vẫn phải mở
   * ra. Ba nhóm còn lại thì suy được từ `partnerId` — nên khi ô này rỗng vẫn
   * lấy nhóm của bộ phận đang chọn, để mở lại đơn cũ là thấy đúng nhóm.
   */
  const [nhomBNCChon, setNhomBNCChon] = useState<MaNhomBNC | "">("");
  const nhomBNCDangChon: MaNhomBNC | "" =
    nhomBNCChon || nhomCuaBoPhan(newTransaction.partnerId) || "";

  const addTransactionItem = () => {
    setNewTransaction((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: products[0]?.id || "",
          quantity: 0,
          batchNumber: prev.type === "OPENING" ? "Tồn 25/4" : "",
        },
      ],
    }));
  };

  const removeTransactionItem = (index: number) => {
    if (newTransaction.items.length <= 1) return;
    setNewTransaction((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateTransactionItem = (
    index: number,
    updates: Partial<TransactionItem>,
  ) => {
    setNewTransaction((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...updates } : item,
      ),
    }));
  };

  const [selectedInTransitGroup, setSelectedInTransitGroup] = useState<
    Transaction[] | null
  >(null);
  const [selectedInTransitIds, setSelectedInTransitIds] = useState<string[]>(
    [],
  );
  const [actualReceivedQtyMap, setActualReceivedQtyMap] = useState<
    Record<string, number>
  >({});
  /**
   * Chữ người dùng đang gõ trong ô "Thực nhận", giữ nguyên chưa diễn giải.
   *
   * Phải tách khỏi `actualReceivedQtyMap` (số đã diễn giải) vì hai thứ khác
   * nhau trong lúc đang gõ: gõ dở "144," thì chưa ra số nào, mà ép về số ngay
   * thì con trỏ nhảy và dấu phẩy vừa gõ biến mất.
   *
   * VÌ SAO KHÔNG DÙNG `type="number"` NỮA: bàn phím số tiếng Việt trên Android
   * cho dấu PHẨY. Gõ "144,2" vào ô số thì trình duyệt coi là không hợp lệ và
   * trả về chuỗi rỗng — app đọc ra 0, ghi nhận đã nhận 0 lít và toàn bộ 144,2
   * lít thành hao hụt. Không một cảnh báo nào.
   */
  const [soThucNhanText, setSoThucNhanText] = useState<Record<string, string>>(
    {},
  );

  /** "144,2" và "144.2" đều là 144,2. Rỗng hoặc gõ dở thì trả null. */
  const docSoThapPhan = (v: string): number | null => {
    const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
    if (!s || s === "." || s === "-") return null;
    const n = Number(s);
    return Number.isFinite(n) ? parseFloat(n.toFixed(4)) : null;
  };
  const [lossReason, setLossReason] = useState<string>("");
  const [confirmationPhotos, setConfirmationPhotos] = useState<string[]>([]);
  const [confirmationPhoto, setConfirmationPhoto] = useState<string>("");
  const [showLossModal, setShowLossModal] = useState(false);

  const inTransitGroups = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    const sortedAll = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Determine the sequence for ALL groups ever created to keep numbers consistent
    const groupSequence: Record<string, number> = {};
    let counter = 0;
    sortedAll.forEach((t) => {
      if (t.referenceGroupId && !groupSequence[t.referenceGroupId]) {
        counter++;
        groupSequence[t.referenceGroupId] = counter;
      }
    });

    transactions
      .filter((t) => t.status === "in_transit")
      .forEach((t) => {
        const key = t.referenceGroupId || t.id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

    // Sort groups by date descending for UI
    return Object.entries(groups)
      .map(([id, group]) => ({
        id,
        group,
        sheetNumber: groupSequence[id] || "Lẻ",
      }))
      .sort(
        (a, b) =>
          new Date(b.group[0].date).getTime() -
          new Date(a.group[0].date).getTime(),
      );
  }, [transactions]);

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState<Omit<Partner, "id">>({
    name: "",
    sapCode: "",
    type: "AGENT",
    phone: "",
    address: "",
  });

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerFormData.name) return;

    const newId =
      partnerFormData.sapCode || `p-${Math.random().toString(36).substr(2, 6)}`;
    const newPartner: Partner = {
      id: newId,
      ...partnerFormData,
    };

    setDoc(doc(db, "partners", newPartner.id), newPartner)
      .then(() => {
        setShowAddPartner(false);
        setPartnerFormData({
          name: "",
          sapCode: "",
          type: "AGENT",
          phone: "",
          address: "",
        });
      })
      .catch((err) => {
        alert(
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `partners/${newPartner.id}`,
          ),
        );
      });
  };

  const handleDeleteInTransitGroup = async (group: Transaction[]) => {
    if (!daDuocDuyet) {
      alert("Tài khoản chưa được duyệt nên chưa thao tác được.");
      return;
    }
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa toàn bộ ${group.length} bản ghi trong đơn này không?`,
      )
    )
      return;

    try {
      setLoading(true);
      const batch = writeBatch(db);
      group.forEach((t) => {
        batch.delete(doc(db, "transactions", t.id));
      });
      await batch.commit();
      showNotification("Đã xóa đơn đi đường thành công!");
    } catch (err) {
      alert(
        handleFirestoreError(err, OperationType.DELETE, "transactions"),
      );
    } finally {
      setLoading(false);
    }
  };

  const revertAccidentalConfirmations = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      // We want to revert transactions that were confirmed via bulk confirm recently
      // Specifically ones with the note "(Xác nhận hàng loạt - Nhận đủ)"
      const trxsToRevert = transactions.filter(
        (t) =>
          t.status === "completed" &&
          t.notes?.includes("(Xác nhận hàng loạt - Nhận đủ)"),
      );

      if (trxsToRevert.length === 0) {
        showNotification("Không tìm thấy đơn nào cần khôi phục!");
        return;
      }

      trxsToRevert.forEach((t) => {
        batch.update(doc(db, "transactions", t.id), {
          status: "in_transit",
          updatedAt: new Date().toISOString(),
          notes:
            t.notes?.replace(" (Xác nhận hàng loạt - Nhận đủ)", "").trim() ||
            "",
        });
      });

      await batch.commit();
      setSelectedInTransitIds([]);
      showNotification(
        `Đã khôi phục ${trxsToRevert.length} bản ghi về trạng thái Đang đi đường!`,
      );
    } catch (err) {
      alert(handleFirestoreError(err, OperationType.WRITE, "transactions"));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkConfirm = () => {
    if (selectedInTransitIds.length === 0) return;

    // Find all transactions that belong to the selected group IDs
    const trxsToConfirm = transactions.filter(
      (t) =>
        t.status === "in_transit" &&
        t.referenceGroupId &&
        selectedInTransitIds.includes(t.referenceGroupId),
    );

    if (trxsToConfirm.length === 0) return;

    setSelectedInTransitGroup(trxsToConfirm);

    // Build initial qty map (receive all)
    const qtyMap: Record<string, number> = {};
    trxsToConfirm.forEach((t) => {
      qtyMap[t.productId] = parseFloat(
        ((qtyMap[t.productId] || 0) + t.quantity).toFixed(4),
      );
    });
    setActualReceivedQtyMap(qtyMap);
    setLossReason("");
    setConfirmationPhotos([]);
    setConfirmationPhoto("");
    setShowLossModal(true);
  };

  const handleScanInvoice = async (base64Image: string) => {
    if (!selectedInTransitGroup) return;

    try {
      setIsScanning(true);
      const response = await callAiApi("/api/gemini/scan-invoice", {
        image: base64Image,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();

      if (data.items) {
        if (data.exactDate) {
          setScannedInvoiceDate(data.exactDate);
        }
        const newQtyMap = { ...actualReceivedQtyMap };
        const newMatchedIds = new Set(matchedProductIds);
        let matchedCount = 0;

        // Vietnamese accent normalization
        const cleanVietnamese = (str: string) => {
          return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .toLowerCase();
        };

        const normalize = (s: string) => {
          if (!s) return "";
          return cleanVietnamese(s)
            .replace(/bia/g, "")
            .replace(/vo/g, "")
            .replace(/keg/g, "")
            .replace(/lon/g, "")
            .replace(/thung/g, "")
            .replace(/chai/g, "")
            .replace(/\s+/g, "")
            .trim();
        };

        // Keyword extraction helper to split and filter noise words
        const getKeywords = (s: string) => {
          if (!s) return [];
          const clean = cleanVietnamese(s).replace(/[^a-z0-9\s]/g, " ");
          return clean
            .split(/\s+/)
            .filter(
              (word) =>
                word &&
                word.length >= 2 &&
                ![
                  "bia",
                  "vo",
                  "keg",
                  "lon",
                  "thung",
                  "chai",
                  "lit",
                  "kegs",
                  "va",
                  "loai",
                  "so",
                  "luong",
                ].includes(word),
            );
        };

        data.items.forEach((scannedItem: any) => {
          const target = normalize(scannedItem.productName);
          if (!target) return;

          const targetKeywords = getKeywords(scannedItem.productName);

          // Try to find a match in the currently being confirmed group
          const matches = selectedInTransitGroup.filter((t) => {
            const pName = normalize(t.productName);

            // 1. Direct or partial substring match
            if (pName.includes(target) || target.includes(pName)) {
              return true;
            }

            // 2. Keyword overlap match (fuzzy matching)
            const transitKeywords = getKeywords(t.productName);
            const commonKeywords = targetKeywords.filter((w) =>
              transitKeywords.includes(w),
            );

            return commonKeywords.length > 0;
          });

          if (matches.length > 0) {
            const firstMatch = matches[0];
            const pId = firstMatch.productId;

            // Calculate total expected transit quantity for this product ID in the group
            const totalTransit = selectedInTransitGroup
              .filter((t) => t.productId === pId)
              .reduce((sum, t) => sum + t.quantity, 0);

            // Since beer name matches, it's a 100% quantity match with the in-transit amount, ignoring any keg mismatch from the invoice
            newQtyMap[pId] = parseFloat(totalTransit.toFixed(4));

            matches.forEach((match) => {
              newMatchedIds.add(match.id);
              matchedCount++;
            });
          }
        });

        setActualReceivedQtyMap(newQtyMap);
        setMatchedProductIds(newMatchedIds);
        if (matchedCount > 0) {
          showNotification(
            `Tin đã khớp được ${matchedCount} đơn hàng dựa trên phiếu!`,
          );
        } else {
          const scannedList = data.items
            .map(
              (i: any) => `${i.productName} (${i.quantity} ${i.unit || "món"})`,
            )
            .join(", ");
          showNotification(
            `Tin đọc được trên phiếu: [ ${scannedList} ] nhưng chưa khớp tự động được với các đơn đang chọn. Anh vui lòng bấm chọn thủ công nhé!`,
            "error",
          );
        }
      } else {
        showNotification(
          "Tin đọc nhưng không lấy được thông tin mặt hàng nào trên phiếu. Anh chọn góc chụp chính diện đầy đủ nhé!",
          "error",
        );
      }
    } catch (err) {
      console.error(err);
      showNotification(
        "Tin không đọc được ảnh này, anh thử lại với góc chụp rõ hơn nhé!",
        "error",
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleReportLoss = async () => {
    if (!selectedInTransitGroup || selectedInTransitGroup.length === 0) return;

    // Only confirm transactions whose product ID or transaction ID is in the matched set
    const trxsToConfirm = selectedInTransitGroup.filter(
      (t) => matchedProductIds.has(t.id) || matchedProductIds.has(t.productId),
    );

    if (trxsToConfirm.length === 0) {
      showNotification(
        "Chưa có đơn nào được khớp trên phiếu ạ! Anh vui lòng quét phiếu hoặc bấm 'Có trên phiếu' để xác nhận nhé.",
        "error",
      );
      return;
    }

    try {
      setLoading(true);
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const photoUrls = confirmationPhotos;

      // 1. Prepare clean batches state for re-allocation
      // We "add back" the currently assigned stock of the transactions we are confirming
      // to let getFIFOAllocations "see" the available stock.
      const currentBatchesLocal = batches.map((b) => ({ ...b }));
      trxsToConfirm.forEach((t) => {
        const b = currentBatchesLocal.find(
          (bl) =>
            bl.batchNumber === t.batchNumber && bl.productId === t.productId,
        );
        if (b) b.stock += t.quantity;
      });

      // 2. Chronological sort for correct FIFO sequence during confirmation
      const sortedTrxs = [...trxsToConfirm].sort((a, b) =>
        (a.date || "").localeCompare(b.date || ""),
      );

      // 3. Group by product for distribution with updated FIFO and loss handling
      const trxsByProduct: Record<string, Transaction[]> = {};
      sortedTrxs.forEach((t) => {
        if (!trxsByProduct[t.productId]) trxsByProduct[t.productId] = [];
        trxsByProduct[t.productId].push(t);
      });

      for (const productId of Object.keys(trxsByProduct)) {
        const groupTrxs = trxsByProduct[productId];
        const actualProductQty = actualReceivedQtyMap[productId];
        const totalShippedForProductInThisMatch = parseFloat(
          Number(groupTrxs.reduce((sum, t) => sum + t.quantity, 0)).toFixed(4),
        );

        const cleanActualProductQty =
          actualProductQty !== undefined
            ? parseFloat(Number(actualProductQty).toFixed(4))
            : totalShippedForProductInThisMatch;

        let remainingLossToAllocate = parseFloat(
          Number(Math.max(
            0,
            totalShippedForProductInThisMatch - cleanActualProductQty,
          )).toFixed(4),
        );

        // If microscopic difference (floating-point noise), treat it as 0
        if (remainingLossToAllocate < 0.0001) {
          remainingLossToAllocate = 0;
        }

        const p = products.find((prod) => prod.id === productId);

        for (const trx of groupTrxs) {
          // Determine final date: Scanning priority, then existing in-transit date
          const finalDate = scannedInvoiceDate || trx.date || now;

          let lossForThisTrx = parseFloat(
            Number(Math.max(
              0,
              Math.min(trx.quantity, remainingLossToAllocate),
            )).toFixed(4),
          );

          if (lossForThisTrx < 0.0001) {
            lossForThisTrx = 0;
          }

          const finalTrxQty = parseFloat(
            Number(trx.quantity - lossForThisTrx).toFixed(4),
          );
          remainingLossToAllocate = parseFloat(
            Number(remainingLossToAllocate - lossForThisTrx).toFixed(4),
          );

          // Re-allocate lot number based on the latest FIFO state
          const allocations = getFIFOAllocations(
            trx.productId,
            finalTrxQty,
            currentBatchesLocal,
          );
          const bestBatch =
            allocations.length > 0
              ? allocations[0].batchNumber
              : trx.batchNumber || "UNKNOWN";

          if (lossForThisTrx > 0) {
            batch.update(doc(db, "transactions", trx.id), {
              quantity: finalTrxQty,
              originalQuantity: trx.originalQuantity || trx.quantity, // Preserve original shipped quantity
              status: "completed",
              notes:
                `${trx.notes || ""} [Hao hụt: ${lossForThisTrx} ${p?.unit || "đv"}, Lý do: ${lossReason || "Chênh lệch"}]`.trim(),
              date: finalDate,
              updatedAt: now,
              batchNumber: bestBatch,
              evidencePhotoUrl: photoUrls[0] || null,
              evidencePhotoUrls: photoUrls,
            });
          } else {
            batch.update(doc(db, "transactions", trx.id), {
              status: "completed",
              date: finalDate,
              updatedAt: now,
              batchNumber: bestBatch,
              notes:
                `${trx.notes || ""} (Tin đã khớp và cập nhật mã lô FIFO)`.trim(),
              evidencePhotoUrl: photoUrls[0] || null,
              evidencePhotoUrls: photoUrls,
            });
          }
        }
      }

      await batch.commit();

      showNotification(
        `Xác nhận thành công ${trxsToConfirm.length} đơn. Còn ${selectedInTransitGroup.length - trxsToConfirm.length} đơn chưa có trên phiếu vẫn giữ nguyên.`,
      );

      setShowLossModal(false);
      setSelectedInTransitGroup(null);
      setSelectedInTransitIds([]);
      setMatchedProductIds(new Set());
      setScannedInvoiceDate(null);
      setActualReceivedQtyMap({});
      setSoThucNhanText({});
      setLossReason("");
      setConfirmationPhotos([]);
      setConfirmationPhoto("");
    } catch (err) {
      alert(handleFirestoreError(err, OperationType.WRITE, "transactions"));
    } finally {
      setLoading(false);
    }
  };
  const handleDeletePartner = async (id: string) => {
    if (!isOwner) {
      alert("Chỉ anh Khoa mới có quyền xóa đối tác ạ!");
      return;
    }
    if (
      window.confirm(
        "Bạn có chắc chắn muốn xóa đối tác này không? Dữ liệu giao dịch liên quan sẽ không bị xóa nhưng sẽ mất liên kết tên đối tác chính thức.",
      )
    ) {
      try {
        // Xoá thật trên Firestore (trước đây chỉ xoá state local nên đối tác
        // "sống lại" sau khi tải lại trang — nay đã sửa).
        await deleteDoc(doc(db, "partners", id));
        setPartners(partners.filter((p) => p.id !== id));
        showNotification("Đã xóa đối tác.", "success");
      } catch (err) {
        alert(
          handleFirestoreError(err, OperationType.DELETE, `partners/${id}`),
        );
      }
    }
  };

  // ---------------------------------------------------------------------------
  // DỰ BÁO DUNG LƯỢNG FIRESTORE
  // Gói Spark (miễn phí) của Firebase giới hạn 1 GiB dung lượng lưu trữ.
  // Ta ước tính dung lượng đang dùng bằng cách đo kích thước thật (bytes) của
  // dữ liệu đang giữ trong bộ nhớ, rồi chiếu tốc độ tăng theo lịch sử giao dịch
  // để dự báo còn bao lâu nữa thì chạm ngưỡng.
  // ---------------------------------------------------------------------------
  const storageForecast = useMemo(() => {
    const FREE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GiB (gói Spark)
    // Firestore tính thêm overhead cho tên field/document và chỉ mục.
    // Hệ số 1.5 là ước lượng thận trọng để không báo thấp hơn thực tế.
    const OVERHEAD_FACTOR = 1.5;

    const byteSize = (rows: unknown[]) => {
      if (rows.length === 0) return 0;
      try {
        return new Blob([JSON.stringify(rows)]).size;
      } catch {
        return JSON.stringify(rows).length;
      }
    };

    const txBytes = byteSize(transactions);
    // Doanh thu khong con la tai lieu luu tren Firestore nen khong chiem dung
    // luong va khong ton luot doc nao nua - xem revenueData o tren.
    const partnerBytes = byteSize(partners);
    const usedBytes = (txBytes + partnerBytes) * OVERHEAD_FACTOR;
    const usedPercent = (usedBytes / FREE_LIMIT_BYTES) * 100;

    // Kích thước trung bình mỗi bản ghi giao dịch (để quy đổi ra "còn bao nhiêu đơn").
    const avgTxBytes =
      transactions.length > 0
        ? (txBytes * OVERHEAD_FACTOR) / transactions.length
        : 0;
    const remainingBytes = Math.max(0, FREE_LIMIT_BYTES - usedBytes);
    const remainingTransactions =
      avgTxBytes > 0 ? Math.floor(remainingBytes / avgTxBytes) : null;

    // Tốc độ phát sinh giao dịch: dựa trên khoảng thời gian từ giao dịch đầu tới nay.
    let perDay: number | null = null;
    let daysLeft: number | null = null;
    if (transactions.length > 1) {
      const times = transactions
        .map((t) => parseDateSafe(t.date).getTime())
        .filter((t) => !isNaN(t));
      if (times.length > 1) {
        const earliest = Math.min(...times);
        const spanDays = Math.max(
          1,
          (Date.now() - earliest) / (1000 * 60 * 60 * 24),
        );
        perDay = transactions.length / spanDays;
        if (perDay > 0 && avgTxBytes > 0) {
          daysLeft = Math.floor(remainingBytes / (perDay * avgTxBytes));
        }
      }
    }

    const level: "safe" | "warning" | "danger" =
      usedPercent >= 80 ? "danger" : usedPercent >= 50 ? "warning" : "safe";

    /* ---- LƯỢT ĐỌC: hạn mức sẽ hết TRƯỚC dung lượng ----
     *
     * Gói Spark cho 50.000 lượt đọc tài liệu mỗi ngày. App đang tải TRỌN các
     * collection mỗi lần mở (không có limit/where), nên mỗi lần mở app tốn số
     * lượt đọc bằng đúng tổng số tài liệu đang có.
     *
     * Vì sao chưa thêm limit(): tồn kho theo lô (FIFO) và tồn đầu/cuối kỳ đều
     * duyệt TOÀN BỘ lịch sử giao dịch. Cắt bớt dữ liệu tải về sẽ làm số tồn kho
     * sai mà không báo lỗi gì — tệ hơn hẳn việc hết hạn mức đọc. Muốn cắt được
     * thì phải chốt tồn đầu kỳ theo tháng trước, đó là một thay đổi thiết kế.
     *
     * Con số dưới đây để biến rủi ro vô hình thành cái nhìn thấy được: khi nó
     * đỏ lên là lúc phải làm việc đó, đừng đợi app trắng dữ liệu mới biết.
     */
    const FREE_READS_PER_DAY = 50000;
    const docsPerAppOpen =
      transactions.length + partners.length + slips.length;
    const opensPerDay =
      docsPerAppOpen > 0
        ? Math.floor(FREE_READS_PER_DAY / docsPerAppOpen)
        : null;
    // Dưới 20 lần mở/ngày là hẹp thật: 4-5 người, mỗi người mở vài lần là hết.
    const readLevel: "safe" | "warning" | "danger" =
      opensPerDay === null
        ? "safe"
        : opensPerDay < 20
          ? "danger"
          : opensPerDay < 60
            ? "warning"
            : "safe";

    return {
      usedBytes,
      usedPercent,
      limitBytes: FREE_LIMIT_BYTES,
      txBytes: txBytes * OVERHEAD_FACTOR,
      partnerBytes: partnerBytes * OVERHEAD_FACTOR,
      remainingTransactions,
      perDay,
      daysLeft,
      level,
      docsPerAppOpen,
      opensPerDay,
      readLevel,
      freeReadsPerDay: FREE_READS_PER_DAY,
      counts: {
        transactions: transactions.length,
        partners: partners.length,
      },
    };
  }, [transactions, partners, slips]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Filtering Logic
  const dateRange = useMemo(() => {
    if (timeFilter === "all") return null;

    let start: Date;
    let end: Date;

    if (timeFilter === "day") {
      start = startOfDay(filterBaseDate);
      end = endOfDay(filterBaseDate);
    } else if (timeFilter === "week") {
      start = startOfWeek(filterBaseDate, { weekStartsOn: 1 });
      end = endOfWeek(filterBaseDate, { weekStartsOn: 1 });
    } else if (timeFilter === "month") {
      start = startOfMonth(filterBaseDate);
      end = endOfMonth(filterBaseDate);
    } else {
      start = startOfYear(filterBaseDate);
      end = endOfYear(filterBaseDate);
    }

    return { start, end };
  }, [timeFilter, filterBaseDate]);

  /**
   * DUYET SO LIEU BANG CHU KY GIAY
   *
   * Mot phieu duoc coi la DA DUYET khi da co anh to phieu ky tuoi. Trang thai
   * nay SUY RA tu `slips`, khong luu them co nao tren tung giao dich - nho vay
   * khong bao gio lech hai nguon, va vua tai anh ky xong la ca loat giao dich
   * cua phieu do doi trang thai cung luc.
   *
   * Hang thuoc phieu chua ky thi CHUA VAO TON: khong cong vao ton kho, khong
   * len bao cao, va khong xuat ban duoc (vi phep kiem du hang o handleAddTransaction
   * doc `inventory`, ma `inventory` chi tinh tu `countedTransactions`).
   */
  const approvedSlips = useMemo(() => approvedSlipCodes(slips), [slips]);

  /**
   * Cac giao dich duoc phep tac dong den ton kho.
   *
   * MOI phep tinh ton phai dung danh sach nay chu khong dung `transactions`
   * goc. Chi can mot cho dung danh sach goc la con so cho do cao hon cac cho
   * khac ma khong co gi bao loi.
   *
   * Ngoai le co y: tab Lich su va thu vien anh van hien day du de nguoi dung
   * thay duoc hang minh vua dien va biet no dang cho ky.
   */
  const countedTransactions = useMemo(
    () => stockTransactions(transactions, approvedSlips),
    [transactions, approvedSlips],
  );

  const filteredTransactionsByTime = useMemo(() => {
    if (!dateRange) return transactions;

    return transactions.filter((t) => {
      const date = parseISO(t.date);
      return isWithinInterval(date, {
        start: dateRange.start,
        end: dateRange.end,
      });
    });
  }, [transactions, dateRange]);

  /** Ban da loc theo thoi gian VA da bo hang chua ky - dung cho thong ke, do thi. */
  const countedTransactionsByTime = useMemo(
    () => stockTransactions(filteredTransactionsByTime, approvedSlips),
    [filteredTransactionsByTime, approvedSlips],
  );

  const filteredRevenueByTime = useMemo(() => {
    if (timeFilter === "all") return revenueData;

    let start: Date;
    let end: Date;

    if (timeFilter === "day") {
      start = startOfDay(filterBaseDate);
      end = endOfDay(filterBaseDate);
    } else if (timeFilter === "week") {
      start = startOfWeek(filterBaseDate, { weekStartsOn: 1 });
      end = endOfWeek(filterBaseDate, { weekStartsOn: 1 });
    } else if (timeFilter === "month") {
      start = startOfMonth(filterBaseDate);
      end = endOfMonth(filterBaseDate);
    } else {
      start = startOfYear(filterBaseDate);
      end = endOfYear(filterBaseDate);
    }

    return revenueData.filter((r) => {
      try {
        const date = (r as any)._parsedDate || parseDateSafe(r.date);
        return isWithinInterval(date, { start, end });
      } catch {
        return false;
      }
    });
  }, [revenueData, timeFilter, filterBaseDate]);

  const previousRevenueByTime = useMemo(() => {
    if (timeFilter === "all") return [];

    let start: Date;
    let end: Date;

    if (timeFilter === "day") {
      start = startOfDay(subDays(filterBaseDate, 1));
      end = endOfDay(subDays(filterBaseDate, 1));
    } else if (timeFilter === "week") {
      start = startOfWeek(subWeeks(filterBaseDate, 1), { weekStartsOn: 1 });
      end = endOfWeek(subWeeks(filterBaseDate, 1), { weekStartsOn: 1 });
    } else if (timeFilter === "month") {
      start = startOfMonth(subMonths(filterBaseDate, 1));
      end = endOfMonth(subMonths(filterBaseDate, 1));
    } else {
      start = startOfYear(subYears(filterBaseDate, 1));
      end = endOfYear(subYears(filterBaseDate, 1));
    }

    return revenueData.filter((r) => {
      try {
        const date = (r as any)._parsedDate || parseDateSafe(r.date);
        return isWithinInterval(date, { start, end });
      } catch {
        return false;
      }
    });
  }, [revenueData, timeFilter, filterBaseDate]);

  const revenueAnalytics = useMemo(() => {
    // totalAmount luôn là doanh thu TRƯỚC VAT (xem types.ts), nên mọi con số
    // dưới đây cùng một gốc so sánh.
    const currentRev = filteredRevenueByTime.reduce(
      (a, b) => a + b.totalAmount,
      0,
    );
    const prevRev = previousRevenueByTime.reduce(
      (a, b) => a + b.totalAmount,
      0,
    );
    const currentVat = filteredRevenueByTime.reduce(
      (a, b) => a + (b.vatAmount || 0),
      0,
    );

    /**
     * Sản lượng quy về LÍT. Trước đây cộng thẳng số lượng của mọi dòng rồi gắn
     * nhãn bằng đơn vị của dòng đầu tiên — tức là cộng lon với lít vào một số
     * và gọi nó là "sản lượng", kéo theo ARPU cũng vô nghĩa.
     */
    const litersOfRows = (rows: typeof filteredRevenueByTime) =>
      rows.reduce(
        (a, r) =>
          a + revenueRowLiters(r, matchRevenueProduct(products, r)).liters,
        0,
      );
    const currentQty = litersOfRows(filteredRevenueByTime);
    const prevQty = litersOfRows(previousRevenueByTime);

    const partnerGroups: Record<string, number> = {};
    const productGroups: Record<string, number> = {};
    const productQtyGroups: Record<string, number> = {};

    filteredRevenueByTime.forEach((r) => {
      partnerGroups[r.partnerName] =
        (partnerGroups[r.partnerName] || 0) + r.totalAmount;
      productGroups[r.productName] =
        (productGroups[r.productName] || 0) + r.totalAmount;
      productQtyGroups[r.productName] =
        (productQtyGroups[r.productName] || 0) + r.quantity;
    });

    const sortedPartners = Object.entries(partnerGroups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sortedProducts = Object.entries(productGroups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sortedProductQty = Object.entries(productQtyGroups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top20Count = Math.ceil(sortedPartners.length * 0.2);
    const top20Rev = sortedPartners
      .slice(0, top20Count)
      .reduce((a, b) => a + b.value, 0);
    const concentration = currentRev > 0 ? (top20Rev / currentRev) * 100 : 0;

    const growth = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;
    const qtyGrowth =
      prevQty > 0 ? ((currentQty - prevQty) / prevQty) * 100 : 0;
    const arpu = currentQty > 0 ? currentRev / currentQty : 0;
    const prevArpu = prevQty > 0 ? prevRev / prevQty : 0;
    const arpuGrowth = prevArpu > 0 ? ((arpu - prevArpu) / prevArpu) * 100 : 0;

    return {
      /** Doanh thu TRƯỚC VAT. */
      totalRevenue: currentRev,
      totalVat: currentVat,
      totalAfterVat: currentRev + currentVat,
      revGrowth: growth,
      /** Sản lượng quy về LÍT. */
      totalQuantity: currentQty,
      qtyGrowth,
      /** Đơn giá bình quân, đồng trên một LÍT. */
      arpu,
      arpuGrowth,
      concentration,
      partnerStats: sortedPartners,
      productStats: sortedProducts,
      productQtyStats: sortedProductQty,
    };
  }, [filteredRevenueByTime, previousRevenueByTime, products]);

  const cfoMetrics = revenueAnalytics;

  const groupedRevenue = useMemo(() => {
    const groups = new Map<
      string,
      {
        /** Khoá nhóm, duy nhất — dùng cho React key và trạng thái bung. */
        key: string;
        invoiceNumber: string;
        date: string;
        partnerName: string;
        totalAmount: number;
        items: RevenueRecord[];
      }
    >();

    filteredRevenueByTime.forEach((r) => {
      // Filter by partner search
      if (
        revenuePartnerSearch &&
        !r.partnerName
          .toLowerCase()
          .includes(revenuePartnerSearch.toLowerCase())
      ) {
        return;
      }

      /*
       * Gom theo SỐ HÓA ĐƠN nếu đã phát hành; chưa phát hành thì gom theo
       * NGÀY + ĐỐI TÁC — tức là một lượt giao hàng.
       *
       * Doanh thu nay sinh từ xuất kho nên phần lớn dòng chưa có số hóa đơn.
       * Nếu vẫn lấy số hóa đơn làm khoá thì mỗi dòng thành một nhóm riêng mang
       * nhãn "N/A", sổ chi tiết dài ra gấp mấy lần mà không nhóm được gì.
       */
      const issued = (r.invoiceNumber || "").trim();
      const key = issued || `chua-hd|${r.date.slice(0, 10)}|${r.partnerId || r.partnerName}`;
      const existing = groups.get(key);

      if (existing) {
        existing.totalAmount += r.totalAmount;
        existing.items.push(r);
      } else {
        groups.set(key, {
          key,
          invoiceNumber: issued || "CHƯA XUẤT HĐ",
          date: r.date,
          partnerName: r.partnerName,
          totalAmount: r.totalAmount,
          items: [r],
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      return b.date.localeCompare(a.date);
    });
  }, [filteredRevenueByTime, revenuePartnerSearch]);

  const periodLabel = useMemo(() => {
    if (timeFilter === "all") return "Tất cả thời gian";
    if (timeFilter === "day")
      return format(filterBaseDate, "'Ngày' dd/MM/yyyy", { locale: vi });
    if (timeFilter === "week") {
      const start = startOfWeek(filterBaseDate, { weekStartsOn: 1 });
      const end = endOfWeek(filterBaseDate, { weekStartsOn: 1 });
      return `Tuần ${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy")}`;
    }
    if (timeFilter === "month")
      return format(filterBaseDate, "'Tháng' MM/yyyy", { locale: vi });
    if (timeFilter === "year")
      return format(filterBaseDate, "'Năm' yyyy", { locale: vi });
    return "";
  }, [timeFilter, filterBaseDate]);

  const moveFilterDate = (direction: "prev" | "next") => {
    if (timeFilter === "all") return;

    let newDate: Date;
    if (timeFilter === "day")
      newDate =
        direction === "prev"
          ? subDays(filterBaseDate, 1)
          : addDays(filterBaseDate, 1);
    else if (timeFilter === "week")
      newDate =
        direction === "prev"
          ? subWeeks(filterBaseDate, 1)
          : addWeeks(filterBaseDate, 1);
    else if (timeFilter === "month")
      newDate =
        direction === "prev"
          ? subMonths(filterBaseDate, 1)
          : addMonths(filterBaseDate, 1);
    else
      newDate =
        direction === "prev"
          ? subYears(filterBaseDate, 1)
          : addYears(filterBaseDate, 1);

    setFilterBaseDate(newDate);
  };

  // Derived State: Batches (Tracking stock per batch) - OPTIMIZED O(N)
  const batches = useMemo(() => {
    // Chi tinh tren giao dich da duyet: hang chua co anh phieu ky thi chua co
    // trong kho, nen cung khong duoc tao ra lo hang nao de FIFO lay ra xuat.
    if (!countedTransactions.length) return [];

    // Process in chronological order for correct stock history/FIFO
    const sortedTransactions = [...countedTransactions].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateA.localeCompare(dateB);
    });

    // Look up products faster with a map
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    // Group transactions by product and batch for O(1) lookup
    const batchMap = new Map<string, BatchInfo>();

    // Single pass through transactions
    for (const t of sortedTransactions) {
      if (!t.batchNumber || !t.productId) continue;
      const key = `${t.productId}_${t.batchNumber}`;

      let existing = batchMap.get(key);
      if (!existing) {
        const product = productMap.get(t.productId);
        if (!product) continue;

        existing = {
          batchNumber: t.batchNumber,
          productId: t.productId,
          productName: t.productName || product.name,
          category: t.category || product.category,
          stock: 0,
          importDate: t.date,
        };
        batchMap.set(key, existing);
      }

      const qty = Number(t.quantity) || 0;

      if (t.type === "IN" || t.type === "OPENING") {
        existing.stock += qty;
        // Keep earliest import date
        if (t.date && t.date < existing.importDate) {
          existing.importDate = t.date;
        }
      } else if (
        t.type === "OUT" ||
        t.type === "LOSS" ||
        t.type === "DAMAGE" ||
        t.type === "ADJUST_OUT"
      ) {
        // Deduction regardless of status (in_transit means it's out of warehouse)
        existing.stock -= qty;
        if (
          t.date &&
          (!existing.lastExportDate || t.date > existing.lastExportDate)
        ) {
          existing.lastExportDate = t.date;
        }
      }
    }

    // Return batches (filter empty if needed, or keep for history)
    return Array.from(batchMap.values()).sort((a, b) => {
      const timeA = new Date(a.importDate).getTime();
      const timeB = new Date(b.importDate).getTime();
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeA - timeB;
    });
  }, [countedTransactions, products]);

  // AUTO-FILL FIFO SUGGESTION
  useEffect(() => {
    if (activeTab === "export" && !loading) {
      const currentItems = newTransaction.items;
      let hasChange = false;

      const updatedItems = currentItems.map((item) => {
        if (!item.productId) return item;
        const product = products.find((p) => p.id === item.productId);
        if (!product) return item;

        // Tìm lô đầu tiên còn hàng
        const oldestBatch = batches.find(
          (b) => b.productId === item.productId && b.stock > 0,
        );
        const targetBatch = oldestBatch ? oldestBatch.batchNumber : "";

        // Chỉ cập nhật nếu Lô dự kiến khác Lô hiện tại và Lô hiện tại chưa được người dùng nhập thủ công (hoặc rỗng)
        if (
          targetBatch &&
          item.batchNumber !== targetBatch &&
          (!item.batchNumber || item.batchNumber === "")
        ) {
          hasChange = true;
          return { ...item, batchNumber: targetBatch };
        }
        return item;
      });

      if (hasChange) {
        setNewTransaction((prev) => ({ ...prev, items: updatedItems }));
      }
    }
  }, [activeTab, batches, loading, products]); // Added products to dependencies

  // Default supplier for import
  useEffect(() => {
    if (activeTab === "import") {
      // Nhà máy nguồn hàng cũng lấy từ danh mục ghép: Firestore thiếu
      // SKB-BNC là cả tab nhập kho không chọn được nguồn.
      const skb = donVi.find((p) => p.id === "SKB-BNC" || p.name === "SKB-BNC");
      if (skb && newTransaction.partnerId !== skb.id) {
        setNewTransaction((prev) => ({
          ...prev,
          partnerId: skb.id,
          type: "IN",
        }));
      }
    }
  }, [activeTab, partners, newTransaction.partnerId]);

  const filteredTransactionsForReport = useMemo(() => {
    const bq = batchSearchQuery.toLowerCase().trim();
    const pq = reportPartnerSearch.toLowerCase().trim();

    // Bao cao phai khop voi ton kho, nen cung bo hang chua co anh phieu ky.
    // De lot vao day thi cot "Tong Nhap" se cao hon "Ton cuoi" mot cach khong
    // giai thich duoc, va file Excel xuat ra cung sai theo.
    let filtered = countedTransactionsByTime;

    if (bq) {
      filtered = filtered.filter((t) =>
        t.batchNumber?.toLowerCase().includes(bq),
      );
    }

    if (pq) {
      filtered = filtered.filter((t) =>
        t.partnerName?.toLowerCase().includes(pq),
      );
    }

    return filtered;
  }, [countedTransactionsByTime, batchSearchQuery, reportPartnerSearch]);

  /*
   * ẢNH CHO THƯ VIỆN — xem `src/lib/thuVienAnh.ts`.
   *
   * Phải gom từ HAI nguồn: ảnh tờ phiếu đã ký nằm ở `slips`, ảnh biên bản xuất
   * nằm ở `transactions`. Bản trước chỉ đọc `transactions[].evidencePhotoUrl`
   * nên tab Nhập kho luôn trống, dù người dùng đã tải ảnh phiếu lên đầy đủ.
   */
  const anhTruocLocDonVi = useMemo(
    () =>
      dungAnhThuVien({
        transactions,
        slips,
        loai: galleryFilter,
        tuNgay: galleryTuNgay,
        denNgay: galleryDenNgay,
        tuKhoa: gallerySearchQuery,
      }),
    [
      transactions,
      slips,
      galleryFilter,
      galleryTuNgay,
      galleryDenNgay,
      gallerySearchQuery,
    ],
  );

  /**
   * Đơn vị bày trong ô chọn: lấy từ bộ ảnh ĐANG XEM, tức là sau khi đã lọc
   * ngày, TRƯỚC khi lọc đơn vị.
   *
   * Sau khi lọc ngày thì ô chọn mới đúng ý "khoảng này có những đơn vị nào".
   * Trước khi lọc đơn vị thì chọn xong danh sách mới không co lại còn mỗi cái
   * vừa chọn, không thì đổi sang đơn vị khác phải bỏ lọc rồi chọn lại.
   */
  const donViCoAnh = useMemo(
    () => danhSachDonVi(anhTruocLocDonVi),
    [anhTruocLocDonVi],
  );

  /** Ảnh sau khi lọc đơn vị (hoặc phần của BNC), trước khi soi tiếp điểm bán. */
  const anhTruocLocBoPhan = useMemo(
    () => locTheoDonVi(anhTruocLocDonVi, galleryDonVi),
    [anhTruocLocDonVi, galleryDonVi],
  );

  /** Điểm bán có ảnh trong phần đang lọc; rỗng thì không bày ô chọn thứ hai. */
  const boPhanCoAnh = useMemo(
    () => danhSachBoPhanBNC(anhTruocLocBoPhan),
    [anhTruocLocBoPhan],
  );

  const anhThuVien = useMemo(
    () =>
      galleryBoPhan
        ? anhTruocLocBoPhan.filter((a) => a.donVi === galleryBoPhan)
        : anhTruocLocBoPhan,
    [anhTruocLocBoPhan, galleryBoPhan],
  );

  /** Số tấm lỗi trong đúng bộ đang xem, không đếm những tấm đã lọc ra ngoài. */
  const soAnhLoi = useMemo(
    () => anhThuVien.filter((a) => anhLoi.has(a.id)).length,
    [anhThuVien, anhLoi],
  );

  /**
   * TẢI HÀNG LOẠT: gói mọi ảnh đang xem vào một tệp ZIP.
   *
   * Gói đúng những tấm đang hiện trên lưới, tức là đã lọc theo chiều nhập/xuất,
   * theo khoảng ngày và theo từ khoá. Người dùng lọc xong nhìn thấy gì thì tải
   * đúng ngần ấy — không phải giải thích thêm là nút này tải cái gì.
   *
   * Tải bốn tấm một lúc: chờ từng tấm thì vài trăm tấm mất hàng phút, mà mở
   * hết một lúc thì Cloudinary chặn bớt và trình duyệt cũng nghẽn.
   *
   * Tấm nào tải hỏng thì BỎ QUA rồi đếm lại, không dừng cả mẻ. Hỏng một tấm mà
   * mất cả tệp thì tệ hơn nhiều; báo số hỏng ở cuối để còn biết mà kiểm.
   */
  const taiTatCaAnhThuVien = async () => {
    if (tienTrinhTaiAnh.tong > 0) return;
    const ds = anhThuVien;
    if (!ds.length) {
      showNotification("Không có ảnh nào trong khoảng đang xem", "error");
      return;
    }
    if (
      ds.length > 300 &&
      !window.confirm(
        `Sắp tải ${ds.length} ảnh và gói vào một tệp ZIP. Việc này có thể mất vài phút và tốn nhiều bộ nhớ. Tiếp tục?`,
      )
    ) {
      return;
    }

    setTienTrinhTaiAnh({ tong: ds.length, xong: 0, hong: 0 });
    const tep: { ten: string; duLieu: Uint8Array }[] = [];
    let hong = 0;
    let tongByte = 0;
    let tran = false;
    let ke = 0;

    // Chặn ở 800 MB: quá mức này trình duyệt hay hết bộ nhớ giữa chừng, mà
    // báo trước thì còn lọc hẹp lại được, chứ treo tab thì mất sạch.
    const TRAN_BYTE = 800 * 1024 * 1024;

    const chay = async () => {
      while (ke < ds.length && !tran) {
        const k = ke++;
        const a = ds[k];
        try {
          const r = await fetch(a.url);
          if (!r.ok) throw new Error(String(r.status));
          const du = new Uint8Array(await r.arrayBuffer());
          tongByte += du.length;
          if (tongByte > TRAN_BYTE) {
            tran = true;
          } else {
            tep.push({ ten: tenTrongZip(k + 1, a), duLieu: du });
          }
        } catch {
          hong += 1;
        }
        setTienTrinhTaiAnh((t) => ({ ...t, xong: t.xong + 1, hong }));
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(4, ds.length) }, () => chay()),
      );
      if (tran) {
        showNotification(
          "Bộ ảnh quá lớn (trên 800 MB). Thu hẹp khoảng ngày rồi tải lại.",
          "error",
        );
        return;
      }
      if (!tep.length) {
        showNotification("Không tải được tấm nào. Kiểm tra lại mạng.", "error");
        return;
      }
      // Xếp theo tên để giải nén ra đúng thứ tự đang xem: tải bốn luồng nên
      // thứ tự hoàn thành không theo thứ tự trên lưới.
      tep.sort((a, b) => a.ten.localeCompare(b.ten));
      const zip = taoZip(tep);
      const chieu = galleryFilter === "IN" ? "nhap-kho" : "xuat-kho";
      const khoang =
        galleryTuNgay || galleryDenNgay
          ? `-${galleryTuNgay || "dau"}-den-${galleryDenNgay || "nay"}`
          : "";
      const url = URL.createObjectURL(zip);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thu-vien-anh-${chieu}${khoang}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Thu hồi muộn một nhịp: thu ngay thì Safari huỷ luôn việc tải.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      showNotification(
        hong
          ? `Đã tải ${tep.length} ảnh, ${hong} tấm hỏng không lấy được`
          : `Đã tải ${tep.length} ảnh`,
        hong ? "error" : "success",
      );
    } finally {
      setTienTrinhTaiAnh({ tong: 0, xong: 0, hong: 0 });
    }
  };

  /**
   * Tổng số ảnh của chiều đang xem, KHÔNG lọc ngày.
   *
   * Để nói được "đang xem 4 trong 120 tấm" — không có con số này thì lưới rỗng
   * trông y hệt lúc chưa có ảnh nào, và người dùng không biết là do khoảng ngày
   * đang hẹp.
   */
  const tongAnhMoiChieu = useMemo(
    () =>
      dungAnhThuVien({
        transactions,
        slips,
        loai: galleryFilter,
        tuNgay: "",
        denNgay: "",
        tuKhoa: "",
      }).length,
    [transactions, slips, galleryFilter],
  );

  const batchLifecycle = useMemo(() => {
    const bq = batchSearchQuery.toLowerCase().trim();
    if (!bq || bq.length < 2) return null;

    // Dung giao dich da duyet de con so "Con lai" khop voi ton kho thuc.
    const allMatches = countedTransactions.filter((t) =>
      t.batchNumber?.toLowerCase().includes(bq),
    );
    if (allMatches.length === 0) return null;

    const imports = allMatches.filter(
      (t) => t.type === "IN" || t.type === "OPENING",
    );
    const exports = allMatches.filter(
      (t) => t.type === "OUT" && t.status !== "in_transit",
    );

    const totalIn = imports.reduce((sum, t) => sum + t.quantity, 0);
    const totalOut = exports.reduce((sum, t) => sum + t.quantity, 0);

    return {
      batchNumber: bq,
      imports,
      exports,
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      productName: allMatches[0].productName,
      unit:
        products.find((p) => p.id === allMatches[0].productId)?.unit ||
        "Đơn vị",
    };
  }, [countedTransactions, batchSearchQuery, products]);

  // Derived State: Import/Export Flow Summary
  const flowSummary = useMemo(() => {
    const summaryMap = new Map<
      string,
      {
        id: string;
        in: number;
        out: number;
        inValue: number;
        outValue: number;
        productName: string;
        category: Category;
        unit: string;
        openingStock: number;
        closingStock: number;
        /** Phần hao hụt, đã nằm trong . Tách ra chỉ để hiện thành cột riêng. */
        loss: number;
      }
    >();

    products.forEach((p) => {
      summaryMap.set(p.id, {
        id: p.id,
        in: 0,
        out: 0,
        inValue: 0,
        outValue: 0,
        productName: p.name,
        category: p.category,
        unit: p.unit,
        openingStock: 0,
        closingStock: 0,
        loss: 0,
      });
    });

    // 1. Calculate In/Out for the period
    const productPriceMap = new Map(products.map((p) => [p.id, p.price]));

    filteredTransactionsForReport.forEach((t) => {
      if (t.type === "OUT" && t.status === "in_transit") return;

      const entry = summaryMap.get(t.productId);
      if (entry) {
        const price = Number(productPriceMap.get(t.productId) || 0);
        /*
         * TỒN ĐẦU KỲ KHÔNG PHẢI HÀNG NHẬP TRONG KỲ.
         *
         * `OPENING` là số dư mang sang, không phải một lần nhập hàng. Cộng nó
         * vào cột "Tổng nhập" thì cột "Tồn đầu" — vốn tính ngược ra bằng
         * closing − in + out — sẽ ra 0, và người đọc báo cáo thấy kỳ này nhập
         * nhiều hơn thực tế đúng bằng số dư đầu kỳ.
         *
         * Nó VẪN nằm trong tồn cuối (xem phép tính closingStock bên dưới) vì
         * đó là hàng có thật trong kho.
         */
        if (t.type === "OPENING") {
          // không tính vào nhập trong kỳ
        } else if (t.type === "IN") {
          entry.in += Number(t.quantity || 0);
          entry.inValue += Number(t.quantity || 0) * price;
        } else {
          entry.out += Number(t.quantity || 0);
          entry.outValue += Number(t.quantity || 0) * price;
          /*
           * Hao hụt VẪN nằm trong `out` — phép tính tồn đầu (closing − in +
           * out) dựa vào đó. Đếm riêng thêm một lượt để hiện thành cột, vì
           * gộp vào "Tổng xuất" thì không ai biết trong đó có bao nhiêu là
           * hàng mình mất.
           */
          if (t.type === "LOSS" || t.type === "DAMAGE") {
            entry.loss += Number(t.quantity || 0);
          }
        }
      }
    });

    /* 
    // 1.1 Add Revenue data to Outflows - Removed to avoid double counting
    // Stock flow should follow physical transactions. Revenue is for reconciliation.
    filteredRevenueByTime.forEach(r => {
      const product = products.find(p => p.name === r.productName);
      if (product) {
        const entry = summaryMap.get(product.id);
        if (entry) {
          entry.out += r.quantity;
          entry.outValue += r.totalAmount;
        }
      }
    });
    */

    // 2. Calculate Closing Stock (Stock at the end of period)
    const baseTransactions = batchSearchQuery.trim()
      ? countedTransactions.filter((t) =>
          t.batchNumber
            ?.toLowerCase()
            .includes(batchSearchQuery.toLowerCase().trim()),
        )
      : countedTransactions;

    baseTransactions.forEach((t) => {
      // Don't subtract from closing stock if it's still in transit
      if (t.type === "OUT" && t.status === "in_transit") return;

      const entry = summaryMap.get(t.productId);
      if (entry) {
        const transDate = parseISO(t.date);
        // If "all" time, closing stock is current stock
        // If filtered, closing stock is stock up to end of period
        const isBeforeOrAtEnd = !dateRange || transDate <= dateRange.end;

        if (isBeforeOrAtEnd) {
          const multiplier = t.type === "IN" || t.type === "OPENING" ? 1 : -1;
          entry.closingStock += multiplier * t.quantity;
        }
      }
    });

    // 3. Calculate Opening Stock: Opening = Closing - In + Out
    summaryMap.forEach((entry) => {
      entry.openingStock = entry.closingStock - entry.in + entry.out;
    });

    return Array.from(summaryMap.values()).filter((item) => {
      if (!batchSearchQuery.trim()) return true;
      return (
        item.in > 0 ||
        item.out > 0 ||
        item.closingStock > 0 ||
        item.openingStock > 0
      );
    });
  }, [
    filteredTransactionsForReport,
    filteredRevenueByTime,
    countedTransactions,
    products,
    dateRange,
    batchSearchQuery,
  ]);

  /**
   * HANG DA DIEN NHUNG CHUA VAO TON - dang cho anh phieu ky.
   *
   * Dem theo SO PHIEU chu khong theo so ngay: mot ngay co the giao nhieu dot,
   * moi dot mot phieu rieng, va nguoi dung can biet con bao nhieu to phieu phai
   * di lay chu ky.
   */
  const pendingApproval = useMemo(() => {
    const rows = pendingSlipTransactions(transactions, approvedSlips);
    const slipCodes = new Set(rows.map((t) => t.slipCode!));
    const liters = rows.reduce((sum, t) => {
      const p = products.find((x) => x.id === t.productId);
      return sum + (t.quantity || 0) * ((p?.capacityPerUnit || 0) / 1000);
    }, 0);
    return {
      count: rows.length,
      slipCount: slipCodes.size,
      codes: [...slipCodes].sort(),
      liters,
    };
  }, [transactions, approvedSlips, products]);

  const inventory = useMemo(() => {
    const invMap = new Map<string, InventoryItem>();

    // Hàng đã điền nhưng chưa có ảnh ký, tách theo mặt hàng. Chỉ để HIỂN THỊ:
    // nó không đi vào `stock`, không đi vào `totalLiters`, không đi vào cảnh
    // báo mức thấp — cộng vào bất kỳ chỗ nào trong số đó là bỏ mất lớp khoá
    // chữ ký mà không có gì báo lỗi.
    const pendingByProduct = pendingStockByProduct(transactions, approvedSlips);

    // 1. Initialize for all products
    products.forEach((p) => {
      invMap.set(p.id, {
        productId: p.id,
        productName: p.name,
        category: p.category,
        unit: p.unit,
        stock: 0,
        totalLiters: 0,
        // Sản phẩm chưa đặt định mức riêng thì dùng ngưỡng chung, để danh sách
        // "sắp hết hàng" hoạt động thay vì luôn rỗng như trước.
        minStock: p.minStock ?? DEFAULT_MIN_STOCK,
        pendingStock: pendingByProduct.get(p.id) || 0,
      });
    });

    // 2. Aggregate from pre-calculated batches (O(B))
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    batches.forEach((b) => {
      const item = invMap.get(b.productId);
      const product = productMap.get(b.productId);
      if (item && product) {
        item.stock += b.stock;
        const units = b.stock * (product.conversionFactor || 1);
        const liters = (units * (product.capacityPerUnit || 1000)) / 1000;
        item.totalLiters += liters;
      }
    });

    // Xếp theo tồn CỘNG phần chờ ký — chỉ để xếp chỗ, không hiện ra thành số
    // nào. Xếp theo mỗi `stock` thì mặt hàng vừa nhập cả nghìn lon mà chưa ký
    // sẽ nằm đáy bảng, đúng lúc người ta cần nhìn thấy nó nhất.
    return Array.from(invMap.values()).sort(
      (a, b) => b.stock + b.pendingStock - (a.stock + a.pendingStock),
    );
  }, [batches, products, transactions, approvedSlips]);

  // Derived State: Stats & Turnover
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;

    // Da duyet: the "Tong nhap" phai khop voi ton kho, khong dem hang cho ky.
    countedTransactionsByTime.forEach((t) => {
      if (t.type === "IN") {
        totalIn += t.quantity;
      } else if (
        (t.type === "OUT" && t.status !== "in_transit") ||
        t.type === "LOSS" ||
        t.type === "DAMAGE"
      ) {
        totalOut += t.quantity;
      }
    });

    const currentStock = inventory.reduce((acc, curr) => acc + curr.stock, 0);
    const partnerCount = partners.length;
    const totalLiters = inventory.reduce(
      (acc, curr) => acc + curr.totalLiters,
      0,
    );

    const avgInventory = totalIn / 2 || 1;
    const turnoverRate = Number((totalOut / avgInventory).toFixed(2));

    const totalValue = inventory.reduce((acc, curr) => {
      const product = products.find((p) => p.id === curr.productId);
      return acc + curr.stock * (product?.price || 0);
    }, 0);

    let lowStockItems = 0;
    let outOfStockItems = 0;
    let healthyItems = 0;

    inventory.forEach((i) => {
      // Dùng đúng định mức của từng sản phẩm (đã có mặc định khi tính
      // inventory), thay vì một con số 10 riêng ở đây — trước kia thẻ "Cảnh
      // báo cạn kho" và danh sách "sắp hết hàng" chạy theo hai ngưỡng khác
      // nhau nên đếm ra hai kết quả lệch nhau.
      if (i.stock <= 0) outOfStockItems++;
      else if (i.stock < i.minStock) lowStockItems++;
      else healthyItems++;
    });

    return {
      totalIn,
      totalOut,
      currentStock,
      partnerCount,
      totalLiters,
      turnoverRate,
      totalValue,
      inventoryHealth: {
        low: lowStockItems,
        out: outOfStockItems,
        healthy: healthyItems,
      },
    };
  }, [countedTransactionsByTime, partners, inventory, products]);

  const filteredTransactions = useMemo(() => {
    const q = historySearchQuery.toLowerCase().trim();
    if (!q) return filteredTransactionsByTime;
    return filteredTransactionsByTime.filter((t) => {
      const basicMatch =
        t.productName.toLowerCase().includes(q) ||
        t.partnerName.toLowerCase().includes(q) ||
        t.batchNumber?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q);

      if (basicMatch) return true;

      const partner = donVi.find((p) => p.id === t.partnerId);
      return partner?.sapCode?.toLowerCase().includes(q);
    });
  }, [filteredTransactionsByTime, historySearchQuery, donVi]);

  const chartData = useMemo(() => {
    const categories: Category[] = ["Lon", "Lít", "Chai"];
    const results = categories.reduce(
      (acc, cat) => {
        acc[cat] = { name: cat, Nhập: 0, Xuất: 0, "Doanh thu": 0 };
        return acc;
      },
      {} as Record<string, any>,
    );

    const prodToCat = new Map(products.map((p) => [p.name, p.category]));

    countedTransactionsByTime.forEach((t) => {
      if (results[t.category]) {
        if (t.type === "IN") results[t.category].Nhập += t.quantity;
        else if (t.type === "OUT" && t.status !== "in_transit")
          results[t.category].Xuất += t.quantity;
      }
    });

    filteredRevenueByTime.forEach((r) => {
      const cat = prodToCat.get(r.productName) as string;
      if (cat && results[cat]) {
        results[cat]["Doanh thu"] += r.quantity;
      }
    });

    return Object.values(results);
  }, [countedTransactionsByTime, filteredRevenueByTime, products]);

  const handleAddTransaction = async (type: TransactionType) => {
    /*
     * Tra trên `donVi` (danh mục GHÉP) chứ không tra trên `partners`.
     *
     * Ô chọn hiện danh mục ghép, nên chọn được cả đơn vị mới chỉ có trong code
     * mà Firestore chưa có — 20 bộ phận BNC, SAIR. Tra ngược lại trên
     * `partners` thì không thấy, và người dùng nhận thông báo "Vui lòng chọn
     * đối tác" ngay sau khi vừa chọn xong. Chọn được thì phải lưu được: hai
     * bên phải đọc cùng một danh sách, không thì lại lệch lần nữa.
     */
    const par = donVi.find(
      (partner) => partner.id === newTransaction.partnerId,
    );

    // Global Validation
    //
    // NHOM_BNC_TAM là giá trị tạm của ô chọn, không phải đối tác thật — nên phép
    // tra bên trên không thấy và nhánh dưới đây chặn lại. Nói rõ thiếu gì thay
    // vì "chưa chọn đối tác", vì người dùng đã chọn BNC rồi.
    if (newTransaction.partnerId === NHOM_BNC_TAM) {
      alert(
        "Chưa chọn bộ phận của BNC.\n\nBấm đúng một bộ phận trong danh sách ngay dưới ô chọn đơn vị rồi lưu lại nhé.",
      );
      return;
    }

    if (!par && type !== "OPENING") {
      alert("Vui lòng chọn đối tác!");
      return;
    }

    // Items Validation
    const validItems = newTransaction.items.filter(
      (item) => item.productId && item.quantity > 0,
    );
    if (validItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm với số lượng hợp lệ!");
      return;
    }

    if (type === "IN") {
      // Nói rõ THIẾU Ở MẶT HÀNG NÀO. Bảng nhập có hơn chục dòng; câu "thiếu mã
      // lô" trống không bắt người dùng tự dò từng dòng để tìm ô còn trắng.
      const thieuLo = validItems
        .filter((item) => !item.batchNumber?.trim())
        .map(
          (item) =>
            products.find((p) => p.id === item.productId)?.name ||
            item.productId,
        );
      if (thieuLo.length > 0) {
        alert(
          `Chưa có số lô cho ${thieuLo.length} mặt hàng:\n\n· ${thieuLo.join("\n· ")}\n\nĐiền vào ô Số lô của từng dòng, hoặc điền một lần ở ô "Số lô chung" phía trên bảng.`,
        );
        return;
      }
    }

    if (type === "OUT") {
      for (const item of validItems) {
        const currentItem = inventory.find(
          (i) => i.productId === item.productId,
        );
        const canDung = Number(item.quantity) + (Number(item.lossQuantity) || 0);
        // Phai cong ca hao hut: hang di ra khoi kho la ca hai phan, khong chi
        // phan ghi cong no. Bo qua thi ton kho tut xuong am ma khong ai chan.
        if (!currentItem || currentItem.stock < canDung) {
          alert(
            `Sản phẩm "${products.find((p) => p.id === item.productId)?.name}" không đủ số lượng trong kho!`,
          );
          return;
        }
      }
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const referenceGroupId = `multi-${Date.now()}`;
      const timestamp = new Date().toISOString();
      const transactionDate = newTransaction.date
        ? newTransaction.date.includes("T")
          ? newTransaction.date
          : `${newTransaction.date}T${timestamp.split("T")[1]}`
        : timestamp;

      /**
       * MOT LUOT NHAP LA MOT PHIEU.
       *
       * Ca loat mat hang trong lan bam nay dung chung mot ma phieu -> in ra
       * dung mot to giay, hai ben ky mot lan. Ngay san xuat giao nhieu dot thi
       * moi dot mot ma (PN-260818-01, -02...), khong gop chung.
       *
       * Dem ma ke tiep tren CA HAI nguon: cac phieu da luu va ma phieu tren
       * chinh cac giao dich. Chi xet `slips` la khong du, vi tai lieu phieu chi
       * duoc tao luc bam In — giao dot thu hai truoc khi in dot mot se bi cap
       * lai dung ma cu, roi mot to anh ky duyet luon ca hai dot.
       */
      const slipCode =
        type === "IN"
          ? nextSlipCode(format(new Date(transactionDate), "yyyy-MM-dd"), [
              ...slips.map((s) => s.code),
              ...transactions.map((t) => t.slipCode),
            ])
          : undefined;

      // Local copy of batches to handle multiple items in one go
      let currentBatchesLocal = batches.map((b) => ({ ...b }));

      for (const item of validItems) {
        const p = products.find((prod) => prod.id === item.productId);
        if (!p) continue;

        if (type === "OUT") {
          const allocations = getFIFOAllocations(
            p.id,
            Number(item.quantity),
            currentBatchesLocal,
          );

          for (let i = 0; i < allocations.length; i++) {
            const alloc = allocations[i];
            const transactionId = `split-${Date.now()}-${item.productId}-${i}`;
            const transaction: Transaction = {
              id: transactionId,
              date: transactionDate,
              type: "OUT",
              productId: p.id,
              productName: p.name,
              category: p.category,
              quantity: alloc.quantity,
              partnerId: par?.id || "UNKNOWN",
              partnerName: par?.name || "Vô danh",
              notes:
                validItems.length > 1
                  ? `[Món ${validItems.indexOf(item) + 1}/${validItems.length}] ${allocations.length > 1 ? `[Lô ${i + 1}/${allocations.length}] ` : ""}${newTransaction.notes}`
                  : allocations.length > 1
                    ? `[Lô ${i + 1}/${allocations.length}] ${newTransaction.notes}`
                    : newTransaction.notes,
              batchNumber: alloc.batchNumber,
              evidencePhotoUrl: newTransaction.evidencePhotoUrl || null,
              evidencePhotoUrls:
                newTransaction.evidencePhotoUrls.length > 0
                  ? newTransaction.evidencePhotoUrls
                  : newTransaction.evidencePhotoUrl
                    ? [newTransaction.evidencePhotoUrl]
                    : [],
              createdBy: user || "Guest",
              referenceGroupId: referenceGroupId,
              status: newTransaction.isInTransit ? "in_transit" : "completed",
              originalQuantity: alloc.quantity,
            };
            batch.set(doc(db, "transactions", transactionId), transaction);
          }

          /*
           * HAO HỤT — ghi thành giao dịch RIÊNG, loại `LOSS`.
           *
           * Vì sao không cộng thẳng vào dòng xuất: dòng xuất là số lên công nợ
           * và lên hóa đơn. Cộng phần hao hụt vào đó là xuất hóa đơn cho phần
           * mình không thu tiền. Tách riêng thì tồn kho giảm đúng phần đã đi
           * ra thật, còn công nợ giữ đúng số đã thống nhất với đối tác.
           *
           * Cũng đi qua FIFO trên CÙNG bản sao tồn theo lô: có số lô thật thì
           * tồn theo lô mới trừ được — phép tính tồn theo lô bỏ qua mọi giao
           * dịch không có số lô, nên thiếu bước này là hao hụt ghi xong mà tồn
           * kho không đổi.
           *
           * `LOSS` đã bị `billableTransactions()` loại khỏi hóa đơn và doanh
           * thu, nên không phải làm gì thêm ở hai chỗ đó.
           */
          const hao = Number(item.lossQuantity) || 0;
          if (hao > 0) {
            const haoAlloc = getFIFOAllocations(p.id, hao, currentBatchesLocal);
            for (let k = 0; k < haoAlloc.length; k++) {
              const al = haoAlloc[k];
              const haoId = `hao-${Date.now()}-${p.id}-${k}`;
              batch.set(doc(db, "transactions", haoId), {
                id: haoId,
                date: transactionDate,
                type: "LOSS",
                productId: p.id,
                productName: p.name,
                category: p.category,
                quantity: al.quantity,
                partnerId: par?.id || "",
                partnerName: par?.name || "",
                notes: (`Hao hụt — không ghi công nợ · ${newTransaction.notes}`).trim().replace(/ · $/, ""),
                batchNumber: al.batchNumber,
                evidencePhotoUrls: [],
                createdBy: user || "Guest",
                referenceGroupId,
                status: "completed",
              } as Transaction);
            }
          }
        } else {
          const transactionId = `trx-${Date.now()}-${item.productId}`;
          const transaction: Transaction = {
            id: transactionId,
            date: transactionDate,
            type,
            productId: p.id,
            productName: p.name,
            category: p.category,
            quantity: Number(item.quantity),
            partnerId:
              type === "OPENING" ? "SYSTEM_BEGINNING" : par?.id || "UNKNOWN",
            partnerName:
              type === "OPENING" ? "Số dư đầu kỳ" : par?.name || "Vô danh",
            notes:
              validItems.length > 1
                ? `[Món ${validItems.indexOf(item) + 1}/${validItems.length}] ${newTransaction.notes}`
                : newTransaction.notes,
            batchNumber: item.batchNumber || null,
            evidencePhotoUrl: newTransaction.evidencePhotoUrl || null,
            evidencePhotoUrls:
              newTransaction.evidencePhotoUrls.length > 0
                ? newTransaction.evidencePhotoUrls
                : newTransaction.evidencePhotoUrl
                  ? [newTransaction.evidencePhotoUrl]
                  : [],
            createdBy: user || "Guest",
            referenceGroupId: referenceGroupId,
            // Chi hang nhap tay moi can chu ky. Ton dau ky khong co luot giao
            // nhan nao de hai ben ky nen khong gan ma phieu -> vao ton ngay.
            ...(slipCode ? { slipCode } : {}),
          };
          batch.set(doc(db, "transactions", transactionId), transaction);
        }
      }


      await batch.commit();

      const inTransit = newTransaction.isInTransit;

      // Immediate state updates
      // Nhap tay thi di thang sang tab Phieu nhap kho: hang chua co anh ky la
      // chua vao ton, nen viec ke tiep luon la in phieu cho hai ben ky. Dua
      // nguoi dung ve tab Lich su o day se de ho tuong da xong.
      setActiveTab(slipCode ? "slips" : inTransit ? "in-transit" : "history");
      setNewTransaction({
        type: "IN",
        partnerId:
          donVi.find((p) => p.id === "SKB-BNC" || p.name === "SKB-BNC")?.id ||
          donVi[0]?.id ||
          "",
        notes: "",
        evidencePhotoUrl: "",
        evidencePhotoUrls: [],
        date: format(new Date(), "yyyy-MM-dd"),
        isInTransit: false,
        items: [
          { productId: products[0]?.id || "", quantity: 0, batchNumber: "" },
        ],
      });

      setLoading(false);
      showNotification(
        slipCode
          ? `Đã tạo phiếu ${slipCode} — in ra cho hai bên ký, có ảnh ký thì hàng mới vào tồn`
          : "Hệ thống cập nhật data thành công",
      );
    } catch (err) {
      setLoading(false);
      // `alert` chứ không phải thông báo tự tắt: lưu hỏng là việc chưa xong,
      // người dùng phải đọc rồi mới đi tiếp. Thông báo 3 giây trôi qua trong
      // lúc họ đang nhìn chỗ khác thì coi như không có.
      alert(handleFirestoreError(err, OperationType.WRITE, "transactions"));
    }
  };

  const handleDeleteTransaction = async (id: string, productName: string) => {
    if (!isOwner) {
      alert("Chỉ anh Khoa mới có quyền xóa giao dịch ạ!");
      return;
    }
    if (
      !window.confirm(
        `Anh có chắc chắn muốn xóa giao dịch của sản phẩm "${productName}" này không?`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "transactions", id));
      showNotification("Đã xóa giao dịch thành công");
    } catch (err) {
      alert(
        handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`),
      );
    }
  };

  /**
   * ĐÃ ĐƯỢC DUYỆT LÀ DÙNG ĐƯỢC TOÀN BỘ PHÂN HỆ.
   *
   * Trước chia ba mức: VIEWER chỉ xem, STAFF ghi được kho, OWNER thêm doanh
   * thu. Nay chủ sở hữu quyết định bỏ phân cấp — vào được app thì dùng hết
   * chức năng, vì hai lớp đăng nhập Google + mã PIN đã đủ chặn người ngoài.
   *
   * Cửa thật sự còn lại là BƯỚC DUYỆT: tài khoản Google nào cũng đăng nhập
   * được, nhưng vào thì ở trạng thái PENDING và không đọc ghi được gì cho tới
   * khi chủ sở hữu bấm duyệt.
   *
   * Phải khớp đúng với `isApproved()` trong firestore.rules. Lệch bên nào cũng
   * sinh lỗi: luật chặt hơn giao diện thì người dùng làm xong mới bị từ chối;
   * luật rộng hơn giao diện thì mở DevTools là làm được thứ màn hình không cho.
   */
  const daDuocDuyet = useMemo(() => userRole !== "PENDING", [userRole]);

  const isAuthorizedFull = daDuocDuyet;
  const canWrite = daDuocDuyet;

  /**
   * Ai được THAO TÁC doanh thu.
   *
   * Xem thì cả bộ phận cùng xem — số liệu kinh doanh không phải bí mật với
   * người trong nhà. Nhưng tạo lệnh xuất hóa đơn lên SAP và dọn số liệu thì
   * chỉ kế toán: hóa đơn đã phát hành là đã lên cơ quan thuế, huỷ phải làm
   * biên bản. Chủ sở hữu cũng nằm trong nhóm này.
   *
   * Phải khớp đúng `isAccountant()` trong firestore.rules.
   */
  const laKeToan = useMemo(
    () => userRole === "OWNER" || userRole === "KE_TOAN",
    [userRole],
  );

  /**
   * Menu bên trái, chia theo NHÓM CÔNG VIỆC thay vì một danh sách dài.
   *
   * Người dùng tìm mục theo việc họ đang làm ("tôi cần nhập hàng") chứ không
   * theo thứ tự chữ cái, nên gom thành 5 nhóm quen thuộc với nghiệp vụ kho.
   * Nhóm nào hết mục (do phân quyền) thì tự ẩn luôn cả tiêu đề.
   */
  const navGroups = useMemo(() => {
    const isOwnerRole = userRole === "OWNER";
    const groups = [
      {
        id: "overview",
        title: "Tổng quan",
        items: [
          {
            id: "dashboard",
            label: "Bảng điều khiển",
            icon: LayoutDashboard,
            color: "#3b82f6",
          },
          {
            id: "inventory",
            label: "Tồn kho",
            icon: Package,
            color: "#f59e0b",
          },
        ],
      },
      {
        id: "operations",
        title: "Nhập · Xuất",
        /*
         * CHỈ NGƯỜI ĐƯỢC GHI MỚI THẤY NHÓM NÀY.
         *
         * Trước đây nhóm này không xét vai trò, nên người VIEWER vẫn mở được
         * màn hình nhập kho, điền hết số lượng, số lô, rồi bấm lưu — và bị máy
         * chủ từ chối ở bước cuối. Bắt người ta làm xong hết mới nói "không có
         * quyền" là tệ hơn hẳn việc không cho vào từ đầu.
         *
         * Đây đúng là kiểu lệch giữa giao diện và luật phân quyền mà
         * firestore.rules đã cảnh báo, chỉ khác chiều: lần này giao diện hứa
         * rộng hơn luật cho phép.
         */
        items: canWrite
          ? [
              {
                id: "import",
                label: "Nhập kho",
                icon: PlusCircle,
                color: "#10b981",
              },
              {
                id: "slips",
                label: "Phiếu nhập",
                icon: FileText,
                color: "#0ea5e9",
              },
              {
                id: "export",
                label: "Xuất kho",
                icon: MinusCircle,
                color: "#f97316",
              },
              {
                id: "in-transit",
                label: "Đơn đi đường",
                icon: Truck,
                color: "#fbbf24",
              },
            ]
          : [],
      },
      {
        id: "reports",
        title: "Báo cáo",
        items: [
          // Báo cáo: Owner, Staff và Viewer đều xem được
          {
            id: "reports",
            label: "Báo cáo tổng hợp",
            icon: TrendingUp,
            color: "#f43f5e",
          },
          {
            id: "debt",
            label: "Công nợ · Hóa đơn",
            icon: Receipt,
            color: "#14b8a6",
          },
          // BNC nhận phần lớn sản lượng mà hóa đơn chỉ có một dòng, nên cần
          // một chỗ riêng nhìn xuống từng bộ phận.
          {
            id: "bnc",
            label: "Đơn BNC",
            icon: Building2,
            color: "#0284c7",
          },
          // Doanh thu: ai cũng XEM được; riêng thao tác thì chỉ kế toán,
          // chặn ở trong tab chứ không chặn ở menu.
          {
            id: "revenue-mgmt",
            label: "Doanh thu",
            icon: FileSpreadsheet,
            color: "#8b5cf6",
          },
        ],
      },
      {
        id: "records",
        title: "Dữ liệu",
        items: [
          {
            id: "gallery",
            label: "Thư viện ảnh",
            icon: ImageIcon,
            color: "#ec4899",
          },
          { id: "partners", label: "Đối tác", icon: Users, color: "#6366f1" },
          { id: "history", label: "Lịch sử", icon: History, color: "#64748b" },
        ],
      },
      {
        id: "system",
        title: "Hệ thống",
        // Cài đặt: CHỈ CHỦ SỞ HỮU
        items: isOwnerRole
          ? [
              {
                id: "settings",
                label: "Cài đặt",
                icon: ShieldCheck,
                color: "#ef4444",
              },
            ]
          : [],
      },
    ];

    return groups.filter((g) => g.items.length > 0);
  }, [userRole]);

  // Danh sách phẳng — dùng cho kiểm tra quyền vào tab và tra tên tab đang mở
  const navItems = useMemo(
    () => navGroups.flatMap((g) => g.items),
    [navGroups],
  );

  // Handle unauthorized tab access
  useEffect(() => {
    const navIds = navItems.map((i) => i.id);
    if (user && !navIds.includes(activeTab)) {
      setActiveTab(navIds[0] || "dashboard");
    }
  }, [user, activeTab, navItems]);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Superior Background Architecture */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=2574&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-20 scale-100"
            alt="Background"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-100/60 via-white/40 to-slate-100/60" />
        </div>

        <div className="flex flex-col items-center gap-8 relative z-10 transition-all duration-300">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Beer className="w-6 h-6 text-slate-400" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-widest font-serif italic uppercase">
              Bia Bà Nà
            </h1>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">
              Đang tải dữ liệu...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ManHinhDangNhap
        onLogin={handleGoogleLogin}
        isAuthenticating={isAuthenticating}
        authError={authError}
        maBuild={__BUILD_ID__}
      />
    );
  }

  /**
   * Da dang nhap Google nhung chu so huu chua duyet.
   *
   * Man hinh nay chan hoan toan phan giao dien du lieu. Nhung do khong phai
   * lop bao ve that: quy tac Firestore moi la thu chan that su - nguoi chua
   * duyet co goi thang vao co so du lieu cung khong doc duoc gi.
   */
  // Đứng TRƯỚC màn hình chờ duyệt: chưa đọc được hồ sơ thì chưa biết người này
  // đang chờ duyệt hay đã là quản trị, nói bừa cái nào cũng sai.
  if (user && loiHoSo) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 premium-shadow text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Chưa xác định được quyền
            </h2>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              {loiHoSo}
              <br />
              <br />
              Vai trò của bạn KHÔNG bị thay đổi. Kiểm tra sóng rồi thử lại.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" /> Thử lại
            </Button>
            <Button variant="ghost" className="flex-1" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Đăng xuất
            </Button>
          </div>
          <div className="text-left">
            <KiemTraQuyen vaiTroTrongApp={userRole} />
          </div>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 font-sans">
        <div className="fixed top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 premium-shadow text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Tài khoản đang chờ duyệt
            </h2>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              Bạn đã đăng nhập thành công bằng
              <br />
              <span className="text-slate-900 break-all">
                {currentUserProfile?.email}
              </span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
              Vui lòng liên hệ quản trị viên để được cấp quyền truy cập. Sau khi
              được duyệt, bạn chỉ cần tải lại trang là vào được.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" /> Tải lại
            </Button>
            <Button variant="ghost" className="flex-1" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Đăng xuất
            </Button>
          </div>

          {/* Người bị chặn ở màn hình này cũng cần biết vì sao — có khi vai trò
              đã được cấp rồi mà hồ sơ lại nằm ở một UID khác. */}
          <div className="text-left">
            <KiemTraQuyen vaiTroTrongApp={userRole} />
          </div>
        </div>
      </div>
    );
  }

  /**
   * LOP BAO VE THU 2: MA PIN
   *
   * Day la KHOA MAN HINH cho may dung chung, khong phai lop xac thuc
   * mat ma. Nguoi da co tai khoan Google hop le van co the goi thang vao
   * co so du lieu ma khong qua man hinh nay - viec chan that su nam o
   * firestore.rules. Muc dich cua PIN la: dong nghiep ngoi vao may ai do
   * quen dang xuat thi khong xem/sua duoc du lieu kho.
   */
  if (!pinUnlocked) {
    const needsSetup = !currentUserProfile?.pinHash;

    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 font-sans">
        <div className="fixed top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 premium-shadow space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {needsSetup ? "Thiết lập mã PIN" : "Nhập mã PIN"}
            </h2>
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
              {needsSetup
                ? "Đặt mã PIN 6 chữ số để bảo vệ khi dùng máy chung. Bạn sẽ cần mã này mỗi lần mở app."
                : "Lớp bảo vệ thứ 2 cho tài khoản"}
              <br />
              <span className="text-slate-900">{currentUserProfile?.email}</span>
            </p>
          </div>

          {pinError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
                {pinError}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              autoFocus
              placeholder="● ● ● ● ● ●"
              value={pinInput}
              onChange={(e) =>
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  needsSetup ? handleCreatePin() : handleVerifyPin();
                }
              }}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-primary focus:bg-white transition-all"
            />

            {needsSetup && (
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                placeholder="Nhập lại mã PIN"
                value={pinConfirmInput}
                onChange={(e) =>
                  setPinConfirmInput(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePin();
                }}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center text-lg font-black tracking-[0.4em] outline-none focus:border-primary focus:bg-white transition-all"
              />
            )}
          </div>

          <Button
            className="w-full"
            loading={pinBusy}
            onClick={needsSetup ? handleCreatePin : handleVerifyPin}
            disabled={pinBusy || pinInput.length !== 6}
          >
            {needsSetup ? "Đặt mã PIN" : "Mở khoá"}
          </Button>

          <button
            onClick={handleLogout}
            className="w-full text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors py-2"
          >
            Đăng xuất
          </button>

          {!needsSetup && (
            <p className="text-[10px] font-bold text-slate-400 text-center leading-relaxed">
              Quên mã PIN? Liên hệ quản trị viên để đặt lại.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-screen bg-bg-main text-slate-900 font-sans overflow-hidden transition-all duration-150",
        (loading || isAccountModalOpen) && user
          ? "blur-[1px] brightness-95"
          : "",
      )}
    >
      {/* Vach vang tren dinh man hinh - dau nhan dien cua thuong hieu bia */}
      <div className="fixed top-0 inset-x-0 h-1 z-[100] bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600 pointer-events-none" />

      {/* Hai vet sang ho phach lam nen bot phang. Dat duoi cung (z-0) va
          khong bat su kien chuot de khong can tro thao tac. */}
      <div className="fixed -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-amber-500/10 dark:bg-amber-500/15 blur-[130px] pointer-events-none z-0" />
      <div className="fixed -bottom-48 -right-32 w-[560px] h-[560px] rounded-full bg-amber-400/10 dark:bg-amber-400/10 blur-[140px] pointer-events-none z-0" />

      {/* Account Profile Modal */}
      {isAccountModalOpen && currentUserProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <div
            onClick={() => setIsAccountModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md pointer-events-auto"
          />
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white overflow-hidden relative z-10 pointer-events-auto">
            <div className="p-8 sm:p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Hồ sơ cá nhân
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Thông tin tài khoản hệ thống
                  </p>
                </div>
                <button
                  onClick={() => setIsAccountModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Họ và tên
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {currentUserProfile.name || "Chưa đặt tên"}
                      </p>
                    </div>
                    {currentUserProfile.photoURL ? (
                      <img
                        src={currentUserProfile.photoURL}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Tài khoản Google
                    </p>
                    <p className="text-sm font-bold text-slate-900 break-all">
                      {currentUserProfile.email}
                    </p>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Chức danh
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {userRole === "OWNER"
                          ? "Thẩm quyền tối cao"
                          : userRole === "KE_TOAN"
                            ? "Kế toán"
                            : userRole === "STAFF"
                              ? "Chuyên viên Vận hành"
                              : userRole === "VIEWER"
                                ? "Người xem phân tích"
                                : "Chờ phê duyệt"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        userRole === "PENDING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-600",
                      )}
                    >
                      {userRole === "PENDING" ? "Chờ duyệt" : "Active"}
                    </div>
                  </div>
                </div>

                {/* Mat khau do Google quan ly - app khong luu gi ca */}
                <div className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50/60 flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                      Bảo mật bởi Google
                    </p>
                    <p className="text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                      Mật khẩu và xác thực hai lớp do tài khoản Google của bạn
                      quản lý. Hệ thống này không lưu mật khẩu của bạn. Muốn đổi
                      mật khẩu, vui lòng đổi trực tiếp trong tài khoản Google.
                    </p>
                  </div>
                </div>

                {/* Ai cũng bấm được, kể cả người chỉ xem — đúng ra người bị
                    chặn mới là người cần nó nhất. */}
                <KiemTraQuyen vaiTroTrongApp={userRole} />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Processing Overlay */}
      {loading && user && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/5 backdrop-blur-[1px]">
          <div className="bg-white/90 backdrop-blur-3xl p-8 rounded-3xl shadow-2xl border border-white flex flex-col items-center gap-6 scale-up-center">
            <div className="relative">
              <div className="w-16 h-16 border-[5px] border-slate-100 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary/30 animate-spin-slow" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] mb-1">
                Tin Tin đang xử lý
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Vui lòng đợi trong giây lát...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking Notification */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
          <div
            className={cn(
              "px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300",
              notification.type === "success"
                ? "bg-emerald-500/90 text-white border-emerald-400"
                : "bg-rose-500/90 text-white border-rose-400",
            )}
          >
            <div className="flex items-center gap-3">
              {notification.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="font-bold text-sm tracking-tight">
                {notification.message}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white border-r border-slate-100 transition-all duration-200 transform lg:relative lg:translate-x-0 overflow-hidden shrink-0 flex flex-col premium-shadow",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:w-0 lg:opacity-0 lg:border-none",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-amber-500/30 rotate-3 group hover:rotate-0 transition-transform">
                <Beer className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-serif italic leading-none">
                  BIA BÀ NÀ
                </h1>
                <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 sm:mt-2">
                  SUNCRAFT BREWERY
                </p>
                {/*
                  Ma commit cua ban dang chay. Sua giao dien nhieu lan roi
                  khong biet app dang la ban nao — Vercel chua build xong,
                  build hong, hay trinh duyet con giu ban cu. Doi chieu ma nay
                  voi commit moi nhat la biet ngay, khong phai doan.
                */}
                <p
                  className="text-[8px] font-mono font-bold text-slate-300 mt-0.5"
                  title="Mã commit của bản đang chạy"
                >
                  build {__BUILD_ID__}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 sm:px-4 custom-scrollbar overflow-y-auto pb-4">
            {navGroups.map((group, groupIndex) => (
              <div key={group.id} className={groupIndex > 0 ? "mt-6" : ""}>
                <p className="px-3 sm:px-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id === "export") {
                          setNewTransaction((prev) => ({
                            ...prev,
                            isInTransit: true,
                          }));
                        } else if (item.id === "import") {
                          setNewTransaction((prev) => ({
                            ...prev,
                            isInTransit: false,
                          }));
                        }
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 group relative overflow-hidden text-left",
                        activeTab === item.id
                          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <item.icon
                        className="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{
                          color:
                            activeTab === item.id ? "#ffffff" : item.color,
                        }}
                      />
                      <span className="flex-1 min-w-0 truncate text-[13px] sm:text-sm font-bold tracking-tight">
                        {item.label}
                      </span>
                      {activeTab === item.id && (
                        <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/*
            Chân menu: gọn lại còn một thẻ nhỏ. Trước đây chiếm gần 1/3 chiều
            cao cột trái trong khi đây chỉ là thông tin phụ — tên nhãn rút
            ngắn để không bị cắt chữ, hai nút phụ nằm cùng một hàng.
          */}
          <div className="px-3 sm:px-4 pb-4 pt-2 shrink-0">
            <div className="bg-slate-50/60 rounded-2xl p-2 border border-slate-100">
              <button
                onClick={() => setIsAccountModalOpen(true)}
                className="w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white transition-all text-left"
              >
                <div className="w-9 h-9 shrink-0 rounded-xl bg-white flex items-center justify-center text-primary font-black text-sm shadow-sm ring-1 ring-slate-100">
                  {user?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 truncate tracking-tight leading-tight">
                    {user}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <p className="text-[11px] font-semibold text-slate-400 truncate">
                      {userRole === "OWNER"
                        ? "Chủ sở hữu"
                        : userRole === "KE_TOAN"
                          ? "Kế toán"
                          : userRole === "STAFF"
                            ? "Vận hành"
                            : "Chỉ xem"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
              </button>

              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                {isOwner && (
                  <button
                    onClick={handleHardReset}
                    title="Xoá toàn bộ dữ liệu trong hệ thống"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-amber-600 hover:bg-amber-50 text-[11px] font-bold transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Dọn sạch
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-rose-500 hover:bg-rose-50 text-[11px] font-bold transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 sm:h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {navItems.find((i) => i.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-slate-600">
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* Chuyen che do sang / toi */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/40 hover:bg-slate-100 transition-all"
            >
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-50/30">
          <div
            key={activeTab}
            className="max-w-7xl mx-auto space-y-4 sm:space-y-8 pb-24"
          >
            {/*
              MỘT dải cảnh báo cho mọi kho dữ liệu đang không đọc được.
              Đặt ngay đầu vùng nội dung để không bỏ sót, nhưng gọn một dòng
              chứ không phải thông báo đỏ toàn màn hình — số liệu đọc được vẫn
              dùng bình thường trong lúc chờ sửa phân quyền.
            */}
            {Object.keys(loiDoc).length > 0 && (
              <div className="p-3 rounded-2xl border border-rose-200 bg-rose-50 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-black text-rose-800 uppercase tracking-wider">
                    Không đọc được {Object.keys(loiDoc).length} kho dữ liệu:{" "}
                    {Object.keys(loiDoc).join(", ")}
                  </p>
                  <p className="text-[11px] font-bold text-rose-700/90 leading-relaxed">
                    {Object.values(loiDoc)[0]}
                  </p>
                </div>
              </div>
            )}

            {/* Global Filter Bar for Analytical Tabs */}
            {[
              "dashboard",
              "inventory",
              "reports",
              "revenue-mgmt",
              "history",
            ].includes(activeTab) && (
              <div className="bg-white/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex bg-slate-100/50 p-1 rounded-xl sm:rounded-2xl border border-slate-100 w-full md:w-auto overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: "all", label: "Tất cả" },
                      { id: "day", label: "Ngày thực tế" },
                      { id: "week", label: "Tuần thực tế" },
                      { id: "month", label: "Tháng thực tế" },
                      { id: "year", label: "Năm thực tế" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTimeFilter(f.id)}
                      className={cn(
                        "flex-1 md:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        timeFilter === f.id
                          ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
                          : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {timeFilter !== "all" && (
                  <div className="flex items-center gap-4 bg-slate-50/50 px-6 py-2 rounded-2xl border border-slate-100">
                    <button
                      onClick={() => moveFilterDate("prev")}
                      className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>

                    <div className="flex flex-col items-center min-w-[140px] relative group px-2">
                      <button
                        onClick={() => {
                          if (dateInputRef.current) {
                            dateInputRef.current.click();
                            dateInputRef.current.focus();
                          }
                        }}
                        className="flex flex-col items-center hover:scale-105 transition-transform"
                      >
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-primary opacity-60" />
                          <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                            {periodLabel}
                          </span>
                        </div>
                      </button>
                      <input
                        ref={dateInputRef}
                        type="date"
                        className="absolute inset-0 opacity-0 pointer-events-none"
                        value={format(filterBaseDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          if (e.target.value)
                            setFilterBaseDate(parseISO(e.target.value));
                        }}
                      />
                      <button
                        onClick={() => setFilterBaseDate(new Date())}
                        className="text-[9px] font-bold text-primary hover:underline mt-0.5"
                      >
                        Về hôm nay
                      </button>
                    </div>

                    <button
                      onClick={() => moveFilterDate("next")}
                      className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {isAuthorizedFull && activeTab === "dashboard" && (
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all cursor-pointer border border-primary/20">
                        <FileUp className="w-3.5 h-3.5" /> Nạp Excel Tồn Kho
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportInventoryExcel}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                      Phạm vi dữ liệu
                    </p>
                    <p className="text-[11px] font-black text-slate-900 mt-1 uppercase">
                      Đã tối ưu hóa
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <Filter className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "dashboard" && (
              <>
                {userRole === "OWNER" && (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5">
                    <StatCard
                      title="TỔNG DOANH THU"
                      value={formatNumber(
                        filteredRevenueByTime.reduce(
                          (a, b) => a + b.totalAmount,
                          0,
                        ),
                      )}
                      unit="đ"
                      icon={DollarSign}
                      color="green"
                      subtitle="Dữ liệu theo kỳ"
                      trend={
                        filteredRevenueByTime.length > 0
                          ? `+${filteredRevenueByTime.length} GD`
                          : "0 GD"
                      }
                      chartData={filteredRevenueByTime
                        .slice(-10)
                        .map((r) => ({ value: r.totalAmount }))}
                    />
                    <StatCard
                      title="VÒNG QUAY TỒN KHO"
                      value={stats.turnoverRate}
                      unit="x"
                      icon={RefreshCw}
                      color="primary"
                      target="4.5x"
                      trend="+0.3"
                      chartData={[
                        { value: 4.0 },
                        { value: 4.1 },
                        { value: 3.9 },
                        { value: 4.2 },
                        { value: 4.2 },
                      ]}
                    />
                    <StatCard
                      title="TỶ LỆ LẤY ĐẦY (FILL RATE)"
                      value="98.5"
                      unit="%"
                      icon={Layers}
                      color="green"
                      target="98%"
                      trend="+1.2%"
                      chartData={[
                        { value: 95 },
                        { value: 96 },
                        { value: 97.5 },
                        { value: 98 },
                        { value: 98.5 },
                      ]}
                    />
                    <StatCard
                      title="ĐỘ CHÍNH XÁC TỒN KHO"
                      value="99.8"
                      unit="%"
                      icon={ShieldCheck}
                      color="primary"
                      target="100%"
                      trend="Ổn định"
                      chartData={[
                        { value: 99.5 },
                        { value: 99.7 },
                        { value: 99.8 },
                        { value: 99.6 },
                        { value: 99.8 },
                      ]}
                    />
                    <StatCard
                      title="CHI PHÍ LƯU KHO"
                      value="12.4"
                      unit="%"
                      icon={Package2}
                      color="rose"
                      target="Giảm 2% so với Q1"
                      trend="-2.1%"
                      chartData={[
                        { value: 14.5 },
                        { value: 14.0 },
                        { value: 13.2 },
                        { value: 12.8 },
                        { value: 12.4 },
                      ]}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Operations & Storage Center */}
                  <Card
                    title="Vận hành Kho & Bảo quản"
                    className="lg:col-span-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Nhiệt độ kho lạnh
                        </p>
                        <div className="flex items-baseline gap-2">
                          <h5 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            4.2°C
                          </h5>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">
                            Celsius
                          </span>
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                            OPTIMAL
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Độ ẩm trung bình
                        </p>
                        <div className="flex items-baseline gap-2">
                          <h5 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            65%
                          </h5>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">
                            Humidity
                          </span>
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                            NORMAL
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Sử dụng diện tích
                        </p>
                        <div className="flex items-baseline gap-2">
                          <h5 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            78.5%
                          </h5>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">
                            Capacity
                          </span>
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                            STABLE
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Lô hàng chậm (Aging &gt; 15 ngày)
                        </p>
                        <div className="flex items-baseline gap-2">
                          <h5 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {
                              batches.filter(
                                (b) =>
                                  b.stock > 0 &&
                                  differenceInDays(
                                    new Date(),
                                    parseISO(b.importDate),
                                  ) > 15,
                              ).length
                            }
                          </h5>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">
                            Lô hàng
                          </span>
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              batches.filter(
                                (b) =>
                                  b.stock > 0 &&
                                  differenceInDays(
                                    new Date(),
                                    parseISO(b.importDate),
                                  ) > 15,
                              ).length > 0
                                ? "bg-rose-500 animate-pulse"
                                : "bg-emerald-500",
                            )}
                          />
                          <span
                            className={cn(
                              "text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none",
                              batches.filter(
                                (b) =>
                                  b.stock > 0 &&
                                  differenceInDays(
                                    new Date(),
                                    parseISO(b.importDate),
                                  ) > 15,
                              ).length > 0
                                ? "text-rose-600"
                                : "text-emerald-600",
                            )}
                          >
                            {batches.filter(
                              (b) =>
                                b.stock > 0 &&
                                differenceInDays(
                                  new Date(),
                                  parseISO(b.importDate),
                                ) > 15,
                            ).length > 0
                              ? "CRITICAL"
                              : "ALL CLEAR"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Stock-out & Low Inventory Defense Center */}
                  <Card
                    title="⚠️ Cảnh báo Đứt hàng & Tồn thấp"
                    className="lg:col-span-4 bg-slate-900 border-none shadow-2xl"
                  >
                    <div className="space-y-4 sm:space-y-6">
                      {inventory.filter((i) => i.stock <= i.minStock).length ===
                      0 ? (
                        <div className="py-8 sm:py-12 flex flex-col items-center text-center">
                          <ShieldCheck className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-500 mb-4 sm:mb-6 opacity-20" />
                          <p className="text-[10px] sm:text-sm font-bold text-white uppercase tracking-widest">
                            Toàn bộ kho hàng ổn định
                          </p>
                        </div>
                      ) : (
                        inventory
                          .filter((i) => i.stock <= i.minStock)
                          .slice(0, 5)
                          .map((item) => (
                            <div
                              key={item.productId}
                              className="group cursor-help"
                            >
                              <div className="flex justify-between items-center mb-2 sm:mb-3">
                                <div className="flex flex-col">
                                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors leading-none">
                                    {item.productName}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mt-1 sm:mt-1.5">
                                    Min: {item.minStock} {item.unit}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={cn(
                                      "text-sm sm:text-base font-black font-mono",
                                      item.stock <= 0
                                        ? "text-rose-500"
                                        : "text-amber-500",
                                    )}
                                  >
                                    {item.stock}{" "}
                                    <span className="text-[9px] sm:text-[10px] opacity-40">
                                      {item.unit}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 sm:h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-1000 ease-out",
                                    item.stock <= 0
                                      ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                      : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
                                  )}
                                  style={{
                                    width: `${Math.min(100, (item.stock / (item.minStock || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))
                      )}

                      {inventory.filter((i) => i.stock <= i.minStock).length >
                        5 && (
                        <button
                          onClick={() => setActiveTab("inventory")}
                          className="w-full py-3 sm:py-4 bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] transition-all border border-white/5"
                        >
                          Tất cả{" "}
                          {
                            inventory.filter((i) => i.stock <= i.minStock)
                              .length
                          }{" "}
                          cảnh báo
                        </button>
                      )}
                    </div>
                  </Card>

                  {/* Batch Aging & Slow Moving Inventory Dashboard */}
                  <Card
                    title="📊 Phân tích Lô hàng mới (Trong 7 ngày)"
                    className="lg:col-span-12"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {/* Aging Categories Summary */}
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                          Tuân thủ FIFO (Mới)
                        </p>
                        <p className="text-2xl font-black text-emerald-700">
                          {
                            batches.filter(
                              (b) =>
                                b.stock > 0 &&
                                differenceInDays(
                                  new Date(),
                                  parseISO(b.importDate),
                                ) < 7,
                            ).length
                          }
                        </p>
                        <p className="text-[8px] font-bold text-emerald-500 mt-1 uppercase">
                          Dưới 7 ngày
                        </p>
                      </div>
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">
                          Cảnh báo chậm (Lưu kho)
                        </p>
                        <p className="text-2xl font-black text-amber-700">
                          {
                            batches.filter(
                              (b) =>
                                b.stock > 0 &&
                                differenceInDays(
                                  new Date(),
                                  parseISO(b.importDate),
                                ) >= 7 &&
                                differenceInDays(
                                  new Date(),
                                  parseISO(b.importDate),
                                ) <= 15,
                            ).length
                          }
                        </p>
                        <p className="text-[8px] font-bold text-amber-500 mt-1 uppercase">
                          7 - 15 ngày
                        </p>
                      </div>
                      <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex flex-col items-center text-center">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">
                          Hàng tồn đọng (Critical)
                        </p>
                        <p className="text-2xl font-black text-rose-700">
                          {
                            batches.filter(
                              (b) =>
                                b.stock > 0 &&
                                differenceInDays(
                                  new Date(),
                                  parseISO(b.importDate),
                                ) > 15,
                            ).length
                          }
                        </p>
                        <p className="text-[8px] font-bold text-rose-500 mt-1 uppercase">
                          Trên 15 ngày
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/20">
                            <th className="font-serif italic text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-5 px-3 sm:px-6">
                              Mã Lô
                            </th>
                            <th className="font-serif italic text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-5 px-3 sm:px-6">
                              Sản phẩm
                            </th>
                            <th className="font-serif italic text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-5 px-3 sm:px-6 text-right">
                              Tồn hiện tại
                            </th>
                            <th className="font-serif italic text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-5 px-3 sm:px-6 text-center">
                              Ngày nhập
                            </th>
                            <th className="font-serif italic text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-5 px-3 sm:px-6 text-right">
                              Thời gian lưu kho
                            </th>
                            <th className="font-serif italic text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-5 px-3 sm:px-6 text-right">
                              Trạng thái
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                          {batches
                            .filter(
                              (b) =>
                                b.stock > 0 &&
                                differenceInDays(
                                  new Date(),
                                  parseISO(b.importDate),
                                ) <= 7,
                            )
                            .sort(
                              (a, b) =>
                                new Date(b.importDate).getTime() -
                                new Date(a.importDate).getTime(),
                            ) // Newest first for recent view
                            .slice(0, 7)
                            .map((batch) => {
                              const age = differenceInDays(
                                new Date(),
                                parseISO(batch.importDate),
                              );
                              return (
                                <tr
                                  key={`${batch.productId}_${batch.batchNumber}`}
                                  className="hover:bg-slate-50/50 transition-all group"
                                >
                                  <td className="py-3 sm:py-5 px-3 sm:px-6">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={cn(
                                          "w-2 h-8 rounded-full shadow-sm",
                                          age > 15
                                            ? "bg-rose-500 shadow-rose-200"
                                            : age >= 7
                                              ? "bg-amber-400 shadow-amber-100"
                                              : "bg-emerald-400 shadow-emerald-100",
                                        )}
                                      />
                                      <span className="font-mono text-[10px] sm:text-xs text-slate-600 font-black">
                                        #{batch.batchNumber}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 sm:py-5 px-3 sm:px-6">
                                    <div className="flex flex-col">
                                      <span className="text-xs sm:text-sm font-black text-slate-900 leading-none tracking-tight">
                                        {batch.productName}
                                      </span>
                                      <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-1.5">
                                        {batch.category}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 sm:py-5 px-3 sm:px-6 font-mono text-right text-xs sm:text-sm font-black text-slate-900">
                                    {formatNumber(batch.stock)}
                                  </td>
                                  <td className="py-3 sm:py-5 px-3 sm:px-6 text-center font-mono text-[9px] sm:text-xs text-slate-400 font-bold">
                                    {formatDisplayDate(batch.importDate)}
                                  </td>
                                  <td className="py-3 sm:py-5 px-3 sm:px-6 text-right">
                                    <span
                                      className={cn(
                                        "text-xs sm:text-sm font-black italic",
                                        age > 15
                                          ? "text-rose-600"
                                          : age >= 7
                                            ? "text-amber-600"
                                            : "text-emerald-600",
                                      )}
                                    >
                                      {age}{" "}
                                      <span className="text-[9px] not-italic opacity-60">
                                        ngày
                                      </span>
                                    </span>
                                  </td>
                                  <td className="py-3 sm:py-5 px-3 sm:px-6 text-right">
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1 shadow-sm",
                                        age > 15
                                          ? "bg-rose-50 border-rose-100 text-rose-600"
                                          : age >= 7
                                            ? "bg-amber-50 border-amber-100 text-amber-600"
                                            : "bg-emerald-50 border-emerald-100 text-emerald-600",
                                      )}
                                    >
                                      {age > 15
                                        ? "Đọng kho"
                                        : age >= 7
                                          ? "Chậm"
                                          : "Bình thường"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {batches.filter((b) => b.stock > 0).length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-20 text-center">
                                <AlertCircle className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                  Không có lô hàng tồn kho hiện tại
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Info className="w-5 h-5 text-primary" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose">
                            Dashboard hiện đang lọc các lô hàng nhập trong vòng{" "}
                            <span className="text-primary font-black">
                              7 ngày qua
                            </span>{" "}
                            để tối ưu hiển thị.
                          </p>
                          {batches.filter(
                            (b) =>
                              b.stock > 0 &&
                              differenceInDays(
                                new Date(),
                                parseISO(b.importDate),
                              ) > 7,
                          ).length > 0 && (
                            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">
                              Chú ý: Có{" "}
                              {
                                batches.filter(
                                  (b) =>
                                    b.stock > 0 &&
                                    differenceInDays(
                                      new Date(),
                                      parseISO(b.importDate),
                                    ) > 7,
                                ).length
                              }{" "}
                              lô hàng khác đang có dấu hiệu chậm/đọng kho (&gt;
                              7 ngày).
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("inventory")}
                        className="bg-white text-[10px] w-full sm:w-auto"
                      >
                        KIỂM TRA TOÀN KHO
                      </Button>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === "inventory" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative max-w-md w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors hover:text-primary" />
                    <input
                      placeholder="Tìm kiếm sản phẩm trong kho..."
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm transition-all premium-shadow"
                    />
                  </div>
                  <Button variant="outline" className="bg-white">
                    <Download className="w-4 h-4" /> Xuất báo cáo Excel
                  </Button>
                </div>

                <Card title="Trạng thái tồn kho chi tiết" noPadding>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="font-bold text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest py-3 sm:py-4 px-3 sm:px-6">
                            Sản phẩm
                          </th>
                          <th className="font-bold text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest py-3 sm:py-4 px-3 sm:px-6">
                            Quy cách
                          </th>
                          <th className="font-bold text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest py-3 sm:py-4 px-3 sm:px-6 text-right">
                            Tồn kho
                          </th>
                          <th
                            className="font-bold text-[9px] sm:text-[10px] text-amber-600 uppercase tracking-widest py-3 sm:py-4 px-3 sm:px-6 text-right"
                            title="Đã điền vào app nhưng chưa có ảnh phiếu ký. Chưa cộng vào tồn kho và chưa xuất bán được."
                          >
                            Chờ ký
                          </th>
                          <th className="font-bold text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest py-3 sm:py-4 px-3 sm:px-6 text-right">
                            Phòng kho
                          </th>
                          <th className="font-bold text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest py-3 sm:py-4 px-3 sm:px-6 text-right">
                            Cảnh báo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inventory.map((item) => (
                          <tr
                            key={item.productId}
                            onClick={() =>
                              setSelectedInventoryProduct(item.productId)
                            }
                            className="hover:bg-slate-50 transition-colors group cursor-pointer"
                          >
                            <td className="py-3 sm:py-4 px-3 sm:px-6">
                              <p className="font-bold text-slate-900 leading-none text-xs sm:text-sm">
                                {item.productName}
                              </p>
                              <p className="text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                {item.productId}
                              </p>
                            </td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6">
                              <span
                                className={cn(
                                  "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-tighter border",
                                  item.category === "Lon"
                                    ? "bg-orange-50 border-orange-100 text-orange-600"
                                    : item.category === "Lít"
                                      ? "bg-blue-50 border-blue-100 text-blue-600"
                                      : "bg-emerald-50 border-emerald-100 text-emerald-600",
                                )}
                              >
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6 font-mono text-right text-sm sm:text-lg font-black text-slate-900">
                              {formatNumber(item.stock)}
                            </td>
                            {/*
                              Cot "cho ky": so da dien nhung chua co anh phieu
                              ky. Co dau + de doc ra ngay la "them ngoai ton",
                              khong phai mot phan cua con so ben trai.
                            */}
                            <td className="py-3 sm:py-4 px-3 sm:px-6 font-mono text-right text-sm sm:text-lg font-black">
                              {item.pendingStock > 0 ? (
                                <span
                                  className="text-amber-600"
                                  title="Chưa vào tồn — cần ảnh phiếu ký"
                                >
                                  +{formatNumber(item.pendingStock)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6 font-mono text-right text-sm sm:text-lg font-black text-primary">
                              {formatNumber(item.totalLiters)}
                              <span className="text-[10px] sm:text-xs font-bold ml-0.5">
                                L
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {item.stock <= 50 ? (
                                <span className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                                  MỨC THẤP
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                  ỔN ĐỊNH
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Batch Detail Modal/Section */}
                {selectedInventoryProduct && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                      onClick={() => setSelectedInventoryProduct(null)}
                    />
                    <Card
                      className="relative w-full max-w-2xl bg-white shadow-2xl border-2 border-slate-900 rounded-3xl overflow-hidden"
                      noPadding
                    >
                      <div className="bg-slate-900 p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-900" />
                          </div>
                          <div>
                            <h3 className="text-white text-lg font-black uppercase tracking-tight italic font-serif">
                              {" "}
                              CHI TIẾT TỒN KHO THEO LÔ
                            </h3>
                            <p className="text-amber-400 text-[9px] font-black uppercase tracking-widest">
                              {
                                products.find(
                                  (p) => p.id === selectedInventoryProduct,
                                )?.name
                              }
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedInventoryProduct(null)}
                          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                        >
                          <RefreshCw className="w-5 h-5 rotate-45" />
                        </button>
                      </div>

                      <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                        <div className="space-y-4">
                          {batches.filter(
                            (b) =>
                              b.productId === selectedInventoryProduct &&
                              b.stock > 0,
                          ).length > 0 ? (
                            batches
                              .filter(
                                (b) =>
                                  b.productId === selectedInventoryProduct &&
                                  b.stock > 0,
                              )
                              .map((batch) => (
                                <div
                                  key={batch.batchNumber}
                                  className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-primary/30 transition-all"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex flex-col items-center justify-center shadow-sm">
                                      <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                                        LÔ
                                      </span>
                                      <span className="text-xs font-black text-slate-900 font-mono italic">
                                        #{batch.batchNumber}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                                        Ngày nhập
                                      </p>
                                      <p className="text-sm font-bold text-slate-900 font-mono">
                                        {formatDate(batch.importDate)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                                    <div className="sm:text-right">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                                        Số lượng tồn
                                      </p>
                                      <p className="text-xl font-black text-slate-900 flex items-baseline gap-1.5">
                                        {formatNumber(batch.stock)}
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          {products.find(
                                            (p) => p.id === batch.productId,
                                          )?.unit || "Đơn vị"}
                                        </span>
                                      </p>
                                    </div>
                                    {batch.lastExportDate && (
                                      <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter mt-1 text-right">
                                        Xuất gần nhất:{" "}
                                        {format(
                                          parseISO(batch.lastExportDate),
                                          "dd/MM",
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="py-20 text-center flex flex-col items-center">
                              <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] italic">
                                Sản phẩm hiện đã hết hàng tồn kho
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center gap-3">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                            Hệ thống đang áp dụng phương pháp FIFO để trừ tồn
                            kho theo lô
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-8">
                {/* Report Sub-Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-100 rounded-2xl w-fit premium-shadow">
                      {(
                        [
                          { id: "summary", label: "Tổng hợp", icon: Layers },
                          { id: "in", label: "Báo cáo Nhập", icon: PlusCircle },
                          {
                            id: "out",
                            label: "Báo cáo Xuất",
                            icon: MinusCircle,
                          },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setReportSubTab(st.id)}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            reportSubTab === st.id
                              ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                              : "text-slate-400 hover:text-slate-900 hover:bg-slate-50",
                          )}
                        >
                          <st.icon className="w-4 h-4" />
                          {st.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Lọc theo Mã lô..."
                          value={batchSearchQuery}
                          onChange={(e) => setBatchSearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all"
                        />
                        {batchSearchQuery && (
                          <button
                            onClick={() => setBatchSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="relative w-full sm:w-64">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Lọc theo Đối tác..."
                          value={reportPartnerSearch}
                          onChange={(e) =>
                            setReportPartnerSearch(e.target.value)
                          }
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all"
                        />
                        {reportPartnerSearch && (
                          <button
                            onClick={() => setReportPartnerSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="px-6 py-2.5 bg-white border border-slate-100"
                      onClick={handleExportReportToExcel}
                    >
                      <Download className="w-4 h-4" /> Xuất Báo Cáo
                    </Button>
                  </div>
                </div>

                {batchLifecycle && (
                  <div className="bg-white border-2 border-slate-900 rounded-3xl overflow-hidden shadow-2xl shadow-slate-200">
                    <div className="bg-slate-900 px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-slate-900" />
                        </div>
                        <div>
                          <h3 className="text-white text-xl font-black uppercase tracking-tight italic font-serif">
                            TRUY XUẤT NGUỒN GỐC LÔ HÀNG
                          </h3>
                          <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                            Mã lô: {batchLifecycle.batchNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                          <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">
                            Tồn kho lô
                          </p>
                          <p className="text-sm font-black text-white">
                            {formatNumber(batchLifecycle.balance)}{" "}
                            <span className="text-[10px] font-bold text-white/60">
                              {batchLifecycle.unit}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50/30">
                      {/* Lịch sử Nhập */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <PlusCircle className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                            Lịch sử Nhập hàng
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {batchLifecycle.imports.length > 0 ? (
                            batchLifecycle.imports.map((imp) => (
                              <div
                                key={imp.id}
                                className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex justify-between items-center group hover:border-emerald-300 transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs">
                                    {format(parseISO(imp.date), "dd/MM")}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                      Từ: {imp.partnerName}
                                    </p>
                                    <h5 className="text-xs font-bold text-slate-900">
                                      {imp.productName}
                                    </h5>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-emerald-600">
                                    +{formatNumber(imp.quantity)}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    {/* Giao dịch không lưu đơn vị tính; đơn vị
                                        lấy từ danh mục sản phẩm. Bản cũ đọc
                                        imp.unit — trường không tồn tại nên
                                        luôn rơi về nhánh sau. */}
                                    {products.find(
                                      (p) => p.id === imp.productId,
                                    )?.unit || batchLifecycle.unit}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic border-2 border-dashed border-slate-200 rounded-2xl">
                              Không tìm thấy dữ liệu nhập của lô này
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lịch sử Xuất */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MinusCircle className="w-4 h-4 text-rose-600" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                            Lịch sử Xuất hàng
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {batchLifecycle.exports.length > 0 ? (
                            batchLifecycle.exports.map((exp) => (
                              <div
                                key={exp.id}
                                className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex justify-between items-center group hover:border-rose-300 transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-black text-xs">
                                    {format(parseISO(exp.date), "dd/MM")}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                      Đến: {exp.partnerName}
                                    </p>
                                    <h5 className="text-xs font-bold text-slate-900">
                                      {exp.productName}
                                    </h5>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-rose-600">
                                    -{formatNumber(exp.quantity)}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    {products.find(
                                      (p) => p.id === exp.productId,
                                    )?.unit || batchLifecycle.unit}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic border-2 border-dashed border-slate-200 rounded-2xl">
                              Lô này chưa phát sinh giao dịch xuất kho
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 px-8 border-t border-slate-100 flex items-center gap-4">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        Truy xuất dữ liệu trên toàn bộ hệ thống (Bao gồm dữ liệu
                        ngoài khoảng thời gian đang lọc)
                      </p>
                    </div>
                  </div>
                )}

                {reportSubTab === "summary" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Strategic "Speaking" Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-xl p-4 sm:p-6 relative overflow-hidden group">
                        <div className="relative z-10">
                          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
                            Giá trị tồn kho
                          </p>
                          <h3 className="text-xl sm:text-2xl font-black text-white">
                            {(stats.totalValue / 1000000).toFixed(1)}M{" "}
                            <span className="text-xs sm:text-sm font-bold text-slate-500">
                              VNĐ
                            </span>
                          </h3>
                          <div className="mt-3 sm:mt-4 flex items-center gap-2 text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-400/10 w-fit px-2 sm:px-2.5 py-1 rounded-lg">
                            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{" "}
                            +2.4% vs tuần trước
                          </div>
                        </div>
                        <DollarSign className="absolute right-[-5px] bottom-[-5px] sm:right-[-10px] sm:bottom-[-10px] w-16 h-16 sm:w-24 sm:h-24 text-white/5 group-hover:scale-110 transition-transform" />
                      </Card>

                      <Card className="bg-white border border-slate-100 shadow-sm p-4 sm:p-6 relative overflow-hidden group">
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
                          Điểm sức khỏe kho
                        </p>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                            {Math.round(
                              (stats.inventoryHealth.healthy /
                                (inventory.length || 1)) *
                                100,
                            )}
                            %
                          </h3>
                          <div className="flex-1 h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                              style={{
                                width: `${(stats.inventoryHealth.healthy / (inventory.length || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-3 sm:mt-4 leading-relaxed">
                          {stats.inventoryHealth.healthy} sản phẩm đạt ngưỡng an
                          toàn.
                        </p>
                      </Card>

                      <Card className="bg-rose-50 border-rose-100 p-4 sm:p-6 relative overflow-hidden group">
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-rose-400 mb-1.5">
                          Cảnh báo cạn kho
                        </p>
                        <div className="flex items-end gap-2">
                          <h3 className="text-2xl sm:text-3xl font-black text-rose-600">
                            {stats.inventoryHealth.low +
                              stats.inventoryHealth.out}
                          </h3>
                          <p className="text-[10px] sm:text-xs font-bold text-rose-400 mb-1 sm:mb-1.5 uppercase">
                            Sản phẩm
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-3 flex gap-2">
                          <div className="px-2 py-0.5 sm:py-1 rounded bg-rose-200 text-rose-700 text-[9px] sm:text-[10px] font-black uppercase">
                            {stats.inventoryHealth.out} Đã hết
                          </div>
                          <div className="px-2 py-0.5 sm:py-1 rounded bg-amber-200 text-amber-700 text-[9px] sm:text-[10px] font-black uppercase">
                            {stats.inventoryHealth.low} Sắp hết
                          </div>
                        </div>
                        <AlertTriangle className="absolute right-[-5px] top-[-5px] w-12 h-12 sm:w-16 sm:h-16 text-rose-500/10" />
                      </Card>

                      <Card className="bg-indigo-50 border-indigo-100 p-4 sm:p-6 relative overflow-hidden group">
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-1.5">
                          Hiệu suất vận hành
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black text-indigo-900">
                          {stats.turnoverRate}{" "}
                          <span className="text-xs sm:text-sm">vòng/kỳ</span>
                        </h3>
                        <div className="mt-3 sm:mt-4 flex flex-col gap-1 sm:gap-1.5">
                          <div className="flex justify-between text-[9px] sm:text-xs font-bold text-indigo-500 uppercase tracking-tighter">
                            <span>Tốc độ xuất bình quân</span>
                            <span>
                              {formatNumber(
                                stats.totalOut /
                                  (timeFilter === "all" ? 30 : 7),
                              )}
                              /ngày
                            </span>
                          </div>
                          <div className="w-full h-1 sm:h-1.5 bg-indigo-200 rounded-full" />
                        </div>
                        <HandCoins className="absolute right-[-5px] bottom-[-5px] sm:right-[-10px] sm:bottom-[-10px] w-16 h-16 sm:w-24 sm:h-24 text-indigo-500/10" />
                      </Card>
                    </div>

                    {/* Revenue Summary Integration - OWNER ONLY */}
                    {userRole === "OWNER" &&
                    filteredRevenueByTime.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 bg-slate-900 border-none shadow-2xl p-4 sm:p-8 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                            <div className="space-y-2 text-center md:text-left">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                Tổng doanh thu kỳ này
                              </p>
                              <h3 className="text-2xl sm:text-4xl font-black text-white">
                                {formatNumber(cfoMetrics.totalRevenue)}{" "}
                                <span className="text-[10px] sm:text-sm font-bold opacity-40">
                                  VNĐ
                                </span>
                              </h3>
                              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-center md:justify-start">
                                <TrendingUp className="w-3 h-3" /> Tăng trưởng
                                ổn định dựa trên báo cáo
                              </p>
                            </div>
                            <div className="hidden md:block w-px h-16 bg-white/10" />
                            <div className="flex-1 w-full">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
                                Top Đối tác mua nhiều nhất
                              </p>
                              <div className="space-y-3">
                                {cfoMetrics.partnerStats
                                  .slice(0, 2)
                                  .map((p) => (
                                    <div
                                      key={p.name}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-xs font-bold text-white/70 uppercase tracking-tight">
                                        {p.name}
                                      </span>
                                      <span className="text-xs font-black text-white">
                                        {formatNumber(p.value)}đ
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                        <Card className="bg-white border-slate-100 p-4 sm:p-8 flex flex-col justify-center items-center text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                            Sản phẩm tiêu thụ chính
                          </p>
                          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-3">
                            <Package className="w-8 h-8" />
                          </div>
                          <h4 className="font-black text-slate-900 uppercase">
                            {cfoMetrics.productQtyStats[0]?.name || "—"}
                          </h4>
                          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            Dẫn đầu sản lượng
                          </p>
                        </Card>
                      </div>
                    ) : (
                      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 group hover:bg-primary/10 transition-all duration-500">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary transform group-hover:rotate-6 transition-transform">
                            <FileSpreadsheet className="w-8 h-8" />
                          </div>
                          <div className="space-y-1 text-center md:text-left">
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                              Kích hoạt Phân tích Doanh thu
                            </h4>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider leading-relaxed max-w-sm">
                              Tải lên tệp Excel của đại lý tại mục{" "}
                              <span
                                className="text-primary underline cursor-pointer"
                                onClick={() => setActiveTab("revenue-mgmt")}
                              >
                                Quản lý Doanh thu
                              </span>{" "}
                              để tích hợp vào báo cáo tổng hợp.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("revenue-mgmt")}
                          className="px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          Đến mục Doanh thu
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card
                        title="Phân tích Doanh thu tiềm năng (Hàng tồn)"
                        noPadding
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50/50">
                                <th className="py-4 px-6 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                                  Sản phẩm
                                </th>
                                <th className="py-4 px-6 font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">
                                  Tồn hiện tại
                                </th>
                                <th className="py-4 px-6 font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">
                                  Giá trị (VNĐ)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {inventory
                                .sort((a, b) => b.stock - a.stock)
                                .slice(0, 5)
                                .map((item) => {
                                  const product = products.find(
                                    (p) => p.id === item.productId,
                                  );
                                  const value =
                                    item.stock * (product?.price || 0);
                                  return (
                                    <tr
                                      key={item.productId}
                                      className="hover:bg-slate-50 transition-colors"
                                    >
                                      <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                                        {item.productName}
                                      </td>
                                      <td className="py-4 px-6 text-right font-mono text-sm">
                                        {formatNumber(item.stock)}
                                      </td>
                                      <td className="py-4 px-6 text-right font-mono text-sm font-black text-primary">
                                        {formatNumber(value)}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </Card>

                      <Card title="Xu hướng nhập/xuất bia">
                        <div className="h-[300px] w-full mt-4">
                          <ResponsiveContainer
                            width="100%"
                            height={300}
                            minWidth={0}
                          >
                            <BarChart data={chartData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke={chartColors.grid}
                              />
                              <XAxis
                                dataKey="name"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: chartColors.axis }}
                              />
                              <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: chartColors.axis }}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "12px",
                                  border: chartColors.tooltipBorder,
                                  backgroundColor: chartColors.tooltipBg,
                                  color: chartColors.tooltipText,
                                  boxShadow:
                                    "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                                  fontSize: "12px",
                                }}
                                itemStyle={{ color: chartColors.tooltipText }}
                                labelStyle={{ color: chartColors.tooltipText }}
                                cursor={{
                                  fill: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.04)",
                                }}
                              />
                              <Legend
                                wrapperStyle={{
                                  fontSize: "11px",
                                  fontWeight: "Bold",
                                  textTransform: "uppercase",
                                  paddingTop: "20px",
                                }}
                              />
                              <Bar
                                dataKey="Nhập"
                                fill={chartColors.blue}
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                              />
                              <Bar
                                dataKey="Xuất"
                                fill={chartColors.rose}
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                              />
                              {userRole === "OWNER" ? (
                                <Bar
                                  dataKey="Doanh thu"
                                  fill={chartColors.emerald}
                                  radius={[4, 4, 0, 0]}
                                  barSize={20}
                                />
                              ) : null}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    <Card title="Báo cáo Lưu chuyển & Tồn kho" noPadding>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                                Sản phẩm
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-right">
                                Tồn đầu
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-right">
                                Nhập
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-right">
                                Xuất
                              </th>
                              {/*
                                Hao hut tach thanh cot rieng. Gop vao "Xuat"
                                thi khong ai biet trong do bao nhieu la hang
                                minh mat - va cung khong kiem duoc rang hao
                                hut da ghi hay chua.
                              */}
                              <th className="font-bold text-[10px] text-amber-600 uppercase tracking-widest py-4 px-6 text-right">
                                Hao hụt
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-right">
                                Tồn cuối
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-right">
                                Tình trạng
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {flowSummary.map((item) => {
                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-slate-50 transition-colors group"
                                >
                                  <td className="py-4 px-6">
                                    <p className="font-bold text-slate-900 text-xs">
                                      {item.productName}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                                      {item.category}
                                    </p>
                                  </td>
                                  <td className="py-4 px-6 font-mono text-right text-xs font-bold text-slate-500">
                                    {formatNumber(item.openingStock)}
                                  </td>
                                  <td className="py-4 px-6 font-mono text-right text-xs font-bold text-emerald-600">
                                    {formatNumber(item.in)}
                                  </td>
                                  <td className="py-4 px-6 font-mono text-right text-xs font-bold text-rose-500">
                                    {formatNumber(item.out)}
                                  </td>
                                  <td className="py-4 px-6 font-mono text-right text-xs font-bold">
                                    {item.loss > 0 ? (
                                      <span className="text-amber-600">
                                        {formatNumber(item.loss)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6 font-mono text-right text-xs font-black text-slate-900">
                                    {formatNumber(item.closingStock)}
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    {item.in > 0 && item.out / item.in > 0.8 ? (
                                      <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                        Dòng vốn nhanh
                                      </span>
                                    ) : item.in > 0 &&
                                      item.out / item.in < 0.2 ? (
                                      <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                        Tồn đọng
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        Ổn định
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}

                {(reportSubTab === "in" || reportSubTab === "out") && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card
                      title={
                        reportSubTab === "in"
                          ? "Chi Tiết Nhật Ký Nhập Kho"
                          : "Chi Tiết Nhật Ký Xuất Kho"
                      }
                      noPadding
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                                Ngày thực nhập/xuất
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                                Sản phẩm
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-right">
                                Số lượng
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                                Người thực hiện
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                                Đối tác
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-center">
                                Mã lô
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                                Ghi chú
                              </th>
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-center">
                                Thao tác
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredTransactionsForReport
                              .filter((t) => {
                                if (reportSubTab === "in")
                                  return (
                                    t.type === "IN" || t.type === "OPENING"
                                  );
                                return (
                                  t.type === "OUT" && t.status !== "in_transit"
                                );
                              })
                              .map((t, idx, arr) => {
                                const isGrouped =
                                  t.referenceGroupId &&
                                  ((idx > 0 &&
                                    arr[idx - 1].referenceGroupId ===
                                      t.referenceGroupId) ||
                                    (idx < arr.length - 1 &&
                                      arr[idx + 1].referenceGroupId ===
                                        t.referenceGroupId));
                                return (
                                  <tr
                                    key={t.id}
                                    className={cn(
                                      "hover:bg-slate-50 transition-colors relative group/row",
                                      isGrouped ? "bg-amber-50/10" : "",
                                    )}
                                  >
                                    <td className="py-4 px-6 relative">
                                      {isGrouped && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400" />
                                      )}
                                      <div className="text-[11px] font-bold text-slate-900 font-mono flex items-center gap-2">
                                        {isGrouped && (
                                          // Bọc trong <span> để có tooltip:
                                          // icon Lucide không nhận prop title.
                                          <span title="Giao dịch xuất nhiều lô">
                                            <Layers className="w-3 h-3 text-amber-500" />
                                          </span>
                                        )}
                                        {formatDate(t.date)}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex flex-col">
                                        <div className="font-bold text-slate-900 text-sm leading-tight">
                                          {t.productName}
                                        </div>
                                        <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">
                                          {t.category}
                                        </div>
                                        {isGrouped && (
                                          <div className="text-[8px] font-black text-amber-600 uppercase tracking-tighter mt-1 bg-amber-100/50 w-fit px-1 rounded">
                                            Phần của lệnh xuất gộp
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                      <span
                                        className={cn(
                                          "font-mono font-black text-sm",
                                          t.type === "IN"
                                            ? "text-emerald-600"
                                            : "text-rose-600",
                                        )}
                                      >
                                        {formatNumber(t.quantity)}
                                      </span>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                                          {t.createdBy.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">
                                          {t.createdBy}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-tight">
                                      {t.partnerName}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      <button
                                        onClick={() => {
                                          if (t.batchNumber) {
                                            setBatchSearchQuery(t.batchNumber);
                                            setReportSubTab(
                                              t.type === "OUT" ? "out" : "in",
                                            );
                                          }
                                        }}
                                        className={cn(
                                          "inline-block px-2 py-1 rounded text-[10px] font-black font-mono transition-all",
                                          t.batchNumber
                                            ? "bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white cursor-pointer"
                                            : "text-slate-300",
                                        )}
                                      >
                                        {t.batchNumber || "—"}
                                      </button>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-2 min-w-[100px]">
                                        <span className="text-xs text-slate-400 italic italic">
                                          {t.notes || "—"}
                                        </span>
                                        {t.evidencePhotoUrl && (
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={() => {
                                                setGalleryFilter(
                                                  t.type === "IN" ||
                                                    t.type === "OPENING"
                                                    ? "IN"
                                                    : "OUT",
                                                );
                                                setGallerySearchQuery(
                                                  t.type === "OUT"
                                                    ? t.partnerName
                                                    : t.batchNumber || "",
                                                );
                                                // Mở thư viện đúng ngày của
                                                // giao dịch này, không phải cả
                                                // tháng.
                                                try {
                                                  const ngay = format(
                                                    parseISO(t.date),
                                                    "yyyy-MM-dd",
                                                  );
                                                  setGalleryTuNgay(ngay);
                                                  setGalleryDenNgay(ngay);
                                                } catch (e) {}
                                                setActiveTab("gallery");
                                              }}
                                              className="w-6 h-6 bg-primary/5 text-primary rounded flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                              title="Chuyển đến Thư viện ảnh"
                                            >
                                              <ImageIcon className="w-3 h-3" />
                                            </button>
                                            <a
                                              href={t.evidencePhotoUrl}
                                              download={`bien-ban-${t.id}.png`}
                                              className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"
                                              title="Tải về"
                                            >
                                              <Download className="w-3 h-3" />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      <button
                                        onClick={() =>
                                          handleDeleteTransaction(
                                            t.id,
                                            t.productName,
                                          )
                                        }
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Xóa giao dịch"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            {filteredTransactionsForReport.filter((t) => {
                              if (reportSubTab === "in")
                                return t.type === "IN" || t.type === "OPENING";
                              return (
                                t.type === "OUT" && t.status !== "in_transit"
                              );
                            }).length === 0 && (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="py-20 text-center text-slate-400 text-sm font-bold uppercase tracking-widest opacity-30"
                                >
                                  Chưa có dữ liệu giao dịch phù hợp.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === "revenue-mgmt" && daDuocDuyet && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Trung tâm Quản lý Doanh thu
                    </h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-none">
                      Phân tích & Theo dõi số liệu kinh doanh
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* Xuất Excel chỉ đọc số rồi tải về máy, không đụng gì tới
                        dữ liệu — nên ai xem được thì tải được. */}
                    <button
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                      onClick={handleExportRevenueToExcel}
                    >
                      <Download className="w-4 h-4 text-primary" /> Xuất Excel
                      Doanh thu
                    </button>
                    {/*
                      Nút dùng MỘT LẦN: dọn số doanh thu cũ nạp từ file Excel.
                      Xoá dữ liệu nên chỉ kế toán thấy.
                    */}
                    {laKeToan && (
                      <button
                        className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-200 hover:scale-105 active:scale-95 transition-all"
                        onClick={clearOldRevenueDocs}
                      >
                        <Trash2 className="w-4 h-4" /> Dọn số cũ
                      </button>
                    )}
                  </div>
                </div>

                {/*
                  XUAT HOA DON LEN SAP.
                  De ngay dau tab, tren ca phan phan tich: day la viec phai lam
                  hang ky, con phan phan tich la thu de xem.
                */}
                <SapExportPanel
                  rows={sapSourceRows}
                  jobs={sapJobs}
                  canRun={laKeToan}
                  busy={sapBusy}
                  onCreate={handleCreateSapJob}
                  onDownload={downloadSapJobFile}
                  onChangeStatus={handleChangeSapJobStatus}
                />

                {revenueData.length > 0 ? (
                  <>
                    {/* Phân tích Doanh thu Chuyên sâu (CFO Dashboard) */}
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                          title="Doanh thu (trước VAT)"
                          value={formatNumber(cfoMetrics.totalRevenue)}
                          unit="VND"
                          icon={DollarSign}
                          color="primary"
                          trend={
                            timeFilter !== "all"
                              ? `${cfoMetrics.revGrowth >= 0 ? "+" : ""}${cfoMetrics.revGrowth.toFixed(1)}%`
                              : null
                          }
                          subtitle={`VAT ${formatNumber(cfoMetrics.totalVat)} đ · sau thuế ${formatNumber(cfoMetrics.totalAfterVat)} đ`}
                        />
                        <StatCard
                          title="Sản lượng tiêu thụ"
                          value={formatNumber(
                            Math.round(cfoMetrics.totalQuantity),
                          )}
                          unit="LÍT"
                          icon={Package}
                          color="green"
                          trend={
                            timeFilter !== "all"
                              ? `${cfoMetrics.qtyGrowth >= 0 ? "+" : ""}${cfoMetrics.qtyGrowth.toFixed(1)}%`
                              : null
                          }
                          subtitle="Đã quy đổi lon và lít về cùng lít"
                        />
                        <StatCard
                          title="Đơn giá bình quân / lít"
                          value={formatNumber(Math.round(cfoMetrics.arpu))}
                          unit="đ/L"
                          icon={TrendingUp}
                          color="amber"
                          trend={
                            timeFilter !== "all"
                              ? `${cfoMetrics.arpuGrowth >= 0 ? "+" : ""}${cfoMetrics.arpuGrowth.toFixed(1)}%`
                              : null
                          }
                          subtitle="Hiệu quả đơn giá"
                        />
                        <StatCard
                          title="Index Tập trung KH"
                          value={`${cfoMetrics.concentration.toFixed(1)}`}
                          unit="%"
                          icon={Users}
                          color="rose"
                          subtitle="Top 20% KH đóng góp DT"
                        />
                      </div>

                      {/* CFO Advanced Insights Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card
                          title="Cơ cấu Sản phẩm & Đối tác (Strategic Mix)"
                          className="lg:col-span-2"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-6">
                            <div className="space-y-6">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                I. Tỷ trọng doanh thu theo SKU
                              </p>
                              <div className="h-[280px] w-full">
                                <ResponsiveContainer
                                  width="100%"
                                  height={280}
                                  minWidth={0}
                                >
                                  <BarChart
                                    layout="vertical"
                                    data={cfoMetrics.productStats.slice(0, 5)}
                                    margin={{ left: 0, right: 30 }}
                                  >
                                    <XAxis type="number" hide />
                                    <YAxis
                                      dataKey="name"
                                      type="category"
                                      fontSize={10}
                                      width={110}
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{
                                        fill: chartColors.axis,
                                        fontWeight: 700,
                                      }}
                                    />
                                    <Tooltip
                                      contentStyle={{
                                        borderRadius: "16px",
                                        border: chartColors.tooltipBorder,
                                        backgroundColor: chartColors.tooltipBg,
                                        color: chartColors.tooltipText,
                                        boxShadow:
                                          "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                                      }}
                                      itemStyle={{
                                        color: chartColors.tooltipText,
                                      }}
                                      labelStyle={{
                                        color: chartColors.tooltipText,
                                      }}
                                      cursor={{
                                        fill: isDark
                                          ? "rgba(255,255,255,0.06)"
                                          : "rgba(0,0,0,0.04)",
                                      }}
                                      formatter={(val: number) =>
                                        formatNumber(val) + " đ"
                                      }
                                    />
                                    <Bar
                                      dataKey="value"
                                      fill={chartColors.accent}
                                      radius={[0, 6, 6, 0]}
                                      barSize={24}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="space-y-6">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-4">
                                II. Top 5 Đối tác trọng điểm
                              </p>
                              <div className="h-[280px] w-full">
                                <ResponsiveContainer
                                  width="100%"
                                  height={280}
                                  minWidth={0}
                                >
                                  <PieChart>
                                    <Pie
                                      data={cfoMetrics.partnerStats.slice(0, 5)}
                                      innerRadius={70}
                                      outerRadius={95}
                                      paddingAngle={8}
                                      dataKey="value"
                                      stroke="none"
                                    >
                                      {chartColors.series.map((color, index) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={color}
                                        />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{
                                        borderRadius: "16px",
                                        border: chartColors.tooltipBorder,
                                        backgroundColor: chartColors.tooltipBg,
                                        color: chartColors.tooltipText,
                                        boxShadow:
                                          "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                                      }}
                                      itemStyle={{
                                        color: chartColors.tooltipText,
                                      }}
                                      labelStyle={{
                                        color: chartColors.tooltipText,
                                      }}
                                      formatter={(val: number) =>
                                        formatNumber(val) + " đ"
                                      }
                                    />
                                    <Legend
                                      verticalAlign="bottom"
                                      iconType="circle"
                                      wrapperStyle={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        paddingTop: "30px",
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        </Card>

                        <Card title="Xếp hạng SKU dẫn đầu">
                          <div className="space-y-5 mt-4">
                            {cfoMetrics.productStats.slice(0, 8).map((p, i) => (
                              <div
                                key={p.name}
                                className="flex items-center justify-between group py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-3 rounded-2xl transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[12px] font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
                                    {i + 1}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-slate-800 truncate max-w-[130px]">
                                      {p.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                      VP:{" "}
                                      {(
                                        (p.value /
                                          (cfoMetrics.totalRevenue || 1)) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[13px] font-black text-slate-900">
                                    {formatNumber(p.value)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>

                      {/* Management Summary Report Section */}
                      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white mt-8 shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-10 mb-12 pb-10 border-b border-white/10">
                          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 shadow-2xl">
                            <ShieldCheck className="w-12 h-12" />
                          </div>
                          <div>
                            <h4 className="text-3xl font-black tracking-tight mb-1">
                              Báo cáo tóm lược quản trị tài chính
                            </h4>
                            <p className="text-[12px] font-bold text-white/30 uppercase tracking-[0.4em]">
                              Trích xuất trực tiếp từ dữ liệu quản trị hệ thống
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
                          <div className="space-y-8">
                            <h5 className="text-[12px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-3">
                              <div className="w-4 h-[1px] bg-white/20" /> I.
                              Doanh thu & Thị trường
                            </h5>
                            <div className="space-y-8">
                              <div className="flex gap-5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <p className="text-[15px] text-white/70 leading-relaxed font-medium">
                                  Doanh thu (trước VAT) đạt{" "}
                                  <span className="font-bold text-white underline decoration-white/20 underline-offset-4">
                                    {formatNumber(cfoMetrics.totalRevenue)} đ
                                  </span>
                                   +
           +
          (canXoa.length
            ? \n            : ), biến động{" "}
                                  <span
                                    className={cn(
                                      "font-bold",
                                      cfoMetrics.revGrowth >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400",
                                    )}
                                  >
                                    {cfoMetrics.revGrowth >= 0
                                      ? "tăng"
                                      : "giảm"}{" "}
                                    {Math.abs(cfoMetrics.revGrowth).toFixed(1)}%
                                  </span>{" "}
                                  so với kỳ trước.
                                </p>
                              </div>
                              <div className="flex gap-5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2 shrink-0" />
                                <p className="text-[15px] text-white/70 leading-relaxed font-medium">
                                  Đơn giá bình quân đạt{" "}
                                  <span className="font-bold text-white">
                                    {formatNumber(Math.round(cfoMetrics.arpu))}{" "}
                                    đ/lít
                                  </span>
                                  . Thế trận giá bán{" "}
                                  {cfoMetrics.arpuGrowth >= 0
                                    ? "có sự cải thiện tốt về biên lợi nhuận"
                                    : "đang chịu áp lực cạnh tranh"}
                                  .
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-8 lg:border-l lg:border-white/5 lg:pl-20">
                            <h5 className="text-[12px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-3">
                              <div className="w-4 h-[1px] bg-white/20" /> II.
                              Khách hàng & Rủi ro
                            </h5>
                            <div className="space-y-8">
                              <div className="flex gap-5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2 shrink-0" />
                                <p className="text-[15px] text-white/70 leading-relaxed font-medium">
                                  Chỉ số tập trung (Concentration Index):{" "}
                                  <span className="font-bold text-white">
                                    {cfoMetrics.concentration.toFixed(1)}%
                                  </span>
                                  .
                                  {cfoMetrics.concentration > 70
                                    ? "Cảnh báo rủi ro tập trung dòng tiền vào nhóm đối tác chiến lược vượt ngưỡng an toàn."
                                    : "Cơ cấu đối tác duy trì độ phân tán tối ưu cho dòng tiền."}
                                </p>
                              </div>
                              <div className="flex gap-5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2 shrink-0" />
                                <p className="text-[15px] text-white/70 leading-relaxed font-medium">
                                  Đối tác hạt nhân{" "}
                                  <span className="font-bold text-white">
                                    {cfoMetrics.partnerStats[0]?.name || "N/A"}
                                  </span>{" "}
                                  đóng góp tỷ trọng lớn nhất với{" "}
                                  <span className="font-bold text-white">
                                    {(
                                      ((cfoMetrics.partnerStats[0]?.value ||
                                        0) /
                                        (cfoMetrics.totalRevenue || 1)) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                  .
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-8 lg:border-l lg:border-white/5 lg:pl-20">
                            <h5 className="text-[12px] font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-3">
                              <div className="w-4 h-[1px] bg-rose-400/20" />{" "}
                              III. Khuyến nghị quản trị
                            </h5>
                            <div className="bg-white/[0.03] p-5 sm:p-6 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm">
                              <p className="text-[15px] text-white/40 italic leading-relaxed font-medium">
                                "
                                {cfoMetrics.concentration > 70
                                  ? "Hệ thống khuyến nghị BGĐ ưu tiên chiến lược 'Long-tail' (mở rộng tệp khách hàng tiềm năng để giảm thiểu rủi ro khi đối tác trọng điểm có biến động. Đồng thời siết chặt kiểm soát công nợ cho nhóm Sales dẫn đầu."
                                  : "Thực trạng tài chính đang ở vùng ổn định. Khuyến nghị duy trì các chính sách chăm sóc khách hàng trọng điểm và chuẩn bị nguồn lực cho các SKU có dấu hiệu tăng trưởng nhanh."}
                                "
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ĐỐI SOÁT XUẤT KHO ↔ HÓA ĐƠN
                        Trả lời câu hỏi: hàng đã rời kho có ra hóa đơn đủ chưa.
                        Hai bên ghi số theo đơn vị khác nhau nên hạ hết về lít. */}
                    {/*
                      ĐỐI SOÁT XUẤT KHO ↔ HÓA ĐƠN — TẠM GỠ KHỎI MÀN HÌNH.

                      Bảng này trước đây so sản lượng đã rời kho với sản lượng
                      trên hóa đơn nạp từ file Excel. Nay doanh thu SINH RA từ
                      chính xuất kho, nên phép so đó là so một con số với chính
                      nó: lúc nào cũng khớp 100%, và một bảng luôn báo "đạt"
                      còn nguy hiểm hơn không có bảng nào.

                      Phép tính vẫn giữ nguyên ở src/lib/reconcile.ts cùng 46
                      test của nó. Nó sẽ có việc thật trở lại ở bước SAP: khi
                      hóa đơn phát hành xong và số hóa đơn thật chạy ngược về
                      app, đối soát sẽ so xuất kho với hóa đơn ĐÃ PHÁT HÀNH —
                      lúc đó hai vế mới thật sự là hai nguồn khác nhau.
                    */}

                    {/* Sổ chi tiết. Khi lọc "Tất cả" thì chỉ dựng 50 hóa đơn
                        gần nhất — trước đây khối này bị ẩn hẳn nên không có
                        cách nào xem/sửa hóa đơn ở chế độ toàn thời gian. */}
                    {(() => {
                      const SHOW_ALL_LIMIT = 50;
                      const isCapped =
                        timeFilter === "all" &&
                        groupedRevenue.length > SHOW_ALL_LIMIT;
                      const visibleInvoices = isCapped
                        ? groupedRevenue.slice(0, SHOW_ALL_LIMIT)
                        : groupedRevenue;
                      return (
                      <div className="space-y-4 pt-12 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Sổ chi tiết giao dịch từ Báo cáo
                          </h4>

                          <div className="relative group flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                              type="text"
                              placeholder="Tìm kiếm đối tác / Đại lý..."
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              value={revenuePartnerSearch}
                              onChange={(e) =>
                                setRevenuePartnerSearch(e.target.value)
                              }
                            />
                            {revenuePartnerSearch && (
                              <button
                                onClick={() => setRevenuePartnerSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isCapped && (
                          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                              Đang ở chế độ "Tất cả" nên chỉ hiện{" "}
                              {SHOW_ALL_LIMIT} hóa đơn gần nhất trong tổng{" "}
                              {groupedRevenue.length} hóa đơn. Chọn lọc theo
                              tháng hoặc năm để xem và sửa đầy đủ.
                            </p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {visibleInvoices.length > 0 ? (
                            visibleInvoices.map((invoice) => {
                              const isExpanded = expandedInvoices.includes(
                                invoice.key,
                              );
                              return (
                                <div
                                  key={invoice.key}
                                  className="group"
                                >
                                  <div
                                    className={cn(
                                      "bg-white border rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer relative z-10",
                                      isExpanded
                                        ? "border-primary shadow-xl shadow-primary/5"
                                        : "border-slate-100 hover:border-primary/20 hover:shadow-md",
                                    )}
                                    onClick={() => {
                                      setExpandedInvoices((prev) =>
                                        prev.includes(invoice.key)
                                          ? prev.filter((n) => n !== invoice.key)
                                          : [...prev, invoice.key],
                                      );
                                    }}
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="flex items-center gap-3 sm:gap-4">
                                        <div
                                          className={cn(
                                            "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all",
                                            isExpanded
                                              ? "bg-primary text-white"
                                              : "bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary",
                                          )}
                                        >
                                          <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                              {formatDisplayDate(invoice.date)}
                                            </p>
                                            <span className="w-0.5 h-0.5 bg-slate-200 rounded-full" />
                                            <span className="text-[8px] sm:text-[9px] font-bold text-primary/60 uppercase tracking-widest">
                                              {invoice.items.length} MẶT HÀNG
                                            </span>
                                          </div>
                                          <h5 className="text-[12px] sm:text-[13px] font-bold text-slate-800 tracking-tight group-hover:text-primary transition-colors italic">
                                            Số HĐ:{" "}
                                            <span className="not-italic">
                                              {invoice.invoiceNumber}
                                            </span>
                                          </h5>
                                          {/* Chưa phát hành thì nói rõ số hóa đơn sẽ do SAP cấp, đừng để người đọc tưởng app làm mất số. */}
                                          {!invoice.items[0]?.invoiceNumber && (
                                            <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">
                                              Số hóa đơn do SAP cấp sau khi phát hành
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 md:flex items-center md:justify-end gap-x-4 gap-y-2 md:gap-8 w-full md:w-auto px-4 py-3 md:p-0 bg-slate-50/50 md:bg-transparent rounded-xl border border-slate-100 md:border-none">
                                        <div className="text-left md:text-right">
                                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">
                                            Đối tác
                                          </p>
                                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase truncate max-w-[120px] sm:max-w-none">
                                            {invoice.partnerName}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">
                                            Doanh Thu
                                          </p>
                                          <p className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                                            {formatNumber(invoice.totalAmount)}
                                            <span className="text-[9px] font-medium ml-0.5">
                                              đ
                                            </span>
                                          </p>
                                        </div>
                                        {/*
                                          Trước đây có nút xoá cả tờ hóa đơn,
                                          để dọn khi nạp nhầm file. Bỏ đi vì
                                          doanh thu không còn nạp vào nữa: nó
                                          tính từ phiếu xuất, nên muốn bỏ một
                                          dòng thì sửa phiếu xuất tương ứng.
                                        */}
                                        {(
                                          <div
                                            className={cn(
                                              "col-span-2 md:col-span-1 flex w-full md:w-7 h-5 md:h-7 rounded-lg md:rounded-full bg-slate-100 md:bg-slate-50 items-center justify-center transition-all mt-1 md:mt-0",
                                              isExpanded
                                                ? "bg-primary/10 text-primary md:rotate-180"
                                                : "text-slate-300",
                                            )}
                                          >
                                            <ChevronDown
                                              className={cn(
                                                "w-4 h-4 transition-transform",
                                                isExpanded &&
                                                  "rotate-180 md:rotate-0",
                                              )}
                                            />
                                            <span className="md:hidden text-[8px] font-black uppercase tracking-[0.2em] ml-1">
                                              {isExpanded
                                                ? "Thu gọn"
                                                : "Xem chi tiết"}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nested Detail View */}
                                  {isExpanded && (
                                    <div className="relative -mt-4 pt-8 pb-4 px-8 bg-slate-50/50 border-x border-b border-slate-100/60 rounded-b-2xl z-0 overflow-hidden">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {invoice.items.map((item, idx) => (
                                          <div
                                            key={item.id || idx}
                                            className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm group/item hover:border-primary/30 transition-all"
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="space-y-0.5 min-w-0">
                                                <p className="text-[10px] font-bold text-slate-700 line-clamp-1">
                                                  {item.productName}
                                                </p>
                                                <p className="text-[9px] font-medium text-slate-400">
                                                  MÃ:{" "}
                                                  {item.materialCode || "N/A"}
                                                </p>
                                              </div>
                                              <div className="text-right shrink-0">
                                                <p className="text-[10px] font-bold text-slate-900">
                                                  {formatNumber(item.quantity)}{" "}
                                                  {item.unit ||
                                                    products.find(
                                                      (p) =>
                                                        p.name ===
                                                        item.productName,
                                                    )?.unit ||
                                                    "ĐV"}
                                                </p>
                                                <p className="text-[9px] font-bold text-emerald-600">
                                                  {formatNumber(
                                                    item.totalAmount,
                                                  )}{" "}
                                                  đ
                                                </p>
                                              </div>
                                            </div>

                                            {/*
                                              Không sửa/xoá được từng dòng nữa:
                                              dòng này là số TÍNH RA từ một
                                              phiếu xuất. Sửa ở đây thì lần mở
                                              app sau nó tính lại và số sửa biến
                                              mất — nên chỉ đường về đúng gốc.
                                            */}
                                            <button
                                              onClick={() =>
                                                setActiveTab("reports")
                                              }
                                              title="Doanh thu tính từ phiếu xuất kho — sửa ở đó"
                                              className="w-full flex items-center justify-center gap-1 mt-3 pt-2.5 border-t border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-primary transition-all"
                                            >
                                              <FileText className="w-3 h-3" />
                                              Xem phiếu xuất gốc
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-20 text-center">
                              <Search className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                Không có dữ liệu hóa đơn
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })()}
                  </>
                ) : (
                  <Card className="py-16 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2 bg-slate-50/50 rounded-3xl">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl text-slate-300">
                      <FileSpreadsheet className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-slate-900">
                        Chưa có doanh thu trong kỳ này
                      </h4>
                      <p className="text-sm text-slate-400 max-w-md mx-auto font-bold uppercase tracking-wider">
                        Doanh thu tính thẳng từ xuất kho. Có phiếu xuất đã giao
                        xong là số hiện ở đây, không phải nạp file nào.
                      </p>
                    </div>
                    <button
                      className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all mt-4"
                      onClick={() => setActiveTab("export")}
                    >
                      Sang tab Xuất kho
                    </button>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "in-transit" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                      Quản lý đơn đi đường
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Theo dõi và xác nhận các đơn hàng đang vận chuyển (2-3
                      ngày).
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {daDuocDuyet &&
                      transactions.some(
                        (t) =>
                          t.status === "completed" &&
                          t.notes?.includes("(Xác nhận hàng loạt - Nhận đủ)"),
                      ) && (
                        <button
                          onClick={revertAccidentalConfirmations}
                          className="px-4 py-3 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                          title="Khôi phục các đơn đã xác nhận nhầm không có ảnh"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Khôi phục đơn lỗi
                        </button>
                      )}
                    {daDuocDuyet && selectedInTransitIds.length > 0 && (
                        <button
                          onClick={handleBulkConfirm}
                          className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Xác nhận {selectedInTransitIds.length} đơn đã chọn
                        </button>
                      )}
                  </div>
                </div>

                <Card noPadding className="premium-shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {/* Chọn nhiều đơn để xác nhận hàng loạt — việc của
                              kho, không riêng chủ sở hữu. */}
                          {daDuocDuyet && (
                            <th className="py-4 px-6 w-10">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20"
                                checked={
                                  selectedInTransitIds.length ===
                                    inTransitGroups.length &&
                                  inTransitGroups.length > 0
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedInTransitIds(
                                      inTransitGroups.map((g) => g.id),
                                    );
                                  } else {
                                    setSelectedInTransitIds([]);
                                  }
                                }}
                              />
                            </th>
                          )}
                          <th className="py-4 px-6 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                            Ngày xuất
                          </th>
                          <th className="py-4 px-6 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                            Sản phẩm
                          </th>
                          <th className="py-4 px-6 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                            Đối tác
                          </th>
                          <th className="py-4 px-6 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                            Ghi chú
                          </th>
                          <th className="py-4 px-6 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">
                            SL Gửi
                          </th>
                          <th className="py-4 px-6 font-black text-[10px] text-slate-400 uppercase tracking-widest text-center">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inTransitGroups.length > 0 ? (
                          inTransitGroups.map(({ id, group, sheetNumber }) => {
                            const firstTrx = group[0];
                            const totalQty = group.reduce(
                              (sum, t) => sum + t.quantity,
                              0,
                            );
                            const partnerName = firstTrx.partnerName;
                            const date = firstTrx.date;
                            // Coalesce all notes in the group
                            const combinedNotes = Array.from(
                              new Set(
                                group.map((t) => t.notes).filter(Boolean),
                              ),
                            ).join(", ");

                            return (
                              <tr
                                key={id}
                                className={cn(
                                  "hover:bg-amber-50/30 transition-all group",
                                  selectedInTransitIds.includes(id) &&
                                    "bg-primary/5",
                                )}
                              >
                                {daDuocDuyet && (
                                  <td className="py-4 px-6">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20"
                                      checked={selectedInTransitIds.includes(
                                        id,
                                      )}
                                      onChange={() => {
                                        setSelectedInTransitIds((prev) =>
                                          prev.includes(id)
                                            ? prev.filter((x) => x !== id)
                                            : [...prev, id],
                                        );
                                      }}
                                    />
                                  </td>
                                )}
                                <td className="py-4 px-6 text-[11px] font-mono font-bold text-slate-500">
                                  {formatDate(date)}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900 text-sm leading-tight">
                                    Phiếu số: {sheetNumber}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                                    {group.length} mặt hàng khác nhau
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-tighter text-slate-700">
                                    {partnerName}
                                  </span>
                                </td>
                                <td className="py-4 px-6 max-w-[200px]">
                                  <p className="text-[10px] text-slate-500 font-medium italic line-clamp-2">
                                    {combinedNotes || "---"}
                                  </p>
                                </td>
                                <td className="py-4 px-6 text-right font-mono font-black text-sm text-amber-600">
                                  {formatNumber(totalQty)}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedInTransitGroup(group);
                                        const qtyMap: Record<string, number> = {};
                                        // Group actualReceivedQtyMap by productId instead of trx.id
                                        group.forEach((t) => {
                                          qtyMap[t.productId] = parseFloat(
                                            ((qtyMap[t.productId] || 0) + t.quantity).toFixed(4),
                                          );
                                        });
                                        setActualReceivedQtyMap(qtyMap);
                                        setShowLossModal(true);
                                      }}
                                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Xác nhận cả phiếu
                                    </button>

                                    {/* Phiếu đi đường chưa vào sổ tồn kho nên
                                        ai đã được duyệt cũng xoá được. */}
                                    {daDuocDuyet && (
                                      <button
                                        onClick={() =>
                                          handleDeleteInTransitGroup(group)
                                        }
                                        className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all"
                                        title="Xóa toàn bộ đơn"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-20 text-center text-slate-300 font-bold uppercase tracking-[0.2em] text-xs"
                            >
                              Không có đơn hàng nào đang đi đường.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Loss Reporting Modal */}
                {showLossModal &&
                  selectedInTransitGroup &&
                  selectedInTransitGroup.length > 0 && (
                    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
                      <div
                        onClick={() => setShowLossModal(false)}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                      />
                      {/*
                        Trên điện thoại: dán sát đáy, cao gần hết màn hình,
                        không có lề hai bên. Lề 16px cộng bo góc lớn của bản
                        trước ăn mất khoảng 40px bề ngang — trên máy 375px thì
                        đó là hơn một phần mười, đủ để tên bia bị cắt.
                      */}
                      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                        <div className="px-4 py-3 sm:p-8 sm:pb-4 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-[15px] sm:text-xl font-black text-slate-900 uppercase leading-tight">
                                {selectedInTransitIds.length > 1
                                  ? "XÁC NHẬN HÀNG LOẠT"
                                  : "XÁC NHẬN CẢ PHIẾU GIAO HÀNG"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest break-all">
                                  {selectedInTransitIds.length > 1
                                    ? `Đang chọn ${selectedInTransitIds.length} mã phiếu khác nhau`
                                    : `Mã phiếu hệ thống: ${selectedInTransitGroup[0].referenceGroupId?.replace("multi-", "") || "Cá lẻ"}`}
                                </p>
                                {scannedInvoiceDate && (
                                  <span className="flex items-center gap-2 text-[9px] px-2.5 py-1 bg-indigo-50 text-indigo-600 font-bold rounded-full border border-indigo-100 uppercase animate-in fade-in slide-in-from-left-2">
                                    <Clock className="w-3 h-3" />
                                    Phiếu:{" "}
                                    {formatDisplayDate(scannedInvoiceDate)}{" "}
                                    {format(
                                      parseISO(scannedInvoiceDate),
                                      "HH:mm",
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setShowLossModal(false);
                                setConfirmationPhoto("");
                              }}
                              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                              <X className="w-5 h-5 text-slate-400" />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 py-3 sm:p-8 sm:pt-4 space-y-3 sm:space-y-6 overflow-y-auto">
                          <div className="space-y-4">
                            {(() => {
                              const groupedItems =
                                selectedInTransitGroup.reduce(
                                  (acc, trx) => {
                                    if (!acc[trx.productId]) {
                                      acc[trx.productId] = {
                                        productId: trx.productId,
                                        productName: trx.productName,
                                        totalQuantity: 0,
                                        ids: [],
                                      };
                                    }
                                    acc[trx.productId].totalQuantity = parseFloat(
                                      (acc[trx.productId].totalQuantity + trx.quantity).toFixed(4),
                                    );
                                    acc[trx.productId].ids.push(trx.id);
                                    return acc;
                                  },
                                  {} as Record<string, any>,
                                );

                              const productList = Object.values(groupedItems);

                              return (
                                <>
                                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    Chi tiết hàng hóa ({productList.length} mặt
                                    hàng)
                                  </h4>
                                  <div className="space-y-2 sm:space-y-3">
                                    {productList.map((item: any) => {
                                      const isMatched =
                                        matchedProductIds.has(item.productId) ||
                                        item.ids.some((id: string) =>
                                          matchedProductIds.has(id),
                                        );
                                      return (
                                        <div
                                          key={item.productId}
                                          className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border sm:border-2 transition-all ${isMatched ? "bg-emerald-50/50 border-emerald-500/25" : "bg-slate-50 border-transparent opacity-60"}`}
                                        >
                                          {/*
                                            Thẻ bó sát để bớt phải lướt: phiếu
                                            5 mặt hàng trước đây dài gần ba màn
                                            hình điện thoại, phải cuộn ba lần
                                            mới thấy hết rồi mới tới chỗ tải
                                            ảnh. Đo lại sau khi bó: 1.745px còn
                                            1.201px, tức chưa tới hai màn hình.
                                            Bỏ ô biểu tượng thùng hàng (chỉ để
                                            trang trí), tên bia và nút "Loại bỏ"
                                            về chung một hàng, ô nhập nằm cùng
                                            hàng với nhãn.
                                          */}
                                          <div className="flex items-start gap-2.5">
                                            <div className="min-w-0 flex-1">
                                                {/* Cho xuống dòng thay vì cắt
                                                    chữ: tên bia dài là bình
                                                    thường, mà cắt đi thì hai
                                                    loại khác nhau nhìn giống
                                                    hệt nhau. */}
                                                <div className="text-[13px] sm:text-sm font-black text-slate-900 leading-snug break-words">
                                                  {item.productName}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                    Xuất:{" "}
                                                    {formatNumber(
                                                      item.totalQuantity,
                                                    )}{" "}
                                                    đơn vị
                                                  </div>
                                                  {isMatched && (
                                                    <span className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 bg-emerald-500 text-white font-black rounded-full uppercase shrink-0">
                                                      <CheckCircle className="w-2 h-2" />
                                                      ĐÃ KHỚP
                                                    </span>
                                                  )}
                                                </div>
                                            </div>
                                            <button
                                              onClick={() => {
                                                const newSet = new Set(
                                                  matchedProductIds,
                                                );
                                                if (isMatched) {
                                                  newSet.delete(item.productId);
                                                  item.ids.forEach(
                                                    (id: string) =>
                                                      newSet.delete(id),
                                                  );
                                                } else {
                                                  newSet.add(item.productId);
                                                }
                                                setMatchedProductIds(newSet);
                                                // Ensure valid initial value in map
                                                if (
                                                  !actualReceivedQtyMap[
                                                    item.productId
                                                  ]
                                                ) {
                                                  setActualReceivedQtyMap(
                                                    (prev) => ({
                                                      ...prev,
                                                      [item.productId]:
                                                        item.totalQuantity,
                                                    }),
                                                  );
                                                }
                                              }}
                                              className={`shrink-0 px-3 py-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] font-black uppercase transition-all ${isMatched ? "bg-rose-100 text-rose-500 hover:bg-rose-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}
                                            >
                                              {isMatched
                                                ? "Loại bỏ"
                                                : "Có trên phiếu"}
                                            </button>
                                          </div>

                                          {isMatched && (() => {
                                            const product = products.find((p) => p.id === item.productId);
                                            const rawQty = actualReceivedQtyMap[item.productId] ?? item.totalQuantity;
                                            const currentQty = parseFloat(Number(rawQty ?? 0).toFixed(4));

                                            return (
                                              <div className="mt-2 flex items-center gap-2 w-full">
                                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest shrink-0">
                                                  Thực nhận
                                                </label>
                                                <div className="flex items-center gap-1.5 font-mono flex-1">
                                                  {/*
                                                    `text` + `inputMode="decimal"`:
                                                    vẫn ra bàn phím số trên
                                                    điện thoại, nhưng nhận được
                                                    cả dấu phẩy. Ô `type=number`
                                                    coi "144,2" là không hợp lệ
                                                    và trả chuỗi rỗng — app đọc
                                                    ra 0 rồi ghi cả 144,2 lít
                                                    thành hao hụt.
                                                  */}
                                                  <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="flex-1 min-w-0 px-3 py-1.5 bg-white border-2 border-emerald-500/20 rounded-lg text-base sm:text-sm font-black focus:border-emerald-500 outline-none transition-all"
                                                    value={
                                                      soThucNhanText[
                                                        item.productId
                                                      ] ?? String(currentQty)
                                                    }
                                                    onChange={(e) => {
                                                      const chu = e.target.value;
                                                      setSoThucNhanText({
                                                        ...soThucNhanText,
                                                        [item.productId]: chu,
                                                      });
                                                      const so =
                                                        docSoThapPhan(chu);
                                                      // Gõ dở thì giữ nguyên số
                                                      // cũ, đừng nhảy về 0.
                                                      if (so !== null) {
                                                        setActualReceivedQtyMap({
                                                          ...actualReceivedQtyMap,
                                                          [item.productId]: so,
                                                        });
                                                      }
                                                    }}
                                                  />
                                                  <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">
                                                    {product?.unit || "đơn vị"}
                                                  </span>
                                                </div>
                                                {currentQty < item.totalQuantity && (
                                                  <div className="mt-2 flex items-center gap-1.5 text-rose-500 text-[10px] font-bold italic bg-rose-50 p-2 rounded-lg border border-rose-100 shadow-sm leading-relaxed">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Hao hụt: {formatNumber(Math.max(0, item.totalQuantity - currentQty))} {product?.unit || "đơn vị"}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {Object.entries(actualReceivedQtyMap).some(
                            ([pId, qty]) => {
                              const totalSent = selectedInTransitGroup
                                .filter((t) => t.productId === pId)
                                .reduce((sum, t) => sum + t.quantity, 0);
                              return qty < totalSent;
                            },
                          ) && (
                            <div className="space-y-3">
                              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1 block leading-snug">
                                Lý do hao hụt
                                <span className="text-rose-500"> *</span>
                              </label>
                              <textarea
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium min-h-[80px]"
                                placeholder="Ví dụ: Nổ lon do va đập, thiếu hàng khi kiểm đếm..."
                                value={lossReason}
                                onChange={(e) => setLossReason(e.target.value)}
                              />
                              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-rose-600 mb-1">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    Cảnh báo chênh lệch
                                  </span>
                                </div>
                                <p className="text-xs text-rose-500 font-bold italic">
                                  Hệ thống sẽ tự động ghi nhận phần chênh lệch
                                  vào mục HAO HỤT.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            {/* Nhãn ngắn lại: bản trước dài quá nên trên điện
                                thoại vắt xuống dòng thứ hai còn trơ mỗi chữ
                                "BUỘC)". */}
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1 block">
                              Ảnh minh chứng
                              <span className="text-rose-500"> *</span>
                            </label>

                            {/*
                              BA NÚT NHỎ LẠI, XẾP NGANG.
                              Chúng chỉ là chỗ bấm một lần rồi thôi; chiếm ba
                              khối lớn chồng lên nhau thì đẩy ảnh minh chứng
                              xuống tận đáy, phải cuộn mới thấy. Chỗ cần rộng
                              là ẢNH, để đối chiếu chữ viết tay với số lượng ở
                              trên.
                            */}
                            <div className="grid grid-cols-3 gap-2">
                              <label className="flex flex-col items-center justify-center gap-1 p-2 sm:p-3 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/40 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group relative overflow-hidden min-h-[58px] sm:min-h-[76px]">
                                {isScanning ? (
                                  <div className="flex flex-col items-center gap-1.5">
                                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                                    <span className="text-[9px] font-black text-emerald-600 uppercase animate-pulse text-center leading-tight">
                                      Đang đọc...
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <Sun className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black text-emerald-600 uppercase text-center leading-tight tracking-tight">
                                      Quét bằng Tin
                                    </span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  multiple
                                  disabled={isScanning}
                                  onChange={async (e) => {
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                      const newPhotos: string[] = [];
                                      // Giữ base64 ảnh đầu để AI quét (Gemini cần base64, không phải URL).
                                      let firstScanBase64 = "";
                                      try {
                                        for (let i = 0; i < files.length; i++) {
                                          const base64 =
                                            await readFileAsDataURL(files[i]);
                                          const compressed =
                                            await compressImage(
                                              base64,
                                              1600,
                                              1600,
                                              0.8,
                                            );
                                          if (i === 0)
                                            firstScanBase64 = compressed;
                                          const url =
                                            await uploadToCloudinary(compressed);
                                          newPhotos.push(url);
                                        }
                                      } catch (err) {
                                        console.error("Lỗi tải ảnh:", err);
                                        alert(
                                          "Không thể tải ảnh lên. Anh kiểm tra kết nối mạng/Cloudinary nhé!",
                                        );
                                        return;
                                      }

                                      setConfirmationPhotos((prev) => [
                                        ...prev,
                                        ...newPhotos,
                                      ]);
                                      if (
                                        !confirmationPhoto &&
                                        newPhotos.length > 0
                                      ) {
                                        setConfirmationPhoto(newPhotos[0]);
                                      }

                                      // Quét ảnh đầu để trích xuất dữ liệu
                                      if (firstScanBase64) {
                                        await handleScanInvoice(firstScanBase64);
                                      }
                                    }
                                  }}
                                />
                              </label>
                              <label className="flex flex-col items-center justify-center gap-1 p-2 sm:p-3 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group min-h-[58px] sm:min-h-[76px]">
                                <Camera className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                <span className="text-[9px] font-black text-slate-400 uppercase group-hover:text-primary text-center leading-tight tracking-tight">
                                  Chụp thêm
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  capture="environment"
                                  multiple
                                  onChange={async (e) => {
                                    const files = e.target.files;
                                    if (files) {
                                      const newPhotos: string[] = [];
                                      try {
                                        for (let i = 0; i < files.length; i++) {
                                          const base64 =
                                            await readFileAsDataURL(files[i]);
                                          newPhotos.push(
                                            await compressAndUploadPhoto(base64),
                                          );
                                        }
                                      } catch (err) {
                                        console.error("Lỗi tải ảnh:", err);
                                        alert(
                                          "Không thể tải ảnh lên. Anh kiểm tra kết nối mạng/Cloudinary nhé!",
                                        );
                                        return;
                                      }
                                      setConfirmationPhotos((prev) => [
                                        ...prev,
                                        ...newPhotos,
                                      ]);
                                      if (
                                        !confirmationPhoto &&
                                        newPhotos.length > 0
                                      )
                                        setConfirmationPhoto(newPhotos[0]);
                                    }
                                  }}
                                />
                              </label>
                              <label className="flex flex-col items-center justify-center gap-1 p-2 sm:p-3 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group min-h-[58px] sm:min-h-[76px]">
                                <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                <span className="text-[9px] font-black text-slate-400 uppercase group-hover:text-emerald-500 text-center leading-tight tracking-tight">
                                  Chọn từ máy
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  multiple
                                  onChange={async (e) => {
                                    const files = e.target.files;
                                    if (files) {
                                      const newPhotos: string[] = [];
                                      try {
                                        for (let i = 0; i < files.length; i++) {
                                          const base64 =
                                            await readFileAsDataURL(files[i]);
                                          newPhotos.push(
                                            await compressAndUploadPhoto(base64),
                                          );
                                        }
                                      } catch (err) {
                                        console.error("Lỗi tải ảnh:", err);
                                        alert(
                                          "Không thể tải ảnh lên. Anh kiểm tra kết nối mạng/Cloudinary nhé!",
                                        );
                                        return;
                                      }
                                      setConfirmationPhotos((prev) => [
                                        ...prev,
                                        ...newPhotos,
                                      ]);
                                      if (
                                        !confirmationPhoto &&
                                        newPhotos.length > 0
                                      )
                                        setConfirmationPhoto(newPhotos[0]);
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            {/*
                              ẢNH TO, KHÔNG CẮT, MỖI TẤM MỘT HÀNG.
                              Đây là tờ biên bản viết tay: người dùng phải đọc
                              được con số trên đó rồi dò với số lượng ở phần
                              trên. Bản trước cắt vuông và xếp bốn tấm một hàng
                              — thành ra chỉ thấy giữa tờ giấy, chữ số nằm ở mép
                              bị cắt mất.

                              `object-contain` giữ nguyên tỉ lệ nên không mất
                              góc nào của tờ phiếu.
                            */}
                            {confirmationPhotos.length > 0 && (
                              <div className="space-y-3 mt-4">
                                {confirmationPhotos.map((photo, idx) => (
                                  <div
                                    key={idx}
                                    className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
                                  >
                                    <img
                                      src={photo}
                                      alt={`Ảnh minh chứng ${idx + 1}`}
                                      className="w-full max-h-[60vh] object-contain"
                                    />
                                    <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-900/70 text-white text-[9px] font-black uppercase tracking-widest">
                                      Ảnh {idx + 1}/{confirmationPhotos.length}
                                    </span>
                                    {/*
                                      Nút xóa LUÔN HIỆN. Bản trước chỉ hiện khi
                                      rê chuột — trên điện thoại không có rê
                                      chuột, nên tải nhầm ảnh là không gỡ ra
                                      được bằng cách nào cả.
                                    */}
                                    <button
                                      onClick={() => {
                                        const updated =
                                          confirmationPhotos.filter(
                                            (_, i) => i !== idx,
                                          );
                                        setConfirmationPhotos(updated);
                                        if (idx === 0)
                                          setConfirmationPhoto(
                                            updated[0] || "",
                                          );
                                      }}
                                      className="absolute top-2 right-2 p-2.5 bg-rose-500 text-white rounded-xl shadow-lg active:scale-90 transition-transform"
                                      aria-label={`Xóa ảnh ${idx + 1}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chân hộp thoại: chừa thêm đệm dưới cho thanh điều hướng của điện
                            thoại, không thì nút Xác nhận nằm sát mép và bấm hay trượt. */}
                        <div className="px-4 py-3 pb-4 sm:p-8 sm:pt-4 border-t border-slate-100 bg-slate-50/30 flex gap-2 sm:gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setShowLossModal(false);
                            }}
                          >
                            Hủy
                          </Button>
                          <Button
                            className="flex-[2] bg-emerald-500 hover:bg-emerald-600"
                            onClick={handleReportLoss}
                            loading={loading}
                            disabled={
                              loading || confirmationPhotos.length === 0
                            }
                          >
                            {confirmationPhotos.length === 0
                              ? "Cần ảnh minh chứng"
                              : `XÁC NHẬN HOÀN TẤT (${confirmationPhotos.length} ẢNH)`}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Ẩn menu thôi chưa đủ: tab có thể đang mở sẵn từ trước khi vai
                trò bị hạ. Chặn cả ở đây để không bao giờ hiện ra một biểu mẫu
                mà bấm lưu chắc chắn hỏng. */}
            {(activeTab === "import" || activeTab === "export") && !canWrite && (
              <div className="max-w-lg mx-auto text-center py-20 space-y-3">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-black text-slate-900">
                  Tài khoản này chỉ được xem
                </p>
                <p className="text-[12px] font-bold text-slate-500 leading-relaxed">
                  Nhập kho và xuất kho cần vai trò STAFF hoặc OWNER. Nhờ chủ sở
                  hữu vào mục Người dùng cấp quyền, rồi đăng xuất và đăng nhập
                  lại.
                </p>
              </div>
            )}

            {(activeTab === "import" || activeTab === "export") && canWrite && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2 mb-8">
                  <div
                    className={cn(
                      "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-xl",
                      activeTab === "import"
                        ? "bg-blue-600 shadow-blue-200"
                        : "bg-rose-600 shadow-rose-200",
                    )}
                  >
                    {activeTab === "import" ? (
                      <PlusCircle className="text-white w-8 h-8" />
                    ) : (
                      <MinusCircle className="text-white w-8 h-8" />
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 italic font-serif">
                    GHI NHẬN{" "}
                    {activeTab === "import"
                      ? newTransaction.type === "OPENING"
                        ? "TỒN ĐẦU KỲ"
                        : "NHẬP KHO"
                      : "XUẤT KHO"}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Hệ thống ghi nhận đa mặt hàng (Batch Processing)
                  </p>
                </div>

                {/*
                  Nạp cả tháng từ TỆP GỐC của bộ phận.

                  Trước đây phải chuyển tệp về khuôn tệp mẫu rồi mới nạp được —
                  một bước chép tay ở giữa, và chép tay là chỗ sinh sai số.
                  Nay đọc thẳng sheet "T Kho" trong tệp gốc.
                */}
                {activeTab === "export" && canWrite && (
                  <Card title="Nạp xuất kho từ file BBGN">
                    <TkhoImport
                      products={products}
                      partners={partners}
                      diemBanOverrides={diemBanOverrides}
                      onSaveDiemBan={handleSaveDiemBan}
                      onCreateNhap={handleCreateNhapFromTkho}
                      onCreate={handleCreateFromBbgn}
                      busy={loading}
                    />
                  </Card>
                )}

                <Card className="p-4 sm:p-10 relative overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {activeTab === "import" && (
                      <div className="md:col-span-2">
                        <Select
                          label="Hình thức ghi nhận"
                          options={[
                            {
                              value: "IN",
                              label: "Nhập kho (Nhập hàng mới về)",
                            },
                            {
                              value: "OPENING",
                              label: "Tồn đầu kỳ (Số liệu gốc ban đầu)",
                            },
                          ]}
                          value={newTransaction.type}
                          onChange={(e: any) => {
                            const type = e.target.value as TransactionType;
                            setNewTransaction({
                              ...newTransaction,
                              type,
                              items: newTransaction.items.map((item) => ({
                                ...item,
                                batchNumber:
                                  type === "OPENING"
                                    ? "Tồn 25/4"
                                    : item.batchNumber === "Tồn 25/4"
                                      ? ""
                                      : item.batchNumber,
                              })),
                            });
                          }}
                        />
                      </div>
                    )}

                    <div className="md:col-span-1">
                      <Input
                        label={
                          activeTab === "import"
                            ? newTransaction.type === "OPENING"
                              ? "Ngày chốt tồn đầu"
                              : "Ngày thực nhập"
                            : "Ngày thực xuất"
                        }
                        type="date"
                        value={newTransaction.date}
                        onChange={(e: any) =>
                          setNewTransaction({
                            ...newTransaction,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="md:col-span-1">
                      {newTransaction.type !== "OPENING" && (
                        <Select
                          label={
                            activeTab === "import"
                              ? "Nhà cung cấp"
                              : "Đơn vị nhận (Đối tác)"
                          }
                          /*
                            BNC gom bon bo phan nhung trong o nay chi hien MOT
                            dong "BNC". Chon no thi moi hien o thu hai de chon
                            bo phan. Truoc day bon bo phan nam phang thanh bon
                            dong trong cung o, khong ai nhan ra day la mot don
                            vi chia nho.
                          */
                          options={(() => {
                            const ds = donVi.filter((p) =>
                              activeTab === "import"
                                ? p.type === "SUPPLIER"
                                : p.type !== "SUPPLIER",
                            );
                            const out: { value: string; label: string }[] = [];
                            let daChenBNC = false;
                            for (const p of ds) {
                              if (laBoPhanBNC(p.id)) {
                                // Bốn bộ phận gộp thành MỘT dòng "BNC", chèn
                                // đúng chỗ chúng đứng trong danh mục. Nối vào
                                // cuối thì BNC rơi xuống đáy danh sách 23 dòng,
                                // phải cuộn hết mới thấy.
                                if (!daChenBNC) {
                                  out.push({
                                    value: NHOM_BNC_TAM,
                                    label: "BNC [AD0103]",
                                  });
                                  daChenBNC = true;
                                }
                                continue;
                              }
                              out.push({
                                value: p.id,
                                label: `${p.name} ${p.sapCode ? "[" + p.sapCode + "]" : ""}`,
                              });
                            }
                            return out;
                          })()}
                          value={
                            laBoPhanBNC(newTransaction.partnerId) ||
                            newTransaction.partnerId === NHOM_BNC_TAM
                              ? NHOM_BNC_TAM
                              : newTransaction.partnerId
                          }
                          onChange={(e: any) => {
                            // Doi don vi thi bo nhom cu di: giu lai thi chon
                            // FV roi chon lai BNC se thay "Noi bo" sang san,
                            // tuong nhu da chon xong.
                            setNhomBNCChon("");
                            setNewTransaction({
                              ...newTransaction,
                              // Chon BNC thi chua biet bo phan nao -> de o thu
                              // hai quyet dinh. Khong doan mot bo phan mac dinh:
                              // doan sai la ghi san luong vao nhom sai.
                              partnerId: e.target.value,
                            });
                          }}
                        />
                      )}

                      {/*
                        O THU HAI — BON NHOM CUA BNC, chi hien khi da chon BNC.

                        BNC chia bon phan: Noi bo, Ngoai giao, HTKD, Chi phi
                        khac. Ba nhom sau dung bang MOT bo phan nen bam la chon
                        xong; Noi bo gom 17 diem ban nen mo tiep tang thu ba.

                        Truoc day 20 bo phan nam phang thanh 20 nut trong cung
                        mot luoi: Ngoai giao va HTKD lan giua mot ruot ten quan,
                        khong ai nhan ra day la bon phan khac han nhau ve ban
                        chat — mot ben la ban trong khu, ba ben kia thi khong.
                      */}
                      {activeTab !== "import" &&
                        (newTransaction.partnerId === NHOM_BNC_TAM ||
                          laBoPhanBNC(newTransaction.partnerId)) && (
                          <div className="mt-4 space-y-2">
                            <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                              Phần của BNC
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {NHOM_BNC.map((n) => {
                                const dangChon = nhomBNCDangChon === n.ma;
                                return (
                                  <button
                                    key={n.ma}
                                    type="button"
                                    onClick={() => {
                                      setNhomBNCChon(n.ma);
                                      setNewTransaction({
                                        ...newTransaction,
                                        // Nhóm nào đúng bằng một bộ phận thì
                                        // chọn luôn. Nội bộ thì để trống chờ
                                        // chọn điểm bán: đoán sẵn một quán là
                                        // ghi sản lượng cho nhầm khách.
                                        partnerId: n.boPhan ?? NHOM_BNC_TAM,
                                      });
                                    }}
                                    className={cn(
                                      "px-3 py-2.5 rounded-xl border transition-all text-left leading-tight",
                                      dangChon
                                        ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary",
                                    )}
                                  >
                                    <span className="block text-[11px] font-black uppercase tracking-wide">
                                      {n.ten}
                                    </span>
                                    <span
                                      className={cn(
                                        "block text-[9px] font-bold mt-0.5",
                                        dangChon
                                          ? "text-white/70"
                                          : "text-slate-400",
                                      )}
                                    >
                                      {n.moTa}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/*
                              TANG THU BA — 17 diem ban, chi hien khi dang o
                              nhom Noi bo. Ba nhom con lai khong co diem ban nao
                              nen khong bay ra luoi rong.
                            */}
                            {nhomBNCDangChon === "NB" && (
                              <>
                                <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1 pt-1">
                                  Điểm bán nội bộ
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                                  {donVi
                                    .filter(
                                      (p) => nhomCuaBoPhan(p.id) === "NB",
                                    )
                                    .map((p) => {
                                      const dangChon =
                                        newTransaction.partnerId === p.id;
                                      return (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() =>
                                            setNewTransaction({
                                              ...newTransaction,
                                              partnerId: p.id,
                                            })
                                          }
                                          className={cn(
                                            "px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all text-left leading-tight",
                                            dangChon
                                              ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                                              : "bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary",
                                          )}
                                        >
                                          {p.name.replace(/^BNC · /, "")}
                                        </button>
                                      );
                                    })}
                                </div>
                              </>
                            )}
                            {newTransaction.partnerId === NHOM_BNC_TAM && (
                              <p className="text-[10px] font-bold text-amber-700">
                                {nhomBNCDangChon === "NB"
                                  ? "Chưa chọn điểm bán — chưa lưu được."
                                  : "Chưa chọn phần của BNC — chưa lưu được."}
                              </p>
                            )}

                            {/*
                              Danh muc trong Firestore chua co du don vi cua
                              code. Van bam chon duoc, nhung ma bo phan SAP se
                              tra ra rong khi ket xuat cong no — nen phai noi
                              ra, kem nut sua ngay tai cho.
                            */}
                            {donViThieu.length > 0 && (
                              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                                <p className="text-[10px] font-bold text-rose-700 leading-relaxed">
                                  Danh mục đơn vị trong hệ thống thiếu{" "}
                                  {donViThieu.length} mục so với danh mục chuẩn.
                                  Chọn vẫn được, nhưng mã bộ phận SAP sẽ trống
                                  khi kết xuất công nợ.
                                </p>
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={handleSyncPartners}
                                    disabled={loading}
                                    className="px-4 py-2 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                                  >
                                    Cập nhật danh mục đơn vị
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {/*
                      NHAP KHO: dung bang nhap nhanh liet ke san toan bo danh
                      muc. Kho co hon chuc loai bia, bam "them dong" roi chon
                      trong danh sach tha xuong vua cham vua de bo sot.
                    */}
                    {activeTab === "import" && pendingApproval.count > 0 && (
                      <div className="md:col-span-2 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                            {pendingApproval.slipCount} phiếu chưa vào tồn
                          </p>
                          <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed">
                            {formatNumber(pendingApproval.liters)} lít đã điền
                            nhưng <strong>chưa cộng vào tồn kho</strong> và chưa
                            xuất bán được, vì phiếu chưa có ảnh chữ ký. Sang tab{" "}
                            <strong>Phiếu nhập kho</strong> để in, hai bên ký
                            rồi tải ảnh lên.
                          </p>
                          <p className="text-[10px] font-black text-amber-700/70 font-mono tracking-wide">
                            {pendingApproval.codes.slice(0, 8).join(" · ")}
                            {pendingApproval.codes.length > 8 &&
                              ` +${pendingApproval.codes.length - 8}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === "import" && (
                      <div className="md:col-span-2 mt-4">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Nhập theo danh mục
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400">
                            Điền số vào loại nhận được · để trống là không nhập
                          </p>
                        </div>
                        <BulkImportGrid
                          products={products}
                          inventory={inventory}
                          initialRows={newTransaction.items.map((i) => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            batchNumber: i.batchNumber || "",
                          }))}
                          onChange={(rows) =>
                            setNewTransaction((prev) => ({
                              ...prev,
                              items: rows.length
                                ? rows
                                : [
                                    {
                                      productId: "",
                                      quantity: 0,
                                      batchNumber: "",
                                    },
                                  ],
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Items List (xuat kho / ton dau ky van nhap tung dong) */}
                    {activeTab !== "import" && (
                    <div className="md:col-span-2 mt-4">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Danh sách mặt hàng ({newTransaction.items.length})
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const missingProducts = products.filter(
                                (p) =>
                                  !newTransaction.items.some(
                                    (item) => item.productId === p.id,
                                  ),
                              );
                              if (!missingProducts.length)
                                return showNotification(
                                  "Anh đã chọn hết các mặt hàng hiện có rồi ạ!",
                                );

                              setNewTransaction((prev) => ({
                                ...prev,
                                items: [
                                  ...prev.items.filter(
                                    (i) => i.productId !== "",
                                  ),
                                  ...missingProducts.map((p) => ({
                                    productId: p.id,
                                    quantity: 0,
                                    batchNumber: "",
                                  })),
                                ],
                              }));
                            }}
                            className="text-[10px] font-black text-amber-600 bg-amber-50 uppercase tracking-widest flex items-center gap-1.5 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Layers className="w-3.5 h-3.5" /> Thêm toàn bộ danh
                            mục
                          </button>
                          <button
                            onClick={() => {
                              // Simple quick select: allow user to select multiple products at once
                              const availableProducts = products.filter(
                                (p) =>
                                  !newTransaction.items.some(
                                    (item) => item.productId === p.id,
                                  ),
                              );
                              if (availableProducts.length === 0) {
                                showNotification(
                                  "Anh đã chọn hết các mặt hàng hiện có rồi ạ!",
                                );
                                return;
                              }

                              const selectedIds = window.prompt(
                                "Nhập tên sản phẩm để chọn nhanh (Ngăn cách bởi dấu phẩy):\n" +
                                  availableProducts
                                    .map((p) => p.name)
                                    .join(", "),
                              );

                              if (selectedIds) {
                                const searchTerms = selectedIds
                                  .split(",")
                                  .map((s) => s.trim().toLowerCase());
                                const matches = availableProducts.filter((p) =>
                                  searchTerms.some((term) =>
                                    p.name.toLowerCase().includes(term),
                                  ),
                                );

                                if (matches.length > 0) {
                                  setNewTransaction((prev) => ({
                                    ...prev,
                                    items: [
                                      ...prev.items.filter(
                                        (i) => i.productId !== "",
                                      ),
                                      ...matches.map((p) => ({
                                        productId: p.id,
                                        quantity: 0,
                                        batchNumber: "",
                                      })),
                                    ],
                                  }));
                                }
                              }
                            }}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Search className="w-3.5 h-3.5" /> Chọn nhanh
                          </button>
                          <button
                            onClick={addTransactionItem}
                            className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <PlusCircle className="w-3.5 h-3.5" /> Thêm dòng
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {newTransaction.items.map((item, index) => (
                          <div
                            key={`item-${index}-${item.productId}`}
                            className="p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200 relative group/item"
                          >
                            {newTransaction.items.length > 1 && (
                              <button
                                onClick={() => removeTransactionItem(index)}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-100 text-rose-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/item:opacity-100 transition-all hover:bg-rose-50"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                              <div className="sm:col-span-5">
                                <Select
                                  label={`Sản phẩm ${index + 1}`}
                                  options={products.map((p) => ({
                                    value: p.id,
                                    label: p.name,
                                  }))}
                                  value={item.productId}
                                  onChange={(e: any) =>
                                    updateTransactionItem(index, {
                                      productId: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <Input
                                  label={`Số lượng (${products.find((p) => p.id === item.productId)?.unit || "—"})`}
                                  type="number"
                                  placeholder="0"
                                  value={
                                    item.quantity === 0 ? "" : item.quantity
                                  }
                                  onChange={(e: any) =>
                                    updateTransactionItem(index, {
                                      quantity: Number(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              {/*
                                HAO HỤT — hiện cho MỌI đối tác khi xuất kho tay.
                                Không hiện ở phần nạp file: ở đó số liệu đến từ
                                sheet, không có ai ngồi đó để biết hao hụt thật.

                                Để người dùng ĐIỀN TAY, app chỉ gợi ý. Với hàng
                                bom thì gợi ý theo 0,6 lít/keg — số keg thật chỉ
                                người giao biết, và không phải lần nào cũng tròn
                                keg, nên tự áp là ghi hao hụt cho một lượng hàng
                                chưa chắc có thật.
                              */}
                              {activeTab === "export" && (
                                <div className="sm:col-span-12">
                                  <Input
                                    label="Hao hụt — không ghi công nợ"
                                    type="number"
                                    placeholder="0"
                                    value={
                                      item.lossQuantity ? item.lossQuantity : ""
                                    }
                                    onChange={(e: any) =>
                                      updateTransactionItem(index, {
                                        lossQuantity: Number(e.target.value),
                                      })
                                    }
                                  />
                                  <p className="text-[10px] font-bold text-amber-700 mt-1.5 leading-relaxed">
                                    {(() => {
                                      const sp = products.find(
                                        (p) => p.id === item.productId,
                                      );
                                      if (!item.quantity)
                                        return "Điền số lượng xuất trước, app sẽ gợi ý phần hao hụt.";
                                      if (sp?.category !== "Lít")
                                        return "Hàng lon không có keg nên không gợi ý được — điền nếu thực tế có hao hụt.";
                                      const keg =
                                        item.quantity / LIT_MOI_KEG_GHI;
                                      const goiY =
                                        Math.round(
                                          keg *
                                            (LIT_MOI_KEG_THUC -
                                              LIT_MOI_KEG_GHI) *
                                            100,
                                        ) / 100;
                                      return Math.abs(keg - Math.round(keg)) <
                                        0.005
                                        ? `${formatNumber(item.quantity)} lít = ${Math.round(keg)} keg → gợi ý hao hụt ${formatNumber(goiY)} lít (0,6 lít/keg).`
                                        : `${formatNumber(item.quantity)} lít không chia tròn 20 nên không suy ra được số keg — anh tự điền.`;
                                    })()}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-1 leading-relaxed">
                                    Ghi thành một dòng hao hụt riêng: tồn kho
                                    trừ cả phần này, còn công nợ và hóa đơn chỉ
                                    lấy số lượng ở trên.
                                  </p>
                                </div>
                              )}
                              <div className="sm:col-span-4">
                                {/* Khối này nằm trong nhánh activeTab !==
                                    "import" (nhập kho dùng bảng nhập nhanh),
                                    nên điều kiện activeTab === "import" cũ ở
                                    đây luôn sai — đã bỏ. */}
                                {newTransaction.type === "OPENING" && (
                                  <Input
                                    label="Số lô (Mã lô nhập)"
                                    placeholder="LOT-XXX"
                                    value={item.batchNumber}
                                    onChange={(e: any) =>
                                      updateTransactionItem(index, {
                                        batchNumber: e.target.value,
                                      })
                                    }
                                  />
                                )}
                                {activeTab === "export" &&
                                  (() => {
                                    const selectedBatch = batches.find(
                                      (b) =>
                                        b.productId === item.productId &&
                                        b.batchNumber === item.batchNumber,
                                    );
                                    const currentProduct = products.find(
                                      (p) => p.id === item.productId,
                                    );
                                    // Only show mismatch if we actually matched a batch for this specific productId
                                    const isCategoryMismatch =
                                      selectedBatch &&
                                      currentProduct &&
                                      selectedBatch.category !==
                                        currentProduct.category;

                                    return (
                                      <div
                                        className={cn(
                                          "text-[10px] font-mono font-black px-3 py-3 rounded-xl border flex flex-col gap-1",
                                          isCategoryMismatch
                                            ? "text-rose-600 bg-rose-50 border-rose-200"
                                            : "text-rose-500 bg-rose-50/50 border-rose-100",
                                        )}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>
                                            FIFO:{" "}
                                            {item.batchNumber || "TỰ ĐỘNG"}
                                          </span>
                                          {selectedBatch && (
                                            <span className="opacity-40">
                                              {selectedBatch.category}
                                            </span>
                                          )}
                                        </div>
                                        {isCategoryMismatch && (
                                          <div className="text-[8px] flex items-center gap-1.5 mt-0.5 text-rose-500 uppercase font-black">
                                            <AlertTriangle className="w-3 h-3" />
                                            Cảnh báo: Lô này thuộc hệ{" "}
                                            {selectedBatch.category}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    )}

                    <div className="md:col-span-2">
                      <Input
                        label="Ghi chú tổng quát (Tùy chọn)"
                        placeholder="Ví dụ: Theo xe tải số hiệu..., Ghi chú chung cho cả đơn..."
                        value={newTransaction.notes}
                        onChange={(e: any) =>
                          setNewTransaction({
                            ...newTransaction,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>

                    {activeTab === "export" && (
                      <div className="md:col-span-2">
                        <div className="p-5 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex items-center gap-4">
                          <Truck className="w-8 h-8 text-amber-500" />
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-amber-900 uppercase tracking-widest">
                              Mặc định: Đơn hàng đi đường (Giao sau)
                            </span>
                            <span className="text-[10px] text-amber-700/70 font-bold italic">
                              Tất cả đơn xuất kho sẽ được lưu vào mục "Đơn đi
                              đường" để xác nhận khi hoàn tất.
                            </span>
                          </div>
                          <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-amber-500 text-white rounded-full text-[8px] font-black uppercase">
                            Active
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Anh minh chung da chuyen sang tab "Phieu nhap": chup
                        anh to phieu DA KY chinh la buoc duyet so lieu. Xem
                        src/components/ImportSlip.tsx */}
                  </div>

                  <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center border-t border-slate-100 pt-10">
                    <Button
                      variant={activeTab === "import" ? "primary" : "danger"}
                      className="w-full sm:flex-1 py-5 text-base shadow-2xl relative group overflow-hidden"
                      onClick={() =>
                        handleAddTransaction(
                          activeTab === "import" ? newTransaction.type : "OUT",
                        )
                      }
                      disabled={
                        loading ||
                        newTransaction.items.some(
                          (i) => !i.productId || i.quantity <= 0,
                        )
                      }
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : activeTab === "import" ? (
                        <PlusCircle className="w-5 h-5" />
                      ) : (
                        <MinusCircle className="w-5 h-5" />
                      )}
                      <span className="relative z-10">
                        {activeTab === "import"
                          ? newTransaction.type === "OPENING"
                            ? "GHI NHẬN TỒN ĐẦU"
                            : `HOÀN TẤT NHẬP ${newTransaction.items.length} MÓN`
                          : `HOÀN TẤT XUẤT ${newTransaction.items.length} MÓN`}
                      </span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto px-10 py-5"
                      onClick={() => setActiveTab("dashboard")}
                    >
                      Hủy bỏ
                    </Button>
                  </div>

                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-20 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-50 rounded-full -ml-24 -mb-24 opacity-20 pointer-events-none" />
                </Card>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight font-serif italic">
                      Thiết lập Thẩm quyền
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                      Phân quyền truy cập hệ thống theo Email
                    </p>
                  </div>
                </div>

                {/* Dọn ảnh base64 còn kẹt từ bản app đầu tiên. */}
                <Card title="Kho ảnh">
                  <ChuyenAnhCu transactions={transactions} slips={slips} />
                </Card>

                {/* DỮ LIỆU THỬ NGHIỆM — dùng khi app chưa đưa vào vận hành */}
                <Card title="Dữ liệu thử nghiệm">
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
                      <FlaskConical className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                        Tạo sẵn giao dịch nhập kho của 5 ngày gần nhất để chạy
                        thử quy trình: nhập số → in phiếu → ký → tải ảnh duyệt.
                        Kèm phiếu xuất và hóa đơn của 3 ngày gần nhất — trong đó
                        cố ý để một sản phẩm thiếu hóa đơn, một sản phẩm chưa ra
                        hóa đơn và một hóa đơn sai tên hàng, để xem bảng Đối soát
                        có bắt đúng không. Mọi bản ghi đều mang dấu riêng nên xoá
                        được sạch, không lẫn vào số liệu thật về sau.
                      </p>
                    </div>

                    {demoTransactionCount > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-[11px] font-black text-amber-800">
                          Đang có {demoTransactionCount} bản ghi thử nghiệm
                          (giao dịch + doanh thu) trong hệ thống
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        className="flex-1"
                        loading={demoBusy}
                        onClick={handleGenerateDemoData}
                      >
                        <FlaskConical className="w-4 h-4" /> Tạo dữ liệu thử
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        loading={demoBusy}
                        onClick={handleClearDemoData}
                        disabled={demoTransactionCount === 0}
                      >
                        <Trash2 className="w-4 h-4" /> Xoá dữ liệu thử
                      </Button>
                    </div>

                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                      Nút xoá chỉ động tới các bản ghi mang dấu thử nghiệm và
                      phiếu của những ngày đó. Muốn xoá sạch mọi thứ kể cả số
                      thật thì dùng "Dọn sạch hệ thống" ở thanh bên.
                    </p>
                  </div>
                </Card>

                {/* DỰ BÁO DUNG LƯỢNG FIREBASE — cảnh báo sớm trước khi chạm giới hạn */}
                <Card title="Sức khỏe hệ thống · Dung lượng Firebase">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              "text-4xl font-black tracking-tight",
                              storageForecast.level === "danger"
                                ? "text-rose-600"
                                : storageForecast.level === "warning"
                                  ? "text-amber-500"
                                  : "text-emerald-600",
                            )}
                          >
                            {storageForecast.usedPercent < 0.1
                              ? "<0.1"
                              : storageForecast.usedPercent.toFixed(1)}
                            %
                          </span>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            đã dùng
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500">
                          {formatBytes(storageForecast.usedBytes)} /{" "}
                          {formatBytes(storageForecast.limitBytes)} (gói Spark
                          miễn phí)
                        </p>
                      </div>

                      <div
                        className={cn(
                          "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2",
                          storageForecast.level === "danger"
                            ? "bg-rose-50 border-rose-100 text-rose-600"
                            : storageForecast.level === "warning"
                              ? "bg-amber-50 border-amber-100 text-amber-600"
                              : "bg-emerald-50 border-emerald-100 text-emerald-600",
                        )}
                      >
                        {storageForecast.level === "safe" ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {storageForecast.level === "danger"
                          ? "Nguy hiểm — cần dọn dẹp"
                          : storageForecast.level === "warning"
                            ? "Cần theo dõi"
                            : "An toàn"}
                      </div>
                    </div>

                    {/* LƯỢT ĐỌC — hạn mức này thường hết trước dung lượng */}
                    <div
                      className={cn(
                        "mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-3 justify-between",
                        storageForecast.readLevel === "danger"
                          ? "bg-rose-50 border-rose-200"
                          : storageForecast.readLevel === "warning"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-slate-50 border-slate-100",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {storageForecast.readLevel === "safe" ? (
                          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle
                            className={cn(
                              "w-4 h-4 shrink-0 mt-0.5",
                              storageForecast.readLevel === "danger"
                                ? "text-rose-600"
                                : "text-amber-600",
                            )}
                          />
                        )}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Lượt đọc mỗi lần mở app
                          </p>
                          <p className="text-[11px] font-bold text-slate-500 mt-1 leading-relaxed">
                            App tải trọn dữ liệu mỗi lần mở:{" "}
                            <strong>
                              {formatNumber(storageForecast.docsPerAppOpen)}
                            </strong>{" "}
                            lượt đọc. Hạn mức gói Spark là{" "}
                            {formatNumber(storageForecast.freeReadsPerDay)} lượt
                            đọc/ngày.
                            {storageForecast.opensPerDay !== null && (
                              <>
                                {" "}
                                Tức khoảng{" "}
                                <strong>
                                  {formatNumber(storageForecast.opensPerDay)}
                                </strong>{" "}
                                lần mở app mỗi ngày cho cả nhóm.
                              </>
                            )}
                            {storageForecast.readLevel !== "safe" && (
                              <>
                                {" "}
                                <span className="text-rose-700">
                                  Hạn mức này sẽ hết trước dung lượng — cần
                                  chuyển sang chốt tồn đầu kỳ theo tháng để
                                  không phải tải cả lịch sử.
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap self-start sm:self-auto",
                          storageForecast.readLevel === "danger"
                            ? "bg-white border-rose-200 text-rose-600"
                            : storageForecast.readLevel === "warning"
                              ? "bg-white border-amber-200 text-amber-600"
                              : "bg-white border-slate-200 text-slate-500",
                        )}
                      >
                        {storageForecast.readLevel === "danger"
                          ? "Chật"
                          : storageForecast.readLevel === "warning"
                            ? "Cần theo dõi"
                            : "Còn rộng"}
                      </div>
                    </div>

                    {/* Thanh tiến trình */}
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            storageForecast.level === "danger"
                              ? "bg-rose-500"
                              : storageForecast.level === "warning"
                                ? "bg-amber-400"
                                : "bg-emerald-500",
                          )}
                          style={{
                            width: `${Math.min(100, Math.max(0.5, storageForecast.usedPercent))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        <span>0</span>
                        <span>50%</span>
                        <span>1 GB</span>
                      </div>
                    </div>

                    {/* Dự báo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Còn chứa được
                        </p>
                        <p className="text-lg font-black text-slate-900">
                          {storageForecast.remainingTransactions !== null
                            ? `~${formatNumber(storageForecast.remainingTransactions)} đơn`
                            : "—"}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Tốc độ phát sinh
                        </p>
                        <p className="text-lg font-black text-slate-900">
                          {storageForecast.perDay !== null
                            ? `~${storageForecast.perDay.toFixed(1)} đơn/ngày`
                            : "—"}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Dự kiến đầy sau
                        </p>
                        <p className="text-lg font-black text-slate-900">
                          {storageForecast.daysLeft !== null
                            ? storageForecast.daysLeft > 3650
                              ? "Trên 10 năm"
                              : storageForecast.daysLeft > 365
                                ? `~${(storageForecast.daysLeft / 365).toFixed(1)} năm`
                                : `~${formatNumber(storageForecast.daysLeft)} ngày`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Chi tiết theo nhóm dữ liệu */}
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      {[
                        {
                          label: "Giao dịch nhập/xuất",
                          bytes: storageForecast.txBytes,
                          count: storageForecast.counts.transactions,
                        },
                        {
                          label: "Đối tác",
                          bytes: storageForecast.partnerBytes,
                          count: storageForecast.counts.partners,
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="font-bold text-slate-500">
                            {row.label}{" "}
                            <span className="text-slate-300">
                              ({formatNumber(row.count)} bản ghi)
                            </span>
                          </span>
                          <span className="font-mono font-black text-slate-700">
                            {formatBytes(row.bytes)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed border-t border-slate-100 pt-4">
                      Ảnh minh chứng được lưu trên Cloudinary (không tính vào
                      dung lượng Firebase). Con số trên là ƯỚC TÍNH từ dữ liệu
                      đang tải về máy, đã cộng 50% hao phí chỉ mục — số thật xem
                      tại Firebase Console. Khi chạm 80%, anh nên xuất Excel lưu
                      trữ rồi dọn bớt giao dịch cũ.
                    </p>
                  </div>
                </Card>

                <Card title="Phê duyệt & phân quyền người dùng">
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                        Người dùng tự đăng nhập bằng Google và sẽ ở trạng thái
                        <span className="text-amber-600"> chờ duyệt</span> cho
                        tới khi được cấp vai trò tại đây. Hệ thống không lưu mật
                        khẩu của ai — phần đó do Google quản lý.
                      </p>
                    </div>

                    {allUserProfiles.length === 0 ? (
                      <p className="text-center text-xs font-bold text-slate-400 py-10">
                        Chưa có người dùng nào đăng nhập.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {[...allUserProfiles]
                          // Nguoi cho duyet len dau cho de thay
                          .sort((a, b) =>
                            a.role === "PENDING" && b.role !== "PENDING"
                              ? -1
                              : b.role === "PENDING" && a.role !== "PENDING"
                                ? 1
                                : (a.email || "").localeCompare(b.email || ""),
                          )
                          .map((profile) => {
                            // Chu so huu goc: khong hien o chon vai tro, vi
                            // khong ai duoc ha quyen tai khoan nay.
                            const laChuSoHuuGoc =
                              profile.email === OWNER_EMAIL;
                            return (
                              <div
                                key={profile.uid}
                                className="p-4 rounded-2xl border border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {profile.photoURL ? (
                                    <img
                                      src={profile.photoURL}
                                      alt=""
                                      className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                      <User className="w-5 h-5 text-slate-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">
                                      {profile.name || "Chưa đặt tên"}
                                      {laChuSoHuuGoc && (
                                        <span className="ml-2 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                                          Chủ sở hữu gốc
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-400 truncate">
                                      {profile.email}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {laChuSoHuuGoc ? (
                                    <span className="px-3 py-2 rounded-xl bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                                      Toàn quyền
                                    </span>
                                  ) : (
                                    <>
                                      <select
                                        value={profile.role}
                                        onChange={async (e) => {
                                          const newRole = e.target
                                            .value as UserRole;
                                          /*
                                            Vai tro OWNER chi co hieu luc that
                                            khi firestore.rules moi da duoc
                                            Publish. Voi ban rules cu, isStaff()
                                            doi dung chu 'STAFF', nen dat ai do
                                            len OWNER lai LAY MAT sach quyen doc
                                            va ghi cua ho - man hinh trong tron,
                                            bam gi cung khong duoc. Hoi truoc
                                            con hon de ho ngoi do khong hieu vi
                                            sao.
                                          */
                                          if (
                                            (newRole === "OWNER" ||
                                              newRole === "KE_TOAN") &&
                                            !window.confirm(
                                              `Cấp quyền ${newRole === "OWNER" ? "toàn quyền" : "kế toán"} cho ${profile.email}?\n\n${newRole === "OWNER" ? "Họ làm được mọi thứ như chủ sở hữu, kể cả duyệt người dùng và xóa dữ liệu." : "Họ làm được mọi việc nghiệp vụ, kể cả thao tác doanh thu và tạo lệnh xuất hóa đơn lên SAP. Không duyệt được người dùng."}\n\nQUAN TRỌNG: phân quyền Firestore phải là bản mới nhất. Nếu chưa dán lại firestore.rules trong Firebase Console thì người này sẽ MẤT HẾT quyền thay vì được thêm.`,
                                            )
                                          ) {
                                            e.target.value = profile.role;
                                            return;
                                          }
                                          try {
                                            await updateDoc(
                                              doc(db, "users", profile.uid),
                                              {
                                                role: newRole,
                                                updatedAt:
                                                  new Date().toISOString(),
                                                // Ai bam duyet thi ghi ten
                                                // nguoi do - gio co the la
                                                // chu so huu thu hai.
                                                approvedBy:
                                                  currentUserProfile?.email ||
                                                  user ||
                                                  OWNER_EMAIL,
                                              },
                                            );
                                            showNotification(
                                              `Đã cập nhật quyền cho ${profile.email}`,
                                            );
                                          } catch (err: any) {
                                            alert(
                                              "Không cập nhật được: " +
                                                err.message,
                                            );
                                          }
                                        }}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:border-primary"
                                      >
                                        <option value="PENDING">
                                          Chờ duyệt
                                        </option>
                                        <option value="VIEWER">
                                          VIEWER — Chỉ xem
                                        </option>
                                        <option value="STAFF">
                                          STAFF — Nhập/xuất kho
                                        </option>
                                        <option value="KE_TOAN">
                                          KẾ TOÁN — Làm được mọi việc
                                        </option>
                                        <option value="OWNER">
                                          OWNER — Toàn quyền, như chủ sở hữu
                                        </option>
                                      </select>

                                      {profile.pinHash && (
                                        <button
                                          onClick={async () => {
                                            if (
                                              !confirm(
                                                `Đặt lại mã PIN của ${profile.email}?\n\nHọ sẽ được yêu cầu tạo mã PIN mới ở lần đăng nhập tới.`,
                                              )
                                            )
                                              return;
                                            try {
                                              await updateDoc(
                                                doc(db, "users", profile.uid),
                                                {
                                                  pinHash: null,
                                                  pinUpdatedAt:
                                                    new Date().toISOString(),
                                                },
                                              );
                                              showNotification(
                                                "Đã đặt lại mã PIN",
                                              );
                                            } catch (err: any) {
                                              alert(
                                                "Không đặt lại được: " +
                                                  err.message,
                                              );
                                            }
                                          }}
                                          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-colors"
                                          title="Đặt lại mã PIN"
                                        >
                                          <Lock className="w-4 h-4" />
                                        </button>
                                      )}

                                      <button
                                        onClick={async () => {
                                          if (
                                            !confirm(
                                              `Xoá quyền truy cập của ${profile.email}?`,
                                            )
                                          )
                                            return;
                                          try {
                                            await deleteDoc(
                                              doc(db, "users", profile.uid),
                                            );
                                            showNotification("Đã thu hồi quyền");
                                          } catch (err: any) {
                                            alert(
                                              "Không xoá được: " + err.message,
                                            );
                                          }
                                        }}
                                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                                        title="Thu hồi quyền truy cập"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative max-w-md w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors hover:text-primary" />
                    <input
                      placeholder="Tìm kiếm lịch sử (Sản phẩm, Đối tác, Số lô...)"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm transition-all premium-shadow"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="bg-white border border-slate-100"
                    >
                      <Download className="w-4 h-4" /> Xuất dữ liệu
                    </Button>
                  </div>
                </div>

                <Card noPadding>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                            Ngày thực nhập/xuất
                          </th>
                          <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-center">
                            Hoạt động
                          </th>
                          <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                            Sản phẩm
                          </th>
                          <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-right">
                            Số lượng
                          </th>
                          <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                            Ghi chú & Minh chứng
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.length > 0 ? (
                          filteredTransactions.map((t) => (
                            <tr
                              key={t.id}
                              className="hover:bg-slate-50 transition-colors group"
                            >
                              <td className="py-4 px-6">
                                <div className="text-[11px] font-bold text-slate-500 font-mono">
                                  {formatDate(t.date).split(" ")[0]}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold">
                                  {formatDate(t.date).split(" ")[1]}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span
                                  className={cn(
                                    "inline-flex items-center justify-center w-8 h-8 rounded-lg",
                                    t.type === "IN" || t.type === "OPENING"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : t.type === "LOSS" || t.type === "DAMAGE"
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-rose-50 text-rose-600",
                                  )}
                                >
                                  {t.type === "IN" || t.type === "OPENING" ? (
                                    <ArrowDownLeft className="w-4 h-4" />
                                  ) : (
                                    <ArrowUpRight className="w-4 h-4" />
                                  )}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-900 text-sm leading-tight">
                                  {t.productName}
                                  {t.status === "in_transit" && (
                                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-tighter flex inline-flex items-center gap-1 mt-1 md:mt-0">
                                      <Truck className="w-3 h-3" />
                                      Đang đi đường
                                    </span>
                                  )}
                                  {(t.type === "LOSS" ||
                                    t.type === "DAMAGE") && (
                                    <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-tighter mt-1 md:mt-0">
                                      Hao hụt / Hư hại
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">
                                  {t.category} • {t.partnerName}
                                </div>
                                {t.batchNumber && (
                                  <div className="mt-1 text-[10px] font-mono font-black text-primary/60">
                                    LOT: {t.batchNumber}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <span
                                  className={cn(
                                    "font-mono font-black text-sm",
                                    t.type === "IN" || t.type === "OPENING"
                                      ? "text-emerald-600"
                                      : "text-rose-600",
                                  )}
                                >
                                  {t.type === "IN" || t.type === "OPENING"
                                    ? "+"
                                    : "-"}
                                  {formatNumber(t.quantity)}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-400 italic max-w-[120px] truncate">
                                    {t.notes || "—"}
                                  </span>
                                  {t.evidencePhotoUrl && (
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() =>
                                          window.open(
                                            t.evidencePhotoUrl,
                                            "_blank",
                                          )
                                        }
                                        className="w-7 h-7 bg-primary/5 text-primary rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                                        title="Xem biên bản"
                                      >
                                        <ImageIcon className="w-4 h-4" />
                                      </button>
                                      <a
                                        href={t.evidencePhotoUrl}
                                        download={`bien-ban-${t.id}.png`}
                                        className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                        title="Tải ảnh về"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-20 text-center text-slate-400 text-sm font-bold uppercase tracking-widest opacity-30"
                            >
                              Không tìm thấy giao dịch phù hợp.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "debt" && daDuocDuyet && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Công nợ · Hóa đơn
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Gom xuất kho theo kỳ · tính thuế · kết xuất mẫu Chốt
                  </p>
                </div>
                <Card>
                  <DebtExport
                    transactions={transactions}
                    products={products}
                    /* Danh mục ghep: Firestore co the con thieu bo phan BNC,
                       ma thieu ma BP la hoa don sai khach. */
                    partners={donVi}
                    hoaDon={hoaDon}
                    onSaveHoaDon={handleSaveHoaDon}
                  />
                </Card>
              </div>
            )}

            {activeTab === "bnc" && daDuocDuyet && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Đơn BNC
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Bia đi tới bộ phận nào trong khu · trạng thái từng đơn
                  </p>
                </div>
                <Card>
                  <DonBNC
                    transactions={transactions}
                    products={products}
                    partners={donVi}
                  />
                </Card>
              </div>
            )}


            {activeTab === "slips" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Phiếu nhập kho
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Mỗi lượt giao một phiếu · In · Ký tươi · Chụp ảnh là vào
                      tồn
                    </p>
                  </div>
                </div>

                <Card>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3 mb-5">
                    <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                      Mỗi lượt sản xuất giao hàng là một phiếu riêng. Kho đếm và
                      đối chiếu với số đã điền, khớp thì bấm{" "}
                      <strong>Xem &amp; in</strong>, hai bên ký tươi lên bản in,
                      rồi đưa ảnh tờ đã ký vào đúng phiếu đó —{" "}
                      <strong>Chụp ảnh</strong> nếu đang dùng điện thoại, hoặc{" "}
                      <strong>Tải ảnh lên</strong> nếu đã có tệp ảnh/bản quét
                      sẵn. <strong>Có ảnh ký thì hàng mới vào tồn kho</strong> và
                      mới xuất bán được; chưa ký thì số chỉ nằm chờ ở đây.
                    </p>
                  </div>

                  <ImportSlipPanel
                    transactions={transactions}
                    products={products}
                    partners={partners}
                    slips={slips}
                    canWrite={canWrite}
                    currentUserName={currentUserProfile?.name || user || ""}
                    onMarkPrinted={handleMarkSlipPrinted}
                    onUploadSigned={handleUploadSignedSlip}
                    onRemoveSigned={
                      isOwner ? handleRemoveSignedSlipPhoto : undefined
                    }
                    uploadingCode={uploadingSlipCode}
                  />
                </Card>
              </div>
            )}

            {activeTab === "partners" && (
              <div className="space-y-6">
                {isOwner && partners.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">
                          Danh sách Đối tác đang trống
                        </h3>
                        <p className="text-xs font-bold text-amber-700/70 mt-1">
                          Anh có muốn Tin khôi phục lại danh sách đối tác mẫu
                          (SKB, APC, BNG...) không?
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRestorePartners}
                      className="px-8 py-3.5 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-600/20 hover:bg-amber-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Khôi phục ngay
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partners.map((p) => (
                    <Card key={p.id} className="relative group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-4">
                          <div
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter inline-block",
                              p.type === "SUPPLIER"
                                ? "bg-blue-100 text-blue-600"
                                : p.type === "RESTAURANT"
                                  ? "bg-amber-100 text-amber-600"
                                  : p.type === "AGENT"
                                    ? "bg-indigo-100 text-indigo-600"
                                    : "bg-gray-100 text-gray-600",
                            )}
                          >
                            {p.type === "SUPPLIER"
                              ? "Nhà cung cấp"
                              : p.type === "RESTAURANT"
                                ? "Nhà hàng"
                                : p.type === "AGENT"
                                  ? "Đại lý"
                                  : "Khách lẻ"}
                          </div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-gray-900 leading-tight">
                              {p.name}
                            </h4>
                            {p.sapCode && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black border border-slate-200">
                                SAP: {p.sapCode}
                              </span>
                            )}
                            <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mt-1">
                              {p.phone || "Không có SĐT"}
                            </p>
                          </div>
                          {p.address && (
                            <div className="flex items-start gap-2 text-xs text-gray-400">
                              <Search className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{p.address}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePartner(p.id)}
                          className="p-2 hover:bg-rose-50 rounded-lg transition-colors group/del"
                          title="Xóa đối tác"
                        >
                          <Trash2 className="w-4 h-4 text-gray-300 group-hover/del:text-rose-500" />
                        </button>
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="text-[10px] uppercase font-bold text-gray-400">
                          Tổng GD
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {
                            transactions.filter((t) => t.partnerId === p.id)
                              .length
                          }
                        </div>
                      </div>
                    </Card>
                  ))}
                  <button
                    onClick={() => setShowAddPartner(true)}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <PlusCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">
                      Thêm đối tác mới
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "gallery" && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight italic font-serif uppercase">
                      THƯ VIỆN ẢNH{" "}
                      {galleryFilter === "IN" ? "NHẬP KHO" : "XUẤT KHO"}
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.3em]">
                      {galleryFilter === "IN"
                        ? "Ảnh tờ phiếu nhập kho đã ký"
                        : "Ảnh biên bản giao hàng"}{" "}
                      · đang xem {formatNumber(anhThuVien.length)}/
                      {formatNumber(tongAnhMoiChieu)} ảnh
                    </p>
                  </div>

                  <div className="flex flex-col lg:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Search Dynamic Field */}
                    <div className="relative group w-full lg:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        /*
                          Chieu xuat da co o chon don vi ben canh nen o nay
                          khong con de tra cuu don vi nua: bay hai cach lam mot
                          viec thi nguoi dung go ten don vi vao day roi khong
                          hieu vi sao khong ra. O nay de tra ten hang va ma lo.
                        */
                        placeholder={
                          galleryFilter === "IN"
                            ? "Tra cứu MÃ PHIẾU / MÃ LÔ..."
                            : "Tra cứu MẶT HÀNG / MÃ LÔ..."
                        }
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-black placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm uppercase tracking-widest text-slate-700"
                        value={gallerySearchQuery}
                        onChange={(e) => setGallerySearchQuery(e.target.value)}
                      />
                      {gallerySearchQuery && (
                        <button
                          onClick={() => setGallerySearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Khoảng ngày: từ ngày — đến ngày */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <div className="relative flex-1 lg:w-40">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          aria-label="Từ ngày"
                          className="w-full pl-10 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm text-slate-700"
                          value={galleryTuNgay}
                          max={galleryDenNgay || undefined}
                          onChange={(e) => setGalleryTuNgay(e.target.value)}
                        />
                      </div>
                      <span className="text-slate-300 font-black shrink-0">
                        —
                      </span>
                      <div className="relative flex-1 lg:w-40">
                        <input
                          type="date"
                          aria-label="Đến ngày"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm text-slate-700"
                          value={galleryDenNgay}
                          min={galleryTuNgay || undefined}
                          onChange={(e) => setGalleryDenNgay(e.target.value)}
                        />
                      </div>
                      {/* Bỏ chặn ngày để xem lại toàn bộ. Có nút này thì không
                          ai phải chỉnh tay hai ô về rỗng. */}
                      <button
                        onClick={() => {
                          setGalleryTuNgay("");
                          setGalleryDenNgay("");
                        }}
                        className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary transition-all shrink-0"
                      >
                        Tất cả
                      </button>
                    </div>

                    {/* Toggle IN/OUT */}
                    <div className="flex bg-slate-100/50 backdrop-blur-sm p-1.5 rounded-2xl w-full md:w-auto border border-slate-200/50 shadow-inner">
                      <button
                        onClick={() => {
                          setGalleryFilter("IN");
                          // Chiều nhập không lọc theo đơn vị, mà để nguyên thì
                          // nó vẫn âm thầm lọc khi quay lại chiều xuất.
                          setGalleryDonVi("");
                          setGalleryBoPhan("");
                        }}
                        className={cn(
                          "flex-1 md:px-8 py-3 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                          galleryFilter === "IN"
                            ? "bg-white text-amber-600 shadow-xl shadow-amber-500/10 border border-slate-100"
                            : "text-slate-400 hover:text-slate-600",
                        )}
                      >
                        Nhập kho
                      </button>
                      <button
                        onClick={() => {
                          setGalleryFilter("OUT");
                          setGalleryDonVi("");
                          setGalleryBoPhan("");
                        }}
                        className={cn(
                          "flex-1 md:px-8 py-3 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                          galleryFilter === "OUT"
                            ? "bg-white text-rose-600 shadow-xl shadow-rose-500/10 border border-slate-100"
                            : "text-slate-400 hover:text-slate-600",
                        )}
                      >
                        Xuất kho
                      </button>
                    </div>

                    {/* Lọc theo đơn vị — chỉ chiều xuất kho mới có đối tác
                        nhận hàng. Dùng ô chọn chứ không dùng ô gõ: không ai
                        nhớ khoảng ngày đó có những đơn vị nào mà gõ.

                        BNC gộp thành BỐN PHẦN như màn xuất kho, không bày 20
                        dòng "BNC · ..." lấn hết đơn vị khác. Chọn Nội bộ thì
                        hiện thêm ô chọn điểm bán, nên vẫn soi được từng quán. */}
                    {galleryFilter === "OUT" && (
                      <div className="relative w-full lg:w-56 shrink-0">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          aria-label="Lọc theo đơn vị"
                          value={galleryDonVi}
                          onChange={(e) => {
                            // Đổi đơn vị thì bỏ điểm bán đang soi: điểm bán cũ
                            // gần như luôn thuộc phần khác, để lại là lưới trống.
                            setGalleryDonVi(e.target.value);
                            setGalleryBoPhan("");
                          }}
                          className="w-full appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm uppercase tracking-widest text-slate-700 disabled:opacity-50"
                          disabled={donViCoAnh.length === 0}
                        >
                          <option value="">
                            {donViCoAnh.length === 0
                              ? "Không có đơn vị nào"
                              : `Tất cả đơn vị (${formatNumber(donViCoAnh.length)})`}
                          </option>
                          {/* Đơn vị đang chọn mà khoảng ngày mới không còn ảnh
                              thì vẫn phải bày ra, không thì ô chọn tự nhảy về
                              "Tất cả" trong khi lưới vẫn đang lọc. */}
                          {galleryDonVi &&
                            !donViCoAnh.some((d) => d.gia === galleryDonVi) && (
                              <option value={galleryDonVi}>
                                {tenLocDonVi(galleryDonVi)} — không có ảnh trong
                                khoảng này
                              </option>
                            )}
                          {donViCoAnh.map((d) => (
                            <option key={d.gia} value={d.gia}>
                              {d.ten}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    )}

                    {/* Ô THỨ HAI — điểm bán, chỉ hiện khi phần đang lọc có từ
                        hai bộ phận trở lên (thực tế là Nội bộ với 17 điểm bán).
                        Ba phần kia chỉ có một bộ phận nên ô này vô nghĩa. */}
                    {galleryFilter === "OUT" && boPhanCoAnh.length > 0 && (
                      <div className="relative w-full lg:w-52 shrink-0">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          aria-label="Lọc theo điểm bán"
                          value={galleryBoPhan}
                          onChange={(e) => setGalleryBoPhan(e.target.value)}
                          className="w-full appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm uppercase tracking-widest text-slate-700"
                        >
                          <option value="">
                            {`Tất cả điểm bán (${formatNumber(boPhanCoAnh.length)})`}
                          </option>
                          {boPhanCoAnh.map((d) => (
                            <option key={d} value={d}>
                              {d.replace(/^BNC · /, "")}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    )}

                    {/* Tải hàng loạt: gói đúng những tấm đang hiện trên lưới */}
                    <button
                      onClick={taiTatCaAnhThuVien}
                      disabled={
                        tienTrinhTaiAnh.tong > 0 || anhThuVien.length === 0
                      }
                      title={
                        anhThuVien.length === 0
                          ? "Không có ảnh nào trong khoảng đang xem"
                          : `Gói ${anhThuVien.length} ảnh đang xem vào một tệp ZIP`
                      }
                      className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {tienTrinhTaiAnh.tong > 0 ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang tải {formatNumber(tienTrinhTaiAnh.xong)}/
                          {formatNumber(tienTrinhTaiAnh.tong)}
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Tải tất cả ({formatNumber(anhThuVien.length)})
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/*
                  Đếm số tấm lỗi trong đúng bộ đang xem. Ảnh lỗi không tự lộ ra
                  khi lướt qua nhanh, mà biết có bao nhiêu tấm mất thì còn đi
                  tìm lại chứng từ được.
                */}
                {soAnhLoi > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex gap-2 items-start">
                    <ImageOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                      <strong>
                        {formatNumber(soAnhLoi)}/{formatNumber(anhThuVien.length)}{" "}
                        tấm
                      </strong>{" "}
                      không tải được — ô ảnh ghi rõ lý do từng tấm. Ảnh cũ nhúng
                      trong hệ thống thì chạy phần <strong>Chuyển ảnh cũ</strong>;
                      ảnh không còn trên máy chủ thì phải tìm lại tờ biên bản.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {anhThuVien.length > 0 ? (
                    anhThuVien.map((t) => (
                      <div
                        key={t.id}
                        className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-slate-100 cursor-pointer"
                        onClick={() => setSelectedGalleryImage(t)}
                      >
                        <div className="aspect-[4/5] overflow-hidden">
                          {/*
                            Tấm nào tải không được thì NÓI RA lý do, không để ô
                            trắng. Ô trắng trơn nhìn giống app lọc sai hoặc mất
                            ảnh, mà thật ra ảnh đã không còn hoặc là ảnh cũ
                            nhúng trong tài liệu bị cắt cụt.
                          */}
                          {anhLoi.has(t.id) ? (
                            <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2 px-3 text-center">
                              <ImageOff className="w-7 h-7 text-slate-300" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-snug">
                                Không tải được ảnh
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 leading-snug">
                                {lyDoAnhLoi(t.url)}
                              </span>
                            </div>
                          ) : (
                            <img
                              src={t.url}
                              alt={t.tieuDe}
                              loading="lazy"
                              onError={() => ghiAnhLoi(t.id)}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Calendar className="w-2.5 h-2.5 text-white/70" />
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-widest",
                                  galleryFilter === "IN"
                                    ? "text-amber-300"
                                    : "text-rose-300",
                                )}
                              >
                                {galleryFilter === "IN"
                                  ? "Ngày thực nhập"
                                  : "Ngày thực xuất"}
                                : {formatDate(t.date)}
                              </span>
                            </div>
                            <h5 className="text-white font-bold text-[11px] sm:text-xs leading-tight truncate">
                              {t.tieuDe}
                            </h5>
                            <div className="flex items-center gap-1.5 mt-1 border-t border-white/10 pt-2">
                              <Users
                                className={cn(
                                  "w-2.5 h-2.5",
                                  galleryFilter === "IN"
                                    ? "text-amber-400"
                                    : "text-rose-400",
                                )}
                              />
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-tighter truncate",
                                  galleryFilter === "IN"
                                    ? "text-amber-200"
                                    : "text-rose-200",
                                )}
                              >
                                {t.phu}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2 bg-slate-50/50 rounded-3xl">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl text-slate-300">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-slate-900 uppercase">
                          Trống
                        </h4>
                        {/* Rỗng vì khoảng ngày hẹp KHÁC hẳn rỗng vì chưa có
                            ảnh nào. Nói nhầm là người dùng đi tìm lỗi ở chỗ
                            không có lỗi. */}
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                          {tongAnhMoiChieu > 0
                            ? `Không có ảnh nào trong khoảng ngày đang chọn. Toàn bộ có ${formatNumber(tongAnhMoiChieu)} ảnh — nới ngày ra hoặc bấm "Tất cả".`
                            : galleryFilter === "IN"
                              ? "Chưa có ảnh phiếu nhập kho nào. Ảnh vào đây sau khi tải tờ phiếu đã ký lên ở tab Phiếu nhập."
                              : "Chưa có ảnh biên bản xuất kho nào được ghi nhận."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fullscreen Image View Modal */}
            {selectedGalleryImage && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div
                  onClick={() => setSelectedGalleryImage(null)}
                  className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl"
                />
                <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col">
                  <div className="absolute -top-16 left-0 right-0 flex items-center justify-between pointer-events-none">
                    <div className="flex flex-col">
                      <h3 className="text-white font-black text-xl uppercase tracking-tighter">
                        {selectedGalleryImage.tieuDe}
                      </h3>
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                        {formatDate(selectedGalleryImage.date)} •{" "}
                        {selectedGalleryImage.phu}
                      </p>
                    </div>
                    <div className="flex gap-4 pointer-events-auto">
                      <a
                        href={selectedGalleryImage.url}
                        download={`BCSX-${selectedGalleryImage.id}.png`}
                        className="w-12 h-12 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all"
                      >
                        <Download className="w-6 h-6" />
                      </a>
                      <button
                        onClick={() => setSelectedGalleryImage(null)}
                        className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  {anhLoi.has(selectedGalleryImage.id) ? (
                    <div className="w-full h-full rounded-3xl bg-slate-100 flex flex-col items-center justify-center gap-3 px-6 text-center">
                      <ImageOff className="w-12 h-12 text-slate-300" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Không tải được ảnh
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 max-w-sm leading-relaxed">
                        {lyDoAnhLoi(selectedGalleryImage.url)}
                      </p>
                      {/*
                        Bày nguyên đường dẫn ra: đây là thứ duy nhất nói được
                        ảnh hỏng vì lý do gì, mà người dùng thì không mở được
                        cơ sở dữ liệu lên xem. Có nó thì chụp lại là đủ để lần
                        ra chỗ ghi sai.
                      */}
                      <code className="max-w-lg px-3 py-2 rounded-lg bg-white border border-slate-200 text-[10px] font-mono text-slate-500 break-all leading-relaxed">
                        {selectedGalleryImage.url.slice(0, 160)}
                        {selectedGalleryImage.url.length > 160 ? "…" : ""}
                      </code>
                    </div>
                  ) : (
                    <img
                      src={selectedGalleryImage.url}
                      onError={() => ghiAnhLoi(selectedGalleryImage.id)}
                      className="w-full h-full object-contain rounded-3xl shadow-2xl"
                      alt="Zoomed"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Add Partner Modal */}
            {showAddPartner && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  onClick={() => setShowAddPartner(false)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 underline decoration-indigo-200 underline-offset-4">
                        ĐỐI TÁC MỚI
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                        Khởi rạo quan hệ hợp tác
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddPartner(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleAddPartner} className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Input
                          label="Tên Đối tác / Đại lý"
                          placeholder="Nhập tên chính thức..."
                          value={partnerFormData.name}
                          onChange={(e: any) =>
                            setPartnerFormData({
                              ...partnerFormData,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <Input
                        label="Mã SAP (Tùy chọn)"
                        placeholder="AD0xxx..."
                        value={partnerFormData.sapCode}
                        onChange={(e: any) =>
                          setPartnerFormData({
                            ...partnerFormData,
                            sapCode: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Phân loại"
                        options={[
                          { value: "AGENT", label: "Đại lý" },
                          { value: "RESTAURANT", label: "Nhà hàng" },
                          { value: "SUPPLIER", label: "Nhà cung cấp" },
                          { value: "OTHER", label: "Khác" },
                        ]}
                        value={partnerFormData.type}
                        onChange={(e: any) =>
                          setPartnerFormData({
                            ...partnerFormData,
                            type: e.target.value as any,
                          })
                        }
                      />
                      <Input
                        label="Số điện thoại"
                        placeholder="09xx..."
                        value={partnerFormData.phone}
                        onChange={(e: any) =>
                          setPartnerFormData({
                            ...partnerFormData,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Input
                      label="Địa chỉ (Tùy chọn)"
                      placeholder="Nhập địa chỉ..."
                      value={partnerFormData.address}
                      onChange={(e: any) =>
                        setPartnerFormData({
                          ...partnerFormData,
                          address: e.target.value,
                        })
                      }
                    />
                    <div className="pt-4 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        type="button"
                        onClick={() => setShowAddPartner(false)}
                      >
                        Hủy
                      </Button>
                      <Button className="flex-[2]" type="submit">
                        Lưu Đối tác
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
