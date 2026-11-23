/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback, ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  Building2,
  PlusCircle,
  MinusCircle,
  Users,
  Search,
  Calendar,
  Clock,
  User,
  Download,
  LogOut,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Info,
  Menu,
  X,
  CheckCircle,
  Truck,
  Camera,
  Image as ImageIcon,
  Layers,
  FileText,
  AlertTriangle,
  Trash2,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  FileUp,
  Beer,
  Sun,
  Moon,
  Lock,
  Unlock,
  KeyRound,
  FlaskConical,
  Receipt,
  Loader2,
  Calculator,
  Factory,
  Warehouse,
  ClipboardList,
  BarChart3,
  PieChart,
  Contact,
} from "lucide-react";
import {
  isValid,
  parse,
  startOfDay,
  endOfDay,
  parseISO,
  format,
} from "date-fns";
import {
  Transaction,
  Product,
  Partner,
  InventoryItem,
  TransactionType,
  Category,
  UserRole,
  UserProfile,
  ImportSlip,
  ChuKyDienTu,
  KeHoachSanXuat,
  DanhGiaSanXuat,
  KiemKeBon,
  KiemKeKegItem,
  KiemKeKegLit,
} from "./types";
import { INITIAL_PRODUCTS, INITIAL_PARTNERS } from "./constants";
import { cn, formatDate, formatNumber, ngayGioDiaPhuong } from "./lib/utils";
import { useTheme } from "./lib/useTheme";
import {
  nextSlipCode,
  pendingSlipTransactions,
  pendingStockByProduct,
  phieuDaVaoTon,
  stockTransactions,
} from "./lib/slip";
import {
  goiYLoFIFO,
  laDoiTacChuan206,
  taoTokenChuKy,
  tinhTonTheoLo,
  tongHopGiaoKegVaHaoHutDVTV,
} from "./lib/loBia";

import {
  db,
  auth,
  googleProvider,
  firebaseProjectId,
  firestoreDatabaseId,
  signInWithPopup,
  reauthenticateWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocFromServer,
  getDoc,
  getDocs,
  writeBatch,
  deleteField,
  batDauGuiDoLuong,
} from "./firebase";
import {
  BO_DEM,
  KHO_DO_LUONG,
  MOC_THAM_CHIEU,
  cacNgayGanNhat,
  duBaoCuoiNgay,
  mucDo,
  ngayHanMuc,
  phutDaQua,
  xepNguoi,
  type LoaiGoi,
  type NgayDoLuong,
} from "./lib/doLuong";
import {
  PIN_MAX_ATTEMPTS,
  clearLegacyPinStorage,
  clearPinResetIntent,
  generatePinSalt,
  getActivePinResetHint,
  hasPinResetIntentFor,
  hashPin,
  isValidPinFormat,
  isWeakPin,
  savePinResetIntent,
  verifyPin,
} from "./lib/pin";
import ImportSlipPanel, { BieuMauDienTuModal } from "./components/ImportSlip";
import XuongSanXuatPanel from "./components/XuongSanXuatPanel";
import QuanLyXuongPanel from "./components/QuanLyXuongPanel";
import KhoTongNxtPanel from "./components/KhoTongNxtPanel";
import KeToanDashboardPanel from "./components/KeToanDashboardPanel";
import BulkImportGrid from "./components/BulkImportGrid";
import KiemTraQuyen from "./components/KiemTraQuyen";
import {
  chiMucTheoChungTu,
  KHO_ANH_CHUNG_TU,
  maChungTuCuaDong,
  phieuDaCoAnhKy,
  viecAnhKhiXoa,
  type AnhChungTu,
} from "./anh/moHinh";
import {
  baoAnhChuaXoa,
  boTepVuaTai,
  chuAnhDaXoa,
  ghiAnhVaoLo,
  lamViecAnhKhiXoa,
  taiAnhChoChungTu,
} from "./anh/kho";
import ChonAnh, { taoTepCho, type TepCho } from "./anh/ChonAnh";
import { DangKyChuKy, HinhChuKy, HopKy, NguonChuKyMau, type YeuCauKy } from "./components/ChuKy";
import {
  bamSha256,
  idChuKyMau,
  mauMoiNhat,
  noiDungKiemKeBon,
  noiDungKiemKeKeg,
  noiDungPhieuNhap,
  XAC_THUC_KY,
  type ChuKyMau,
  type DongPhieuNhap,
} from "./lib/chuKy";
import { idKeHoach, lapViecGhiKeHoach, type DongKeHoach } from "./lib/keHoachSX";
import type { DongSoKeg } from "./lib/soKeg";
import { isoSangVn } from "./lib/oNgay";
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
import {
  DOI_TAC_DONG_BO,
  docBangTonKho,
  lapKeHoachDongBo,
  TEN_LOAI,
} from "./lib/napTonKho";
import { DANH_SACH_VAI_TRO, canChuKy, quyenCua, tenVaiTro, vaiTroDeChon } from "./lib/quyen";
import { dauCuaLoai } from "./lib/tonKho";
import type { TkhoNhapDraft } from "./lib/tkhoXuat";
import { danhKhoaBbgn, type BbgnDraft, dongCuNgoaiTep } from "./lib/bbgn";
import DebtExport from "./components/DebtExport";
import TraCuuHoaDon from "./components/TraCuuHoaDon";
import DanhBa from "./components/DanhBa";
import {
  bangSoPhieu,
  chungTuChuaCoSo,
  soPhieuCuaDong,
} from "./lib/soPhieuBaoCao";
import DonBNC from "./components/DonBNC";
import ManHinhDangNhap from "./components/ManHinhDangNhap";
import ManHinhPin, {
  type PinScreenMode,
  type PinStageState,
} from "./components/ManHinhPin";
import CapLaiPinDialog from "./components/CapLaiPinDialog";
import DoiPinCaNhanCard from "./components/DoiPinCaNhanCard";
import type { HoaDonGhiNhan } from "./lib/hoaDon";
import type { GhiSoPhieu } from "./lib/soPhieu";
import {
  KHO_BO_DEM,
  KHO_SO_PHIEU,
  capSoPhieu,
  giuMaPhieuNhap,
  laBoDemChieuNhap,
  laBoDemChieuXuat,
  huyPhieu,
} from "./lib/soPhieuKho";

import ONgay from "./components/ONgay";
import { DaiSucKhoe } from "./components/DaiSucKhoe";
import { nguonMoCoi, soPhieuMoCoi } from "./lib/nguonMoCoi";
import type { KetQuaThayThe } from "./lib/hoaDonThayThe";

import {
  laDongHaoHut,
  trongNhatKyNhap,
  trongNhatKyXuat,
} from "./lib/nhatKyKho";
import {
  boGiaoDichPhieuDaHuy,
  giaoDichConSotCuaPhieuDaHuy,
  nguonPhieuDaHuy,
} from "./lib/phieuHuy";
import { chuanTen, ghiChuHienThi } from "./lib/ghiChu";
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



/**
 * Định mức tồn tối thiểu dùng chung cho sản phẩm chưa đặt định mức riêng.
 * Bằng đúng con số 10 mà thẻ "Cảnh báo cạn kho" vẫn dùng từ trước.
 */
const DEFAULT_MIN_STOCK = 10;

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

  // Phien dang nhap do Firebase Auth quan ly (xem useEffect onAuthStateChanged).
  // Ban cu doc vai tro tu localStorage - ai cung sua duoc bang cong cu trinh
  // duyet de tu nang minh len OWNER.
  const [user, setUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("PENDING");
  /**
   * XEM NHƯ VAI TRÒ (chỉ admin thật): đổi GIAO DIỆN sang góc nhìn một vai trò
   * để thử từng phân hệ. Chỉ đổi menu, nút, quyền hiện trên màn hình — máy chủ
   * vẫn coi là admin (luật Firestore theo tài khoản thật), dữ liệu tải như admin.
   */
  const [vaiTroThu, setVaiTroThu] = useState<UserRole | null>(null);
  const vaiTroXem: UserRole = userRole === "OWNER" && vaiTroThu ? vaiTroThu : userRole;
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
   * Listener đã hỏng thì Firestore đóng luôn nó, không tự thử lại — nên dải
   * này có nút Tải lại trang. Đọc được lại thì tự xoá khỏi danh sách.
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
  const isOwner = vaiTroXem === "OWNER";
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
  /**
   * ẢNH CHỨNG TỪ — bảng `anh_chung_tu`, nguồn duy nhất của mọi ảnh minh chứng.
   * Ảnh gắn vào chứng từ (mã phiếu nhập / mã chuyến giao), không nằm trên dòng
   * giao dịch nào. Xem src/anh/moHinh.ts.
   */
  const [anhChungTu, setAnhChungTu] = useState<AnhChungTu[]>([]);
  /** Bảng ảnh đã về lần đầu chưa — chưa về thì không cho xoá dữ liệu (không biết ảnh nào đi theo). */
  const daTaiAnhRef = useRef(false);
  /** Ảnh theo mã chứng từ. */
  const anhTheoChungTu = useMemo(() => chiMucTheoChungTu(anhChungTu), [anhChungTu]);
  /** Đường dẫn ảnh của chứng từ chứa một dòng giao dịch. */
  const anhCuaDong = useCallback(
    (t: Transaction) => (anhTheoChungTu.get(maChungTuCuaDong(t)) || []).map((a) => a.url),
    [anhTheoChungTu],
  );
  /**
   * Lượt xoá này kéo theo những ảnh nào: ảnh của chứng từ không còn dòng /
   * phiếu nào sống thì xoá, ảnh dùng chung thì gỡ chứng từ đã mất. Bảng ảnh
   * chưa về thì báo và trả `null` — nơi gọi DỪNG, không xoá gì: xoá dữ liệu
   * mà không biết ảnh nào đi theo là để lại tệp không ai thấy.
   */
  const viecAnhCuaLuotXoa = (
    dong: readonly Transaction[],
    phieu: readonly ImportSlip[] = [],
  ) => {
    if (!daTaiAnhRef.current) {
      alert(
        "Bảng ảnh chưa tải xong nên chưa biết ảnh nào đi theo dữ liệu sắp xoá. Đợi vài giây rồi bấm lại. Chưa xoá gì.",
      );
      return null;
    }
    const idXoa = new Set(dong.map((t) => t.id));
    const maXoa = new Set(phieu.map((p) => p.code));
    const conSong = new Set<string>([
      ...transactions.filter((t) => !idXoa.has(t.id)).map(maChungTuCuaDong),
      ...slips.filter((p) => !maXoa.has(p.code)).map((p) => p.code),
    ]);
    return viecAnhKhiXoa(
      anhChungTu,
      [...dong.map(maChungTuCuaDong), ...phieu.map((p) => p.code)],
      conSong,
    );
  };
  /**
   * Hóa đơn ĐÃ PHÁT HÀNH, do người dùng điền lại số và ngày thật.
   *
   * Đây là bước cuối của quy trình: nạp đơn đã giao → app tính công nợ từng
   * đơn vị → cầm số đó đi phát hành hóa đơn ngoài app → quay lại điền số thật.
   * Xem `src/lib/hoaDon.ts`.
   */
  const [hoaDon, setHoaDon] = useState<HoaDonGhiNhan[]>([]);
  /**
   * SỔ SỐ PHIẾU — mỗi phiếu nhập / xuất một số cố định.
   *
   * Số KHÔNG lưu trên tài liệu giao dịch mà lưu ở sổ riêng, nối với chứng từ
   * qua trường `nguon` (mã phiếu nhập, hoặc `referenceGroupId` của lượt xuất).
   * Nhờ vậy bật tính năng này không phải sửa một tài liệu giao dịch nào —
   * không có bước chuyển đổi dữ liệu nào để làm hỏng.
   */
  const [soPhieu, setSoPhieu] = useState<GhiSoPhieu[]>([]);
  const [keHoach, setKeHoach] = useState<KeHoachSanXuat[]>([]);
  /** Chữ ký mẫu vẽ tay của mọi người (bảng `chu_ky_mau`, bất biến). */
  const [chuKyMau, setChuKyMau] = useState<ChuKyMau[]>([]);
  /** Sổ keg: tồn đầu sở hữu / tại ĐVTV, mua thêm, hỏng — xem `lib/soKeg.ts`. */
  const [soKeg, setSoKeg] = useState<DongSoKeg[]>([]);
  const [daTaiChuKyMau, setDaTaiChuKyMau] = useState(false);
  /** Mở màn đổi chữ ký mẫu (từ Cài đặt, hoặc khi ký mà chưa có mẫu). */
  const [moDoiChuKy, setMoDoiChuKy] = useState(false);
  /** Yêu cầu ký đang chờ người dùng nhập PIN. */
  const [choKy, setChoKy] = useState<(YeuCauKy & { xong: (m: ChuKyMau | null) => void }) | null>(null);
  const [danhGia, setDanhGia] = useState<DanhGiaSanXuat[]>([]);
  const [kiemKeBon, setKiemKeBon] = useState<KiemKeBon[]>([]);
  const [kiemKeKeg, setKiemKeKeg] = useState<KiemKeKegLit[]>([]);
  const [bieuMauCode, setBieuMauCode] = useState<string | null>(null);
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

  const [activeTab, setActiveTab] = useState("");
  /**
   * Tab con trong mục Sổ kho & Xuất SAP (tách phần Tổng hợp thành tab riêng `overview`).
   */
  const [reportSubTab, setReportSubTab] = useState<"in" | "out">("in");

  /*
   * Phân hệ Công nợ · Hóa đơn chia làm HAI thẻ, theo trạng thái của đơn.
   *
   *   "chua-xuat" — đơn chưa mang đi xuất hóa đơn: tải tệp TEMPLATE mang đi
   *                 phát hành.
   *   "da-xuat"   — điền số và ngày hóa đơn, tra lại hóa đơn cũ, in mẫu Chốt.
   *
   * Thẻ tra cứu trước đây tách riêng, nay gộp vào "da-xuat": cả hai cùng trả
   * lời một câu hỏi — hóa đơn này số bao nhiêu, ngày nào — nên tách ra chỉ làm
   * người dùng phải nhớ thứ mình cần nằm ở thẻ nào.
   *
   * Hai thẻ đầu đều do `DebtExport` vẽ, chỉ khác tham số `phan`. Cố ý dựng
   * bằng CÙNG MỘT thẻ ở cùng một chỗ trong cây: đổi thẻ thì React giữ nguyên
   * component, nên số hóa đơn đang gõ dở và biên đợt vừa khai không bị mất.
   * Tách ra hai nhánh khác nhau là mỗi lần đổi thẻ lại dựng mới từ đầu.
   *
   * Thẻ tra cứu tự dựng lại đợt từ chính các hóa đơn đã ghi (biên đợt lưu ở
   * localStorage của một máy nên không tra chéo máy được) — xem
   * `src/lib/traCuuHoaDon.ts`.
   */
  const [theCongNo, setTheCongNo] = useState<"chua-xuat" | "da-xuat">(
    "chua-xuat",
  );

  /*
   * KHOẢNG NGÀY CỦA BÁO CÁO.
   *
   * Thay cho ô "Lọc theo Mã lô" cũ. Mã lô là thứ tra cứu một lần khi cần truy
   * nguồn một chuyến hàng cụ thể, còn báo cáo Nhập – Xuất – Tồn thì lần nào
   * cũng phải hỏi "từ ngày nào đến ngày nào" — nên chỗ này để khoảng ngày.
   *
   * Rỗng cả hai = xem toàn bộ. Không đặt sẵn tháng hiện tại: mở báo cáo ra mà
   * số đã bị cắt theo một khoảng mình không chọn thì dễ đọc nhầm là kho ít
   * hàng, trong khi chỉ là bộ lọc đang bật.
   */
  const [reportTuNgay, setReportTuNgay] = useState("");
  const [reportDenNgay, setReportDenNgay] = useState("");
  const [reportPartnerSearch, setReportPartnerSearch] = useState("");

  // Danh sach so hoa don dang bung chi tiet o so chi tiet doanh thu.
  // Truoc day khai bao la Set nhung cho dung lai goi .includes()/.filter() nen
  // bam vao dong hoa don la loi ngay - gio dung mang cho khop voi cho dung.

  /**
   * Phần gán điểm bán do người dùng thêm, lưu ở collection `diem_ban`.
   *
   * Bảng gán sẵn trong code chỉ phủ tháng 8. Mỗi tháng bộ phận lại mở điểm bán
   * mới — T5, T6, T7 mỗi tháng gần 30 tên lạ. Không lưu lại thì tháng nào cũng
   * phải gán lại từ đầu.
   */
  const [diemBanOverrides, setDiemBanOverrides] = useState<DiemBanEntry[]>([]);



  const [matchedProductIds, setMatchedProductIds] = useState<Set<string>>(
    new Set(),
  );

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  // Cac o nhap mat khau / PIN da duoc go bo: viec xac thuc nay do Google lo.

  const showNotification = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinPreloadData, setPinPreloadData] = useState(false);
  const [pinLeaving, setPinLeaving] = useState(false);
  const pinUnlockedRef = useRef(false);
  useEffect(() => {
    pinUnlockedRef.current = pinUnlocked;
  }, [pinUnlocked]);

  const [pinOffline, setPinOffline] = useState<boolean>(
    () => typeof navigator !== "undefined" && navigator.onLine === false,
  );
  const [pinOfflineHint, setPinOfflineHint] = useState("");
  const [freshResetUid, setFreshResetUid] = useState<string | null>(null);
  const [tempPinChangeUid, setTempPinChangeUid] = useState<string | null>(null);
  const [capLaiPinTarget, setCapLaiPinTarget] = useState<UserProfile | null>(null);
  const manualGoogleLoginRef = useRef(false);

  const laLoiMatMang = (err: unknown): boolean => {
    const code = String((err as any)?.code || "").toLowerCase();
    const msg = String((err as any)?.message || "").toLowerCase();
    return (
      (typeof navigator !== "undefined" && navigator.onLine === false) ||
      code === "unavailable" ||
      msg.includes("offline") ||
      msg.includes("network") ||
      msg.includes("failed to get document")
    );
  };

  /**
   * THEO DOI PHIEN DANG NHAP
   *
   * Firebase Auth tu nho phien nen khong can luu gi trong localStorage nhu
   * ban cu (vua khong an toan vua de gia mao bang cach sua localStorage).
   *
   * Luong: dang nhap Google -> neu chua co ho so thi tao moi o trang thai
   * PENDING -> chu so huu duyet -> kiem tra mang + PIN (luon hoi lai khi F5).
   */
  useEffect(() => {
    clearLegacyPinStorage();

    /**
     * Gỡ theo dõi hồ sơ của phiên trước. Đổi tài khoản mà không gỡ thì hai
     * người cùng ghi vào một chỗ, và vai trò của người trước đè lên người sau.
     */
    let boTheoDoiHoSo = () => {};
    /** Vai trò lần trước, để biết khi nào nó vừa đổi mà báo cho người dùng. */
    let vaiTroTruoc: UserRole | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      boTheoDoiHoSo();
      boTheoDoiHoSo = () => {};
      vaiTroTruoc = null;
      clearLegacyPinStorage();
      pinUnlockedRef.current = false;
      setPinUnlocked(false);
      setPinPreloadData(false);
      setPinLeaving(false);
      setTempPinChangeUid(null);
      setPinStage("idle");
      setPinError("");

      if (!fbUser) {
        setUser(null);
        setUserRole("PENDING");
        setCurrentUserProfile(null);
        setPinOffline(false);
        setPinOfflineHint("");
        setFreshResetUid(null);
        setTempPinChangeUid(null);
        setLoiHoSo("");
        setLoading(false);
        return;
      }

      const uid = fbUser.uid;
      const emailLower = (fbUser.email || "").toLowerCase();
      setUser(fbUser.displayName || fbUser.email || "Người dùng");
      const ref = doc(db, "users", uid);

      // Ghi nhận nếu người dùng vừa chủ động bấm "Đăng nhập bằng Google" trong lượt này
      // (tránh so sánh lệch giờ đồng hồ máy trạm với auth_time; firestore.rules tự kiểm tra phía máy chủ)
      if (manualGoogleLoginRef.current) {
        setFreshResetUid(uid);
      } else {
        setFreshResetUid(null);
      }

      /*
       * BƯỚC 1 — ĐỌC MÁY CHỦ TRỰC TIẾP (KHÔNG DÙNG BẢN ĐỆM KHI ĐANG KHÓA PIN).
       * Giống chuẩn app Kiểm kê: mở / tải lại app bắt buộc có mạng để đọc
       * trạng thái khóa & hash PIN mới nhất từ Firestore; mất mạng thì dừng ở
       * màn hình "Chưa kết nối mạng" kèm nút Thử lại.
       */
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setPinOffline(true);
        setPinOfflineHint(
          "Mở app cần có mạng để kiểm tra mã PIN. Bật Wi-Fi hoặc 4G rồi bấm Thử lại.",
        );
        setLoiHoSo("");
        setLoading(false);
      } else {
        try {
          const snap = await getDocFromServer(ref);
          if (!snap.exists()) {
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
            setUserRole(emailLower === OWNER_EMAIL ? "OWNER" : data.role || "PENDING");
          }
          setPinOffline(false);
          setPinOfflineHint("");
          setLoiHoSo("");
        } catch (err: any) {
          console.error("Khong doc duoc ho so nguoi dung:", err);
          if (laLoiMatMang(err)) {
            setPinOffline(true);
            setPinOfflineHint(
              "Không kết nối được máy chủ để kiểm tra mã PIN. Kiểm tra mạng rồi thử lại.",
            );
            setLoiHoSo("");
            setLoading(false);
          } else {
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
            setLoading(false);
          }
        }
      }

      /*
       * BƯỚC 2 — THEO DÕI HỒ SƠ LIÊN TỤC, KHÔNG ĐỌC MỘT LẦN RỒI THÔI.
       * Giúp chủ sở hữu duyệt/thu hồi quyền hoặc đặt lại PIN là bên kia thấy ngay.
       */
      boTheoDoiHoSo = onSnapshot(
        ref,
        (snap) => {
          setLoading(false);
          if (!snap.exists()) return;
          const data = snap.data() as UserProfile;
          setCurrentUserProfile(data);
          const vaiTro: UserRole =
            emailLower === OWNER_EMAIL ? "OWNER" : data.role || "PENDING";
          setUserRole(vaiTro);
          setLoiHoSo("");

          if (vaiTroTruoc && vaiTroTruoc !== vaiTro) {
            showNotification(
              vaiTro === "PENDING"
                ? "Quyền truy cập của bạn vừa bị thu hồi."
                : `Quyền vừa được cập nhật: ${tenVaiTro(vaiTro)}`,
              vaiTro === "PENDING" ? "error" : "success",
            );
          }
          vaiTroTruoc = vaiTro;
        },
        (err) => {
          console.error("Khong theo doi duoc ho so nguoi dung:", err);
          setLoading(false);
          if (!pinUnlockedRef.current && laLoiMatMang(err)) {
            setPinOffline(true);
            setPinOfflineHint(
              "Mất kết nối máy chủ khi kiểm tra hồ sơ. Vui lòng thử lại khi có mạng.",
            );
            return;
          }
          if (emailLower !== OWNER_EMAIL) {
            setLoiHoSo(
              "Mất kết nối tới hồ sơ người dùng. Quyền đang dùng là bản đọc được gần nhất.",
            );
          }
        },
      );
    });

    return () => {
      boTheoDoiHoSo();
      unsubAuth();
    };
  }, []);

  // FIRESTORE SYNC — chỉ tải dữ liệu nghiệp vụ sau khi xác thực PIN hợp lệ (preload trong nhịp 2s mở khóa)
  const canSyncData = Boolean(user) && userRole !== "PENDING" && (pinUnlocked || pinPreloadData);
  useEffect(() => {
    if (!canSyncData) return;

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

    /*
     * Sync Transactions.
     *
     * DNC — khối cung ứng chỉ đọc được giao dịch chiều XUẤT, và luật Firestore
     * chặn thật ở chỗ này. Nhưng Firestore KHÔNG lọc từng tài liệu khi trả về
     * một danh sách: nó xét CÂU TRUY VẤN. Truy vấn không có ràng buộc thì bị từ
     * chối cả cụm chứ không trả về một phần — nên phải tự thêm ràng buộc.
     *
     * Cố ý không kèm `orderBy` cho DNC: lọc bằng `in` rồi sắp theo một trường
     * khác thì Firestore đòi một chỉ mục ghép phải tạo tay trong Console. Sắp
     * xếp ở máy người dùng thì không cần chỉ mục nào, mà vài nghìn dòng thì
     * không đáng kể.
     */
    const chiXemChieuXuat = quyenCua(userRole).xemXuat && !quyenCua(userRole).xemKho;
    const qTransactions = chiXemChieuXuat
      ? query(collection(db, "transactions"), where("type", "in", ["OUT", "LOSS"]))
      : query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubTransactions = onSnapshot(
      qTransactions,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id }) as Transaction,
        );
        // Truy vấn của DNC không kèm `orderBy` nên phải tự sắp ở đây, để mọi
        // màn hình vẫn nhận danh sách mới nhất trước như các vai trò khác.
        if (chiXemChieuXuat) {
          data.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        }
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

    /*
     * Sync phieu nhap kho (chi trang thai + anh ky, noi dung suy tu transactions).
     *
     * Bỏ qua với DNC: phiếu nhập là chuyện của kho, luật đã chặn đọc, nên đăng
     * ký cũng chỉ sinh lỗi permission-denied trong console chứ không được gì.
     */
    let unsubSlips = () => {};
    if (!chiXemChieuXuat) {
    unsubSlips = onSnapshot(
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
    }

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

    /*
     * ẢNH CHỨNG TỪ. DNC chỉ xem chiều xuất, luật cũng chỉ cho họ đọc ảnh xuất
     * — truy vấn phải tự lọc đúng như vậy, không thì Firestore từ chối cả
     * truy vấn.
     */
    daTaiAnhRef.current = false;
    const unsubAnh = onSnapshot(
      chiXemChieuXuat
        ? query(collection(db, KHO_ANH_CHUNG_TU), where("loai", "==", "XUAT"))
        : collection(db, KHO_ANH_CHUNG_TU),
      (snapshot) => {
        setAnhChungTu(
          snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as AnhChungTu),
        );
        daTaiAnhRef.current = true;
        ghiNhanLoiDoc(KHO_ANH_CHUNG_TU, null);
      },
      (error) => {
        ghiNhanLoiDoc(
          KHO_ANH_CHUNG_TU,
          handleFirestoreError(error, OperationType.GET, KHO_ANH_CHUNG_TU),
        );
      },
    );

    const unsubSoPhieu = onSnapshot(
      collection(db, KHO_SO_PHIEU),
      (snapshot) => {
        setSoPhieu(
          snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as GhiSoPhieu),
        );
        ghiNhanLoiDoc(KHO_SO_PHIEU, null);
      },
      (error) => {
        ghiNhanLoiDoc(
          KHO_SO_PHIEU,
          handleFirestoreError(error, OperationType.GET, KHO_SO_PHIEU),
        );
      },
    );

    // Sync User Configs (Only for OWNER)
    let unsubUsers = () => {};
    if (userRole === "OWNER") {
      unsubUsers = onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          setAllUserProfiles(
            snapshot.docs.map((d) => ({ ...d.data(), uid: d.id }) as UserProfile),
          );
          ghiNhanLoiDoc("users", null);
        },
        (error) => {
          ghiNhanLoiDoc(
            "users",
            handleFirestoreError(error, OperationType.GET, "users"),
          );
        },
      );
    }

    let unsubKeHoach = () => {};
    let unsubChuKyMau = () => {};
    let unsubSoKeg = () => {};
    let unsubDanhGia = () => {};
    let unsubKiemKeBon = () => {};
    let unsubKiemKeKeg = () => {};
    if (!chiXemChieuXuat) {
      unsubSoKeg = onSnapshot(
        collection(db, "so_keg"),
        (snapshot) => {
          setSoKeg(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as DongSoKeg));
          ghiNhanLoiDoc("so_keg", null);
        },
        (error) => {
          ghiNhanLoiDoc("so_keg", handleFirestoreError(error, OperationType.GET, "so_keg"));
        },
      );
      unsubChuKyMau = onSnapshot(
        collection(db, "chu_ky_mau"),
        (snapshot) => {
          setChuKyMau(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as ChuKyMau));
          setDaTaiChuKyMau(true);
          ghiNhanLoiDoc("chu_ky_mau", null);
        },
        (error) => {
          ghiNhanLoiDoc(
            "chu_ky_mau",
            handleFirestoreError(error, OperationType.GET, "chu_ky_mau"),
          );
        },
      );
      unsubKeHoach = onSnapshot(
        collection(db, "ke_hoach_sx"),
        (snapshot) => {
          setKeHoach(
            snapshot.docs
              .map((d) => ({ ...d.data(), id: d.id }) as KeHoachSanXuat)
              .sort((a, b) => b.date.localeCompare(a.date)),
          );
          ghiNhanLoiDoc("ke_hoach_sx", null);
        },
        (error) => {
          ghiNhanLoiDoc(
            "ke_hoach_sx",
            handleFirestoreError(error, OperationType.GET, "ke_hoach_sx"),
          );
        },
      );
      unsubDanhGia = onSnapshot(
        collection(db, "danh_gia_sx"),
        (snapshot) => {
          setDanhGia(
            snapshot.docs
              .map((d) => ({ ...d.data(), id: d.id }) as DanhGiaSanXuat)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          );
          ghiNhanLoiDoc("danh_gia_sx", null);
        },
        (error) => {
          ghiNhanLoiDoc(
            "danh_gia_sx",
            handleFirestoreError(error, OperationType.GET, "danh_gia_sx"),
          );
        },
      );
      unsubKiemKeBon = onSnapshot(
        collection(db, "kiem_ke_bon"),
        (snapshot) => {
          setKiemKeBon(
            snapshot.docs
              .map((d) => ({ ...d.data(), id: d.id }) as KiemKeBon)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          );
          ghiNhanLoiDoc("kiem_ke_bon", null);
        },
        (error) => {
          ghiNhanLoiDoc(
            "kiem_ke_bon",
            handleFirestoreError(error, OperationType.GET, "kiem_ke_bon"),
          );
        },
      );
      unsubKiemKeKeg = onSnapshot(
        collection(db, "kiem_ke_keg"),
        (snapshot) => {
          setKiemKeKeg(
            snapshot.docs
              .map((d) => ({ ...d.data(), id: d.id }) as KiemKeKegLit)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          );
          ghiNhanLoiDoc("kiem_ke_keg", null);
        },
        (error) => {
          ghiNhanLoiDoc(
            "kiem_ke_keg",
            handleFirestoreError(error, OperationType.GET, "kiem_ke_keg"),
          );
        },
      );
    }

    /*
      THÔI NGHE `sap_jobs`: màn hình đọc nó đã gỡ.

      Giữ một listener sống cho dữ liệu không ai hiển thị là trả tiền lượt đọc
      Firestore mỗi lần bảng đó đổi, đổi lấy không gì cả.
    */

    return () => {
      unsubTransactions();
      unsubPartners();
      unsubSlips();
      unsubDiemBan();
      unsubHoaDon();
      unsubSoPhieu();
      unsubAnh();
      unsubUsers();
      unsubKeHoach();
      unsubChuKyMau();
      unsubSoKeg();
      unsubDanhGia();
      unsubKiemKeBon();
      unsubKiemKeKeg();
    };
  }, [user, userRole, canSyncData]);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  // --- Lớp khóa màn hình bằng mã PIN -------------------------------------
  // Giống chuẩn app Kiểm kê: LUÔN bắt nhập lại PIN mỗi lần mở / tải lại trang
  // (kể cả F5 hay Ctrl+Shift+R). Không lưu cờ mở khóa vào sessionStorage/localStorage
  // và không cho vượt PIN khi mất mạng.
  const [pinStage, setPinStage] = useState<PinStageState>("idle");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const choMotion = (ms: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  const unlockSession = () => {
    clearLegacyPinStorage();
    manualGoogleLoginRef.current = false;
    setPinLeaving(false);
    pinUnlockedRef.current = true;
    setPinUnlocked(true);
    setPinStage("idle");
    setPinError("");
  };

  /**
   * Nhịp mở khóa 2 giây chuẩn theo góp ý của anh Khoa:
   *   - ~1s đầu (pinStage = "verify"): vòng 6 chấm xoay tròn + bắt đầu tải nền toàn bộ data vào app
   *   - ~1s sau (pinStage = "ok"): hiện tích xanh + lời chào "Xin chào <Tên chủ user>" rồi trượt vào app đã sẵn sàng data
   */
  const chaoVaVaoApp = async (startedAt: number) => {
    setPinPreloadData(true);
    const conLaiVerify = Math.max(0, 1000 - (Date.now() - startedAt));
    if (conLaiVerify > 0) {
      await choMotion(conLaiVerify);
    }
    setPinStage("ok");
    await choMotion(740);
    setPinLeaving(true);
    await choMotion(260);
    unlockSession();
  };

  /** Kiểm tra kết nối máy chủ thực khi mở khóa PIN (chỉ dùng getDocFromServer). */
  const handleRetryPinNetwork = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser || pinBusy) return;
    setPinError("");

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setPinOffline(true);
      setPinOfflineHint(
        "Thiết bị vẫn chưa có mạng. Vui lòng bật Wi-Fi hoặc 4G rồi thử lại.",
      );
      return;
    }

    setPinBusy(true);
    try {
      const ref = doc(db, "users", fbUser.uid);
      const snap = await getDocFromServer(ref);
      const emailLower = (fbUser.email || "").toLowerCase();
      if (!snap.exists()) {
        const fresh: UserProfile = {
          uid: fbUser.uid,
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
        setUserRole(emailLower === OWNER_EMAIL ? "OWNER" : data.role || "PENDING");
      }
      setPinOffline(false);
      setPinOfflineHint("");
      setLoiHoSo("");
    } catch (err: any) {
      if (laLoiMatMang(err)) {
        setPinOffline(true);
        setPinOfflineHint(
          "Vẫn chưa kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.",
        );
      } else {
        setPinError(
          "Không kiểm tra được hồ sơ: " + (err?.message || "lỗi không xác định"),
        );
      }
    } finally {
      setPinBusy(false);
    }
  };

  // Theo dõi trạng thái mạng khi đang đứng ở màn hình khóa PIN
  useEffect(() => {
    if (!user || pinUnlocked) return;
    const onOffline = () => {
      setPinOffline(true);
      setPinOfflineHint(
        "Mất kết nối mạng. Kết nối lại Wi-Fi hoặc 4G để kiểm tra mã PIN.",
      );
    };
    const onOnline = () => {
      void handleRetryPinNetwork();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [user, pinUnlocked]);

  /** Thiết lập mã PIN lần đầu hoặc đặt lại PIN mới sau khi xác thực lại Google. */
  const handleCreatePin = async (pin: string, confirmPin: string) => {
    if (pinBusy) return;
    setPinError("");

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setPinOffline(true);
      setPinOfflineHint(
        "Mất kết nối mạng. Kết nối Wi-Fi hoặc 4G rồi thử lại để lưu mã PIN.",
      );
      return;
    }

    if (!isValidPinFormat(pin)) {
      setPinError("Mã PIN phải gồm đúng 6 chữ số.");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("Hai lần nhập chưa khớp nhau.");
      return;
    }
    if (isWeakPin(pin)) {
      setPinError(
        "Mã PIN quá dễ đoán (số lặp hoặc liên tiếp). Anh/chị chọn dãy số khác nhé.",
      );
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setPinError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setPinBusy(true);
    setPinStage("verify");
    const tStart = Date.now();
    try {
      const pinSalt = generatePinSalt();
      const pinHash = await hashPin(pin, uid, pinSalt);
      const pinUpdatedAt = new Date().toISOString();
      await updateDoc(doc(db, "users", uid), {
        pinHash,
        pinSalt,
        pinUpdatedAt,
        pinFailCount: 0,
        pinLocked: false,
        pinMustChange: false,
      });
      clearPinResetIntent();
      setFreshResetUid(null);
      setTempPinChangeUid(null);
      setCurrentUserProfile((p) =>
        p
          ? {
              ...p,
              pinHash,
              pinSalt,
              pinUpdatedAt,
              pinFailCount: 0,
              pinLocked: false,
              pinMustChange: false,
            }
          : p,
      );
      showNotification("Đã thiết lập mã PIN bảo vệ");
      await chaoVaVaoApp(tStart);
    } catch (e: any) {
      if (laLoiMatMang(e)) {
        setPinOffline(true);
        setPinOfflineHint(
          "Không lưu được mã PIN vì mất mạng. Vui lòng kết nối lại rồi thử lại.",
        );
        setPinStage("idle");
        return;
      }
      setPinStage("sai");
      const msg =
        e?.code === "permission-denied"
          ? "Phiên Google đã quá hạn — vui lòng đăng xuất rồi đăng nhập lại Google để đặt PIN mới."
          : "Không lưu được mã PIN: " + (e?.message || "lỗi không xác định");
      setPinError(msg);
      await choMotion(450);
      setPinStage("idle");
    } finally {
      setPinBusy(false);
    }
  };

  const handleVerifyPin = async (pin: string) => {
    if (pinBusy) return;
    setPinError("");

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setPinOffline(true);
      setPinOfflineHint(
        "Mất kết nối mạng. Kết nối Wi-Fi hoặc 4G rồi thử lại để nhập mã PIN.",
      );
      return;
    }

    // Khi người dùng nhập PIN kiểm tra thì xóa cờ khôi phục (tránh tự chuyển sang đặt PIN nếu gõ sai 5 lần)
    setFreshResetUid(null);
    setTempPinChangeUid(null);
    setPinBusy(true);
    setPinStage("verify");
    const tStart = Date.now();
    try {
      const ref = doc(db, "users", uid);
      // Bắt buộc đọc máy chủ để đồng bộ trạng thái khóa / số lần sai / hash mới nhất
      const snap = await getDocFromServer(ref);
      const serverProfile = snap.exists()
        ? (snap.data() as UserProfile)
        : currentUserProfile;
      if (snap.exists()) {
        setCurrentUserProfile(serverProfile);
      }

      if (serverProfile?.pinLocked) {
        setPinStage("sai");
        setPinError(
          "Mã PIN đang bị khóa sau 5 lần sai. Đăng nhập lại bằng Google để đặt lại.",
        );
        await choMotion(460);
        setPinStage("idle");
        return;
      }

      const stored = serverProfile?.pinHash;
      if (!stored) {
        setPinStage("idle");
        return;
      }

      const ok = await verifyPin(pin, uid, stored, serverProfile?.pinSalt);

      if (ok) {
        const currentFail = Number(serverProfile?.pinFailCount || 0);
        if (currentFail > 0) {
          try {
            await updateDoc(ref, { pinFailCount: 0, pinLocked: false });
          } catch {
            // Không chặn mở khóa nếu đồng bộ reset bộ đếm lỗi tạm thời thất bại
          }
        }
        clearPinResetIntent();
        if (serverProfile?.pinMustChange) {
          // Nhân viên vừa mở bằng mã PIN tạm do Chủ sở hữu cấp -> yêu cầu tự đặt PIN cá nhân mới
          setPinStage("ok");
          await choMotion(600);
          setPinStage("idle");
          setTempPinChangeUid(uid);
          return;
        }
        await chaoVaVaoApp(tStart);
      } else {
        const minWrongSpin = Math.max(0, 320 - (Date.now() - tStart));
        if (minWrongSpin > 0) await choMotion(minWrongSpin);
        const prevFail = Math.max(0, Number(serverProfile?.pinFailCount || 0));
        const nextFail = Math.min(PIN_MAX_ATTEMPTS, prevFail + 1);
        const shouldLock = nextFail >= PIN_MAX_ATTEMPTS;

        try {
          await updateDoc(ref, {
            pinFailCount: nextFail,
            pinLocked: shouldLock,
          });
        } catch (err) {
          console.error("Khong cap nhat duoc pinFailCount:", err);
        }

        if (shouldLock) {
          savePinResetIntent(
            uid,
            serverProfile?.email || auth.currentUser?.email || "",
          );
        } else {
          clearPinResetIntent();
        }
        setCurrentUserProfile((p) =>
          p ? { ...p, pinFailCount: nextFail, pinLocked: shouldLock } : p,
        );
        setPinStage("sai");

        if (shouldLock) {
          setPinError(
            "Sai mã PIN 5 lần — đăng nhập lại bằng Google để đặt lại mã PIN.",
          );
          window.setTimeout(() => {
            void handleLogout();
          }, 1800);
        } else {
          setPinError(
            `Mã PIN không đúng. Còn ${PIN_MAX_ATTEMPTS - nextFail} lần thử.`,
          );
          await choMotion(460);
          setPinStage("idle");
        }
      }
    } catch (err: any) {
      if (laLoiMatMang(err)) {
        setPinOffline(true);
        setPinOfflineHint(
          "Mất kết nối máy chủ khi kiểm tra mã PIN. Vui lòng thử lại khi có mạng.",
        );
        setPinStage("idle");
      } else {
        setPinStage("sai");
        setPinError(
          "Không kiểm tra được mã PIN: " + (err?.message || "lỗi không xác định"),
        );
        await choMotion(460);
        setPinStage("idle");
      }
    } finally {
      setPinBusy(false);
    }
  };

  /** Quên mã PIN hoặc đang bị khóa: đăng xuất để người dùng đăng nhập lại bằng Google rồi đặt PIN mới. */
  const handleForgotPin = async () => {
    const uid = auth.currentUser?.uid || currentUserProfile?.uid;
    const email = currentUserProfile?.email || auth.currentUser?.email || "";
    if (uid) {
      savePinResetIntent(uid, email);
    }
    await handleLogout();
  };

  /** Chủ sở hữu cấp mã PIN tạm 6 số & mở khóa ngay cho thành viên. */
  const handleIssueTempPin = async (
    profile: UserProfile,
    tempPin: string,
    requireChange: boolean,
  ) => {
    const pinSalt = generatePinSalt();
    const pinHash = await hashPin(tempPin, profile.uid, pinSalt);
    const pinUpdatedAt = new Date().toISOString();
    await updateDoc(doc(db, "users", profile.uid), {
      pinHash,
      pinSalt,
      pinUpdatedAt,
      pinFailCount: 0,
      pinLocked: false,
      pinMustChange: requireChange,
    });
    showNotification(`Đã cấp lại PIN cho ${profile.email}`);
  };

  /** Chủ sở hữu xóa trắng PIN cũ & mở khóa để thành viên tự đặt PIN mới khi vào app. */
  const handleClearPinToReset = async (profile: UserProfile) => {
    await updateDoc(doc(db, "users", profile.uid), {
      pinHash: null,
      pinSalt: null,
      pinFailCount: 0,
      pinLocked: false,
      pinMustChange: false,
      pinUpdatedAt: new Date().toISOString(),
    });
    showNotification(`Đã mở khóa & xóa PIN cũ cho ${profile.email}`);
  };

  /** Đổi mã PIN của chính tài khoản đang đăng nhập ngay trong modal Thông tin tài khoản. */
  const handleSaveSelfPinFromModal = async (
    pinHash: string,
    pinSalt: string,
    pinUpdatedAt: string,
  ) => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
    const payload = {
      pinHash,
      pinSalt,
      pinUpdatedAt,
      pinFailCount: 0,
      pinLocked: false,
      pinMustChange: false,
    };
    const ref = doc(db, "users", fbUser.uid);
    try {
      await updateDoc(ref, payload);
    } catch (err: any) {
      if (err?.code === "permission-denied") {
        // Phiên Google đã quá 10 phút -> xác thực lại bằng popup Google 1 chạm rồi lưu ngay
        await reauthenticateWithPopup(fbUser, googleProvider);
        await updateDoc(ref, payload);
      } else {
        throw err;
      }
    }
    setCurrentUserProfile((p) => (p ? { ...p, ...payload } : p));
    showNotification("Đã đổi mã PIN thành công");
  };

  /**
   * Đăng nhập bằng tài khoản Google.
   *
   * App không giữ mật khẩu: Google lo phần xác thực. Sau khi đăng nhập,
   * onAuthStateChanged sẽ kiểm tra hồ sơ, mạng và trạng thái khóa PIN.
   */
  const handleGoogleLogin = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError("");
    manualGoogleLoginRef.current = true;
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred?.user?.uid) {
        setFreshResetUid(cred.user.uid);
      }
    } catch (e: any) {
      manualGoogleLoginRef.current = false;
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
    manualGoogleLoginRef.current = false;
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Loi dang xuat:", e);
    }
    clearLegacyPinStorage();
    pinUnlockedRef.current = false;
    setPinUnlocked(false);
    setPinPreloadData(false);
    setPinLeaving(false);
    setPinOffline(false);
    setPinOfflineHint("");
    setFreshResetUid(null);
    setTempPinChangeUid(null);
    setCapLaiPinTarget(null);
    setPinStage("idle");
    setPinError("");
    setUser(null);
    setUserRole("PENDING");
    setCurrentUserProfile(null);
    setAllUserProfiles([]);
    setTransactions([]);
    setPartners([]);
    setSlips([]);
    setAnhChungTu([]);
    setHoaDon([]);
    setSoPhieu([]);
    setKeHoach([]);
    setDanhGia([]);
    setKiemKeBon([]);
    setKiemKeKeg([]);
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
      transactions.filter((t) => t.id?.startsWith(DEMO_PREFIX)).length,
    [transactions],
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
                signedAt: day.toISOString(),
                signedBy: currentUserProfile?.email || user || "Demo",
              }
            : {}),
          note: DEMO_NOTE,
          updatedAt: new Date().toISOString(),
        });
        // Ảnh ký thử: ảnh mẫu công khai của Cloudinary, gắn vào mã phiếu thử.
        if (signed) {
          ghiAnhVaoLo(batch, [
            {
              id: `demo~${slipCode}`,
              url: DEMO_SLIP_PHOTO,
              publicId: `demo/${slipCode}`,
              chungTu: [slipCode],
              loai: "NHAP",
              ngay: dateKey,
              maDoiTac: "",
              doiTac: "",
              taiLuc: day.toISOString(),
              taiBoi: currentUserProfile?.email || user || "Demo",
              uid: auth.currentUser?.uid || "",
            },
          ]);
        }

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
      // Ảnh ký thử là ảnh mẫu công khai, không có tệp của app — chỉ xoá bản ghi.
      const maPhieuThu = new Set(demoSlips.map((s) => s.code));
      anhChungTu
        .filter((a) => a.chungTu.every((c) => maPhieuThu.has(c)))
        .forEach((a) => batch.delete(doc(db, KHO_ANH_CHUNG_TU, a.id)));
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

    // Dọn sạch là xoá MỌI THỨ — mọi tấm ảnh chứng từ đi theo.
    const anhDonSach = anhChungTu;
    const confirmReset = window.confirm(
      `Xoá sạch ${transactions.length} giao dịch, ${slips.length} phiếu nhập kho (kèm ảnh phiếu đã ký) và ${soPhieu.length} dòng trong Sổ số phiếu?\n\n` +
        (anhDonSach.length
          ? `XOÁ LUÔN ${anhDonSach.length} ảnh trên Cloudinary — dữ liệu và ảnh đi một cụm.\n\n`
          : "") +
        `Bộ đếm số phiếu cũng đặt lại, nên số phiếu sau khi dọn sẽ đánh lại từ đầu.\n\nĐối tác và danh mục sản phẩm được giữ lại.\n\nKhông khôi phục lại được.`,
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
       * DỮ LIỆU VÀ ẢNH ĐI MỘT CỤM: mọi tấm ảnh chứng từ xoá theo, cả tệp trên
       * Cloudinary lẫn bản ghi (xem src/anh/kho.ts).
       *
       * XOÁ CẢ SỔ SỐ PHIẾU VÀ BỘ ĐẾM.
       *
       * Sổ số phiếu dựng sau (31/08/2026) và không ai thêm nó vào lệnh dọn,
       * nên "dọn sạch" xong tab Sổ số phiếu vẫn còn nguyên một sổ đầy số trỏ
       * vào những chứng từ không còn tồn tại. Đúng cái tật "sạch một nửa" mà
       * đoạn ghi chú trên đã nói.
       *
       * Bộ đếm phải xoá theo, nếu không thì sau khi dọn, phiếu xuất đầu tiên
       * không đánh lại từ 01 mà chạy tiếp con số cũ — người dùng nhìn sổ trống
       * mà số phiếu bắt đầu từ giữa chừng thì không hiểu nổi.
       */
      const snapBoDem = await getDocs(collection(db, KHO_BO_DEM));

      const canXoa: [string, string][] = [
        ...transactions.filter((t) => t.id).map((t) => ["transactions", t.id] as [string, string]),
        ...slips.filter((s) => s.id).map((s) => ["slips", s.id] as [string, string]),
        ...soPhieu
          .filter((g) => g.soPhieu)
          .map((g) => [KHO_SO_PHIEU, g.soPhieu] as [string, string]),
        ...snapBoDem.docs.map((d) => [KHO_BO_DEM, d.id] as [string, string]),
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

      const kqAnh = await lamViecAnhKhiXoa({ xoa: anhDonSach, go: [] });
      setLoading(false);
      showNotification(
        `Đã xoá ${transactions.length} giao dịch, ${slips.length} phiếu nhập, ${soPhieu.length} dòng sổ số phiếu${chuAnhDaXoa(kqAnh)}`,
      );
      baoAnhChuaXoa(kqAnh);
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

  /**
   * Danh sách giao dịch thuộc CHIỀU XUẤT.
   *
   * Gồm cả hao hụt và hư hại: đó cũng là bia đã ra khỏi kho, xoá đơn xuất mà
   * để lại dòng hao hụt của chính đơn ấy thì tồn kho hụt đúng bằng phần hao
   * hụt mồ côi, và không dòng nào giải thích được.
   *
   * Gồm cả đơn ĐANG ĐI ĐƯỜNG: chúng là đơn xuất chưa xác nhận, không phải một
   * loại khác.
   */
  const LOAI_CHIEU_XUAT = ["OUT", "LOSS", "DAMAGE"];

  /**
   * XOÁ TOÀN BỘ GIAO DỊCH XUẤT KHO — để nạp lại từ đầu.
   *
   * Tách khỏi "Dọn sạch": dọn sạch xoá cả nhập kho, tồn đầu kỳ và phiếu đã ký,
   * trong khi việc thường gặp là nạp nhầm một tệp xuất rồi muốn nạp lại. Bắt
   * người dùng dọn sạch cả kho để sửa một tệp xuất là mất luôn phần nhập vốn
   * không có gì sai.
   *
   * XOÁ THEO CẢ SỔ SỐ PHIẾU VÀ BỘ ĐẾM BÊN XUẤT. Để lại thì sổ trỏ vào những
   * chứng từ không còn tồn tại, và lần nạp lại sau không đánh số từ 01 mà chạy
   * tiếp con số cũ. Chỉ đụng bên xuất — bộ đếm bên nhập giữ nguyên, vì số phiếu
   * nhập đã in ra giấy và cấp lại là trùng số thật.
   */
  const handleXoaToanBoXuat = async () => {
    if (!isOwner) return;

    /** Hai dấu xuống dòng, tách một đoạn trong hộp thoại. */
    const NGAT = "\n\n";

    const dsXuat = transactions.filter(
      (t) => t.id && LOAI_CHIEU_XUAT.includes(t.type),
    );
    const dsSo = soPhieu.filter(
      (g) => g.soPhieu && (g.loai === "XUAT" || g.loai === "HUY_XUAT"),
    );

    if (dsXuat.length === 0 && dsSo.length === 0) {
      showNotification("Hiện không có giao dịch xuất kho nào để xoá.");
      return;
    }

    const soDiDuong = dsXuat.filter((t) => t.status === "in_transit").length;
    const soHao = dsXuat.filter((t) => laDongHaoHut(t)).length;

    /*
     * BÁO TRƯỚC SỐ HÓA ĐƠN SẼ MẤT DÒNG HÀNG.
     *
     * Dòng chi tiết của hóa đơn KHÔNG được lưu — chúng dựng lại từ chính giao
     * dịch xuất kho mỗi lần mở tra cứu. Xoá xuất kho là mọi hóa đơn đã ghi số
     * mất hết dòng hàng, và tra cứu báo "không dựng lại được dòng nào".
     *
     * Luật Firestore KHÔNG cho xoá `hoa_don` (`allow delete: if false`) — cố ý,
     * vì tờ hóa đơn đã phát hành là chứng từ đã lên cơ quan thuế. Nên ở đây chỉ
     * báo trước, không xoá theo: người bấm phải biết mình sắp để lại bao nhiêu
     * hóa đơn mồ côi.
     */
    const soHoaDonAnhHuong = hoaDon.filter((h) =>
      String(h?.soHoaDon || "").trim(),
    ).length;

    /*
     * BÁO TRƯỚC SỐ ẢNH BIÊN BẢN SẼ BIẾN MẤT KHỎI THƯ VIỆN.
     *
     * Hộp thoại cũ báo về hóa đơn mà không nói một chữ nào về ảnh. Xoá xuất
     * kho rồi nạp lại tệp Excel là quy trình anh Khoa đã làm nhiều lần — và
     * dữ liệu và ảnh đi một cụm: chuyến bị xoá thì ảnh biên bản của nó xoá
     * theo, nên phải nói trước số ảnh sẽ mất.
     */
    const viecAnhXuat = viecAnhCuaLuotXoa(dsXuat);
    if (!viecAnhXuat) return;
    const anhMatXuat = viecAnhXuat.xoa;

    if (
      !window.confirm(
        `Xoá ${dsXuat.length} giao dịch xuất kho` +
          (soHao > 0 ? ` (trong đó ${soHao} dòng hao hụt)` : "") +
          (soDiDuong > 0 ? `, ${soDiDuong} đơn đang đi đường` : "") +
          ` và ${dsSo.length} dòng phiếu xuất trong Sổ số phiếu?\n\n` +
          (soHoaDonAnhHuong > 0
            ? `CẢNH BÁO: ${soHoaDonAnhHuong} hóa đơn đã ghi số sẽ MẤT HẾT DÒNG HÀNG. ` +
              `Dòng chi tiết không được lưu — chúng dựng lại từ chính giao dịch xuất kho. ` +
              `Bản ghi hóa đơn vẫn còn (luật không cho xoá), nhưng tra cứu sẽ báo ` +
              `"không dựng lại được dòng nào" cho tới khi nạp lại đúng dữ liệu xuất kho của kỳ đó.` +
              NGAT
            : "") +
          (anhMatXuat.length > 0
            ? `XOÁ LUÔN ${anhMatXuat.length} ảnh biên bản trên Cloudinary — dữ liệu và ảnh đi một cụm.` +
              NGAT +
              `Chỉ muốn nạp lại số liệu thì KHÔNG cần xoá: nạp đè tệp lên là đủ, nạp đè giữ nguyên ảnh.` +
              NGAT
            : "") +
          `Bộ đếm số phiếu xuất cũng đặt lại, nên phiếu xuất sau khi xoá đánh lại từ đầu.\n\n` +
          `Nhập kho, tồn đầu kỳ, phiếu đã ký và đối tác được GIỮ NGUYÊN.\n\n` +
          `Không khôi phục lại được.`,
      )
    )
      return;

    try {
      setLoading(true);

      const snapBoDem = await getDocs(collection(db, KHO_BO_DEM));
      const canXoa: [string, string][] = [
        ...dsXuat.map((t) => ["transactions", t.id] as [string, string]),
        ...dsSo.map((g) => [KHO_SO_PHIEU, g.soPhieu] as [string, string]),
        ...snapBoDem.docs
          .filter((d) => laBoDemChieuXuat(d.id))
          .map((d) => [KHO_BO_DEM, d.id] as [string, string]),
      ];

      // Chia lô 400: một `writeBatch` chỉ nhận tối đa 500 thao tác.
      const CHUNK = 400;
      for (let i = 0; i < canXoa.length; i += CHUNK) {
        const batch = writeBatch(db);
        canXoa.slice(i, i + CHUNK).forEach(([kho, id]) => {
          batch.delete(doc(db, kho, id));
        });
        await batch.commit();
      }

      const kqAnh = await lamViecAnhKhiXoa(viecAnhXuat);
      setLoading(false);
      showNotification(
        `Đã xoá ${dsXuat.length} giao dịch xuất, ${dsSo.length} dòng sổ số phiếu${chuAnhDaXoa(kqAnh)}.`,
      );
      baoAnhChuaXoa(kqAnh);
    } catch (error) {
      console.error("Xoa giao dich xuat:", error);
      setLoading(false);
      alert(handleFirestoreError(error, OperationType.DELETE, "transactions"));
    }
  };

  /**
   * XOÁ TOÀN BỘ PHẦN NHẬP KHO — để nạp lại từ đầu.
   *
   * XOÁ CẢ PHIẾU NHẬP (`slips`), không riêng giao dịch. Ảnh tờ phiếu đã ký nằm
   * ở `slips`; bỏ lại thì thư viện ảnh vẫn đầy ảnh nhập kho và tab Phiếu nhập
   * còn một đống phiếu mồ côi không còn dòng hàng nào bên dưới. Sạch một nửa
   * khó hiểu hơn không dọn.
   *
   * DỮ LIỆU VÀ ẢNH ĐI MỘT CỤM: ảnh phiếu đã ký trên Cloudinary xoá theo. Chỉ
   * muốn nạp lại số liệu thì nạp đè tệp, không cần xoá — nạp đè giữ ảnh.
   *
   * TỒN ĐẦU KỲ KHÔNG BAO GIỜ BỊ ĐỤNG TỚI, và cố ý không có ô chọn nào để bật
   * lên. Nó là số dư mang sang, khai một lần rồi thôi — trong khi nút này dùng
   * để nạp lại tệp nhập của một kỳ, việc lặp đi lặp lại. Một lựa chọn có thể
   * trót tích nhầm giữa việc lặp lại ấy là một lựa chọn sẽ có ngày bị tích
   * nhầm, và số gốc của cả kho thì không có đường lấy lại.
   *
   * Muốn xoá cả tồn đầu kỳ thì dùng "Dọn sạch" ở thanh bên — chỗ đó nói rõ là
   * xoá sạch mọi thứ, nên không ai bấm nhầm mà không biết mình đang làm gì.
   *
   * Bộ đếm bên NHẬP xoá theo được: mã phiếu nhập do `nextSlipCode` sinh từ các
   * mã đang có, không lấy từ bộ đếm — xem `laBoDemChieuNhap`.
   */
  const handleXoaToanBoNhap = async () => {
    if (!isOwner) return;

    const dsNhap = transactions.filter((t) => t.id && t.type === "IN");
    const dsSo = soPhieu.filter(
      (g) => g.soPhieu && (g.loai === "NHAP" || g.loai === "HUY_NHAP"),
    );
    const dsPhieu = slips.filter((s) => s.id);

    if (dsNhap.length === 0 && dsSo.length === 0 && dsPhieu.length === 0) {
      showNotification("Hiện không có dữ liệu nhập kho nào để xoá.");
      return;
    }

    const conTonDau = transactions.filter((t) => t.type === "OPENING").length;

    // Đếm ảnh sẽ rơi khỏi Thư viện — xem ghi chú ở nút xoá xuất kho.
    const viecAnhNhap = viecAnhCuaLuotXoa(dsNhap, dsPhieu);
    if (!viecAnhNhap) return;
    const anhMatNhap = viecAnhNhap.xoa;

    if (
      !window.confirm(
        `Xoá ${dsNhap.length} giao dịch nhập kho, ${dsPhieu.length} phiếu nhập ` +
          `kèm ảnh đã ký, và ${dsSo.length} dòng phiếu nhập trong Sổ số phiếu?\n\n` +
          (conTonDau > 0
            ? `GIỮ NGUYÊN ${conTonDau} dòng tồn đầu kỳ.\n`
            : "") +
          `Xuất kho và đối tác cũng giữ nguyên.\n\n` +
          (anhMatNhap.length > 0
            ? `XOÁ LUÔN ${anhMatNhap.length} ảnh phiếu đã ký trên Cloudinary — dữ liệu và ảnh đi một cụm.\n\n` +
              `Chỉ muốn nạp lại số liệu thì KHÔNG cần xoá: nạp đè tệp lên là đủ.\n\n`
            : "") +
          `Không khôi phục lại được.`,
      )
    )
      return;

    try {
      setLoading(true);

      const snapBoDem = await getDocs(collection(db, KHO_BO_DEM));
      const canXoa: [string, string][] = [
        ...dsNhap.map((t) => ["transactions", t.id] as [string, string]),
        ...dsPhieu.map((s) => ["slips", s.id] as [string, string]),
        ...dsSo.map((g) => [KHO_SO_PHIEU, g.soPhieu] as [string, string]),
        ...snapBoDem.docs
          .filter((d) => laBoDemChieuNhap(d.id))
          .map((d) => [KHO_BO_DEM, d.id] as [string, string]),
      ];

      // Chia lô 400: một `writeBatch` chỉ nhận tối đa 500 thao tác.
      const CHUNK = 400;
      for (let i = 0; i < canXoa.length; i += CHUNK) {
        const batch = writeBatch(db);
        canXoa.slice(i, i + CHUNK).forEach(([kho, id]) => {
          batch.delete(doc(db, kho, id));
        });
        await batch.commit();
      }

      const kqAnh = await lamViecAnhKhiXoa(viecAnhNhap);
      setLoading(false);
      showNotification(
        `Đã xoá ${dsNhap.length} giao dịch nhập, ${dsPhieu.length} phiếu nhập, ${dsSo.length} dòng sổ số phiếu${chuAnhDaXoa(kqAnh)}.`,
      );
      baoAnhChuaXoa(kqAnh);
    } catch (error) {
      console.error("Xoa du lieu nhap:", error);
      setLoading(false);
      alert(handleFirestoreError(error, OperationType.DELETE, "transactions"));
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
  ): Promise<{ productId: string; quantity: number; date: string }[] | null> => {
    if (!drafts.length) return [];

    const khoa = (d: TkhoNhapDraft) =>
      "tkho-" +
      stableHash([d.dateKey, d.type, d.productId].join("|"));

    /*
     * Dòng cùng mã thì lệnh `set` bên dưới GHI ĐÈ thẳng — không xoá trước.
     * Bản cũ xoá rồi ghi lại đúng mã đó: thừa một lượt xoá mỗi dòng, và luật
     * chỉ cho admin xoá dòng nhập, nên kế toán nạp lại tệp là hỏng cả lô.
     *
     * Chỉ xoá dòng CŨ KHÔNG CÒN trong tệp (tệp sửa ngày) — và phải hỏi.
     */
    const maMoi = new Set(drafts.map((d) => khoa(d)));
    const dongLech = dongCuNgoaiTep(transactions, {
      tienTo: "tkho-",
      ngay: drafts.map((d) => d.dateKey),
      thuocTep: (id) => maMoi.has(id),
    });
    let canXoa: Transaction[] = [];
    if (dongLech.length) {
      if (!isOwner) {
        alert(
          `Có ${dongLech.length} dòng nhập / tồn đầu của lần nạp trước (cùng khoảng ngày) ` +
            "KHÔNG CÒN trong tệp này — thường do tệp đã sửa ngày.\n\n" +
            "Giữ lại thì hàng bị cộng kho HAI LẦN. Chỉ admin xoá được dòng nhập: " +
            "báo admin nạp lại tệp này để dọn.",
        );
      } else if (
        window.confirm(
          `Có ${dongLech.length} dòng nhập / tồn đầu của lần nạp trước (cùng khoảng ngày) ` +
            "KHÔNG CÒN trong tệp này — thường do tệp đã sửa ngày.\n\n" +
            "Giữ lại thì hàng bị cộng kho HAI LẦN.\n\n" +
            `OK = xoá ${dongLech.length} dòng đó rồi nạp\nCancel = giữ nguyên, chỉ nạp tệp`,
        )
      ) {
        canXoa = dongLech;
      }
    }

    /*
     * HAI NGUỒN CHO CÙNG MỘT SỐ TỒN. Nút "Nạp Excel tồn kho" ghi số tổng theo
     * mặt hàng (`dongbo-…`), tệp T Kho ghi số nhập theo ngày (`tkho-…`). Có cả
     * hai cho cùng mặt hàng là hàng được cộng hai lần. Đường Excel tồn kho đã
     * cảnh báo chiều ngược lại; đây là chiều này.
     */
    const matHangTep = new Set(drafts.map((d) => d.productId));
    const dongBoTrung = transactions.filter(
      (t) => t.id?.startsWith("dongbo-") && matHangTep.has(t.productId),
    );
    if (
      dongBoTrung.length &&
      !window.confirm(
        `${new Set(dongBoTrung.map((t) => t.productId)).size} mặt hàng trong tệp này đã có số ` +
          "tồn nạp từ nút \"Nạp Excel tồn kho\". Nạp thêm số nhập từ tệp T Kho là " +
          "hàng bị CỘNG HAI LẦN.\n\nOK = vẫn nạp (anh sẽ tự gỡ một nguồn)\nCancel = dừng lại",
      )
    ) {
      return null; // dừng cả lượt, phần xuất cũng không ghi
    }

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

    const loMoi: { productId: string; quantity: number; date: string }[] = [];

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
        createdBy: user || "Guest",
        status: "completed",
      };
      batch.set(doc(db, "transactions", id), transaction);
      loMoi.push({ productId: product.id, quantity: d.quantity, date });
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
    loMoi: { productId: string; quantity: number; date: string }[] = [],
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

    /*
     * DÒNG CŨ KHÔNG CÒN TRONG TỆP (tệp sửa ngày / điểm bán / đơn vị) — xem
     * `dongCuNgoaiTep`. Không tự xoá: tệp có thể chỉ là một phần kỳ. Hỏi một
     * lần cho cả nhóm.
     */
    const tienToMoi = new Set(
      drafts.map(
        (d) =>
          "bbgn-" +
          stableHash(
            [d.dateKey, d.partnerId, d.productId, d.outlet || ""].join("|"),
          ) +
          "-",
      ),
    );
    const dongLech = dongCuNgoaiTep(transactions, {
      tienTo: "bbgn-",
      ngay: drafts.map((d) => d.dateKey),
      thuocTep: (id) => [...tienToMoi].some((p) => id.startsWith(p)),
      donVi: new Set(drafts.map((d) => d.partnerId)),
    });
    // Luật: người thường chỉ xoá được đơn còn đi đường.
    // Chỉ admin xoá được dữ liệu.
    const lechXoaDuoc = isOwner ? dongLech : [];
    let xoaThem: Transaction[] = [];
    if (
      dongLech.length &&
      window.confirm(
        `Có ${dongLech.length} dòng của lần nạp trước (cùng kỳ, cùng đơn vị) KHÔNG CÒN ` +
          "trong tệp này — thường do tệp đã sửa ngày, điểm bán hoặc đơn vị.\n\n" +
          "Giữ lại thì hàng bị trừ kho HAI LẦN và công nợ cộng hai lần.\n\n" +
          `OK = xoá ${lechXoaDuoc.length} dòng đó rồi nạp\nCancel = giữ nguyên, chỉ nạp tệp` +
          (lechXoaDuoc.length < dongLech.length
            ? `\n\n${dongLech.length - lechXoaDuoc.length} dòng chỉ admin ` +
              "xoá được — sẽ còn lại, báo admin nạp lại tệp này."
            : ""),
      )
    ) {
      xoaThem = lechXoaDuoc;
    }

    setLoading(true);
    try {
      // Ban sao ton theo lo de FIFO "nhin thay" phan da bi tru trong cung lan chay
      /*
       * TỒN TẠM TÍNH TRONG LẦN NẠP NÀY, để biết dòng nào xuất vượt tồn.
       *
       * Không còn FIFO nên không còn lô "VUOT_DINH_MUC" để đếm; thay bằng một
       * bản đếm tồn theo mặt hàng, trừ dần theo từng dòng sắp ghi. Bỏ hẳn cảnh
       * báo này thì một tệp xuất nhiều hơn số đang có sẽ ghi im lặng và tồn
       * kho âm mà không ai biết.
       */
      const tonTam = new Map<string, number>(tonTheoMatHang);
      const truTon = (productId: string, sl: number) => {
        const con = tonTam.get(productId) ?? 0;
        tonTam.set(productId, con - sl);
        return con < sl;
      };

      /*
       * Ghép lô vừa nhập trong CÙNG lần chạy vào bản sao tồn theo lô.
       *
       * Không chờ được Firestore bắn dữ liệu về: tồn theo lô suy từ state, mà
       * state chỉ đổi ở lần dựng lại sau. Nếu chỉ dựa vào nó thì nạp cả tháng
       * trong một lượt sẽ thấy tồn bằng 0 và báo vượt tồn toàn bộ.
       */
      // Hàng vừa nhập trong CÙNG lần chạy cũng phải được tính vào tồn tạm,
      // không thì dòng xuất ngay sau đó bị báo nhầm là vượt tồn.
      loMoi.forEach((lo) => {
        tonTam.set(lo.productId, (tonTam.get(lo.productId) ?? 0) + lo.quantity);
      });
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
      /*
       * Mã sắp ghi lại thì `set` đè thẳng, không xoá trước: đỡ một lượt xoá,
       * và người thường (luật chỉ cho xoá đơn đi đường) vẫn nạp lại được tệp
       * có đơn đã hoàn tất. Chỉ xoá dòng thừa: chuyến bớt dòng, hao hụt bỏ.
       */
      const seGhi = new Set<string>();
      /*
       * ĐƠN ĐÃ XÁC NHẬN MÀ TỆP KHÔNG ĐỔI SỐ → GIỮ NGUYÊN, không ghi lại.
       *
       * Bản cũ ghi đè mọi dòng: đơn đã hoàn tất (đã có ảnh, đã nhập số thực
       * nhận, đã sinh dòng hao hụt lúc xác nhận) bị lật về "đi đường" với số
       * của tệp, và dòng hao hụt lúc xác nhận bị xoá — nạp lại một tệp cũ là
       * mất công xác nhận cả tháng. Số trên tệp vẫn y như lần trước thì không
       * có gì mới để ghi.
       */
      const giuNguyen = new Set<string>();
      khoaDong.forEach((k, i) => {
        const id = `${k}-0`;
        seGhi.add(id);
        if ((Number(drafts[i].haoHut) || 0) > 0) seGhi.add(`${k}-hao-0`);
        const cu = transactions.find((x) => x.id === id);
        if (
          quaDiDuong &&
          cu?.status === "completed" &&
          cu.productId === drafts[i].productId &&
          Number(cu.originalQuantity ?? cu.quantity) === Number(drafts[i].quantity)
        ) {
          giuNguyen.add(id);
          seGhi.add(`${id}-hao-0`); // hao hụt sinh lúc xác nhận
        }
      });
      const canXoa = [
        ...transactions.filter(
          (t) =>
            [...prefixes].some((p) => t.id?.startsWith(p)) && !seGhi.has(t.id),
        ),
        ...xoaThem,
      ];

      /*
       * TRẢ LẠI TỒN TẠM phần của những dòng cũ sắp bị GHI ĐÈ hoặc XOÁ trong
       * lần nạp này. `tonTheoMatHang` đã trừ chúng rồi; nạp lại đúng tệp cũ mà
       * không trả lại thì mỗi dòng bị trừ hai lần và báo "vượt tồn" giả.
       * Dòng giữ nguyên (đã xác nhận) thì không ghi lại, nên không trả.
       */
      {
        const seDe = new Set<string>(canXoa.map((t) => t.id));
        khoaDong.forEach((k) => {
          if (giuNguyen.has(`${k}-0`)) return;
          seDe.add(`${k}-0`);
          seDe.add(`${k}-hao-0`);
        });
        countedTransactions.forEach((t) => {
          if (!seDe.has(t.id)) return;
          const q = Number(t.quantity) || 0;
          const dau = t.type === "IN" || t.type === "OPENING" ? -1 : 1;
          tonTam.set(t.productId, (tonTam.get(t.productId) ?? 0) + dau * q);
        });
      }
      // Người thường không xoá được dữ liệu (luật Firestore): còn dòng thừa
      // của lần nạp trước mà không dọn thì hàng bị trừ hai lần — dừng hẳn.
      if (!isOwner && canXoa.length) {
        alert(
          `Lần nạp này phải dọn ${canXoa.length} dòng thừa của lần nạp trước, mà ` +
            "chỉ admin xoá được dữ liệu. Chưa ghi gì — nhờ admin nạp tệp này.",
        );
        return;
      }

      /*
       * Dòng cũ không trùng mã với dòng mới (tệp sửa lại) bị xoá ở đây. Ảnh
       * KHÔNG đi theo: ảnh gắn vào chuyến (mã lượt giao), dòng mới cùng chuyến
       * thấy lại ngay. Chuyến đổi hẳn khoá thì ảnh cũ hiện ở Thư viện với chữ
       * "chứng từ đã xoá" để admin xử lý — nạp tệp không bao giờ xoá ảnh.
       */

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
        if (giuNguyen.has(`${khoaDong[viTri]}-0`)) continue;

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

        /*
         * GHI CHÚ CHỈ GIỮ THỨ KHÔNG CỘT NÀO NÓI ĐƯỢC.
         *
         * Bỏ "Nạp từ file BBGN": nó lặp y hệt trên mọi dòng của cùng một lần
         * nạp, nên không phân biệt được dòng nào với dòng nào — mà ô ghi chú
         * càng dài thì mắt càng bỏ qua cả ô, kể cả dòng thật sự cần đọc.
         *
         * Bỏ "Điểm nhận" khi nó trùng tên đối tác: cột Đối tác ngay bên cạnh
         * đã ghi "BNC · KAVKAZ" rồi. Chỉ giữ khi khác — lúc đó nó là thứ duy
         * nhất cho biết bia đi tới đâu.
         */
        const trungTen =
          chuanTen(d.outlet) === chuanTen(d.partnerName) ||
          String(d.partnerName || "")
            .split("·")
            .some((x) => chuanTen(x) === chuanTen(d.outlet));

        const noteParts = [
          soChuyen.length > 1
            ? `Chuyến ${thuTuChuyen}/${soChuyen.length}`
            : "",
          d.outlet && !trungTen ? `Điểm nhận: ${d.outlet}` : "",
          chuanTen(d.note) === chuanTen(d.outlet) ? "" : d.note,
        ].filter(Boolean);

        /*
         * MỘT CHUYẾN GIAO LÀ MỘT DÒNG. Trước đây FIFO chia một lần xuất thành
         * nhiều dòng theo lô, nên biên bản 300 lít có khi thành ba dòng 100 —
         * đối chiếu với tờ giấy phải cộng tay lại.
         *
         * Mã dòng giữ đuôi `-0` như cũ để lần nạp lại vẫn đè lên đúng dòng của
         * lần trước, không sinh thêm bản ghi mới.
         */
        if (truTon(product.id, d.quantity)) shortfall++;

        const id = `${khoaDong[viTri]}-0`;
        seq++;
        const transaction: Transaction = {
          id,
          date: `${d.dateKey}T08:00:00.000Z`,
          type: "OUT",
          productId: product.id,
          productName: product.name,
          category: product.category,
          quantity: d.quantity,
          partnerId: d.partnerId,
          partnerName: d.partnerName,
          notes: noteParts.join(" · "),
          createdBy: user || "Guest",
          referenceGroupId,
          status: quaDiDuong ? "in_transit" : "completed",
          originalQuantity: d.quantity,
        };

        batch.set(doc(db, "transactions", id), transaction);
        opCount++;
        if (opCount >= CHUNK) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }

        /*
         * HAO HỤT TỪ TỆP — ghi thành giao dịch `LOSS` RIÊNG, y như đường điền
         * tay.
         *
         * Vì sao không cộng vào dòng xuất: dòng xuất là số lên công nợ và lên
         * hóa đơn. Cộng phần hao hụt vào đó là xuất hóa đơn cho phần mình
         * không thu tiền. Tách riêng thì tồn kho giảm đúng phần đã đi ra thật,
         * còn công nợ giữ đúng số đã thống nhất với đối tác.
         *
         */
        const hao = Number(d.haoHut) || 0;
        if (hao > 0) {
          {
            if (truTon(product.id, hao)) shortfall++;
            const idHao = `${khoaDong[viTri]}-hao-0`;
            seq++;
            const tHao: Transaction = {
              id: idHao,
              date: `${d.dateKey}T08:00:00.000Z`,
              type: "LOSS",
              productId: product.id,
              productName: product.name,
              category: product.category,
              quantity: hao,
              partnerId: d.partnerId,
              partnerName: d.partnerName,
              notes: `[Hao hụt] ${noteParts.join(" · ")}`,
              createdBy: user || "Guest",
              referenceGroupId,
              /*
               * HAO HỤT CHỜ CÙNG ĐƠN, không ghi nhận trước.
               *
               * Trước đây dòng hao hụt luôn là `completed` trong khi dòng xuất
               * của chính nó còn `in_transit`. Hàng chưa xác nhận giao mà báo
               * cáo đã tính hao hụt — người dùng mở báo cáo ra thấy hao hụt
               * của một chuyến chưa ai ký nhận.
               *
               * Nó được lật sang `completed` cùng lúc đơn đi đường được xác
               * nhận — xem `handleReportLoss`.
               */
              status: quaDiDuong ? "in_transit" : "completed",
              originalQuantity: hao,
            };
            batch.set(doc(db, "transactions", idHao), tHao);
            opCount++;
            if (opCount >= CHUNK) {
              await batch.commit();
              batch = writeBatch(db);
              opCount = 0;
            }
          }
        }
      }

      if (opCount > 0) await batch.commit();

      /*
       * CẤP SỐ PHIẾU XUẤT NGAY SAU KHI NẠP — mỗi chuyến giao một số.
       *
       * Trước đây nạp tệp không cấp số; phải sang màn hình Sổ số phiếu bấm
       * cấp bù, nên quên là cả tháng không có số. Bộ cấp số trả lại đúng số
       * cũ cho đơn đã có (nạp lại tệp không sinh số thứ hai). Hỏng thì không
       * làm hỏng lần nạp: Báo cáo Xuất còn nút "Cấp số phiếu" để cấp bù.
       */
      const donCanSo = new Map<
        string,
        { documentDate: string; donVi: string; soDong: number; soLuong: number }
      >();
      drafts.forEach((d) => {
        if (!products.some((p) => p.id === d.productId)) return;
        const nguon = groupIds.get(`${d.dateKey}|${d.partnerId}|${d.cot ?? -1}`);
        if (!nguon || bangSo.has(`XUAT|${nguon}`)) return;
        const cu = donCanSo.get(nguon) || {
          documentDate: d.dateKey,
          donVi: d.partnerName,
          soDong: 0,
          soLuong: 0,
        };
        cu.soDong += 1;
        cu.soLuong += (Number(d.quantity) || 0) + (Number(d.haoHut) || 0);
        donCanSo.set(nguon, cu);
      });
      let soDaCap = 0;
      let loiCapSo = "";
      for (const [nguon, v] of [...donCanSo.entries()].sort((a, b) =>
        a[1].documentDate.localeCompare(b[1].documentDate),
      )) {
        try {
          await capSoPhieu(db, {
            loai: "XUAT",
            nguon,
            ...v,
            createdBy: user || "Guest",
          });
          soDaCap += 1;
        } catch (e) {
          loiCapSo = e instanceof Error ? e.message : String(e);
          break;
        }
      }

      // Đưa thẳng người dùng tới nơi có việc phải làm tiếp, không để họ tự dò.
      if (quaDiDuong) {
        setActiveTab("in-transit");
        showNotification(
          `Đã nạp ${seq} dòng thành ${soDon} đơn — đang chờ ảnh ở tab Đơn đi đường` +
            (soDaCap ? ` · cấp ${soDaCap} số phiếu xuất` : "") +
            (giuNguyen.size
              ? ` · giữ nguyên ${giuNguyen.size} dòng đã xác nhận, số không đổi`
              : "") +
            (xoaThem.length ? ` · xoá ${xoaThem.length} dòng cũ không còn trong tệp` : ""),
        );
      } else {
        showNotification(
          `Đã ghi ${seq} dòng thẳng vào xuất kho` +
            (soDaCap ? ` · cấp ${soDaCap} số phiếu xuất` : ""),
        );
      }
      if (loiCapSo) {
        alert(
          `Đã nạp xong, nhưng mới cấp được ${soDaCap}/${donCanSo.size} số phiếu xuất.\n\n${loiCapSo}\n\n` +
            'Vào Báo cáo tổng hợp → Báo cáo Xuất, bấm "Cấp số phiếu" để cấp nốt.',
        );
      }
      if (shortfall > 0) {
        alert(
          `Đã ghi xong, nhưng có ${shortfall} dòng xuất vượt tồn kho hiện có` +
            `.\n\nThường là do chưa nhập kho phần ` +
            `hàng tương ứng. Anh kiểm tra lại phần nhập trước rồi sửa các dòng này.`,
        );
      }
      // Nạp xong thì sang Báo cáo tổng hợp — chỗ liệt kê giao dịch vừa ghi.
      // (Trước đây sang Lịch sử, phân hệ đó đã gỡ.)
      setActiveTab("reports");
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
  /**
   * Cấp bù số phiếu cho những chứng từ đã lưu mà chưa có số.
   *
   * CẤP TUẦN TỰ, không chạy song song: bộ đếm là một tài liệu, bắn hàng chục
   * yêu cầu cùng lúc vào nó thì Firestore phải thử lại liên tục và có cái sẽ
   * thua. Chậm hơn vài giây nhưng không sót phiếu nào.
   *
   * Hỏng giữa chừng thì DỪNG LẠI, không cố chạy tiếp: những cái đã cấp vẫn
   * giữ, và bấm lại lần nữa là chạy nốt phần còn lại — vì danh sách "chưa có
   * số" tự tính lại.
   */
  const handleCapBuSoPhieu = async (
    ds: {
      loai: "NHAP" | "XUAT";
      nguon: string;
      documentDate: string;
      donVi: string;
      soDong: number;
      soLuong: number;
    }[],
  ) => {
    let xong = 0;
    try {
      for (const c of ds) {
        await capSoPhieu(db, {
          loai: c.loai,
          documentDate: c.documentDate,
          // Chứng từ nhập đã mang sẵn mã phiếu (`nguon` chính là `slipCode`),
          // nên cấp bù cũng phải dùng đúng mã ấy chứ không sinh số mới —
          // không thì tờ giấy lại mang một số, sổ mang một số khác.
          ...(c.loai === "NHAP" ? { soPhieu: c.nguon } : {}),
          nguon: c.nguon,
          donVi: c.donVi,
          soDong: c.soDong,
          soLuong: c.soLuong,
          createdBy: user || "Guest",
        });
        xong += 1;
      }
      showNotification(`Đã cấp số cho ${xong} chứng từ`);
    } catch (e) {
      alert(
        `Đã cấp được ${xong}/${ds.length} chứng từ rồi dừng lại.\n\n${
          e instanceof Error ? e.message : String(e)
        }\n\nBấm "Cấp số" lần nữa để chạy nốt phần còn lại.`,
      );
    }
  };

  /**
   * HÓA ĐƠN THAY THẾ — một lô: cặp dòng chuyển chuyến ghi nhầm (nếu có), bản
   * lưu tờ bị thay thế, và số mới. Lô hỏng thì không có nửa nào nằm lại.
   * Xem `src/lib/hoaDonThayThe.ts`.
   */
  const handleThayTheHoaDon = async (kq: KetQuaThayThe): Promise<boolean> => {
    try {
      const batch = writeBatch(db);
      for (const d of kq.giaoDich) {
        const sp = products.find((p) => p.id === d.productId);
        const dt = donVi.find((p) => p.id === d.partnerId);
        if (!sp || !dt) throw new Error("Không tìm thấy mặt hàng hoặc đơn vị.");
        const t: Transaction = {
          id: d.id,
          date: d.date,
          type: "OUT",
          productId: sp.id,
          productName: sp.name,
          category: sp.category,
          quantity: d.quantity,
          partnerId: dt.id,
          partnerName: dt.name,
          notes: d.notes,
          createdBy: user || "Guest",
          referenceGroupId: d.referenceGroupId,
          status: "completed",
          dieuChinh: d.dieuChinh,
        };
        batch.set(doc(db, "transactions", d.id), t);
      }
      const luc = new Date().toISOString();
      kq.hoaDon.forEach((h) =>
        batch.set(
          doc(db, "hoa_don", h.id),
          { ...h, updatedAt: luc, updatedBy: currentUserProfile?.email || user || "" },
          { merge: true },
        ),
      );
      await batch.commit();
      showNotification(kq.tomTat);
      return true;
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "hoa_don"));
      return false;
    }
  };

  const handleXoaDieuChinh = async (nhom: string) => {
    const ds = transactions.filter(
      (t) => t.referenceGroupId === nhom && t.dieuChinh,
    );
    if (!ds.length) return;
    if (
      !window.confirm(
        `Xoá lần điều chỉnh này (${ds.length} dòng, cả phần giảm và phần tăng)?`,
      )
    )
      return;
    try {
      const batch = writeBatch(db);
      ds.forEach((t) => batch.delete(doc(db, "transactions", t.id)));
      await batch.commit();
      showNotification("Đã xoá lần điều chỉnh");
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "transactions"));
    }
  };

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

  /**
   * XOÁ MỘT BẢN GHI HÓA ĐƠN — chỉ dùng cho hóa đơn mồ côi.
   *
   * "Mồ côi" là hóa đơn đã ghi số mà không còn giao dịch xuất kho nào bên dưới
   * để dựng lại dòng hàng. Xảy ra khi dữ liệu xuất kho bị xoá sau lúc ghi số.
   *
   * Hộp thoại CỐ Ý dài và nhắc thẳng hậu quả: nếu tờ hóa đơn này đã phát hành
   * thật thì xoá bản ghi là mất dấu vết duy nhất app còn giữ về nó, mà cơ quan
   * thuế thì vẫn có. Đường đúng trong trường hợp ấy là nạp lại dữ liệu xuất
   * kho của kỳ đó, không phải xoá.
   */
  const handleXoaHoaDon = async (h: HoaDonGhiNhan) => {
    if (!isOwner) {
      alert("Chỉ chủ sở hữu mới xoá được bản ghi hóa đơn ạ!");
      return;
    }
    if (
      !window.confirm(
        `Xoá bản ghi hóa đơn ${h.soHoaDon} (${h.donVi})?\n\n` +
          `CHỈ XOÁ KHI ĐÂY LÀ SỐ THỬ NGHIỆM. Nếu tờ hóa đơn này đã phát hành ` +
          `thật thì cơ quan thuế vẫn có nó, còn app thì mất dấu vết duy nhất — ` +
          `lúc đó đường đúng là nạp lại dữ liệu xuất kho của kỳ đó để dòng hàng ` +
          `nối lại, không phải xoá.\n\nKhông khôi phục lại được.`,
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "hoa_don", h.id));
      showNotification(`Đã xoá bản ghi hóa đơn ${h.soHoaDon}`);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "hoa_don"));
    }
  };

  /* ---------------- Phieu nhap kho ---------------- */

  /**
   * XOÁ CẢ MỘT PHIẾU NHẬP — nhập sai số lượng, xoá đi làm lại.
   *
   * Xoá các dòng hàng mang mã phiếu, tài liệu phiếu, và hủy số phiếu trong
   * sổ (phiếu hủy ghi âm — số gốc vẫn nằm trong sổ, không nhảy số).
   *
   * Ai xoá được: phiếu CHƯA có ảnh ký thì người ghi được chiều nhập (hàng chưa
   * vào tồn, chưa có ảnh, xoá không mất gì); phiếu đã ký ảnh thì chỉ admin, và
   * ảnh trên Cloudinary bị xoá theo. Luật Firestore chặn đúng như vậy.
   */
  const handleXoaPhieuNhap = async (code: string) => {
    const dong = transactions.filter(
      (t) => t.type === "IN" && t.slipCode === code,
    );
    const phieu = slips.find((s) => s.code === code);
    const daKy =
      (anhTheoChungTu.get(code)?.length || 0) > 0 || phieu?.status === "signed";
    if (daKy && !isOwner) {
      alert("Phiếu đã có ảnh ký — hàng đã vào tồn. Chỉ admin xoá được phiếu này.");
      return;
    }
    const viecAnh = viecAnhCuaLuotXoa(dong, phieu ? [phieu] : []);
    if (!viecAnh) return;
    const anhMat = viecAnh.xoa;
    if ((anhMat.length || viecAnh.go.length) && !isOwner) {
      alert(
        `Phiếu này có ${anhMat.length} ảnh gắn kèm. Xoá phiếu là xoá luôn ảnh — chỉ admin làm được.`,
      );
      return;
    }
    const tom = dong
      .map((t) => `· ${t.productName}: ${formatNumber(t.quantity)}`)
      .join("\n");
    if (
      !window.confirm(
        `Xoá phiếu nhập ${code}?\n\n${tom || "(không còn dòng hàng nào)"}\n\n` +
          (daKy
            ? `Phiếu ĐÃ KÝ — hàng sẽ rời khỏi tồn kho, và ${anhMat.length} ảnh bị xoá luôn trên Cloudinary.\n\n`
            : "Phiếu chưa ký nên hàng chưa vào tồn — xoá xong nhập lại cho đúng.\n\n") +
          "Số phiếu trong sổ được hủy (phiếu hủy ghi âm). Không khôi phục được.",
      )
    )
      return;

    const so = soPhieu.filter(
      (g) => g.nguon === code && g.trangThai === "hieu_luc" && g.loai === "NHAP",
    );
    try {
      setLoading(true);
      const batch = writeBatch(db);
      dong.forEach((t) => batch.delete(doc(db, "transactions", t.id)));
      if (phieu) batch.delete(doc(db, "slips", phieu.id));
      await batch.commit();

      let loiHuy = "";
      for (const g of so) {
        try {
          await huyPhieu(db, g.soPhieu, {
            documentDate: format(new Date(), "yyyy-MM-dd"),
            lyDo: "Xoá phiếu nhập sai",
            createdBy: user || "Guest",
          });
        } catch (e) {
          loiHuy = e instanceof Error ? e.message : String(e);
        }
      }
      const kqAnh = await lamViecAnhKhiXoa(viecAnh);
      showNotification(`Đã xoá phiếu ${code}${chuAnhDaXoa(kqAnh)}`);
      baoAnhChuaXoa(kqAnh);
      if (loiHuy) {
        alert(`Đã xoá phiếu, nhưng chưa hủy được số phiếu trong sổ:\n\n${loiHuy}`);
      }
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "transactions"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * ĐIỀN MÃ LÔ CHO PHIẾU ĐÃ NHẬP (kể cả phiếu đã ký).
   *
   * Chỉ cập nhật trường `batchNumber` — không đụng số lượng, ảnh hay trạng
   * thái phiếu, nên tồn kho không đổi. Chuỗi rỗng = bỏ mã lô của dòng đó.
   */
  const handleLuuMaLo = async (maLoTheoDong: Record<string, string>) => {
    const ids = Object.keys(maLoTheoDong);
    if (!ids.length) return;
    try {
      setLoading(true);
      const batch = writeBatch(db);
      ids.forEach((id) =>
        batch.update(doc(db, "transactions", id), {
          batchNumber: maLoTheoDong[id].trim(),
        }),
      );
      await batch.commit();
      showNotification(`Đã lưu mã lô cho ${ids.length} dòng`);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "transactions"));
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /**
   * GỠ MỘT ẢNH KÝ ĐÃ TẢI NHẦM KHỎI PHIẾU — chỉ admin.
   *
   * Ảnh ký là chứng từ duyệt số liệu: gỡ hết ảnh thì phiếu quay về chưa duyệt
   * và cả phiếu RA KHỎI TỒN KHO ngay. Tấm chỉ làm chứng cho phiếu này thì xoá
   * luôn tệp trên Cloudinary (dữ liệu và ảnh đi một cụm); tấm còn làm chứng cho
   * chứng từ khác thì chỉ gỡ khỏi phiếu này.
   */
  const handleRemoveSignedSlipPhoto = async (code: string, anh: AnhChungTu) => {
    if (!isOwner) return;
    const existing = slips.find((s) => s.code === code);
    const conLai = (anhTheoChungTu.get(code) || []).filter((a) => a.id !== anh.id);
    // Phiếu ký giấy cũ (chưa có chữ ký điện tử): ảnh tờ đã ký là chứng từ duy
    // nhất — luồng in giấy đã bỏ, gỡ nốt tấm cuối thì phiếu không còn cách nào
    // ký lại. Muốn bỏ thì xoá cả phiếu.
    if (!conLai.length && !existing?.warehouseSig) {
      alert(
        `Đây là ảnh ký DUY NHẤT của phiếu giấy ${code}.\n\nLuồng in giấy đã bỏ, gỡ tấm này thì phiếu không ký lại được. Nhập sai thì xoá cả phiếu rồi nhập lại (phiếu mới ký điện tử).`,
      );
      return;
    }
    const conChungTuKhac = anh.chungTu.filter((c) => c !== code);
    try {
      const kqAnh = await lamViecAnhKhiXoa(
        conChungTuKhac.length
          ? { xoa: [], go: [{ anh, conLai: conChungTuKhac }] }
          : { xoa: [anh], go: [] },
      );
      showNotification(
        `Đã gỡ 1 ảnh khỏi phiếu ${code}` +
          (kqAnh.daXoa > 0 ? " · đã xoá tệp trên Cloudinary" : ""),
      );
      baoAnhChuaXoa(kqAnh);
    } catch (e: any) {
      alert(handleFirestoreError(e, OperationType.WRITE, "slips"));
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
  const handleExportReportToExcel = (forcedKind?: "summary" | "in" | "out") => {
    const kind =
      forcedKind ?? (activeTab === "overview" ? "summary" : reportSubTab);
    let sheetName = "Report";
    let bang: BangDep;

    if (kind === "summary") {
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
          `Kỳ: ${moTaKyBaoCao} · Xuất lúc ${format(new Date(), "HH:mm dd/MM/yyyy")}`,
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
      const typeLabel = kind === "in" ? "Nhap" : "Xuat";
      const targets = filteredTransactionsForReport.filter((t) =>
        kind === "in" ? trongNhatKyNhap(t) : trongNhatKyXuat(t),
      );

      if (targets.length === 0) {
        showNotification(`Không có dữ liệu ${typeLabel} để xuất.`, "error");
        return;
      }

      // Mã lô chỉ có ở chiều nhập; báo cáo xuất giữ nguyên các cột cũ.
      const coMaLo = kind === "in";
      const tieuDe = [
        "Ngày",
        "Số phiếu",
        "Loại",
        "Sản phẩm",
        "Số lượng",
        ...(coMaLo ? ["Mã lô"] : []),
        "Đối tác",
        "Ghi chú",
      ];
      const hang = targets.map((t) => [
        format(parseISO(t.date), "dd/MM/yyyy"),
        (() => {
          const so = soPhieuCuaDong(t, bangSo);
          return so ? so.soPhieu + (so.daHuy ? " (đã hủy)" : "") : "";
        })(),
        t.type,
        t.productName,
        t.quantity,
        ...(coMaLo ? [t.batchNumber || ""] : []),
        t.partnerName,
        t.notes || "",
      ]);
      bang = {
        tieuDeTren: [
          `BÁO CÁO ${kind === "in" ? "NHẬP KHO" : "XUẤT KHO"}`,
          `${targets.length} dòng · Xuất lúc ${format(new Date(), "HH:mm dd/MM/yyyy")}`,
        ],
        tieuDe,
        cot: [
          { rong: 12, kieu: "giua" },
          { rong: 16, kieu: "giua" },
          { rong: 10, kieu: "giua" },
          { rong: 38 },
          { rong: 12, kieu: "so" },
          ...(coMaLo ? [{ rong: 16, kieu: "giua" as const }] : []),
          { rong: 24 },
          { rong: 44 },
        ],
        hang,
        dongTong: [
          "TỔNG CỘNG",
          "",
          "",
          "",
          hang.reduce((s, h) => s + (Number(h[4]) || 0), 0),
          ...(coMaLo ? [""] : []),
          "",
          "",
        ],
      };
      sheetName = `Bao cao ${typeLabel}`;
    }

    const wb = XLSXDep.utils.book_new();
    XLSXDep.utils.book_append_sheet(wb, taoSheetDep(bang), sheetName);
    if (kind === "summary" && baoCaoKegDVTV.rows.length > 0) {
      const kegHang = baoCaoKegDVTV.rows.map((r) => [
        r.unitName,
        r.isStandard206 ? "20,6 L/keg (BNC/FV)" : "20 L/keg (thực giao 20,6L)",
        r.litersDelivered,
        r.internalLiters,
        r.kegsDelivered,
        r.expectedStandardLoss,
        r.actualLossRecorded,
        r.unrecordedGap,
      ]);
      const bangKeg: BangDep = {
        tieuDeTren: [
          "KIỂM SOÁT GIAO KEG ĐVTV & HAO HỤT ĐỊNH MỨC (0,6 L/KEG)",
          `Kỳ: ${moTaKyBaoCao} · ĐVTV ký 20L/keg nhưng thực xuất nội bộ 20,6L/keg · Tổng ĐVTV: ${formatNumber(baoCaoKegDVTV.totals.dvtvKegsDelivered)} Keg · Lệch chuẩn: ${formatNumber(baoCaoKegDVTV.totals.dvtvExpectedLoss06)} L`,
        ],
        tieuDe: [
          "Đơn vị / ĐVTV",
          "Quy ước biên bản",
          "Khách nhận (OUT)",
          "Thực xuất kho (20,6L/keg)",
          "Tổng Keg giao (làm tròn lên)",
          "Lệch chuẩn 0,6L/keg",
          "Đã ghi LOSS",
          "Chênh chưa bù",
        ],
        cot: [
          { rong: 28 },
          { rong: 24, kieu: "giua" },
          { rong: 15, kieu: "so" },
          { rong: 18, kieu: "so" },
          { rong: 16, kieu: "so" },
          { rong: 16, kieu: "so" },
          { rong: 14, kieu: "so" },
          { rong: 14, kieu: "so" },
        ],
        hang: kegHang,
        dongTong: [
          "TỔNG CỘNG (ALL ĐƠN VỊ)",
          "",
          baoCaoKegDVTV.totals.allLitersDelivered,
          baoCaoKegDVTV.totals.allInternalLiters,
          baoCaoKegDVTV.totals.allKegsDelivered,
          baoCaoKegDVTV.totals.dvtvExpectedLoss06,
          baoCaoKegDVTV.totals.allActualLoss,
          baoCaoKegDVTV.totals.dvtvUnrecordedGap,
        ],
      };
      XLSXDep.utils.book_append_sheet(
        wb,
        taoSheetDep(bangKeg),
        "Keg DVTV & Hao hut",
      );
    }
    XLSXDep.writeFile(
      wb,
      `${sheetName} ${format(new Date(), "ddMMyyyy_HHmm")}.xlsx`,
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
      /*
        Tên vai trò và quyền lấy từ `src/lib/quyen.ts`, không viết lại ở đây.
        Bảng cũ viết cứng năm vai trò nên vai trò mới hiện ra dưới dạng mã thô
        ("NHAP_KHO"), và câu "lẽ ra ghi được" thì suy từ `role !== PENDING` nên
        nói sai với DNC — vai trò vốn KHÔNG được ghi gì.
      */
      const q = quyenCua(vaiTroXem);
      const daDuyet = q.xemKho || q.xemXuat;
      const laViecGhi = viec.includes("ghi") || viec.includes("lưu");

      /*
        NÓI LUÔN PROJECT VÀ CƠ SỞ DỮ LIỆU. Firebase cho nhiều cơ sở dữ liệu
        trong một project và MỖI CÁI CÓ BỘ RULES RIÊNG — publish nhầm cái khác
        thì bao nhiêu lần cũng không có tác dụng, mà màn hình vẫn báo y hệt.
        Dự án này KHÔNG dùng `(default)`.
      */
      const cho =
        `Project: ${firebaseProjectId}\n` +
        `Cơ sở dữ liệu: ${firestoreDatabaseId}`;

      return (
        `Tài khoản ${auth.currentUser?.email || "này"} chưa đủ quyền ${viec}` +
        `${path ? ` mục "${path}"` : ""}.\n\n` +
        `Vai trò hiện tại: ${tenVaiTro(userRole)}\n\n` +
        (!daDuyet
          ? "Vai trò này chưa được duyệt nên không đọc và không ghi được gì.\n\n" +
            "Chủ sở hữu vào mục Người dùng chọn vai trò cho tài khoản này. " +
            "Duyệt xong là dùng được ngay, không phải đăng nhập lại."
          : laViecGhi && !q.ghiNhap && !q.ghiXuat
            ? "Vai trò này CHỈ XEM, không ghi được dữ liệu. Nếu cần ghi thì " +
              "nhờ chủ sở hữu đổi vai trò trong mục Người dùng."
            : "Vai trò này lẽ ra làm được việc này, nên vướng ở phân quyền của " +
              "máy chủ — luật trên Firebase còn là bản cũ, chưa biết vai trò " +
              `mới.\n\nChủ sở hữu vào Firebase Console → Firestore Database → ` +
              "tab Rules, dán lại nội dung tệp firestore.rules mới nhất rồi bấm " +
              `Publish.\n\nPHẢI ĐÚNG CƠ SỞ DỮ LIỆU NÀY:\n${cho}\n\n` +
              // Publish rules xong thì phải TẢI LẠI TRANG: những đăng ký đã bị
              // máy chủ từ chối thì Firestore đóng luôn, không tự thử lại.
              // Nhưng không cần đăng xuất — phiên đăng nhập vẫn tốt.
              "Xong thì tải lại trang (Ctrl + Shift + R).")
      );
    }

    if (ma === "unavailable" || ma === "deadline-exceeded") {
      return `Không kết nối được máy chủ nên chưa ${viec} được. Kiểm tra mạng rồi thử lại.`;
    }

    // Hết hạn mức ngày của Firebase: mọi lệnh hỏng tới khi hạn mức đặt lại,
    // làm lại ngay cũng vô ích — nói rõ để không ai bấm đi bấm lại.
    if (ma === "resource-exhausted") {
      return (
        `Firebase đã hết hạn mức hôm nay nên chưa ${viec} được. Hạn mức đặt ` +
        "lại lúc 14h–15h chiều giờ Việt Nam; làm lại sau giờ đó."
      );
    }

    return `Không ${viec} được: ${err?.message || "lỗi không rõ"}`;
  };

  /**
   * NẠP EXCEL TỒN KHO — đồng bộ số tổng theo mặt hàng, KHÔNG nhân đôi.
   *
   * Bản cũ đặt mã tài liệu bằng `Date.now()` + `Math.random()`: nạp lại cùng
   * tệp là thêm một bộ giao dịch mới. Nay mỗi (mặt hàng × loại số) có đúng một
   * dòng, mã suy từ hai thứ đó — xem `src/lib/napTonKho.ts`, nơi đặt toàn bộ
   * phép tính và phép kiểm.
   *
   * Ở đây chỉ còn: đọc tệp → lập kế hoạch → hỏi MỘT lần cho nhóm lệch → ghi →
   * báo lại bằng con số từng nhóm.
   */
  const handleImportInventoryExcel = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const xongTep = () => {
      if (event.target) event.target.value = "";
    };

    let kh: ReturnType<typeof lapKeHoachDongBo>;
    try {
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
        type: "array",
      });
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
        defval: "",
      }) as unknown[][];
      const dong = docBangTonKho(aoa);
      if (!dong.length) {
        alert(
          "Không đọc được dòng nào.\n\nSheet đầu tiên phải có một dòng tiêu đề với cột \"Sản phẩm\" " +
            "(hoặc \"Mã vật tư\"), cùng các cột Tồn đầu / Tổng nhập / Tổng xuất / Hao hụt.",
        );
        xongTep();
        return;
      }
      kh = lapKeHoachDongBo(dong, products, transactions);
    } catch (e) {
      console.error(e);
      alert(`Không đọc được tệp Excel: ${e instanceof Error ? e.message : String(e)}`);
      xongTep();
      return;
    }

    const so = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
    const baoBoQua = [
      kh.khongKhop.length
        ? `${kh.khongKhop.length} dòng KHÔNG khớp danh mục (bỏ qua): ` +
          kh.khongKhop.map((d) => `dòng ${d.dongExcel} "${d.sanPham || d.maVatTu}"`).join(", ")
        : "",
      kh.lechDonVi.length
        ? `${kh.lechDonVi.length} dòng LỆCH ĐƠN VỊ (bỏ qua, không tự quy đổi): ` +
          kh.lechDonVi
            .map((x) => `dòng ${x.d.dongExcel} ghi "${x.d.donViTinh}", kho đếm "${x.donViKho}"`)
            .join(", ")
        : "",
      kh.xungDot.length
        ? `${kh.xungDot.length} mặt hàng có hai dòng số khác nhau (bỏ qua): ${kh.xungDot.join(", ")}`
        : "",
    ].filter(Boolean);

    /*
     * NHÂN ĐÔI KIỂU THỨ HAI: số tổng chồng lên giao dịch chi tiết đã có.
     * Không tự chặn — có thể anh cố ý — nhưng đặt lên ĐẦU hộp xác nhận.
     */
    const canhBaoChiTiet = kh.daCoChiTiet.length
      ? `CẢNH BÁO NHÂN ĐÔI: ${kh.daCoChiTiet.length} mặt hàng ĐÃ CÓ giao dịch chi tiết trong app ` +
        `(nhập/xuất từng lần). Nạp thêm số tổng là cộng hai lần:\n` +
        kh.daCoChiTiet
          .slice(0, 10)
          .map((x) => `• ${x.productName}: ${x.soDong} giao dịch`)
          .join("\n") +
        (kh.daCoChiTiet.length > 10 ? `\n… và ${kh.daCoChiTiet.length - 10} mặt hàng nữa` : "") +
        `\n\nNếu đây là tệp Báo cáo tổng hợp xuất từ chính app thì ĐỪNG nạp.\n\n`
      : "";

    if (!kh.ghiMoi.length && !kh.lech.length) {
      alert(
        `Không có gì để ghi: ${kh.giongHet.length} số đã có y nguyên trong app.` +
          (baoBoQua.length ? `\n\n${baoBoQua.join("\n\n")}` : ""),
      );
      xongTep();
      return;
    }

    if (
      !window.confirm(
        canhBaoChiTiet +
          `Nạp Excel tồn kho:\n\n` +
          `• Ghi mới ${kh.ghiMoi.length} số\n` +
          `• Bỏ qua ${kh.giongHet.length} số đã có y nguyên\n` +
          (kh.lech.length ? `• ${kh.lech.length} số khác với số đang có — hỏi ở bước sau\n` : "") +
          (kh.lapTrongTep ? `• Bỏ ${kh.lapTrongTep} dòng lặp y hệt trong tệp\n` : "") +
          (baoBoQua.length ? `\n${baoBoQua.join("\n\n")}\n` : "") +
          `\nTiếp tục?`,
      )
    ) {
      xongTep();
      return;
    }

    /*
     * NHÓM LỆCH — HỎI MỘT LẦN CHO CẢ NHÓM, kèm từng số cũ → số mới.
     *
     * "Đang có N dòng" là bản trùng do lỗi mã ngẫu nhiên của bản cũ để lại:
     * thay thế là gỡ hết chúng, chỉ để lại một dòng đúng.
     */
    let thay = false;
    if (kh.lech.length) {
      const ds = kh.lech
        .slice(0, 25)
        .map((l) => {
          const cu = l.cu.reduce((t, x) => t + (Number(x.quantity) || 0), 0);
          return (
            `• ${l.moi.productName} · ${TEN_LOAI[l.moi.loai]}: ${so(cu)} → ${so(l.moi.soLuong)}` +
            (l.cu.length > 1 ? ` (đang có ${l.cu.length} dòng trùng)` : "")
          );
        })
        .join("\n");
      thay = window.confirm(
        `${kh.lech.length} số trong tệp KHÁC số đang có trong app:\n\n${ds}` +
          (kh.lech.length > 25 ? `\n… và ${kh.lech.length - 25} số nữa` : "") +
          `\n\nOK = thay bằng số trong tệp.\nHủy = GIỮ NGUYÊN số đang có (vẫn ghi phần mới).`,
      );
    }

    setLoading(true);
    try {
      const cuCanXoa = thay ? kh.lech.flatMap((l) => l.cu) : [];
      // Dòng tồn đồng bộ từ Excel không có chứng từ ảnh nào — xoá không kéo theo ảnh.

      const ghi = [
        ...kh.ghiMoi,
        ...(thay ? kh.lech.map((l) => l.moi).filter((d) => d.soLuong > 0) : []),
      ];
      const giuLai = new Set(ghi.map((d) => d.id));
      // Chỉ admin xoá được dữ liệu: còn dòng phải xoá mà không phải admin thì
      // dừng trước khi ghi gì — lô ghi lẫn lệnh xoá sẽ bị từ chối cả lô.
      if (!isOwner && cuCanXoa.some((t) => !giuLai.has(t.id))) {
        alert(
          "Thay số lần này phải xoá vài dòng cũ, mà chỉ admin xoá được dữ liệu. " +
            "Chưa ghi gì — nhờ admin nạp tệp này, hoặc chọn giữ số cũ.",
        );
        return;
      }
      const now = new Date().toISOString();
      const nguoi = `Nạp Excel tồn kho (${user})`;
      const viec: ((b: ReturnType<typeof writeBatch>) => void)[] = [
        // Dòng cũ trùng mã với dòng sắp ghi thì `set` đè lên luôn, không xoá.
        ...cuCanXoa
          .filter((t) => !giuLai.has(t.id))
          .map((t) => (b: ReturnType<typeof writeBatch>) => b.delete(doc(db, "transactions", t.id))),
        ...ghi.map((d) => (b: ReturnType<typeof writeBatch>) => {
          const p = products.find((x) => x.id === d.productId)!;
          const tx: Transaction = {
            id: d.id,
            date: now,
            type: d.loai,
            productId: p.id,
            productName: p.name,
            category: p.category,
            quantity: d.soLuong,
            partnerId: DOI_TAC_DONG_BO,
            partnerName: "Đồng bộ Excel tồn kho",
            notes: `${TEN_LOAI[d.loai]} · nạp từ Excel tồn kho`,
            createdBy: nguoi,
            status: "completed",
          };
          b.set(doc(db, "transactions", d.id), tx);
        }),
      ];
      const CHUNK = 400;
      for (let k = 0; k < viec.length; k += CHUNK) {
        const batch = writeBatch(db);
        viec.slice(k, k + CHUNK).forEach((f) => f(batch));
        await batch.commit();
      }

      const soXoa = cuCanXoa.filter((t) => !giuLai.has(t.id)).length;
      showNotification(
        `Đã ghi mới ${kh.ghiMoi.length} số` +
          (kh.lech.length
            ? thay
              ? `, thay ${kh.lech.length} số (gỡ ${soXoa} dòng cũ)`
              : `, GIỮ NGUYÊN ${kh.lech.length} số đang có`
            : "") +
          `, bỏ qua ${kh.giongHet.length} số đã có y nguyên` +
          (baoBoQua.length ? `. Có dòng bị bỏ qua — xem lại tệp.` : "."),
      );
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "transactions"));
    } finally {
      setLoading(false);
      xongTep();
    }
  };

  // Form states
  interface TransactionItem {
    productId: string;
    quantity: number;
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
    /** Mã lô của dòng nhập — chỉ ghi nhận, xem `Transaction.batchNumber`. */
    batchNumber?: string;
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
    date: string;
    isInTransit: boolean;
    items: TransactionItem[];
  }>({
    type: "IN",
    partnerId: partners[0]?.id || "",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
    isInTransit: false,
    items: [{ productId: products[0]?.id || "", quantity: 0 }],
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
  /**
   * Ảnh biên bản đang chọn ở khung xác nhận đơn — NẰM TRÊN MÁY, chưa lên
   * Cloudinary. Chỉ khi bấm Xác nhận mới tải lên và ghi cùng lô (src/anh).
   */
  const [anhCho, setAnhCho] = useState<TepCho[]>([]);
  const baoAnhKhongDoc = (n: number) =>
    alert(
      `Điện thoại không cho đọc ${n} ảnh vừa chọn — ảnh đó CHƯA được thêm.

` +
        "Chụp lại hoặc chọn lại ảnh đó. Nếu chọn từ Google Photos / Drive mà vẫn lỗi, " +
        "lưu ảnh về máy trước rồi chọn trong mục Ảnh của máy.",
    );
  const [showLossModal, setShowLossModal] = useState(false);

  /**
   * Hao hụt đang CHỜ theo từng đơn đi đường, cộng theo `referenceGroupId`.
   *
   * Dòng hao hụt cố ý không nằm trong thẻ đơn (nó không phải hàng giao cho đối
   * tác), nhưng phải nói ra là có — nếu không người dùng xác nhận xong mới thấy
   * báo cáo mọc thêm một khoản hao hụt không rõ từ đâu.
   */
  const haoHutChoTheoDon = useMemo(() => {
    const m = new Map<string, number>();
    transactions.forEach((t) => {
      if (!laDongHaoHut(t) || t.status !== "in_transit") return;
      const k = t.referenceGroupId || t.id;
      m.set(k, (m.get(k) || 0) + (Number(t.quantity) || 0));
    });
    return m;
  }, [transactions]);

  /**
   * Các dòng hao hụt đi kèm phiếu đang mở trong khung xác nhận.
   *
   * Hao hụt cố ý không nằm trong danh sách hàng hóa của khung (nó không giao
   * cho đối tác, hỏi "thực nhận bao nhiêu" là vô nghĩa), nhưng phải hiện ra
   * để người kho biết bấm xác nhận là ghi nhận luôn cả phần này.
   */
  const haoHutCuaPhieuDangXac = useMemo(() => {
    if (!selectedInTransitGroup || selectedInTransitGroup.length === 0)
      return [] as Transaction[];
    const nhom = new Set(
      selectedInTransitGroup
        .map((t) => t.referenceGroupId)
        .filter((x): x is string => !!x),
    );
    if (nhom.size === 0) return [] as Transaction[];
    return transactions.filter(
      (t) =>
        laDongHaoHut(t) &&
        t.status === "in_transit" &&
        t.referenceGroupId &&
        nhom.has(t.referenceGroupId),
    );
  }, [transactions, selectedInTransitGroup]);

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

    /*
     * CHỈ GOM DÒNG GIAO, KHÔNG GOM DÒNG HAO HỤT.
     *
     * Thẻ đơn đi đường hiện "SL gửi" và "N mặt hàng" bằng cách cộng cả nhóm,
     * và ô "Thực nhận" trong khung xác nhận cũng dựng từ đây. Để dòng hao hụt
     * lọt vào thì số gửi bị thổi lên và người dùng bị hỏi "đối tác nhận được
     * bao nhiêu phần hao hụt" — một câu vô nghĩa.
     *
     * Hao hụt vẫn được lật sang đã xong cùng lúc với đơn, theo
     * `referenceGroupId` — xem `handleReportLoss`.
     */
    transactions
      .filter((t) => t.status === "in_transit" && !laDongHaoHut(t))
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

  /*
   * THÊM ĐỐI TÁC KHÔNG ĐẺ BẢN TRÙNG, KHÔNG ĐÈ ĐỐI TÁC CŨ.
   *
   * Bản cũ: không chặn bấm hai lần (hai đối tác `p-…` cùng tên), và có mã SAP
   * thì `setDoc` ghi đè thẳng đối tác đang mang mã đó — mất tên, địa chỉ cũ
   * mà không ai hay. Nay: đang lưu thì bỏ qua cú bấm sau; trùng mã SAP hay
   * trùng tên (đã chuẩn hoá) với đối tác đang có thì dừng lại và nói rõ.
   */
  const dangThemDoiTacRef = useRef(false);
  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerFormData.name || dangThemDoiTacRef.current) return;

    const maSap = String(partnerFormData.sapCode || "").trim();
    const trungMa = maSap
      ? partners.find(
          (p) => p.id === maSap || String(p.sapCode || "").trim() === maSap,
        )
      : undefined;
    const trungTen = partners.find(
      (p) => chuanTen(p.name) === chuanTen(partnerFormData.name),
    );
    if (trungMa || trungTen) {
      alert(
        `Đã có đối tác "${(trungMa || trungTen)!.name}"` +
          (trungMa ? ` mang mã SAP ${maSap}` : " trùng tên") +
          ". Sửa đối tác đó thay vì thêm mới — thêm nữa là hai đơn vị cho cùng " +
          "một khách, công nợ tách làm hai.",
      );
      return;
    }

    const newId = maSap || `p-${Math.random().toString(36).substr(2, 6)}`;
    const newPartner: Partner = {
      id: newId,
      ...partnerFormData,
    };

    dangThemDoiTacRef.current = true;
    setDoc(doc(db, "partners", newPartner.id), newPartner)
      .finally(() => {
        dangThemDoiTacRef.current = false;
      })
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

    /*
     * XOÁ CẢ DÒNG HAO HỤT CỦA CHÍNH ĐƠN NÀY.
     *
     * Dòng hao hụt cố ý KHÔNG nằm trong `group` — nó không phải hàng giao cho
     * đối tác nên bị lọc khỏi thẻ đơn đi đường. Nhưng lệnh xoá thì lại chạy
     * đúng trên `group`, nên xoá đơn xong dòng hao hụt nằm lại một mình: vẫn
     * trừ tồn kho, vẫn hiện ở báo cáo, mà không còn đơn nào giải thích nó.
     *
     * Gom theo `referenceGroupId` — cùng một chuyến giao.
     */
    const nhom = new Set(
      group.map((t) => t.referenceGroupId).filter((x): x is string => !!x),
    );
    const haoKemTheo =
      nhom.size > 0
        ? transactions.filter(
            (t) =>
              t.id &&
              laDongHaoHut(t) &&
              t.referenceGroupId &&
              nhom.has(t.referenceGroupId),
          )
        : [];
    const canXoa = [...group, ...haoKemTheo];

    /*
     * DỮ LIỆU VÀ ẢNH ĐI MỘT CỤM, mà chỉ admin xoá được ảnh.
     *
     * Luật cho người xuất kho xoá đơn đang đi đường. Nhưng xoá đơn có ảnh là
     * xoá luôn ảnh — việc của admin. Để người xuất kho xoá được phần dữ liệu
     * mà ảnh nằm lại thì sinh đúng loại tệp lửng lơ không ai thấy; nên chặn
     * từ đầu, nói rõ phải nhờ ai.
     */
    // XOÁ CHỈ ADMIN (21/10/2026): xoá dữ liệu là xoá luôn ảnh trên
    // Cloudinary, và luật Firestore cũng chỉ cho admin xoá.
    if (!isOwner) {
      alert("Chỉ admin mới xoá được đơn. Nhờ anh Khoa xoá đơn này.");
      return;
    }
    const viecAnhDon = viecAnhCuaLuotXoa(canXoa);
    if (!viecAnhDon) return;
    const anhMatDon = viecAnhDon.xoa;

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa toàn bộ ${canXoa.length} bản ghi trong đơn này không?` +
          (haoKemTheo.length > 0
            ? `\n\nTrong đó có ${haoKemTheo.length} dòng hao hụt đi kèm đơn — xoá theo luôn.`
            : "") +
          (anhMatDon.length > 0
            ? `\n\nXOÁ LUÔN ${anhMatDon.length} ảnh biên bản của đơn trên Cloudinary.`
            : ""),
      )
    )
      return;

    const truocXoa = transactions;
    try {
      setLoading(true);
      const batch = writeBatch(db);
      canXoa.forEach((t) => {
        batch.delete(doc(db, "transactions", t.id));
      });
      await batch.commit();
      const kqAnh = await lamViecAnhKhiXoa(viecAnhDon);
      showNotification(`Đã xóa đơn đi đường${chuAnhDaXoa(kqAnh)}!`);
      baoAnhChuaXoa(kqAnh);
      await hoiHuySoPhieuMoCoi(canXoa, truocXoa);
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
        !laDongHaoHut(t) &&
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

    /*
     * MỞ KHUNG RA LÀ CHƯA KHỚP MẶT HÀNG NÀO — CỐ Ý.
     *
     * Người kho phải dò từng loại bia trên tờ phiếu giấy, đối đúng số lượng,
     * rồi mới tích "có trên phiếu" cho loại đó. Đây là bước ĐỐI CHIẾU, không
     * phải thủ tục thừa: tích sẵn cả phiếu là biến nó thành một cú bấm, và
     * hàng giao thiếu trôi thẳng vào sổ mà không ai nhìn.
     *
     * Đặt lại Set RỖNG chứ không để nguyên: dấu khớp còn sót từ đơn mở trước
     * sẽ xác nhận nhầm sang đơn này.
     */
    setMatchedProductIds(new Set());

    // Số đang gõ dở, lý do hao và ảnh của ĐƠN MỞ TRƯỚC (đóng mà không xác
    // nhận) không được lọt sang đơn này.
    setSoThucNhanText({});
    setLossReason("");
    setAnhCho([]);
    setShowLossModal(true);
  };

  /*
   * XÁC NHẬN HỎNG THÌ PHẢI NÓI RA, KHÔNG IM LẶNG.
   *
   * Cả hai lối thoát dưới đây trước kia đều êm: một cái `return` trắng, một
   * cái chỉ hiện dòng thông báo góc màn hình rồi tự tắt. Người dùng bấm xác
   * nhận, không thấy gì đổi, đóng khung lại và tin là đã xong — trong khi đơn
   * vẫn nằm nguyên ở đi đường. Mất cả buổi mới phát hiện.
   *
   * Nay dùng `alert`: nó chặn màn hình, buộc phải đọc.
   */
  /*
   * ĐÓNG KHUNG XÁC NHẬN = BỎ ẢNH ĐANG CHỌN. Ảnh chưa lên máy chủ (chỉ nằm
   * trên máy) nên bỏ là xong, không có gì phải dọn. Phải bỏ hẳn: để lại thì mở
   * đơn KHÁC ra, ảnh của đơn trước nằm đó và bị lưu nhầm sang đơn mới.
   */
  const dongKhungXacNhan = () => {
    if (
      anhCho.length &&
      !window.confirm(`Đóng khung là bỏ ${anhCho.length} ảnh đang chọn (chưa lưu). Đóng?`)
    )
      return;
    setAnhCho([]);
    setShowLossModal(false);
  };

  const handleReportLoss = async () => {
    if (!selectedInTransitGroup || selectedInTransitGroup.length === 0) {
      alert(
        "Chưa chọn được đơn nào để xác nhận. Anh đóng khung này rồi bấm lại " +
          "nút xác nhận trên đơn nhé.",
      );
      return;
    }

    // Only confirm transactions whose product ID or transaction ID is in the matched set
    const trxsToConfirm = selectedInTransitGroup.filter(
      (t) => matchedProductIds.has(t.id) || matchedProductIds.has(t.productId),
    );

    if (trxsToConfirm.length === 0) {
      alert(
        "CHƯA XÁC NHẬN ĐƯỢC — chưa tích mặt hàng nào là có trên phiếu.\n\n" +
          "Anh dò từng loại bia trên tờ phiếu giấy, đối đúng số lượng, rồi bấm " +
          "nút bên phải dòng đó để tích. Dòng đã tích sẽ sáng xanh và có chữ " +
          "\"ĐÃ KHỚP\".",
      );
      return;
    }

    /*
     * ẢNH BIÊN BẢN GẮN VÀO CHUYẾN, KHÔNG THAY ẢNH CŨ.
     *
     * Tải ảnh đang chọn lên rồi ghi CÙNG LÔ với các dòng xác nhận: lô hỏng thì
     * xoá ngay tệp vừa tải. Ảnh cũ của chuyến (xác nhận từng phần lần trước)
     * giữ nguyên — bản cũ thay ảnh, làm tờ biên bản trước rời khỏi đơn.
     */
    const chungTuXacNhan = [...new Set(trxsToConfirm.map(maChungTuCuaDong))];
    const daCoAnh = chungTuXacNhan.some((c) => (anhTheoChungTu.get(c) || []).length > 0);
    if (!anhCho.length && !daCoAnh) {
      alert("Chưa có ảnh biên bản nào. Chụp hoặc chọn ảnh tờ biên bản đã ký rồi bấm xác nhận.");
      return;
    }
    let anhMoi: AnhChungTu[] = [];
    try {
      setLoading(true);
      if (anhCho.length) {
        anhMoi = await taiAnhChoChungTu(
          anhCho.map((t) => t.du),
          {
            chungTu: chungTuXacNhan,
            loai: "XUAT",
            ngay: String(trxsToConfirm[0].date || "").slice(0, 10),
            maDoiTac: trxsToConfirm[0].partnerId || "",
            doiTac: trxsToConfirm[0].partnerName || "",
            taiBoi: currentUserProfile?.email || user || "",
          },
        );
      }
    } catch (e: any) {
      setLoading(false);
      alert("Không tải được ảnh lên kho ảnh (Cloudinary): " + (e?.message || "lỗi không rõ"));
      return;
    }

    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      ghiAnhVaoLo(batch, anhMoi);

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
          const finalDate = trx.date || now;

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

          if (lossForThisTrx > 0) {
            batch.update(doc(db, "transactions", trx.id), {
              quantity: finalTrxQty,
              originalQuantity: trx.originalQuantity || trx.quantity, // Preserve original shipped quantity
              status: "completed",
              notes:
                `${trx.notes || ""} [Hao hụt: ${lossForThisTrx} ${p?.unit || "đv"}, Lý do: ${lossReason || "Chênh lệch"}]`.trim(),
              date: finalDate,
              updatedAt: now,
            });

            /*
             * PHẦN HỤT PHẢI THÀNH GIAO DỊCH `LOSS` THẬT, không chỉ là dòng ghi
             * chú.
             *
             * Trước đây chỗ này chỉ hạ số lượng dòng xuất xuống bằng số thực
             * nhận rồi chép "[Hao hụt: ...]" vào ô ghi chú. Ghi chú là chữ —
             * không phép tính nào đọc nó. Hậu quả: bia đã ra khỏi kho thật
             * nhưng tồn kho vẫn giữ nguyên phần hụt, và báo cáo hao hụt không
             * thấy một giọt nào của đơn đi đường.
             *
             * Vì sao vẫn tách làm hai dòng chứ không giữ nguyên số cũ: dòng
             * xuất là số lên công nợ và lên hóa đơn, phải đúng bằng số đối tác
             * nhận. Phần hụt là phần mình chịu. Tách ra thì tồn kho trừ đủ cả
             * hai, còn công nợ chỉ lấy phần trên.
             *
             */
            {
              // Mã cố định theo dòng xuất: bấm xác nhận lại cũng không đẻ thêm
              // bản ghi hao hụt trùng.
              const haoId = `${trx.id}-hao-0`;
              batch.set(doc(db, "transactions", haoId), {
                id: haoId,
                date: finalDate,
                type: "LOSS",
                productId: trx.productId,
                productName: trx.productName,
                category: trx.category,
                quantity: lossForThisTrx,
                partnerId: trx.partnerId,
                partnerName: trx.partnerName,
                notes:
                  `Hao hụt đơn đi đường — không ghi công nợ · Lý do: ${lossReason || "Chênh lệch"}`.trim(),
                createdBy: user || "Guest",
                referenceGroupId: trx.referenceGroupId,
                status: "completed",
                originalQuantity: lossForThisTrx,
              } as Transaction);
            }
          } else {
            batch.update(doc(db, "transactions", trx.id), {
              status: "completed",
              date: finalDate,
              updatedAt: now,
              // Không thêm chữ gì: cột Trạng thái đã nói là đơn đã xong.
            });
          }
        }
      }

      /*
       * GHI CÁC DÒNG XUẤT XUỐNG FIRESTORE.
       *
       * Dòng này từng bị xoá nhầm (9a3de54): cả lô cập nhật được dựng đầy đủ
       * rồi vứt đi mà không ai biết. Hậu quả đúng như đã gặp — bấm xác nhận
       * xong, không có lỗi nào, nhưng đơn vẫn nằm nguyên ở Đơn đi đường, còn
       * phần hao hụt thì lại vào sổ vì nó đi bằng một lô ghi khác ở dưới.
       *
       * Có try/catch riêng để lỗi của chính lượt ghi này hiện ra kèm MÃ LỖI
       * GỐC của Firestore, không lẫn vào khối catch chung ở cuối hàm.
       */
      try {
        await batch.commit();
        // Ảnh đã ghi cùng lô: bỏ khỏi khung để bấm lại không tải lần hai.
            setAnhCho([]);
      } catch (e: any) {
        setLoading(false);
        void boTepVuaTai(anhMoi);
        alert(
          `LƯU HỎNG NGAY LÚC GHI.\n\n` +
            `Mã lỗi: ${e?.code || "(không có mã)"}\n` +
            `Nội dung: ${e?.message || String(e)}\n\n` +
            `Số dòng định ghi: ${trxsToConfirm.length}`,
        );
        return;
      }

      /*
       * ĐỌC LẠI SAU KHI GHI, ĐỂ BIẾT GHI CÓ ĂN KHÔNG.
       *
       * `writeBatch.commit()` chạy trót lọt không có nghĩa là dữ liệu đã đổi
       * đúng như mình nghĩ: khoá tài liệu sai thì `update` ném lỗi, nhưng một
       * bản ghi bị luật Firestore chặn, hoặc đang bị một lượt ghi khác đè, thì
       * lại im. Triệu chứng gặp thật: bấm xác nhận xong, đơn vẫn nằm nguyên ở
       * Đơn đi đường và không có một dòng báo lỗi nào.
       *
       * Nên đọc lại đúng những bản ghi vừa sửa và kiểm: còn cái nào
       * `in_transit` là báo thẳng ra màn hình kèm mã bản ghi, thay vì để người
       * dùng tự phát hiện sau vài ngày.
       */
      const conTreo: string[] = [];
      for (const trx of trxsToConfirm) {
        const lai = await getDoc(doc(db, "transactions", trx.id));
        const d = lai.data();
        if (!lai.exists()) {
          conTreo.push(`${trx.id} :: không còn bản ghi`);
        } else if (d?.status === "in_transit") {
          /*
           * `updatedAt` phân biệt hai nguyên nhân khác hẳn nhau: bằng đúng giờ
           * vừa ghi nghĩa là ghi CÓ ăn rồi bị một lượt ghi khác đè ngược; vẫn
           * là giờ cũ nghĩa là lệnh ghi KHÔNG hề chạm tới bản ghi này.
           */
          conTreo.push(
            `${trx.id} :: status=${d?.status} updatedAt=${d?.updatedAt || "(trống)"}`,
          );
        }
      }
      if (conTreo.length > 0) {
        setLoading(false);
        alert(
          `LƯU CHƯA ĂN — ${conTreo.length}/${trxsToConfirm.length} dòng vẫn ` +
            `còn ở trạng thái đang đi đường sau khi lưu.\n\n` +
            `Giờ vừa ghi: ${now}\n\n` +
            conTreo.slice(0, 3).join("\n") +
            (conTreo.length > 3 ? `\n… và ${conTreo.length - 3} dòng nữa` : ""),
        );
        return;
      }

      /*
       * LẬT LUÔN HAO HỤT ĐI KÈM ĐƠN NÀY SANG ĐÃ XONG.
       *
       * Hao hụt đọc từ tệp BBGN được ghi sẵn lúc nạp nhưng để `in_transit`,
       * chờ đúng lúc này. Không lật thì nó treo mãi ở trạng thái đi đường và
       * không bao giờ vào báo cáo, dù đơn đã xác nhận xong.
       *
       * Khớp theo CẢ nhóm chứng từ VÀ mặt hàng: xác nhận có thể chỉ khớp được
       * một phần mặt hàng trong đơn, và hao hụt của mặt hàng chưa khớp thì
       * phải tiếp tục chờ lượt sau.
       */
      const daXacNhan = new Set(
        trxsToConfirm
          .filter((t) => t.referenceGroupId)
          .map((t) => `${t.referenceGroupId}|${t.productId}`),
      );
      const haoChoTheo = transactions.filter(
        (t) =>
          laDongHaoHut(t) &&
          t.status === "in_transit" &&
          t.referenceGroupId &&
          daXacNhan.has(`${t.referenceGroupId}|${t.productId}`),
      );
      if (haoChoTheo.length > 0) {
        const batchHao = writeBatch(db);
        haoChoTheo.forEach((t) => {
          batchHao.update(doc(db, "transactions", t.id), {
            status: "completed",
            date: t.date,
            updatedAt: now,
          });
        });
        await batchHao.commit();
      }

      showNotification(
        `Xác nhận thành công ${trxsToConfirm.length} đơn` +
          (haoChoTheo.length > 0
            ? `, kèm ${haoChoTheo.length} dòng hao hụt`
            : "") +
          `. Còn ${selectedInTransitGroup.length - trxsToConfirm.length} đơn chưa có trên phiếu vẫn giữ nguyên.`,
      );

      setShowLossModal(false);
      setSelectedInTransitGroup(null);
      setSelectedInTransitIds([]);
      setMatchedProductIds(new Set());
      setActualReceivedQtyMap({});
      setSoThucNhanText({});
      setLossReason("");
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
    const partnerBytes = byteSize(partners);
    // Sáu bảng còn lại — bản cũ bỏ sót nên ước tính luôn thấp hơn thực tế.
    const khacBytes = byteSize([
      ...slips,
      ...soPhieu,
      ...hoaDon,
      ...anhChungTu,
      ...diemBanOverrides,
    ]);
    const usedBytes = (txBytes + partnerBytes + khacBytes) * OVERHEAD_FACTOR;
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
     * Vì sao chưa thêm limit(): tồn kho và tồn đầu/cuối kỳ đều duyệt TOÀN BỘ
     * lịch sử giao dịch. Cắt bớt dữ liệu tải về sẽ làm số tồn kho
     * sai mà không báo lỗi gì — tệ hơn hẳn việc hết hạn mức đọc. Muốn cắt được
     * thì phải chốt tồn đầu kỳ theo tháng trước, đó là một thay đổi thiết kế.
     *
     * Con số dưới đây để biến rủi ro vô hình thành cái nhìn thấy được: khi nó
     * đỏ lên là lúc phải làm việc đó, đừng đợi app trắng dữ liệu mới biết.
     */
    const FREE_READS_PER_DAY = 50000;
    // Mở app là đọc TRỌN tám bảng — bản cũ chỉ cộng ba.
    const docsPerAppOpen =
      transactions.length +
      partners.length +
      slips.length +
      soPhieu.length +
      hoaDon.length +
      anhChungTu.length +
      diemBanOverrides.length +
      allUserProfiles.length;
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
  }, [transactions, partners, slips, soPhieu, hoaDon, anhChungTu, diemBanOverrides, allUserProfiles]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };


  /**
   * DUYET SO LIEU BANG CHU KY GIAY
   *
   * Mot phieu duoc coi la DA DUYET khi da co anh to phieu ky tuoi. Trang thai
   * nay SUY RA tu bang anh chung tu (src/anh), khong luu them co nao tren tung giao dich - nho vay
   * khong bao gio lech hai nguon, va vua tai anh ky xong la ca loat giao dich
   * cua phieu do doi trang thai cung luc.
   *
   * Hang thuoc phieu chua ky thi CHUA VAO TON: khong cong vao ton kho, khong
   * len bao cao, va khong xuat ban duoc (vi phep kiem du hang o handleAddTransaction
   * doc `inventory`, ma `inventory` chi tinh tu `countedTransactions`).
   */
  const phieuCoAnhKy = useMemo(() => phieuDaCoAnhKy(anhChungTu), [anhChungTu]);
  const approvedSlips = useMemo(
    () => phieuDaVaoTon(slips, phieuCoAnhKy),
    [slips, phieuCoAnhKy],
  );

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
  /**
   * Chứng từ đang mang dấu ĐÃ HỦY trong sổ số phiếu.
   *
   * Dựng lại từ sổ mỗi lần chứ không lưu cờ vào từng giao dịch, nên phiếu hủy
   * từ trước cũng tự đúng theo — xem `src/lib/phieuHuy.ts`.
   */
  const nguonDaHuy = useMemo(() => nguonPhieuDaHuy(soPhieu), [soPhieu]);

  /*
   * Giao dịch CÒN HIỆU LỰC — bỏ mọi dòng thuộc chứng từ đã hủy trong sổ số
   * phiếu. Công nợ, hoá đơn, kế hoạch vs thực xuất, vỏ keg phải dùng bản này:
   * phiếu xuất đã hủy mà vẫn lên sheet Chốt là tính tiền khách cho hàng không
   * giao. Tab Lịch sử / nhật ký phiếu vẫn dùng `transactions` thô để tra lại.
   */
  const giaoDichConHieuLuc = useMemo(
    () => boGiaoDichPhieuDaHuy(transactions, nguonDaHuy),
    [transactions, nguonDaHuy],
  );

  const countedTransactions = useMemo(
    () =>
      boGiaoDichPhieuDaHuy(
        stockTransactions(transactions, approvedSlips),
        nguonDaHuy,
      ),
    [transactions, approvedSlips, nguonDaHuy],
  );








  // Derived State: Batches (Tracking stock per batch) - OPTIMIZED O(N)
  /**
   * TỒN KHO THEO MẶT HÀNG — nguồn duy nhất cho mọi con số tồn.
   *
   * Thay cho bảng tồn theo lô cũ. Khác biệt đáng nói: bảng theo lô BỎ QUA mọi
   * giao dịch không có số lô, nên một dòng
   * nhập hay xuất thiếu lô thì tồn kho không hề đổi mà không có gì báo. Tính
   * thẳng theo mặt hàng thì mọi dòng đều được tính — đúng như bảng nhập · xuất
   * · tồn vẫn làm từ trước (`dungBangTonKy`), nên hai chỗ hết lệch nhau.
   *
   * Dùng chung `dauCuaLoai` với `tonKho.ts` để không có hai bản phân loại
   * tăng/giảm sống song song rồi trôi khỏi nhau.
   *
   * Hàng đang đi đường VẪN trừ: bia rời kho là rời kho.
   */
  const tonTheoMatHang = useMemo(() => {
    const m = new Map<string, number>();
    countedTransactions.forEach((t) => {
      const dau = dauCuaLoai(t.type);
      if (!dau || !t.productId) return;
      m.set(
        t.productId,
        (m.get(t.productId) || 0) + dau * (Number(t.quantity) || 0),
      );
    });
    return m;
  }, [countedTransactions]);

  const tonTheoLo = useMemo(
    () => tinhTonTheoLo(countedTransactions, products),
    [countedTransactions, products],
  );

  // AUTO-FILL FIFO SUGGESTION
  useEffect(() => {
    if (activeTab === "export" && !loading) {
      const currentItems = newTransaction.items;
      let hasChange = false;

      const updatedItems = currentItems.map((item) => {
        if (!item.productId) return item;
        const product = products.find((p) => p.id === item.productId);
        if (!product) return item;

        // Không còn theo dõi theo lô nên không gợi ý lô nào nữa.
        return item;
      });

      if (hasChange) {
        setNewTransaction((prev) => ({ ...prev, items: updatedItems }));
      }
    }
  }, [activeTab, loading, products]);

  /*
   * Đặt sẵn nhà cung cấp cho tab Nhập kho.
   *
   * CHỈ ĐẶT NHÀ CUNG CẤP, KHÔNG ĐỘNG VÀO `type`. Trước đây chỗ này gán kèm
   * `type: "IN"`, và nó xoá mất lựa chọn "Tồn đầu kỳ" của người dùng: `partners`
   * là dữ liệu realtime, nên mỗi lần danh mục đối tác có thay đổi là hiệu ứng
   * chạy lại. Ai vừa chọn Tồn đầu kỳ xong mà đúng lúc đó danh mục cập nhật thì
   * thấy ô tự nhảy về Nhập kho. Nặng nhất là lần mở app đầu tiên: lúc dựng
   * `newTransaction`, `donVi` còn rỗng nên `partnerId` là chuỗi trống; danh mục
   * về sau vài giây, hiệu ứng chạy, và lựa chọn vừa bấm bị đè.
   *
   * Không cần gán `type` ở đây: giá trị dựng ban đầu đã là "IN", và sau mỗi lần
   * lưu thành công form cũng được đặt lại về "IN".
   */
  /**
   * Người dùng CHỦ Ý chọn "Trả bia về nhà máy" ở form xuất — khác với SKB-BNC
   * SÓT LẠI từ form nhập (cái đó phải xoá trắng, không thì phiếu xuất âm thầm
   * thành trả nhà máy).
   */
  const traVeNhaMayRef = useRef(false);
  useEffect(() => {
    if (activeTab !== "export") traVeNhaMayRef.current = false;
  }, [activeTab]);

  useEffect(() => {
    if (
      (activeTab === "xuong" || activeTab === "ql-xuong") &&
      newTransaction.type === "IN"
    ) {
      // Nhà máy nguồn hàng lấy từ danh mục ghép SKB-BNC khi nhập lẻ trong Xưởng.
      const skb = donVi.find((p) => p.id === "SKB-BNC" || p.name === "SKB-BNC");
      if (skb && newTransaction.partnerId !== skb.id) {
        setNewTransaction((prev) => ({
          ...prev,
          partnerId: skb.id,
        }));
      }
    } else if (activeTab === "export") {
      // Sang Xuất kho mà còn giữ nhà cung cấp (SKB-BNC) từ form nhập thì xoá
      // trắng: ô chọn chỉ liệt kê đơn vị nhận, giữ giá trị cũ thì ô HIỆN đơn vị
      // đầu danh sách nhưng lưu vẫn là SKB-BNC → công nợ ghi nhầm cho nhà máy.
      // Chủ ý chọn "Trả bia về nhà máy" thì giữ — xem `traVeNhaMayRef`.
      const cu = donVi.find((p) => p.id === newTransaction.partnerId);
      if (cu?.type === "SUPPLIER" && !traVeNhaMayRef.current) {
        setNewTransaction((prev) => ({ ...prev, partnerId: "" }));
      }
    }
  }, [activeTab, newTransaction.type, partners, newTransaction.partnerId]);

  /**
   * Mốc cuối của khoảng ngày báo cáo, tính tới HẾT ngày đó.
   *
   * `parseISO("2026-08-31")` ra 00:00 sáng, so bằng `<=` thì mất sạch giao
   * dịch trong chính ngày cuối — người dùng chọn "đến 31/08" mà không thấy đơn
   * ngày 31 thì tưởng mất dữ liệu.
   */
  const reportHetNgayDen = useMemo(
    () => (reportDenNgay ? endOfDay(parseISO(reportDenNgay)) : null),
    [reportDenNgay],
  );

  /** Câu mô tả kỳ báo cáo, dùng chung cho màn hình và tiêu đề tệp Excel. */
  const moTaKyBaoCao = useMemo(() => {
    const ten = (iso: string) => format(parseISO(iso), "dd/MM/yyyy");
    if (reportTuNgay && reportDenNgay)
      return `${ten(reportTuNgay)} — ${ten(reportDenNgay)}`;
    if (reportTuNgay) return `Từ ${ten(reportTuNgay)}`;
    if (reportDenNgay) return `Đến hết ${ten(reportDenNgay)}`;
    return "Toàn bộ dữ liệu";
  }, [reportTuNgay, reportDenNgay]);

  const filteredTransactionsForReport = useMemo(() => {
    const pq = reportPartnerSearch.toLowerCase().trim();

    // Bao cao phai khop voi ton kho, nen cung bo hang chua co anh phieu ky.
    // De lot vao day thi cot "Tong Nhap" se cao hon "Ton cuoi" mot cach khong
    // giai thich duoc, va file Excel xuat ra cung sai theo.
    let filtered = countedTransactions;

    if (reportTuNgay) {
      const tu = startOfDay(parseISO(reportTuNgay));
      filtered = filtered.filter((t) => parseISO(t.date) >= tu);
    }

    if (reportHetNgayDen) {
      filtered = filtered.filter((t) => parseISO(t.date) <= reportHetNgayDen);
    }

    if (pq) {
      filtered = filtered.filter((t) =>
        t.partnerName?.toLowerCase().includes(pq),
      );
    }

    return filtered;
  }, [
    countedTransactions,
    reportTuNgay,
    reportHetNgayDen,
    reportPartnerSearch,
  ]);

  /*
   * SỐ PHIẾU NGAY TRÊN BÁO CÁO NHẬP / XUẤT — thay cho màn hình Sổ số phiếu
   * riêng (bỏ 21/10/2026). Xem `src/lib/soPhieuBaoCao.ts`.
   */
  const bangSo = useMemo(() => bangSoPhieu(soPhieu), [soPhieu]);
  const chuaCoSoBaoCao = useMemo(
    () =>
      chungTuChuaCoSo(
        filteredTransactionsForReport.filter((t) =>
          reportSubTab === "in" ? trongNhatKyNhap(t) : trongNhatKyXuat(t),
        ),
        soPhieu,
      ),
    [filteredTransactionsForReport, soPhieu, reportSubTab],
  );
  const [dangCapSo, setDangCapSo] = useState(false);
  const capSoTrongBaoCao = async () => {
    if (!chuaCoSoBaoCao.length || dangCapSo) return;
    if (
      !window.confirm(
        `Cấp số phiếu cho ${chuaCoSoBaoCao.length} chứng từ chưa có số trong kỳ đang xem?\n\n` +
          "Cấp theo thứ tự ngày, từ cũ tới mới. Số đã cấp là cố định, không đổi.",
      )
    )
      return;
    setDangCapSo(true);
    try {
      await handleCapBuSoPhieu(chuaCoSoBaoCao);
    } finally {
      setDangCapSo(false);
    }
  };

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
        /**
         * Hao hụt / hư hại trong kỳ. ĐỨNG RIÊNG, không nằm trong `out`.
         *
         * `out` là số ghi công nợ cho đối tác và lên hóa đơn; hao hụt là phần
         * mình chịu. Gộp chung thì người đọc báo cáo lấy cột Xuất đi đối chiếu
         * công nợ sẽ đòi đối tác trả tiền cả phần mình làm mất.
         *
         * Quan hệ giữa các cột: tồn cuối = tồn đầu + nhập − xuất − hao hụt.
         */
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
      // Đang đi đường thì chưa tính — hao hụt đi kèm đơn cũng vậy, nên chặn
      // theo TRẠNG THÁI chứ không theo loại.
      if (t.status === "in_transit") return;

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
        } else if (t.type === "LOSS" || t.type === "DAMAGE") {
          /*
           * HAO HỤT KHÔNG CỘNG VÀO CỘT XUẤT.
           *
           * Cột Xuất là số ghi công nợ cho đối tác, phải đúng bằng số trên
           * biên bản hai bên ký. Hao hụt là phần mình chịu — cộng vào đó là
           * đòi đối tác trả tiền cả phần mình làm mất.
           *
           * Giá trị cũng không cộng: hao hụt không sinh ra đồng doanh thu nào.
           */
          entry.loss += Number(t.quantity || 0);
        } else {
          entry.out += Number(t.quantity || 0);
          entry.outValue += Number(t.quantity || 0) * price;
        }
      }
    });

    // 2. Calculate Closing Stock (Stock at the end of period)
    /*
     * Tồn cuối tính trên TOÀN BỘ sổ, không phải trên phần đã lọc theo ngày:
     * hàng nhập trước khoảng ngày vẫn đang nằm trong kho. Chỉ chặn ở mốc cuối
     * — đúng nghĩa "tồn tại thời điểm ngày đến".
     */
    countedTransactions.forEach((t) => {
      // Don't subtract from closing stock if it's still in transit
      if (t.status === "in_transit") return;

      const entry = summaryMap.get(t.productId);
      if (entry) {
        const transDate = parseISO(t.date);
        // Không chọn ngày đến thì tồn cuối là tồn hiện tại.
        const isBeforeOrAtEnd =
          !reportHetNgayDen || transDate <= reportHetNgayDen;

        if (isBeforeOrAtEnd) {
          const multiplier = t.type === "IN" || t.type === "OPENING" ? 1 : -1;
          entry.closingStock += multiplier * t.quantity;
        }
      }
    });

    /*
     * 3. TỒN ĐẦU KỲ tính ngược từ tồn cuối.
     *
     *     tồn cuối = tồn đầu + nhập − xuất − hao hụt
     *   → tồn đầu  = tồn cuối − nhập + xuất + hao hụt
     *
     * PHẢI CỘNG CẢ `loss`. Tồn cuối ở bước 2 đã trừ hao hụt rồi (hàng mất là
     * mất thật), nên nếu chỉ cộng lại `out` thì tồn đầu thiếu đúng bằng phần
     * hao hụt, và bảng không còn cân — người đọc cộng tay theo đúng công thức
     * trên sẽ ra lệch mà không hiểu vì sao.
     *
     * Trước đây `out` bao gộp cả hao hụt nên chỉ cần `+ entry.out`; nay hai
     * cột tách nhau thì phép tính này phải tách theo.
     */
    summaryMap.forEach((entry) => {
      entry.openingStock =
        entry.closingStock - entry.in + entry.out + entry.loss;
    });

    return Array.from(summaryMap.values());
  }, [
    filteredTransactionsForReport,
    countedTransactions,
    products,
    reportHetNgayDen,
  ]);

  const baoCaoKegDVTV = useMemo(
    () =>
      tongHopGiaoKegVaHaoHutDVTV({
        transactions: filteredTransactionsForReport,
        products,
        partners: donVi,
      }),
    [filteredTransactionsForReport, products, donVi],
  );

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

    // 2. Cộng tồn theo từng mặt hàng.
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    tonTheoMatHang.forEach((ton, productId) => {
      const item = invMap.get(productId);
      const product = productMap.get(productId);
      if (item && product) {
        item.stock += ton;
        const units = ton * (product.conversionFactor || 1);
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
  }, [tonTheoMatHang, products, transactions, approvedSlips]);

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

    /*
     * XUẤT CHO NHÀ CUNG CẤP = TRẢ BIA VỀ NHÀ MÁY. Chỉ hợp lệ khi đi theo đơn
     * đi đường: đơn chỉ hoàn tất khi kho tổng chụp ẢNH xác nhận trả bia lên
     * (bước xác nhận bắt buộc có ảnh). Lưu thẳng "đã giao" thì không có ảnh
     * nào — chặn. Hàng trả về nhà máy không lên công nợ (`dungBangCongNo`).
     */
    if (type === "OUT" && par?.type === "SUPPLIER" && !newTransaction.isInTransit) {
      alert(
        `Xuất cho "${par.name}" là TRẢ BIA VỀ NHÀ MÁY.

Phải lưu dạng "Đơn đi đường", rồi kho tổng chụp ảnh xác nhận trả bia lên ở bước xác nhận đơn thì mới hoàn tất.`,
      );
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

    if (type === "OUT") {
      // Cộng dồn theo MẶT HÀNG: cùng một mặt hàng ở hai dòng thì phải đủ tồn
      // cho tổng hai dòng, không phải từng dòng một.
      const canTheoMatHang = new Map<string, number>();
      validItems.forEach((it) =>
        canTheoMatHang.set(
          it.productId,
          (canTheoMatHang.get(it.productId) || 0) +
            Number(it.quantity) +
            (Number(it.lossQuantity) || 0),
        ),
      );
      for (const item of validItems) {
        const currentItem = inventory.find(
          (i) => i.productId === item.productId,
        );
        const canDung = canTheoMatHang.get(item.productId) || 0;
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

    /*
     * PHIẾU NHẬP KÝ ĐIỆN TỬ (bỏ in giấy 20/11/2026): người nhập là NGƯỜI TRÌNH
     * — ký ngay lúc lưu (chữ ký mẫu + PIN). Phiếu đi tiếp Quản lý xưởng (Rào 1)
     * rồi Kho tổng (Rào 2) ký; Kho tổng ký xong hàng mới vào tồn.
     */
    let mauTrinh: ChuKyMau | null = null;
    if (type === "IN") {
      const tongNhap = validItems.reduce((t, it) => t + (Number(it.quantity) || 0), 0);
      mauTrinh = await xinKy({
        tieuDe: "Trình phiếu nhập kho",
        vaiTro: "Người trình",
        noiDung: [
          `Phiếu nhập ngày ${isoSangVn((newTransaction.date || "").slice(0, 10))} · ${par?.name || ""}`,
          ...validItems.map((it) => {
            const p = products.find((x) => x.id === it.productId);
            return `${p?.name || it.productId}: ${formatNumber(Number(it.quantity) || 0)} ${p?.unit || ""}`;
          }),
          `Tổng ${formatNumber(tongNhap)} · ${validItems.length} dòng`,
        ],
      });
      if (!mauTrinh) return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const referenceGroupId = `multi-${Date.now()}`;
      // Ngày người dùng chọn + giờ hiện tại theo giờ VN — xem `ngayGioDiaPhuong`.
      const transactionDate = newTransaction.date?.includes("T")
        ? newTransaction.date
        : ngayGioDiaPhuong(newTransaction.date);

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
      /*
       * Mã đề xuất từ dữ liệu trên máy, rồi GIỮ CHỖ trên máy chủ: hai người
       * cùng lưu một lúc không ra trùng mã — xem `giuMaPhieuNhap`.
       */
      const ngayPhieu = format(new Date(transactionDate), "yyyy-MM-dd");
      const slipCode =
        type === "IN"
          ? await giuMaPhieuNhap(
              db,
              ngayPhieu,
              nextSlipCode(ngayPhieu, [
                ...slips.map((s) => s.code),
                ...transactions.map((t) => t.slipCode),
                ...soPhieu.map((g) => g.soPhieu),
              ]),
              user || "Guest",
            )
          : undefined;


      /*
       * Mã giao dịch phải KHÁC NHAU giữa các dòng. Cả vòng lặp chạy trong cùng
       * một mili-giây nên `Date.now()` trùng; hai dòng cùng mặt hàng mà mã chỉ
       * gồm `Date.now()-productId` thì dòng sau GHI ĐÈ dòng trước — mất hàng.
       * Gắn thêm số thứ tự dòng `d{n}`.
       *
       * Lô đã chia cho dòng trước được trừ ra trước khi chia FIFO cho dòng
       * sau, không thì hai dòng cùng rút một lô quá tồn của lô.
       */
      const daChiaTheoLo = new Map<string, number>();
      const khoaLo = (pid: string, lo: string) => `${pid}|${lo}`;
      for (const [itemIdx, item] of validItems.entries()) {
        const p = products.find((prod) => prod.id === item.productId);
        if (!p) continue;

        if (type === "OUT") {
          const itemQty = Number(item.quantity);
          const tonLoConLai = daChiaTheoLo.size
            ? tonTheoLo.map((l) => ({
                ...l,
                closing:
                  l.closing - (daChiaTheoLo.get(khoaLo(l.productId, l.batchNumber)) || 0),
              }))
            : tonTheoLo;
          const fifoAllocs = item.batchNumber?.trim()
            ? [{ batchNumber: item.batchNumber.trim(), quantity: itemQty }]
            : goiYLoFIFO(tonLoConLai, p.id, itemQty);
          const totalAllocated = fifoAllocs.reduce((s, a) => s + a.quantity, 0);
          const allocations =
            fifoAllocs.length > 0 && Math.abs(totalAllocated - itemQty) < 0.001
              ? fifoAllocs
              : [{ batchNumber: fifoAllocs[0]?.batchNumber || "", quantity: itemQty }];

          allocations.forEach((alloc, allocIdx) => {
            if (alloc.batchNumber) {
              const k = khoaLo(p.id, alloc.batchNumber);
              daChiaTheoLo.set(k, (daChiaTheoLo.get(k) || 0) + alloc.quantity);
            }
            const transactionId = `split-${Date.now()}-d${itemIdx}-${item.productId}-${allocIdx}`;
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
                  ? `[Món ${validItems.indexOf(item) + 1}/${validItems.length}] ${newTransaction.notes}`
                  : newTransaction.notes,
              createdBy: user || "Guest",
              referenceGroupId: referenceGroupId,
              status: newTransaction.isInTransit ? "in_transit" : "completed",
              originalQuantity: alloc.quantity,
              ...(alloc.batchNumber ? { batchNumber: alloc.batchNumber } : {}),
            };
            batch.set(doc(db, "transactions", transactionId), transaction);
          });

          const hao = Number(item.lossQuantity) || 0;
          if (hao > 0) {
            {
              const haoId = `hao-${Date.now()}-d${itemIdx}-${p.id}-0`;
              batch.set(doc(db, "transactions", haoId), {
                id: haoId,
                date: transactionDate,
                type: "LOSS",
                productId: p.id,
                productName: p.name,
                category: p.category,
                quantity: hao,
                partnerId: par?.id || "",
                partnerName: par?.name || "",
                notes: (`Hao hụt — không ghi công nợ · ${newTransaction.notes}`).trim().replace(/ · $/, ""),
                createdBy: user || "Guest",
                referenceGroupId,
                status: newTransaction.isInTransit
                  ? "in_transit"
                  : "completed",
                ...(allocations[0]?.batchNumber
                  ? { batchNumber: allocations[0].batchNumber }
                  : {}),
              } as Transaction);
            }
          }
        } else {
          const transactionId =
            itemIdx === 0
              ? `trx-${Date.now()}-${item.productId}`
              : `trx-${Date.now()}-d${itemIdx}-${item.productId}`;
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
            createdBy: user || "Guest",
            referenceGroupId: referenceGroupId,
            // Chi hang nhap tay moi can chu ky. Ton dau ky khong co luot giao
            // nhan nao de hai ben ky nen khong gan ma phieu -> vao ton ngay.
            ...(slipCode ? { slipCode } : {}),
            ...(type === "IN" && item.batchNumber?.trim()
              ? { batchNumber: item.batchNumber.trim() }
              : {}),
          };
          batch.set(doc(db, "transactions", transactionId), transaction);
        }
      }

      if (type === "IN" && slipCode && mauTrinh) {
        const ngayPhieu = transactionDate.slice(0, 10);
        const bam = await bamSha256(
          noiDungPhieuNhap(
            slipCode,
            ngayPhieu,
            validItems.map((it) => ({ productId: it.productId, quantity: Number(it.quantity) })),
          ),
        );
        batch.set(doc(db, "slips", slipCode), {
          id: slipCode,
          code: slipCode,
          date: ngayPhieu,
          status: "cho_ql_xuong",
          note: newTransaction.notes || "",
          creatorSig: taoChuKy(slipCode, "NGUOI_TRINH", mauTrinh, bam),
          createdAt: new Date().toISOString(),
          createdBy: mauTrinh.ten,
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();

      /*
       * CẤP SỐ PHIẾU — SAU KHI CHỨNG TỪ ĐÃ LƯU XONG, KHÔNG CẤP TRƯỚC.
       *
       * Cấp trước rồi lưu hỏng thì sổ có một số trỏ vào chỗ trống, đúng cái
       * "nhảy số" mà kiểm toán hỏi đầu tiên. Cấp sau thì tệ nhất là chứng từ
       * tạm thời chưa có số, và Báo cáo Nhập / Xuất có nút cấp bù.
       *
       * Cũng vì vậy lỗi ở đây KHÔNG làm hỏng cả lần lưu: hàng đã vào sổ kho
       * rồi, bắt người dùng nhập lại từ đầu chỉ để lấy một con số là tệ hơn.
       *
       * Tồn đầu kỳ (`OPENING`) không cấp số: nó là số dư mang sang, không có
       * lượt giao nhận nào để in ra một tờ phiếu.
       */
      let soPhieuVuaCap = "";
      try {
        if (type === "IN" && slipCode) {
          const g = await capSoPhieu(db, {
            loai: "NHAP",
            documentDate: transactionDate.slice(0, 10),
            // Sổ ghi ĐÚNG mã phiếu, không cấp thêm số thứ hai.
            soPhieu: slipCode,
            nguon: slipCode,
            donVi: par?.name || "",
            soDong: validItems.length,
            soLuong: validItems.reduce(
              (t, it) => t + (Number(it.quantity) || 0),
              0,
            ),
            createdBy: user || "Guest",
          });
          soPhieuVuaCap = g.soPhieu;
        } else if (type === "OUT") {
          const g = await capSoPhieu(db, {
            loai: "XUAT",
            documentDate: transactionDate.slice(0, 10),
            nguon: referenceGroupId,
            donVi: par?.name || "",
            soDong: validItems.length,
            // Cộng cả hao hụt: hàng ra khỏi kho là cả hai phần, và tờ phiếu
            // giấy cũng ghi cả hai.
            soLuong: validItems.reduce(
              (t, it) =>
                t +
                (Number(it.quantity) || 0) +
                (Number(it.lossQuantity) || 0),
              0,
            ),
            createdBy: user || "Guest",
          });
          soPhieuVuaCap = g.soPhieu;
        }
      } catch (e) {
        console.error("Cap so phieu that bai", e);
        alert(
          `Đã lưu chứng từ, nhưng CHƯA CẤP ĐƯỢC SỐ PHIẾU.\n\n${
            e instanceof Error ? e.message : String(e)
          }\n\nVào Báo cáo tổng hợp → Báo cáo Nhập / Xuất, bấm "Cấp số phiếu" để cấp bù.`,
        );
      }

      const inTransit = newTransaction.isInTransit;

      // Tạo phiếu nhập lẻ xong -> giữ hoặc đưa về tab Xưởng / Quản lý xưởng
      // nơi Nhật ký phiếu & chứng từ đã được tích hợp trực tiếp ở Tab 1.
      if (slipCode) {
        if (activeTab !== "xuong" && activeTab !== "ql-xuong") {
          setActiveTab(
            quyen.lapPhieuXuong
              ? "xuong"
              : quyen.duyetXuong
                ? "ql-xuong"
                : "reports",
          );
        }
      } else if (inTransit) {
        setActiveTab("in-transit");
      } else if (activeTab !== "xuong" && activeTab !== "ql-xuong") {
        setActiveTab("reports");
      }
      // Form về mặc định (SKB-BNC) — đó là giá trị SÓT, không phải chủ ý trả nhà máy.
      traVeNhaMayRef.current = false;
      setNewTransaction({
        type: "IN",
        partnerId:
          donVi.find((p) => p.id === "SKB-BNC" || p.name === "SKB-BNC")?.id ||
          donVi[0]?.id ||
          "",
        notes: "",
        date: format(new Date(), "yyyy-MM-dd"),
        isInTransit: false,
        items: [
          { productId: products[0]?.id || "", quantity: 0 },
        ],
      });

      setLoading(false);
      showNotification(
        slipCode
          ? `Đã ký trình phiếu ${soPhieuVuaCap || slipCode} — chờ Quản lý xưởng (Rào 1) rồi Kho tổng (Rào 2) ký, Kho tổng ký xong hàng mới vào tồn`
          : soPhieuVuaCap
            ? `Đã lưu, số phiếu ${soPhieuVuaCap}`
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

  /* ---------------- Chữ ký điện tử ---------------- */

  const mauCuaToi = useMemo(
    () => mauMoiNhat(chuKyMau, auth.currentUser?.uid || ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chuKyMau, user],
  );
  const chuKyMauTheoId = useMemo(
    () => new Map(chuKyMau.map((m) => [m.id, m])),
    [chuKyMau],
  );

  /** Lưu chữ ký mẫu MỚI (bất biến — đổi chữ ký là thêm mẫu). */
  const handleLuuChuKyMau = async (net: string, rong: number, cao: number): Promise<boolean> => {
    const u = auth.currentUser;
    if (!u) return false;
    const ten = (currentUserProfile?.name || u.displayName || "").trim();
    try {
      await setDoc(doc(db, "chu_ky_mau", idChuKyMau(u.uid)), {
        uid: u.uid,
        email: u.email || "",
        ten,
        net,
        rong,
        cao,
        bam: await bamSha256(`${ten}|${net}`),
        taoLuc: new Date().toISOString(),
      });
      showNotification("Đã lưu chữ ký — dùng cho các lần ký từ giờ");
      return true;
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "chu_ky_mau"));
      return false;
    }
  };

  /**
   * Nhập lại PIN lúc ký. Đọc hồ sơ trên máy chủ (bộ đếm sai, khoá) như màn
   * khoá PIN: sai thì cộng bộ đếm, sai 5 lần là khoá PIN và đăng xuất.
   * Trả về câu lỗi, hoặc null khi đúng.
   */
  const xacMinhPinKhiKy = async (pin: string): Promise<string | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return "Phiên đăng nhập đã hết — đăng nhập lại.";
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDocFromServer(ref);
      const hs = snap.data() as UserProfile | undefined;
      if (!hs?.pinHash) return "Tài khoản chưa đặt mã PIN.";
      if (hs.pinLocked) return "Mã PIN đang bị khoá sau 5 lần sai — đăng nhập lại Google để đặt lại.";
      if (await verifyPin(pin, uid, hs.pinHash, hs.pinSalt)) {
        if (Number(hs.pinFailCount || 0) > 0) {
          try {
            await updateDoc(ref, { pinFailCount: 0, pinLocked: false });
          } catch {
            /* không chặn việc ký */
          }
        }
        return null;
      }
      const sai = Math.min(PIN_MAX_ATTEMPTS, Math.max(0, Number(hs.pinFailCount || 0)) + 1);
      const khoa = sai >= PIN_MAX_ATTEMPTS;
      try {
        await updateDoc(ref, { pinFailCount: sai, pinLocked: khoa });
      } catch (err) {
        console.error("Khong cap nhat duoc pinFailCount:", err);
      }
      setCurrentUserProfile((p) => (p ? { ...p, pinFailCount: sai, pinLocked: khoa } : p));
      if (khoa) {
        savePinResetIntent(uid, hs.email || auth.currentUser?.email || "");
        window.setTimeout(() => void handleLogout(), 1800);
        return "Sai mã PIN 5 lần — mã PIN đã bị khoá, app sẽ đăng xuất để đặt lại.";
      }
      return `Mã PIN không đúng. Còn ${PIN_MAX_ATTEMPTS - sai} lần thử.`;
    } catch (e: any) {
      return "Không kiểm tra được mã PIN: " + (e?.message || "lỗi mạng");
    }
  };

  /**
   * Xin ký: mở hộp ký (nội dung + chữ ký mẫu + PIN). Trả về mẫu chữ ký khi
   * người dùng nhập đúng PIN, null khi huỷ. Chưa có mẫu thì mở màn đăng ký.
   */
  const xinKy = (yc: YeuCauKy): Promise<ChuKyMau | null> => {
    if (!mauCuaToi) {
      alert("Anh/chị chưa đăng ký chữ ký điện tử. Vẽ chữ ký trước, rồi bấm ký lại.");
      setMoDoiChuKy(true);
      return Promise.resolve(null);
    }
    return new Promise((xong) => setChoKy({ ...yc, xong }));
  };

  /** Dựng chữ ký điện tử ghi lên chứng từ. */
  const taoChuKy = (code: string, vaiTro: string, mau: ChuKyMau, bam: string): ChuKyDienTu => {
    const signedAt = new Date().toISOString();
    const email = currentUserProfile?.email || auth.currentUser?.email || "";
    return {
      name: mau.ten,
      email,
      uid: auth.currentUser?.uid || "",
      signedAt,
      token: taoTokenChuKy(code, vaiTro, email, signedAt),
      chuKyId: mau.id,
      bamNoiDung: bam,
      xacThuc: XAC_THUC_KY,
    };
  };

  /** Các dòng mặt hàng × số lượng của một phiếu nhập — để băm nội dung. */
  const dongCuaPhieuNhap = (code: string): DongPhieuNhap[] =>
    transactions
      .filter((t) => t.type === "IN" && t.slipCode === code)
      .map((t) => ({ productId: t.productId, quantity: Number(t.quantity) || 0 }));

  /* ---------------- Quy trình Paperless 2 Bước Rào · Kế Hoạch · Kiểm Kê FST/BBT ---------------- */

  const handleGuiPhieuXuong = async (input: {
    date: string;
    items: { productId: string; quantity: number; batchNumber: string }[];
    notes: string;
    photos: TepCho[];
    editSlipCode?: string;
  }): Promise<boolean> => {
    if (!input.items.length || !input.photos.length) return false;
    const tongGui = input.items.reduce((t, it) => t + (Number(it.quantity) || 0), 0);
    const mau = await xinKy({
      tieuDe: input.editSlipCode ? `Trình lại phiếu ${input.editSlipCode}` : "Trình phiếu bàn giao Xưởng → Kho tổng",
      vaiTro: "Người trình (Sản xuất)",
      noiDung: [
        `Phiếu ngày ${isoSangVn(input.date.slice(0, 10))} · ${input.photos.length} ảnh hiện trạng`,
        ...input.items.map((it) => {
          const p = products.find((x) => x.id === it.productId);
          return `${p?.name || it.productId}: ${formatNumber(Number(it.quantity) || 0)} ${p?.unit || ""}`;
        }),
        `Tổng ${formatNumber(tongGui)} · ${input.items.length} dòng`,
      ],
    });
    if (!mau) return false;
    const skb =
      donVi.find((p) => p.id === "SKB-BNC" || p.name === "SKB-BNC") ||
      INITIAL_PARTNERS[0];
    setLoading(true);
    let anhMoi: AnhChungTu[] = [];
    try {
      const ngayPhieu = input.date.slice(0, 10);
      const slipCode =
        input.editSlipCode ||
        (await giuMaPhieuNhap(
          db,
          ngayPhieu,
          nextSlipCode(ngayPhieu, [
            ...slips.map((s) => s.code),
            ...transactions.map((t) => t.slipCode),
            ...soPhieu.map((g) => g.soPhieu),
          ]),
          user || "Guest",
        ));

      const email = currentUserProfile?.email || user || "";
      const signerName = currentUserProfile?.name || user || "Nhân viên sản xuất";
      const nowIso = new Date().toISOString();
      const txDate = ngayGioDiaPhuong(ngayPhieu);
      const referenceGroupId = `xuong-${Date.now()}`;

      anhMoi = await taiAnhChoChungTu(
        input.photos.map((p) => p.du),
        {
          chungTu: [slipCode],
          loai: "NHAP",
          ngay: ngayPhieu,
          maDoiTac: skb?.id || "SKB-BNC",
          doiTac: skb?.name || "SKB-BNC",
          taiBoi: email,
        },
      );

      const batch = writeBatch(db);
      if (input.editSlipCode) {
        transactions
          .filter((t) => t.type === "IN" && t.slipCode === input.editSlipCode)
          .forEach((old) => batch.delete(doc(db, "transactions", old.id)));
      }

      input.items.forEach((it, idx) => {
        const p = products.find((x) => x.id === it.productId);
        if (!p) return;
        const txId = `trx-${Date.now()}-${p.id}-${idx}`;
        const tx: Transaction = {
          id: txId,
          date: txDate,
          type: "IN",
          productId: p.id,
          productName: p.name,
          category: p.category,
          quantity: Number(it.quantity),
          partnerId: skb?.id || "SKB-BNC",
          partnerName: skb?.name || "SKB-BNC",
          notes: input.notes || "Bàn giao từ Xưởng SKB sang Kho tổng",
          createdBy: signerName,
          referenceGroupId,
          slipCode,
          batchNumber: it.batchNumber.trim(),
        };
        batch.set(doc(db, "transactions", txId), tx);
      });

      ghiAnhVaoLo(batch, anhMoi);
      batch.set(
        doc(db, "slips", slipCode),
        {
          id: slipCode,
          code: slipCode,
          date: ngayPhieu,
          status: "cho_ql_xuong",
          note: input.notes || "",
          creatorSig: taoChuKy(
            slipCode,
            "SAN_XUAT",
            mau,
            await bamSha256(
              noiDungPhieuNhap(
                slipCode,
                ngayPhieu,
                input.items.map((it) => ({ productId: it.productId, quantity: Number(it.quantity) })),
              ),
            ),
          ),
          managerSig: deleteField(),
          warehouseSig: deleteField(),
          nhaySig: deleteField(),
          rejectedBy: deleteField(),
          rejectedReason: deleteField(),
          rejectedAt: deleteField(),
          updatedAt: nowIso,
        },
        { merge: true },
      );

      await batch.commit();

      if (!input.editSlipCode) {
        try {
          await capSoPhieu(db, {
            loai: "NHAP",
            documentDate: ngayPhieu,
            soPhieu: slipCode,
            nguon: slipCode,
            donVi: skb?.name || "SKB-BNC",
            soDong: input.items.length,
            soLuong: input.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
            createdBy: signerName,
          });
        } catch (err) {
          console.error("Cap so phieu xuong that bai:", err);
        }
      }

      showNotification(`Đã gửi phiếu ${slipCode} lên Quản lý xưởng duyệt (Rào 1)`);
      return true;
    } catch (e: any) {
      if (anhMoi.length) void boTepVuaTai(anhMoi);
      alert(handleFirestoreError(e, OperationType.WRITE, "slips"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Chuẩn bị ký một phiếu nhập đã có: băm nội dung HIỆN TẠI, soát chữ ký đã có
   * trên phiếu còn khớp nội dung không (khác = có người sửa sau khi ký → chặn,
   * trả lại cho người trình ký lại), rồi mở hộp ký.
   */
  const kyPhieuNhap = async (
    code: string,
    tieuDe: string,
    vaiTro: string,
  ): Promise<{ mau: ChuKyMau; bam: string } | null> => {
    const sl = slips.find((x) => x.code === code);
    const dong = dongCuaPhieuNhap(code);
    const ngay = sl?.date || code;
    const bam = await bamSha256(noiDungPhieuNhap(code, ngay, dong));
    const lech = [sl?.creatorSig, sl?.nhaySig, sl?.managerSig].filter(
      (k) => k?.bamNoiDung && k.bamNoiDung !== bam,
    );
    const tong = dong.reduce((t, d) => t + d.quantity, 0);
    // Tách nhiệm: một người không ký hai ô trên cùng một phiếu.
    const toi = auth.currentUser?.uid || "";
    const daKyO =
      toi && sl?.creatorSig?.uid === toi
        ? "Người trình"
        : toi && sl?.managerSig?.uid === toi
          ? "Quản lý xưởng (Rào 1)"
          : "";
    const mau = await xinKy({
      tieuDe,
      vaiTro,
      noiDung: [
        `Phiếu ${code} · ngày ${isoSangVn(String(ngay).slice(0, 10))}`,
        ...dong.map((d) => {
          const p = products.find((x) => x.id === d.productId);
          return `${p?.name || d.productId}: ${formatNumber(d.quantity)} ${p?.unit || ""}`;
        }),
        `Tổng ${formatNumber(tong)} · ${dong.length} dòng`,
        ...(sl?.creatorSig ? [`Người trình: ${sl.creatorSig.name}`] : []),
        ...(sl?.nhaySig ? [`Admin đã ký nháy xác nhận số: ${sl.nhaySig.name}`] : []),
      ],
      chan: lech.length
        ? `Nội dung phiếu đã THAY ĐỔI sau khi ${lech.map((k) => k!.name).join(", ")} ký — không ký được. Trả lại phiếu để người trình kiểm tra và ký lại.`
        : daKyO
          ? `Anh/chị đã ký ô "${daKyO}" của phiếu này. Mỗi người chỉ ký MỘT ô — người trình không tự duyệt, người duyệt không tự ký nhận. Nhờ người khác có quyền ký.`
          : undefined,
    });
    return mau ? { mau, bam } : null;
  };

  /**
   * KÝ NHÁY (admin): xác nhận số trên phiếu trước khi Giám sát xưởng duyệt
   * Rào 1 — để họ biết admin đã đối chiếu số rồi. Không đổi trạng thái phiếu,
   * không thay ô ký nào. Nội dung đổi sau ký nháy thì Rào 1 bị chặn.
   */
  const handleKyNhayPhieu = async (code: string) => {
    if (!isOwner) return;
    const ky = await kyPhieuNhap(code, `Ký nháy xác nhận số · ${code}`, "Ký nháy (admin xác nhận số)");
    if (!ky) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "slips", code), {
        nhaySig: taoChuKy(code, "KY_NHAY", ky.mau, ky.bam),
        updatedAt: new Date().toISOString(),
      });
      showNotification(`Đã ký nháy phiếu ${code} — Giám sát xưởng thấy anh đã xác nhận số`);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.UPDATE, "slips"));
    } finally {
      setLoading(false);
    }
  };

  const handleDuyetRao1 = async (code: string) => {
    const ky = await kyPhieuNhap(code, `Duyệt Rào 1 · ${code}`, "Quản lý xưởng (Rào 1)");
    if (!ky) return;
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "slips", code), {
        status: "cho_kho_tong",
        managerSig: taoChuKy(code, "QUAN_LY_XUONG", ky.mau, ky.bam),
        rejectedBy: deleteField(),
        rejectedReason: deleteField(),
        rejectedAt: deleteField(),
        updatedAt: nowIso,
      });
      showNotification(`Quản lý xưởng đã duyệt Rào 1 phiếu ${code} ➔ Chờ Kho tổng nhận`);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.UPDATE, "slips"));
    } finally {
      setLoading(false);
    }
  };

  const handleDuyetRao2 = async (code: string) => {
    const ky = await kyPhieuNhap(code, `Ký nhận Rào 2 · ${code}`, "Kho tổng nhận (Rào 2)");
    if (!ky) return;
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "slips", code), {
        status: "signed",
        signedAt: nowIso,
        signedBy: currentUserProfile?.email || user || ky.mau.ten,
        warehouseSig: taoChuKy(code, "NHAP_KHO", ky.mau, ky.bam),
        updatedAt: nowIso,
      });
      showNotification(`Kho tổng đã ký nhận Rào 2 phiếu ${code} — hàng chính thức vào tồn`);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.UPDATE, "slips"));
    } finally {
      setLoading(false);
    }
  };

  const handleTraLaiPhieu = async (code: string, reason: string) => {
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const byName = currentUserProfile?.name || user || tenVaiTro(userRole);
      await updateDoc(doc(db, "slips", code), {
        status: "tra_lai",
        rejectedBy: byName,
        rejectedReason: reason,
        rejectedAt: nowIso,
        managerSig: deleteField(),
        warehouseSig: deleteField(),
        nhaySig: deleteField(),
        updatedAt: nowIso,
      });
      showNotification(`Đã trả lại phiếu ${code} cho Xưởng sửa lại`);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.UPDATE, "slips"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * PHÁT HÀNH KẾ HOẠCH SẢN XUẤT — nhiều mã bia, có thể nhiều ngày (lưới hoặc
   * file Excel). Mỗi (ngày × mã bia) một bản ghi id cố định → phát hành lại /
   * nạp lại là ghi đè, không ra dòng trùng. Sản lượng 0 = bỏ kế hoạch dòng đó.
   */
  const handleLuuKeHoach = async (dong: DongKeHoach[], nguon: string): Promise<boolean> => {
    const viec = lapViecGhiKeHoach(dong, keHoach);
    if (!viec.ghi.length && !viec.xoa.length) {
      showNotification(`Kế hoạch không đổi — ${viec.giuNguyen} dòng đã có y nguyên`);
      return true;
    }
    const ngay = [...new Set(dong.map((d) => d.date))].sort();
    if (
      !window.confirm(
        `Phát hành kế hoạch sản xuất ngày ${ngay.map(isoSangVn).join(", ")}:\n\n` +
          `• Ghi ${viec.ghi.length} dòng mã bia\n` +
          `• Bỏ ${viec.xoa.length} dòng (sản lượng 0 hoặc bản cũ trùng)\n` +
          `• Giữ nguyên ${viec.giuNguyen} dòng\n\nTiếp tục?`,
      )
    )
      return false;
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const nguoi = currentUserProfile?.name || user || "";
      const viecGhi: ((lo: ReturnType<typeof writeBatch>) => void)[] = [
        ...viec.ghi.map((d) => (lo: ReturnType<typeof writeBatch>) => {
          const id = idKeHoach(d.date, d.productId);
          const cu = keHoach.find((k) => k.id === id);
          lo.set(doc(db, "ke_hoach_sx", id), {
            id,
            date: d.date,
            productId: d.productId,
            targetQty: d.targetQty,
            note: d.note,
            source: nguon,
            createdBy: cu?.createdBy || nguoi,
            createdAt: cu?.createdAt || nowIso,
            updatedAt: nowIso,
            updatedBy: nguoi,
          } as KeHoachSanXuat);
        }),
        ...viec.xoa.map((id) => (lo: ReturnType<typeof writeBatch>) =>
          lo.delete(doc(db, "ke_hoach_sx", id)),
        ),
      ];
      for (let i = 0; i < viecGhi.length; i += 400) {
        const lo = writeBatch(db);
        viecGhi.slice(i, i + 400).forEach((f) => f(lo));
        await lo.commit();
      }
      showNotification(
        `Đã phát hành kế hoạch: ghi ${viec.ghi.length}, bỏ ${viec.xoa.length}, giữ nguyên ${viec.giuNguyen} dòng`,
      );
      return true;
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "ke_hoach_sx"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLuuDanhGia = async (
    dg: Omit<DanhGiaSanXuat, "id" | "createdBy" | "createdAt">,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const id = `dg-${Date.now()}`;
      await setDoc(doc(db, "danh_gia_sx", id), {
        ...dg,
        id,
        createdBy: currentUserProfile?.name || user || "",
        createdAt: new Date().toISOString(),
      } as DanhGiaSanXuat);
      showNotification("Đã lưu đánh giá sản lượng trong ngày");
      return true;
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "danh_gia_sx"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLuuKiemKeBon = async (input: {
    month: string;
    tankId: string;
    tankGroup: "FST" | "BBT";
    productId: string;
    batchNumber: string;
    liters: number;
    statusLabel: string;
    photos: TepCho[];
  }): Promise<boolean> => {
    if (!input.photos.length) return false;
    const pBon = products.find((x) => x.id === input.productId);
    const mau = await xinKy({
      tieuDe: `Ký biên bản kiểm kê bồn ${input.tankId}`,
      vaiTro: "Người kiểm kê",
      noiDung: [
        `Kiểm kê bồn ${input.tankId} (${input.tankGroup}) · tháng ${input.month}`,
        `${pBon?.name || input.productId} · lô ${input.batchNumber || "—"}`,
        `${formatNumber(Number(input.liters) || 0)} Lít · ${input.photos.length} ảnh`,
      ],
    });
    if (!mau) return false;
    setLoading(true);
    let anhMoi: AnhChungTu[] = [];
    try {
      const id = `kk-${input.month}-${input.tankId}-${Date.now()}`;
      anhMoi = await taiAnhChoChungTu(
        input.photos.map((p) => p.du),
        {
          chungTu: [id],
          loai: "NHAP",
          ngay: `${input.month}-28`,
          maDoiTac: "SKB-BNC",
          doiTac: `Kiểm kê bồn ${input.tankId}`,
          taiBoi: currentUserProfile?.email || user || "",
        },
      );
      const batch = writeBatch(db);
      ghiAnhVaoLo(batch, anhMoi);
      batch.set(doc(db, "kiem_ke_bon", id), {
        id,
        month: input.month,
        tankId: input.tankId,
        tankGroup: input.tankGroup,
        productId: input.productId,
        batchNumber: input.batchNumber,
        liters: Number(input.liters),
        statusLabel: input.statusLabel,
        createdBy: currentUserProfile?.name || user || "",
        createdAt: new Date().toISOString(),
        nguoiLapSig: taoChuKy(
          id,
          "KIEM_KE",
          mau,
          await bamSha256(
            noiDungKiemKeBon({
              id,
              month: input.month,
              tankId: input.tankId,
              productId: input.productId,
              batchNumber: input.batchNumber,
              liters: Number(input.liters),
            }),
          ),
        ),
      } as KiemKeBon);
      await batch.commit();
      showNotification(`Đã lưu kiểm kê bồn ${input.tankId} kèm ảnh minh chứng`);
      return true;
    } catch (e) {
      if (anhMoi.length) void boTepVuaTai(anhMoi);
      alert(handleFirestoreError(e, OperationType.WRITE, "kiem_ke_bon"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLuuKiemKeKegLit = async (input: {
    date: string;
    shiftOrPeriod: string;
    location: "XUONG" | "KHO_TONG";
    items: KiemKeKegItem[];
    totalKegs: number;
    totalLiters: number;
    note: string;
    photos: TepCho[];
  }): Promise<boolean> => {
    if (!input.photos.length) return false;
    const mau = await xinKy({
      tieuDe: `Ký biên bản kiểm kê Keg & Lít · ${input.location === "XUONG" ? "Xưởng" : "Kho tổng"}`,
      vaiTro: "Người kiểm kê",
      noiDung: [
        `Kiểm kê ngày ${isoSangVn(input.date.slice(0, 10))} · ${input.shiftOrPeriod}`,
        ...input.items
          .filter((i) => i.quantity > 0)
          .map((i) => `${i.productName}: ${formatNumber(i.quantity)} ${i.unit}`),
        `Tổng ${formatNumber(input.totalKegs)} keg · ${formatNumber(input.totalLiters)} L · ${input.photos.length} ảnh`,
      ],
    });
    if (!mau) return false;
    setLoading(true);
    let anhMoi: AnhChungTu[] = [];
    try {
      const id = `kk-keg-${input.location.toLowerCase()}-${input.date}-${Date.now()}`;
      const loaiAnh =
        input.location === "KHO_TONG" && quyen.ghiXuat && !quyen.ghiNhap
          ? "XUAT"
          : "NHAP";
      anhMoi = await taiAnhChoChungTu(
        input.photos.map((p) => p.du),
        {
          chungTu: [id],
          loai: loaiAnh,
          ngay: input.date,
          maDoiTac: input.location === "XUONG" ? "SKB-XUONG" : "SKB-KHOTONG",
          doiTac:
            input.location === "XUONG"
              ? "Kiểm kê Keg & Lít Xưởng"
              : "Kiểm kê Keg & Lít Kho tổng",
          taiBoi: currentUserProfile?.email || user || "",
        },
      );
      const batch = writeBatch(db);
      ghiAnhVaoLo(batch, anhMoi);
      batch.set(doc(db, "kiem_ke_keg", id), {
        id,
        date: input.date,
        shiftOrPeriod: input.shiftOrPeriod,
        location: input.location,
        items: input.items,
        totalKegs: Number(input.totalKegs),
        totalLiters: Number(input.totalLiters),
        note: input.note,
        createdBy: currentUserProfile?.name || user || "",
        createdAt: new Date().toISOString(),
        nguoiLapSig: taoChuKy(
          id,
          "KIEM_KE",
          mau,
          await bamSha256(
            noiDungKiemKeKeg({
              id,
              date: input.date,
              location: input.location,
              shiftOrPeriod: input.shiftOrPeriod,
              totalKegs: Number(input.totalKegs),
              items: input.items,
            }),
          ),
        ),
      } as KiemKeKegLit);
      await batch.commit();
      showNotification(
        `Đã lưu kiểm kê Keg & Lít (${input.location === "XUONG" ? "Xưởng" : "Kho tổng"}) kèm ảnh có dấu ngày giờ`,
      );
      return true;
    } catch (e) {
      if (anhMoi.length) void boTepVuaTai(anhMoi);
      alert(handleFirestoreError(e, OperationType.WRITE, "kiem_ke_keg"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * KÝ DUYỆT BIÊN BẢN KIỂM KÊ (= chốt tháng): chữ ký người duyệt + PIN. Chặn
   * khi người duyệt chính là người kiểm kê, hoặc số liệu đã đổi sau khi người
   * kiểm kê ký.
   */
  const kyDuyetKiemKe = async (
    bang: "kiem_ke_bon" | "kiem_ke_keg",
    id: string,
  ): Promise<ChuKyDienTu | null> => {
    const rec: KiemKeBon | KiemKeKegLit | undefined =
      bang === "kiem_ke_bon" ? kiemKeBon.find((x) => x.id === id) : kiemKeKeg.find((x) => x.id === id);
    if (!rec) return null;
    const noiDung =
      bang === "kiem_ke_bon"
        ? noiDungKiemKeBon(rec as KiemKeBon)
        : noiDungKiemKeKeg(rec as KiemKeKegLit);
    const bam = await bamSha256(noiDung);
    const lap = rec.nguoiLapSig;
    const tomTat =
      bang === "kiem_ke_bon"
        ? (() => {
            const b = rec as KiemKeBon;
            const p = products.find((x) => x.id === b.productId);
            return [
              `Kiểm kê bồn ${b.tankId} · tháng ${b.month}`,
              `${p?.name || b.productId} · lô ${b.batchNumber || "—"}`,
              `${formatNumber(b.liters)} Lít`,
            ];
          })()
        : (() => {
            const k = rec as KiemKeKegLit;
            return [
              `Kiểm kê ${k.location === "XUONG" ? "Xưởng" : "Kho tổng"} ngày ${isoSangVn(k.date.slice(0, 10))}`,
              ...k.items
                .filter((i) => i.quantity > 0)
                .map((i) => `${i.productName}: ${formatNumber(i.quantity)} ${i.unit}`),
              `Tổng ${formatNumber(k.totalKegs)} keg · ${formatNumber(k.totalLiters)} L`,
            ];
          })();
    const mau = await xinKy({
      tieuDe: "Ký duyệt & chốt biên bản kiểm kê",
      vaiTro: "Người ký duyệt",
      noiDung: [...tomTat, `Người kiểm kê: ${lap?.name || rec.createdBy || "—"}`],
      chan:
        lap?.bamNoiDung && lap.bamNoiDung !== bam
          ? `Số liệu biên bản đã THAY ĐỔI sau khi ${lap.name} ký — không ký duyệt được. Trả lại để kiểm lại.`
          : lap?.uid && lap.uid === auth.currentUser?.uid
            ? "Anh/chị là người kiểm kê biên bản này — người kiểm kê không tự ký duyệt. Nhờ người khác có quyền ký duyệt."
            : undefined,
    });
    return mau ? taoChuKy(id, "DUYET_KIEM_KE", mau, bam) : null;
  };

  const capNhatDuyetGiamSat = async (
    bang: "danh_gia_sx" | "kiem_ke_bon" | "kiem_ke_keg",
    id: string,
    status: "approved" | "returned",
    reason?: string,
  ) => {
    const duyetSig =
      status === "approved" && bang !== "danh_gia_sx" ? await kyDuyetKiemKe(bang, id) : null;
    if (status === "approved" && bang !== "danh_gia_sx" && !duyetSig) return;
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const actor = currentUserProfile?.name || user || tenVaiTro(userRole);
      await updateDoc(doc(db, bang, id), {
        approvalStatus: status,
        approvedBy: actor,
        approvedAt: nowIso,
        rejectedReason: status === "returned" ? reason || "" : "",
        updatedAt: nowIso,
        updatedBy: actor,
        ...(bang === "danh_gia_sx" ? {} : { duyetSig: duyetSig ?? deleteField() }),
      });
      showNotification(
        status === "approved"
          ? bang === "danh_gia_sx"
            ? "Quản lý xưởng đã duyệt bản ghi giám sát"
            : "Đã ký duyệt — bản này là kiểm kê CHỐT THÁNG"
          : "Đã trả lại bản kiểm để kiểm đếm lại",
      );
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.UPDATE, bang));
    } finally {
      setLoading(false);
    }
  };

  const handleDuyetDanhGia = (id: string, status: "approved" | "returned", reason?: string) =>
    capNhatDuyetGiamSat("danh_gia_sx", id, status, reason);

  const handleDuyetKiemKeBon = (id: string, status: "approved" | "returned", reason?: string) =>
    capNhatDuyetGiamSat("kiem_ke_bon", id, status, reason);

  const handleDuyetKiemKeKeg = (id: string, status: "approved" | "returned", reason?: string) =>
    capNhatDuyetGiamSat("kiem_ke_keg", id, status, reason);

  /** Ghi một dòng sổ keg (admin, kế toán). */
  const handleThemSoKeg = async (
    d: Omit<DongSoKeg, "id" | "createdBy" | "createdAt" | "uid">,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const id = `keg-${d.ngay}-${d.loai.toLowerCase()}-${Date.now()}`;
      await setDoc(doc(db, "so_keg", id), {
        ...d,
        id,
        createdBy: currentUserProfile?.name || user || "",
        createdAt: new Date().toISOString(),
        uid: auth.currentUser?.uid || "",
      });
      showNotification("Đã ghi sổ keg");
      return true;
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.WRITE, "so_keg"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleXoaSoKeg = async (id: string) => {
    if (!isOwner || !window.confirm("Xoá dòng sổ keg ghi nhầm này?")) return;
    try {
      await deleteDoc(doc(db, "so_keg", id));
      showNotification("Đã xoá dòng sổ keg");
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "so_keg"));
    }
  };

  const handleXoaDanhGia = async (id: string) => {
    if (!window.confirm("Xoá bản đánh giá sản lượng này?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "danh_gia_sx", id));
      showNotification("Đã xoá bản đánh giá sản lượng");
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "danh_gia_sx"));
    } finally {
      setLoading(false);
    }
  };

  const handleXoaKiemKeBon = async (id: string) => {
    if (!window.confirm("Xoá bản kiểm kê bồn FST/BBT này?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "kiem_ke_bon", id));
      showNotification("Đã xoá bản kiểm kê bồn FST/BBT");
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "kiem_ke_bon"));
    } finally {
      setLoading(false);
    }
  };

  const handleXoaKiemKeKeg = async (id: string) => {
    if (!window.confirm("Xoá bản kiểm kê Keg & Lít này?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "kiem_ke_keg", id));
      showNotification("Đã xoá bản kiểm kê Keg & Lít");
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "kiem_ke_keg"));
    } finally {
      setLoading(false);
    }
  };

  /*
   * SAU KHI XOÁ LẺ: số phiếu nào không còn dòng hàng nào phía sau thì hỏi hủy
   * luôn. Không hủy thì Sổ số phiếu ghi "còn hiệu lực" cho một chứng từ rỗng.
   * Hủy theo đúng đường của sổ — sinh phiếu hủy ghi âm, số gốc vẫn nằm trong
   * sổ — chứ không xoá số. Xem `src/lib/nguonMoCoi.ts`.
   *
   * `truocXoa` phải là danh sách giao dịch TRƯỚC lần xoá (state lúc bấm).
   */
  /*
   * PHIẾU HỦY = XOÁ HẲN. Sổ số phiếu chỉ giữ ghi chú "đã hủy"; dòng hàng, tờ
   * phiếu nhập và ảnh của nó phải biến khỏi dữ liệu lẫn Cloudinary. Phiếu hủy
   * từ trước khi có quy định này còn sót dữ liệu — admin dọn bằng nút ở Báo cáo.
   */
  const conSotPhieuDaHuy = useMemo(() => {
    const dong = giaoDichConSotCuaPhieuDaHuy(transactions, nguonDaHuy);
    const phieu = slips.filter((s) => nguonDaHuy.has(s.code));
    const soPhieuHuy = new Set(
      [...dong.map((t) => (t.type === "IN" ? t.slipCode : t.referenceGroupId || t.id)), ...phieu.map((p) => p.code)].filter(Boolean),
    );
    return { dong, phieu, soPhieu: soPhieuHuy.size };
  }, [transactions, slips, nguonDaHuy]);

  const handleXoaHanPhieuDaHuy = async () => {
    if (!isOwner) return;
    const { dong, phieu, soPhieu: n } = conSotPhieuDaHuy;
    if (!dong.length && !phieu.length) return;
    const viecAnh = viecAnhCuaLuotXoa(dong, phieu);
    if (!viecAnh) return;
    if (
      !window.confirm(
        `Xoá hẳn dữ liệu của ${n} phiếu đã hủy?

` +
          `· ${dong.length} dòng hàng
· ${phieu.length} tờ phiếu nhập
· ${viecAnh.xoa.length} ảnh (xoá luôn trên Cloudinary)

` +
          "Sổ số phiếu vẫn giữ dòng ghi chú \"đã hủy\". Không khôi phục được.",
      )
    )
      return;
    try {
      setLoading(true);
      const viec = [
        ...dong.map((t) => doc(db, "transactions", t.id)),
        ...phieu.map((p) => doc(db, "slips", p.id)),
      ];
      // Firestore giới hạn 500 thao tác một lô.
      for (let i = 0; i < viec.length; i += 400) {
        const lo = writeBatch(db);
        viec.slice(i, i + 400).forEach((r) => lo.delete(r));
        await lo.commit();
      }
      const kqAnh = await lamViecAnhKhiXoa(viecAnh);
      showNotification(`Đã xoá hẳn dữ liệu ${n} phiếu đã hủy${chuAnhDaXoa(kqAnh)}`);
      baoAnhChuaXoa(kqAnh);
    } catch (e) {
      alert(handleFirestoreError(e, OperationType.DELETE, "transactions"));
    } finally {
      setLoading(false);
    }
  };

  const hoiHuySoPhieuMoCoi = async (
    xoa: Transaction[],
    truocXoa: Transaction[],
  ) => {
    const ds = soPhieuMoCoi(soPhieu, nguonMoCoi(xoa, truocXoa));
    if (!ds.length) return;
    if (
      !window.confirm(
        `Số phiếu ${ds.map((g) => g.soPhieu).join(", ")} không còn dòng hàng nào phía sau.\n\n` +
          "OK = hủy luôn (sổ sinh phiếu hủy ghi âm, số gốc vẫn giữ trong sổ)\n" +
          "Cancel = để nguyên số phiếu",
      )
    )
      return;
    const homNay = format(new Date(), "yyyy-MM-dd");
    for (const g of ds) {
      try {
        await huyPhieu(db, g.soPhieu, {
          documentDate: homNay,
          lyDo: "Xoá chứng từ",
          createdBy: user || "Guest",
        });
      } catch (e) {
        alert(
          `Chưa hủy được ${g.soPhieu}: ${e instanceof Error ? e.message : String(e)}\n\n` +
            "Thử lại sau.",
        );
        return;
      }
    }
    showNotification(`Đã hủy ${ds.length} số phiếu không còn chứng từ`);
  };

  const handleDeleteTransaction = async (id: string, productName: string) => {
    if (!isOwner) {
      alert("Chỉ anh Khoa mới có quyền xóa giao dịch ạ!");
      return;
    }
    // Tờ biên bản thường gắn chung cho cả lượt giao: chỉ báo mất khi KHÔNG còn
    // dòng nào khác dùng nó.
    const dongXoa = transactions.find((t) => t.id === id);
    /*
     * Dòng cuối cùng của một phiếu nhập thì xoá luôn tài liệu phiếu (cùng ảnh
     * ký): để lại là phiếu rỗng giữ ảnh của lô không còn tồn tại.
     */
    const moCoi = nguonMoCoi(dongXoa ? [dongXoa] : [], transactions);
    const phieuXoa = slips.filter((sl) => moCoi.phieuNhap.includes(sl.code));
    const viecAnh = viecAnhCuaLuotXoa(dongXoa ? [dongXoa] : [], phieuXoa);
    if (!viecAnh) return;
    const anhMat = viecAnh.xoa;
    if (
      !window.confirm(
        `Anh có chắc chắn muốn xóa giao dịch của sản phẩm "${productName}" này không?` +
          (phieuXoa.length > 0
            ? `\n\nĐây là dòng cuối của phiếu nhập ${phieuXoa.map((p) => p.code).join(", ")} — xoá luôn phiếu đó.`
            : "") +
          (anhMat.length > 0
            ? `\n\nXOÁ LUÔN ${anhMat.length} ảnh chỉ dòng / phiếu này dùng, trên Cloudinary.`
            : ""),
      )
    )
      return;

    const truocXoa = transactions;
    try {
      if (phieuXoa.length) {
        const batch = writeBatch(db);
        batch.delete(doc(db, "transactions", id));
        phieuXoa.forEach((sl) => batch.delete(doc(db, "slips", sl.id)));
        await batch.commit();
      } else {
        await deleteDoc(doc(db, "transactions", id));
      }
      const kqAnh = await lamViecAnhKhiXoa(viecAnh);
      showNotification(`Đã xóa giao dịch${chuAnhDaXoa(kqAnh)}`);
      baoAnhChuaXoa(kqAnh);
      if (dongXoa) await hoiHuySoPhieuMoCoi([dongXoa], truocXoa);
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

  /**
   * Tra số phiếu theo chứng từ gốc: mã phiếu nhập, hoặc `referenceGroupId` của
   * lượt xuất.
   *
   * Bỏ qua phiếu hủy — chúng dùng chung `nguon` với phiếu gốc, gộp vào bảng tra
   * thì một chứng từ tra ra số hủy thay vì số của chính nó.
   */
  const soPhieuTheoNguon = useMemo(() => {
    const m = new Map<string, string>();
    soPhieu.forEach((g) => {
      if (g?.nguon && g.soPhieu && g.loai !== "HUY_NHAP" && g.loai !== "HUY_XUAT") {
        m.set(g.nguon, g.soPhieu);
      }
    });
    return m;
  }, [soPhieu]);

  /**
   * Vai trò này làm được những gì — một nơi duy nhất, ở `src/lib/quyen.ts`.
   *
   * Trước đây `canWrite` chỉ là "đã được duyệt", vì mọi vai trò đều ghi được cả
   * hai chiều. Nay có hai vai trò một chiều nên phải hỏi riêng từng chiều.
   */
  const quyen = useMemo(() => quyenCua(vaiTroXem), [vaiTroXem]);


  /* ---------------- Bo do luot goi Firebase ---------------- */

  /*
   * MỌI MÁY ĐÃ ĐĂNG NHẬP ĐỀU GỬI BỘ ĐO LÊN — năm phút một lần, và khi tắt
   * trang. Không gửi thì admin chỉ thấy lượt gọi của chính máy mình, trong
   * khi phần lớn lượt đọc là của những người mở app ở kho. Xem `doLuong.ts`.
   */
  useEffect(() => {
    if (!user || !daDuocDuyet || !pinUnlocked) return;
    return batDauGuiDoLuong(currentUserProfile?.email || user || "");
  }, [user, daDuocDuyet, pinUnlocked, currentUserProfile?.email]);

  const [doLuong, setDoLuong] = useState<NgayDoLuong[]>([]);
  const [dangTaiDoLuong, setDangTaiDoLuong] = useState(false);
  /**
   * Đọc bộ đo của N ngày gần nhất — mỗi ngày một tài liệu, tức N lượt đọc.
   *
   * Cố ý ĐỌC THEO LẦN chứ không mở trình nghe: tài liệu hôm nay đổi mỗi lần
   * có máy gửi số lên, nghe liên tục thì chính bộ đo lại ngốn lượt đọc. Hôm nay
   * đọc lại mười phút một lần; bảy ngày chỉ đọc khi admin mở Cài đặt.
   */
  const taiDoLuong = async (soNgay: number) => {
    setDangTaiDoLuong(true);
    try {
      const ds = await Promise.all(
        cacNgayGanNhat(soNgay).map(async (ngay) => {
          const snap = await getDoc(doc(db, KHO_DO_LUONG, ngay));
          const d: any = snap.exists() ? snap.data() : {};
          return {
            ngay,
            doc: Number(d.doc) || 0,
            ghi: Number(d.ghi) || 0,
            xoa: Number(d.xoa) || 0,
            capNhat: d.capNhat,
            nguoi: d.nguoi,
          } as NgayDoLuong;
        }),
      );
      setDoLuong((cu) => {
        const m = new Map(cu.map((x) => [x.ngay, x]));
        ds.forEach((x) => m.set(x.ngay, x));
        return Array.from(m.values()).sort((a, b) => b.ngay.localeCompare(a.ngay));
      });
    } catch (e) {
      console.warn("Chua doc duoc bo do luot goi:", e);
    } finally {
      setDangTaiDoLuong(false);
    }
  };
  useEffect(() => {
    if (!user || !isOwner) return;
    void taiDoLuong(1);
    const hen = setInterval(() => void taiDoLuong(1), 10 * 60 * 1000);
    return () => clearInterval(hen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOwner]);
  useEffect(() => {
    if (isOwner && activeTab === "settings") void taiDoLuong(7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, activeTab]);
  // Nhịp vẽ lại 30 giây khi đang ở Cài đặt, để số "máy này từ lúc mở app" chạy.
  const [, setNhipDoLuong] = useState(0);
  useEffect(() => {
    if (activeTab !== "settings") return;
    const hen = setInterval(() => setNhipDoLuong((n) => n + 1), 30_000);
    return () => clearInterval(hen);
  }, [activeTab]);

  /** Tình hình hôm nay theo từng loại lượt gọi. */
  const goiHomNay = useMemo(() => {
    const hom = doLuong.find((x) => x.ngay === ngayHanMuc());
    const phut = phutDaQua();
    return (["doc", "ghi", "xoa"] as LoaiGoi[]).map((loai) => {
      const da = hom ? hom[loai] : 0;
      const moc = MOC_THAM_CHIEU[loai];
      const duBao = duBaoCuoiNgay(da, phut);
      return {
        loai,
        ten: loai === "doc" ? "Lượt đọc" : loai === "ghi" ? "Lượt ghi" : "Lượt xoá",
        da,
        moc,
        phanTram: moc ? (da / moc) * 100 : 0,
        duBao,
        muc: mucDo(Math.max(da, duBao * 0.9), moc),
      };
    });
  }, [doLuong]);
  /** Có loại nào đáng lo không — dùng cho dải cảnh báo đầu trang. */
  const canhBaoGoi = useMemo(
    () => goiHomNay.filter((g) => g.muc !== "an-toan"),
    [goiHomNay],
  );

  /** Ghi được ít nhất một chiều — dùng để bày nhóm menu Nhập · Xuất. */
  const canWrite = quyen.ghiNhap || quyen.ghiXuat;


  const pendingSlipStats = useMemo(
    () => ({
      rao1: slips.filter((s) => s.status === "cho_ql_xuong").length,
      rao2: slips.filter((s) => s.status === "cho_kho_tong").length,
      traLai: slips.filter((s) => s.status === "tra_lai").length,
    }),
    [slips],
  );

  /**
   * Menu bên trái chia rành mạch THEO BAN BỆ (tránh trùng lặp đầu mục):
   *   0. Tổng quan (Lưu chuyển & Tồn kho tổng thể)
   *   1. Xưởng sản xuất (QL Xưởng + Xưởng sản xuất — đã tích hợp Nhập lẻ & Phiếu giấy cũ bên trong)
   *   2. Kho tổng (NXT & Rào 2, Xuất kho, Đơn đi đường, Sổ kho SAP)
   *   3. Công nợ & Hóa đơn (Dashboard Kế toán, Công nợ·Hóa đơn, Đơn BNC, Đối tác)
   *   4. Tư liệu & Hệ thống (Cài đặt)
   */
  const navGroups = useMemo(() => {
    const isOwnerRole = vaiTroXem === "OWNER";
    const groups = [
      ...(quyen.xemKho
        ? [
            {
              id: "ban-tong-quan",
              title: "Tổng quan",
              items: [
                {
                  id: "overview",
                  label: "Tổng quan kho",
                  icon: PieChart,
                  color: "#f59e0b",
                  badge: 0,
                },
              ],
            },
          ]
        : []),
      {
        id: "ban-xuong",
        title: "1. Xưởng sản xuất (Đầu vào & Nhập)",
        items: [
          ...(quyen.duyetXuong
            ? [
                {
                  id: "ql-xuong",
                  label: "Quản lý xưởng",
                  icon: ClipboardList,
                  color: "#f59e0b",
                  badge: pendingSlipStats.rao1,
                },
              ]
            : []),
          ...(quyen.lapPhieuXuong
            ? [
                {
                  id: "xuong",
                  label: "Xưởng sản xuất",
                  icon: Factory,
                  color: "#fb923c",
                  badge: pendingSlipStats.traLai,
                },
              ]
            : []),
        ],
      },
      {
        id: "ban-kho-tong",
        title: "2. Kho tổng (Xuất & Đi đường)",
        items: [
          ...(quyen.xemKho
            ? [
                {
                  id: "kho-tong",
                  label: "Kho tổng (NXT & Kiểm kê)",
                  icon: Warehouse,
                  color: "#10b981",
                  badge: pendingSlipStats.rao2,
                },
              ]
            : []),
          ...(quyen.ghiXuat
            ? [
                {
                  id: "export",
                  label: "Xuất kho",
                  icon: MinusCircle,
                  color: "#f97316",
                  badge: 0,
                },
                {
                  id: "in-transit",
                  label: "Đơn đi đường",
                  icon: Truck,
                  color: "#fbbf24",
                  badge: 0,
                },
              ]
            : []),
          ...(quyen.xemKho
            ? [
                {
                  id: "reports",
                  label: "Sổ kho & Xuất SAP",
                  icon: TrendingUp,
                  color: "#f43f5e",
                  badge: 0,
                },
              ]
            : []),
        ],
      },
      {
        id: "ban-cong-no",
        title: "3. Công nợ & Hóa đơn",
        items: [
          ...(quyen.xemKeHoachDashboard
            ? [
                {
                  id: "ketoan-dashboard",
                  label: "Dashboard Kế toán",
                  icon: BarChart3,
                  color: "#38bdf8",
                  badge: 0,
                },
              ]
            : []),
          ...(quyen.xemXuat
            ? [
                {
                  id: "debt",
                  label: "Công nợ · Hóa đơn",
                  icon: Receipt,
                  color: "#14b8a6",
                  badge: 0,
                },
                {
                  id: "bnc",
                  label: "Đơn BNC",
                  icon: Building2,
                  color: "#0284c7",
                  badge: 0,
                },
                {
                  id: "partners",
                  label: "Đối tác & Điểm bán",
                  icon: Users,
                  color: "#6366f1",
                  badge: 0,
                },
              ]
            : []),
        ],
      },
      {
        id: "system",
        title: "4. Tư liệu & Hệ thống",
        items: [
          /* Danh bạ nhân viên (MySun Vp Bà Nà) — mọi vai đã duyệt. */
          {
            id: "danhba",
            label: "Danh bạ",
            icon: Contact,
            color: "#0e7490",
            badge: 0,
          },
          ...(isOwnerRole
            ? [
                {
                  id: "settings",
                  label: "Cài đặt & Phân quyền",
                  icon: ShieldCheck,
                  color: "#ef4444",
                  badge: 0,
                },
              ]
            : []),
        ],
      },
    ];

    return groups.filter((g) => g.items.length > 0);
  }, [vaiTroXem, quyen, pendingSlipStats]);

  // Danh sách phẳng — dùng cho kiểm tra quyền vào tab và tra tên tab + ban bệ đang mở
  const navItems = useMemo(
    () => navGroups.flatMap((g) => g.items),
    [navGroups],
  );

  const activeGroup = useMemo(
    () => navGroups.find((g) => g.items.some((i) => i.id === activeTab)),
    [navGroups, activeTab],
  );

  // Handle unauthorized tab access
  useEffect(() => {
    const navIds = navItems.map((i) => i.id);
    if (user && !navIds.includes(activeTab)) {
      setActiveTab(navIds[0] || "");
    }
  }, [user, activeTab, navItems]);

  const renderNhapXuatForm = (mode: "import" | "export") => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div
          className={cn(
            "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-xl",
            mode === "import"
              ? "bg-blue-600 shadow-blue-200"
              : "bg-rose-600 shadow-rose-200",
          )}
        >
          {mode === "import" ? (
            <PlusCircle className="text-white w-8 h-8" />
          ) : (
            <MinusCircle className="text-white w-8 h-8" />
          )}
        </div>
        <h2 className="text-2xl font-black text-slate-900 italic font-serif">
          GHI NHẬN{" "}
          {mode === "import"
            ? newTransaction.type === "OPENING"
              ? "TỒN ĐẦU KỲ"
              : "NHẬP KHO"
            : "XUẤT KHO"}
        </h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Hệ thống ghi nhận đa mặt hàng (Batch Processing)
        </p>
      </div>

      {mode === "export" && quyen.napFile && (
        <Card title="Nạp xuất kho từ file BBGN">
          <TkhoImport
            duocGhiNhap={quyen.ghiNhap}
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
          {mode === "import" && (
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
                  });
                }}
              />
            </div>
          )}

          <div className="md:col-span-1">
            <ONgay
              label={
                mode === "import"
                  ? newTransaction.type === "OPENING"
                    ? "Ngày chốt tồn đầu"
                    : "Ngày thực nhập"
                  : "Ngày thực xuất"
              }
              value={newTransaction.date}
              onChange={(v: string) =>
                setNewTransaction({
                  ...newTransaction,
                  date: v,
                })
              }
            />
          </div>

          <div className="md:col-span-1">
            {newTransaction.type !== "OPENING" && (
              <Select
                label={
                  mode === "import"
                    ? "Nhà cung cấp"
                    : "Đơn vị nhận (Đối tác)"
                }
                options={(() => {
                  const ds = donVi.filter((p) =>
                    mode === "import"
                      ? p.type === "SUPPLIER"
                      : p.type !== "SUPPLIER",
                  );
                  const out: { value: string; label: string }[] = [];
                  // Chưa chọn thì hiện dòng nhắc chọn, KHÔNG để trình duyệt tự
                  // hiện đơn vị đầu danh sách trong khi giá trị thật là rỗng.
                  if (mode === "export" && !newTransaction.partnerId) {
                    out.push({ value: "", label: "— Chọn đơn vị nhận —" });
                  }
                  let daChenBNC = false;
                  for (const p of ds) {
                    if (laBoPhanBNC(p.id)) {
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
                  // TRẢ BIA VỀ NHÀ MÁY: nhà cung cấp đứng cuối danh sách xuất,
                  // ghi rõ là trả về để không chọn nhầm như một khách hàng.
                  if (mode === "export") {
                    donVi
                      .filter((p) => p.type === "SUPPLIER")
                      .forEach((p) =>
                        out.push({
                          value: p.id,
                          label: `↩ Trả bia về nhà máy · ${p.name} (cần ảnh xác nhận)`,
                        }),
                      );
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
                  setNhomBNCChon("");
                  const chon = donVi.find((p) => p.id === e.target.value);
                  const traNhaMay = mode === "export" && chon?.type === "SUPPLIER";
                  traVeNhaMayRef.current = traNhaMay;
                  setNewTransaction({
                    ...newTransaction,
                    partnerId: e.target.value,
                    // Trả nhà máy luôn đi dạng đơn đi đường: chỉ hoàn tất khi
                    // kho tổng chụp ảnh xác nhận trả bia ở bước xác nhận đơn.
                    ...(traNhaMay ? { isInTransit: true } : {}),
                  });
                  if (traNhaMay) {
                    showNotification(
                      "Trả bia về nhà máy: phiếu lưu dạng Đơn đi đường — kho tổng chụp ảnh xác nhận trả bia ở bước xác nhận đơn mới hoàn tất.",
                    );
                  }
                }}
              />
            )}

            {mode !== "import" &&
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
                              dangChon ? "text-white/70" : "text-slate-400",
                            )}
                          >
                            {n.moTa}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {nhomBNCDangChon === "NB" && (
                    <>
                      <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1 pt-1">
                        Điểm bán nội bộ
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                        {donVi
                          .filter((p) => nhomCuaBoPhan(p.id) === "NB")
                          .map((p) => {
                            const dangChon = newTransaction.partnerId === p.id;
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

                  {donViThieu.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                      <p className="text-[10px] font-bold text-rose-700 leading-relaxed">
                        Danh mục đơn vị trong hệ thống thiếu{" "}
                        {donViThieu.length} mục so với danh mục chuẩn. Chọn
                        vẫn được, nhưng mã bộ phận SAP sẽ trống khi kết xuất
                        công nợ.
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

          {mode === "import" && pendingApproval.count > 0 && (
            <div className="md:col-span-2 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                  {pendingApproval.slipCount} phiếu chưa vào tồn
                </p>
                <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed">
                  {formatNumber(pendingApproval.liters)} lít đã điền nhưng{" "}
                  <strong>chưa cộng vào tồn kho</strong> và chưa xuất bán được,
                  vì phiếu chưa có ảnh chữ ký.{" "}
                  <strong>Sang mục 1. Lập phiếu / Duyệt Rào 1 &amp; Nhật ký</strong>{" "}
                  để in, hai bên ký rồi tải ảnh lên.
                </p>
                <p className="text-[10px] font-black text-amber-700/70 font-mono tracking-wide">
                  {pendingApproval.codes.slice(0, 8).join(" · ")}
                  {pendingApproval.codes.length > 8 &&
                    ` +${pendingApproval.codes.length - 8}`}
                </p>
              </div>
            </div>
          )}

          {mode === "import" && (
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
                  batchNumber: i.batchNumber,
                }))}
                onChange={(rows) =>
                  setNewTransaction((prev) => ({
                    ...prev,
                    items: rows.length
                      ? rows
                      : [{ productId: "", quantity: 0 }],
                  }))
                }
              />
            </div>
          )}

          {mode !== "import" && (
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
                          ...prev.items.filter((i) => i.productId !== ""),
                          ...missingProducts.map((p) => ({
                            productId: p.id,
                            quantity: 0,
                          })),
                        ],
                      }));
                    }}
                    className="text-[10px] font-black text-amber-600 bg-amber-50 uppercase tracking-widest flex items-center gap-1.5 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Layers className="w-3.5 h-3.5" /> Thêm toàn bộ danh mục
                  </button>
                  <button
                    onClick={() => {
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
                          availableProducts.map((p) => p.name).join(", "),
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
                              ...prev.items.filter((i) => i.productId !== ""),
                              ...matches.map((p) => ({
                                productId: p.id,
                                quantity: 0,
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
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e: any) =>
                            updateTransactionItem(index, {
                              quantity: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      {mode === "export" && (() => {
                        const sp = products.find((p) => p.id === item.productId);
                        const chuan206 = laDoiTacChuan206(newTransaction.partnerId);
                        const keg20 = item.quantity / LIT_MOI_KEG_GHI;
                        const tronKeg20 =
                          !chuan206 &&
                          sp?.category === "Lít" &&
                          item.quantity > 0 &&
                          Math.abs(keg20 - Math.round(keg20)) < 0.005;
                        const goiY = tronKeg20
                          ? Math.round(
                              Math.round(keg20) *
                                (LIT_MOI_KEG_THUC - LIT_MOI_KEG_GHI) *
                                100,
                            ) / 100
                          : 0;
                        return (
                          <div className="sm:col-span-12">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                              <div className="flex-1">
                                <Input
                                  label="Hao hụt — không ghi công nợ"
                                  type="number"
                                  placeholder="0"
                                  value={item.lossQuantity ? item.lossQuantity : ""}
                                  onChange={(e: any) =>
                                    updateTransactionItem(index, {
                                      lossQuantity: Number(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              {tronKeg20 && goiY > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTransactionItem(index, {
                                      lossQuantity: goiY,
                                    })
                                  }
                                  className="px-3.5 py-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-black whitespace-nowrap shrink-0 transition"
                                >
                                  Áp dụng chuẩn {formatNumber(goiY)} L (0,6 L/keg)
                                </button>
                              )}
                            </div>
                            <p
                              className={cn(
                                "text-[10px] font-bold mt-1.5 leading-relaxed",
                                chuan206 ? "text-sky-700" : "text-amber-700",
                              )}
                            >
                              {!item.quantity
                                ? "Điền số lượng xuất trước, app sẽ kiểm tra chuẩn Keg theo đối tác."
                                : sp?.category !== "Lít"
                                  ? "Hàng lon không có keg nên không phát sinh chênh 0,6 L/keg — điền nếu thực tế có hao hụt."
                                  : chuan206
                                    ? "Đối tác chuẩn 20,6 L/keg (BNC / FV) — mặc định không trừ bù 0,6 L/keg (chỉ điền nếu có vỡ/hỏng thực tế)."
                                    : tronKeg20
                                      ? `ĐVTV ký nhận quy ước 20 L/keg (${formatNumber(item.quantity)} L = ${Math.round(keg20)} keg), nhưng thực tế kho giao ${formatNumber(Math.round((item.quantity + goiY) * 100) / 100)} L (20,6 L/keg) → lệch ${formatNumber(goiY)} L (0,6 L/keg).`
                                      : `ĐVTV có keg lẻ (${formatNumber(item.quantity)} L — làm tròn lên ${Math.ceil(item.quantity / 20.6 - 1e-4)} keg thực tế) — anh điền hao hụt thực tế nếu có.`}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 leading-relaxed">
                              Ghi thành một dòng hao hụt riêng: tồn kho trừ cả phần
                              này, còn công nợ và hóa đơn chỉ lấy số lượng ở trên.
                            </p>
                          </div>
                        );
                      })()}
                      {mode === "export" &&
                        item.productId &&
                        item.quantity > 0 &&
                        (() => {
                          const fifo = goiYLoFIFO(
                            tonTheoLo,
                            item.productId,
                            item.quantity,
                          );
                          return fifo.length > 0 ? (
                            <div className="sm:col-span-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                              Lô xuất FIFO tự động:{" "}
                              <span className="font-mono font-black">
                                {fifo
                                  .map(
                                    (f) =>
                                      `${f.batchNumber} (${formatNumber(f.quantity)})`,
                                  )
                                  .join(" + ")}
                              </span>
                            </div>
                          ) : null;
                        })()}
                      <div className="sm:col-span-4" />
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

          {mode === "export" && (
            <div className="md:col-span-2">
              <div className="p-5 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex items-center gap-4">
                <Truck className="w-8 h-8 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-widest">
                    Mặc định: Đơn hàng đi đường (Giao sau)
                  </span>
                  <span className="text-[10px] text-amber-700/70 font-bold italic">
                    Tất cả đơn xuất kho sẽ được lưu vào mục "Đơn đi đường" để
                    xác nhận khi hoàn tất.
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-amber-500 text-white rounded-full text-[8px] font-black uppercase">
                  Active
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center border-t border-slate-100 pt-10">
          <Button
            variant={mode === "import" ? "primary" : "danger"}
            className="w-full sm:flex-1 py-5 text-base shadow-2xl relative group overflow-hidden"
            onClick={() =>
              handleAddTransaction(
                mode === "import" ? newTransaction.type : "OUT",
              )
            }
            disabled={
              loading ||
              newTransaction.items.some((i) => !i.productId || i.quantity <= 0)
            }
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : mode === "import" ? (
              <PlusCircle className="w-5 h-5" />
            ) : (
              <MinusCircle className="w-5 h-5" />
            )}
            <span className="relative z-10">
              {mode === "import"
                ? newTransaction.type === "OPENING"
                  ? "GHI NHẬN TỒN ĐẦU"
                  : `HOÀN TẤT NHẬP ${newTransaction.items.length} MÓN`
                : `HOÀN TẤT XUẤT ${newTransaction.items.length} MÓN`}
            </span>
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto px-10 py-5"
            onClick={() => {
              if (mode === "export") {
                setActiveTab("reports");
              } else {
                setNewTransaction({
                  type: "IN",
                  partnerId:
                    donVi.find((p) => p.id === "SKB-BNC" || p.name === "SKB-BNC")?.id ||
                    donVi[0]?.id ||
                    "",
                  date: format(new Date(), "yyyy-MM-dd"),
                  isInTransit: false,
                  notes: "",
                  items: [{ productId: "", quantity: 0 }],
                });
              }
            }}
          >
            {mode === "export" ? "Hủy bỏ" : "Làm mới"}
          </Button>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-50 rounded-full -ml-24 -mb-24 opacity-20 pointer-events-none" />
      </Card>
    </div>
  );

  /*
   * TỒN ĐẦU KỲ & NẠP EXCEL — CHỈ ADMIN (anh Khoa 20/11/2026): lúc đưa kho vào
   * dùng, admin nạp tồn đầu cho các bộ phận; từ đó bộ phận thao tác theo các
   * luồng của mình (Xưởng gửi phiếu, Kho tổng nhận / xuất), không tự khai tồn.
   */
  const renderTonDauVaNapLe = () =>
    isOwner ? (
      <div className="space-y-4">
        {quyen.napFile && (
          <div className="flex justify-end">
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
        {renderNhapXuatForm("import")}
      </div>
    ) : undefined;

  const renderNhatKyPhieuChungTu = () =>
    quyen.ghiNhap ? (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
            Bao gồm toàn bộ <strong>phiếu giấy cũ</strong> và{" "}
            <strong>phiếu ký điện tử</strong>. Phiếu mới: người nhập ký trình
            lúc lưu → Quản lý xưởng ký duyệt (Rào 1) → Kho tổng ký nhận (Rào 2).{" "}
            <strong>Kho tổng ký nhận xong thì hàng mới vào tồn kho</strong>. Bấm{" "}
            <strong>BM-SKB-01</strong> để xem biểu mẫu có chữ ký và xuất PDF.
          </p>
        </div>

        <ImportSlipPanel
          transactions={transactions}
          products={products}
          partners={partners}
          slips={slips}
          canWrite={canWrite}
          chuKyMau={chuKyMauTheoId}
          onRemoveSigned={
            isOwner ? handleRemoveSignedSlipPhoto : undefined
          }
          onXoaPhieu={quyen.ghiNhap ? handleXoaPhieuNhap : undefined}
          xoaDuocPhieuDaKy={isOwner}
          onLuuMaLo={quyen.ghiNhap ? handleLuuMaLo : undefined}
          anhTheoPhieu={anhTheoChungTu}
        />
      </div>
    ) : undefined;

  if (loading && !user) {
    return (
      <div className="pin-backdrop min-h-[100dvh] flex items-center justify-center p-6 relative overflow-hidden text-white">
        <div aria-hidden="true" className="dn-ambient-grid pointer-events-none fixed inset-0 z-0 opacity-60" />

        <div className="flex flex-col items-center gap-6 relative z-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
            <Beer className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="dn-card-title text-2xl font-bold tracking-tight text-amber-50">
              Bia Bà Nà · SKB
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-300/80">
              Đang khởi động dữ liệu...
            </p>
          </div>
          <div className="boot-load-bar">
            <div className="boot-load-sweep" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    const resetHint = getActivePinResetHint();
    return (
      <ManHinhDangNhap
        onLogin={handleGoogleLogin}
        isAuthenticating={isAuthenticating}
        authError={authError}
        resetPendingEmail={resetHint ? resetHint.email : null}
        maBuild={__BUILD_ID__}
      />
    );
  }

  /**
   * CHẶN KHI MẤT MẠNG TRƯỚC LỚP PIN:
   * Giống chuẩn app Kiểm kê: không cho dùng hồ sơ/PIN cache để vượt qua lúc mở app.
   */
  if (!pinUnlocked && pinOffline) {
    return (
      <ManHinhPin
        email={currentUserProfile?.email || user || ""}
        mode="mang"
        pinStage="idle"
        pinBusy={pinBusy}
        pinError={pinError}
        offlineHint={pinOfflineHint}
        onClearError={() => setPinError("")}
        onVerifyPin={handleVerifyPin}
        onCreatePin={handleCreatePin}
        onForgotPin={handleForgotPin}
        onRetryNetwork={handleRetryPinNetwork}
        onLogout={handleLogout}
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
              được duyệt, màn hình này tự mở ra — không phải tải lại trang.
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
   * LỚP BẢO VỆ THỨ 2: MÃ PIN
   *
   * Giống chuẩn app Kiểm kê F&B: mỗi lần mở hoặc tải lại trang (F5 / Ctrl+Shift+R)
   * đều bắt nhập lại PIN; kiểm tra trực tiếp máy chủ (không vượt khi mất mạng);
   * sai 5 lần tự khóa trên máy chủ và buộc đăng nhập lại bằng Google để đặt PIN mới.
   */
  if (!pinUnlocked) {
    const pinUid = auth.currentUser?.uid || currentUserProfile?.uid || "";
    const isTempChange = Boolean(pinUid) && tempPinChangeUid === pinUid;
    const canRecoverReset =
      Boolean(pinUid) &&
      freshResetUid === pinUid &&
      (Boolean(currentUserProfile?.pinLocked) || hasPinResetIntentFor(pinUid));
    const pinMode: PinScreenMode = pinOffline
      ? "mang"
      : currentUserProfile?.pinLocked && !canRecoverReset
        ? "khoa"
        : !currentUserProfile?.pinHash || canRecoverReset || isTempChange
          ? "dat"
          : "nhap";
    const failsRemaining = Math.max(
      0,
      PIN_MAX_ATTEMPTS - Number(currentUserProfile?.pinFailCount || 0),
    );

    return (
      <ManHinhPin
        email={currentUserProfile?.email || user || ""}
        displayName={
          currentUserProfile?.name ||
          (user && !user.includes("@") ? user : "")
        }
        mode={pinMode}
        isResetRecovery={canRecoverReset}
        isTempChange={isTempChange}
        pinStage={pinStage}
        pinLeaving={pinLeaving}
        pinBusy={pinBusy}
        pinError={pinError}
        failsRemaining={failsRemaining}
        offlineHint={pinOfflineHint}
        onClearError={() => setPinError("")}
        onVerifyPin={handleVerifyPin}
        onCreatePin={handleCreatePin}
        onForgotPin={handleForgotPin}
        onRetryNetwork={handleRetryPinNetwork}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div
      id="app"
      className={cn(
        "app-vao flex h-screen bg-bg-main text-slate-900 font-sans overflow-hidden transition-all duration-150",
        loading && user && !isAccountModalOpen ? "blur-[1px] brightness-95" : "",
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
        <div className="fixed inset-0 z-[200] flex items-stretch sm:items-center justify-center sm:p-6">
          <div
            onClick={() => setIsAccountModalOpen(false)}
            className="absolute inset-0 bg-slate-900/50 pointer-events-auto"
          />
          {/*
            Điện thoại: phủ KÍN màn hình, cuộn bên trong. Máy tính: khung rộng
            vừa phải, cao tối đa bằng màn hình, cuộn bên trong. Bản trước khung
            hẹp 448px, nằm giữa, và bị phủ hiệu ứng làm mờ của nền app (khung
            nằm trong #app nên mờ theo) — chữ nhoè, thẻ chữ ký bị bóp dọc.
          */}
          <div className="w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto bg-white sm:rounded-3xl shadow-2xl relative z-10 pointer-events-auto">
            <div className="p-5 sm:p-8 space-y-6">
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
                        {/* Tên vai trò lấy từ src/lib/quyen.ts, không viết
                            lại ở đây — thêm vai trò mà quên sửa chỗ này thì
                            người dùng thấy tên của một vai trò khác. */}
                        {tenVaiTro(userRole)}
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

                {/* Chữ ký điện tử của chính người dùng — chỉ vai trò cần ký. */}
                {canChuKy(userRole) && (
                  <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Chữ ký điện tử</p>
                      <button
                        type="button"
                        onClick={() => setMoDoiChuKy(true)}
                        className="shrink-0 px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-[11px] font-extrabold hover:bg-amber-50"
                      >
                        {mauCuaToi ? "Đổi chữ ký" : "Đăng ký chữ ký"}
                      </button>
                    </div>
                    {mauCuaToi && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                        <HinhChuKy mau={mauCuaToi} className="mx-auto h-24 w-full max-w-sm" />
                        <p className="text-xs font-black text-slate-900">{mauCuaToi.ten}</p>
                      </div>
                    )}
                    <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                      Đóng lên chứng từ khi anh/chị trình, duyệt, ký nhận — kèm họ tên, giờ ký, nhập PIN mỗi lần ký.
                      Đổi chữ ký không làm đổi chứng từ đã ký trước đó.
                    </p>
                  </div>
                )}

                {/* Đổi mã PIN khóa màn hình của chính người dùng đang đăng nhập */}
                <DoiPinCaNhanCard
                  profile={currentUserProfile}
                  onSaveNewPin={handleSaveSelfPinFromModal}
                />

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

      {/* Hộp thoại Chủ sở hữu cấp lại mã PIN / mở khóa cho thành viên */}
      <CapLaiPinDialog
        target={capLaiPinTarget}
        onClose={() => setCapLaiPinTarget(null)}
        onIssueTempPin={handleIssueTempPin}
        onClearPinToReset={handleClearPinToReset}
      />

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
              "skb-toast-in px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl",
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
          "sidebar-vao fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white border-r border-slate-100 transition-all duration-200 transform lg:relative lg:translate-x-0 overflow-hidden shrink-0 flex flex-col premium-shadow",
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
              <div
                key={group.id}
                className={groupIndex > 0 ? "mt-5 pt-4 border-t border-slate-100" : ""}
              >
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
                        "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-150 group relative overflow-hidden text-left",
                        activeTab === item.id
                          ? "skb-nav-active bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5",
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
                      {item.badge > 0 && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums shrink-0",
                            activeTab === item.id
                              ? "bg-amber-400 text-slate-950"
                              : "bg-amber-100 text-amber-800",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
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
                      {tenVaiTro(userRole)}
                      {vaiTroXem !== userRole ? ` · xem như ${tenVaiTro(vaiTroXem)}` : ""}
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
      <NguonChuKyMau.Provider value={chuKyMauTheoId}>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Command Header (Craft Brewery & Paperless) */}
        <header className="topbar-vao min-h-16 bg-[#141A23] text-white border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sticky top-0 z-30 shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Đóng/mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs shadow">
                SKB
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-400">
                  Sun KraftBeer · Bà Nà Hills
                </span>
                {activeGroup && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/10">
                    <span className="text-amber-300">{activeGroup.title}</span>
                    <span className="text-slate-500">▸</span>
                    <span>{navItems.find((i) => i.id === activeTab)?.label}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Chỉ hiện badge nhắc việc khi thực sự có phiếu đang chờ duyệt — không lặp lại thanh menu */}
            {quyen.duyetXuong && pendingSlipStats.rao1 > 0 && activeTab !== "ql-xuong" && (
              <button
                onClick={() => setActiveTab("ql-xuong")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-300 text-[11px] font-extrabold transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
                Chờ Rào 1: {pendingSlipStats.rao1}
              </button>
            )}
            {quyen.duyetKhoTong && pendingSlipStats.rao2 > 0 && activeTab !== "kho-tong" && (
              <button
                onClick={() => setActiveTab("kho-tong")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 text-[11px] font-extrabold transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400 pulse-dot" />
                Chờ Rào 2: {pendingSlipStats.rao2}
              </button>
            )}

            {userRole === "OWNER" && (
              <label
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-extrabold",
                  vaiTroThu
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-white/10 text-slate-200 border-white/10",
                )}
                title="Admin: xem app như một vai trò để thử từng phân hệ (chỉ đổi giao diện)"
              >
                <span className="hidden sm:inline">Xem như</span>
                <select
                  value={vaiTroThu || "OWNER"}
                  onChange={(e) =>
                    setVaiTroThu(e.target.value === "OWNER" ? null : (e.target.value as UserRole))
                  }
                  className="bg-transparent outline-none font-extrabold max-w-[150px] sm:max-w-none cursor-pointer"
                >
                  {vaiTroDeChon().filter((v) => v.ma !== "PENDING").map((v) => (
                    <option key={v.ma} value={v.ma} className="text-slate-900">
                      {v.ma === "OWNER" ? "Admin (thật)" : v.ten}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-200">
                {new Date().toLocaleDateString("vi-VN")}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
              className="p-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-200" />
              )}
            </button>
          </div>
        </header>

        {vaiTroThu && userRole === "OWNER" && (
          <div className="px-4 sm:px-8 py-2 bg-amber-400 text-slate-950 text-[11px] font-extrabold flex flex-wrap items-center justify-between gap-2">
            <span>
              Đang xem như: {tenVaiTro(vaiTroThu)} — chỉ đổi giao diện; máy chủ vẫn coi anh là admin (lưu / xoá
              vẫn đi theo quyền admin). Một tài khoản không ký được hai ô trên cùng phiếu, thử trọn luồng ký cần tài khoản thật.
            </span>
            <button
              type="button"
              onClick={() => setVaiTroThu(null)}
              className="px-3 py-1 rounded-lg bg-slate-950 text-amber-300"
            >
              Về admin
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-[#F4F1EA] dark:bg-bg-main">
          <div
            key={activeTab}
            id="view"
            className="vao max-w-[1600px] mx-auto space-y-4 sm:space-y-8 pb-24"
          >
            {/*
              MỘT dải cảnh báo cho mọi kho dữ liệu đang không đọc được.
              Đặt ngay đầu vùng nội dung để không bỏ sót, nhưng gọn một dòng
              chứ không phải thông báo đỏ toàn màn hình — số liệu đọc được vẫn
              dùng bình thường trong lúc chờ sửa phân quyền.
            */}
            {/*
              LƯỢT GỌI FIREBASE ĐANG CAO — chỉ admin thấy, chỉ hiện khi đáng
              lo (đã dùng hoặc dự báo cuối ngày từ 50% mốc trở lên). Nói rõ
              loại nào, bao nhiêu, và còn bao lâu tới lúc hạn mức đặt lại.
            */}
            {isOwner && canhBaoGoi.length > 0 && (
              <div
                className={cn(
                  "p-3 rounded-2xl border flex gap-3",
                  canhBaoGoi.some((g) => g.muc === "nguy")
                    ? "border-rose-200 bg-rose-50"
                    : "border-amber-200 bg-amber-50",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "w-5 h-5 shrink-0 mt-0.5",
                    canhBaoGoi.some((g) => g.muc === "nguy")
                      ? "text-rose-600"
                      : "text-amber-600",
                  )}
                />
                <div className="min-w-0 text-[12px] font-bold text-slate-700 leading-relaxed">
                  <strong>Lượt gọi Firebase hôm nay đang cao.</strong>{" "}
                  {canhBaoGoi
                    .map(
                      (g) =>
                        `${g.ten}: ${formatNumber(g.da)} / ${formatNumber(g.moc)} (${g.phanTram.toFixed(0)}%), dự báo cuối ngày ~${formatNumber(g.duBao)}`,
                    )
                    .join(" · ")}
                  . Hạn mức đặt lại lúc nửa đêm giờ Mỹ (14h–15h chiều giờ Việt Nam).
                  Bớt bấm tải lại trang và đóng bớt tab app đang mở dư. Xem chi tiết
                  trong Cài đặt → Lượt gọi Firebase.
                </div>
              </div>
            )}

            {/*
              NGUỒN DỮ LIỆU CÓ CHUYỆN — mọi người dùng đều thấy: hết hạn mức,
              mất mạng, ghi treo / ghi hỏng, Cloudinary từ chối ảnh. Xem
              src/lib/sucKhoe.ts.
            */}
            <DaiSucKhoe />

            {/*
              Dung lượng ước tính chạm 50% gói miễn phí — chỉ admin thấy.
            */}
            {isOwner && storageForecast.level !== "safe" && (
              <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="min-w-0 text-[12px] font-bold text-slate-700 leading-relaxed">
                  <strong>Dung lượng Firebase ước tính đã dùng{" "}
                  {storageForecast.usedPercent.toFixed(0)}% gói miễn phí.</strong>{" "}
                  Xem Cài đặt → Sức khỏe hệ thống. Số ước tính cao hơn số thật
                  (đo thật xem ở Firebase Console → Firestore → Usage).
                </p>
              </div>
            )}

            {Object.keys(loiDoc).length > 0 && (
              <div className="p-3 rounded-2xl border border-rose-200 bg-rose-50 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-black text-rose-800 uppercase tracking-wider">
                    Không đọc được {Object.keys(loiDoc).length} kho dữ liệu:{" "}
                    {Object.keys(loiDoc).join(", ")}
                  </p>
                  <p className="text-[11px] font-bold text-rose-700/90 leading-relaxed whitespace-pre-line">
                    {Object.values(loiDoc)[0]}
                  </p>
                  {/* Listener đã hỏng thì Firestore đóng luôn, không tự thử
                      lại — phải tải lại trang mới đọc tiếp được. */}
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-[11px] font-black text-rose-700 hover:bg-rose-100"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tải lại trang
                  </button>
                </div>
              </div>
            )}

            {/*
              THANH LỌC KỲ ĐÃ BỎ (27/08/2026).

              Chỗ này từng là dải "Tất cả / Ngày / Tuần / Tháng / Năm" cộng ô
              chọn mốc ngày, hiện trên năm màn hình. Bỏ vì mỗi màn hình đã có bộ
              lọc riêng đúng với việc của nó, hai tầng lọc chồng nhau thì con số
              phụ thuộc một ô người dùng đã quên là mình đặt.

              Chỉ còn nút nạp Excel tồn kho — nó vốn nằm nhờ trong thanh này chứ
              không thuộc về bộ lọc, nên giữ lại và cho đứng riêng.
            */}
            {/*
              ĐÃ GỠ "BẢNG ĐIỀU KHIỂN" VÀ "TỒN KHO" (29/09/2026).

              Hai màn hình này không có số nào của riêng mình: tồn, nhập, xuất,
              hao hụt đều tính lại từ cùng một nguồn mà Báo cáo tổng hợp đã bày
              ra đầy đủ hơn — kèm khoảng ngày, kèm cột hao hụt, kèm xuất Excel.
              Giữ hai bản rút gọn bên cạnh một bản đầy đủ nghĩa là mỗi lần sửa
              cách tính phải nhớ sửa ba chỗ, và chỉ cần quên một chỗ là hai màn
              hình cùng nói về một kho mà ra hai con số.
            */}

            {(() => {
              const renderBoLocKyBaoCao = (
                excelKind: "summary" | "in" | "out",
                showPartnerFilter = true,
              ) => (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-1">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-40">
                        <ONgay
                          aria-label="Từ ngày"
                          value={reportTuNgay}
                          max={reportDenNgay || undefined}
                          onChange={(v: string) => setReportTuNgay(v)}
                          className="w-full px-3 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all text-slate-700"
                        />
                      </div>
                      <span className="text-slate-300 font-black shrink-0">
                        —
                      </span>
                      <div className="relative flex-1 sm:w-40">
                        <ONgay
                          aria-label="Đến ngày"
                          value={reportDenNgay}
                          min={reportTuNgay || undefined}
                          onChange={(v: string) => setReportDenNgay(v)}
                          className="w-full px-3 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all text-slate-700"
                        />
                      </div>
                      {(reportTuNgay || reportDenNgay) && (
                        <button
                          onClick={() => {
                            setReportTuNgay("");
                            setReportDenNgay("");
                          }}
                          className="px-3 py-3 rounded-2xl border border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary transition-all shrink-0 premium-shadow"
                        >
                          Tất cả
                        </button>
                      )}
                    </div>

                    {showPartnerFilter && (
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
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden lg:block">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">
                        Kỳ báo cáo
                      </p>
                      <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest mt-1 leading-none">
                        {moTaKyBaoCao}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="px-6 py-2.5 bg-white border border-slate-100"
                      onClick={() => handleExportReportToExcel(excelKind)}
                    >
                      <Download className="w-4 h-4" /> Xuất Báo Cáo
                    </Button>
                  </div>
                </div>
              );

              return (
                <>
                  {activeTab === "overview" && quyen.xemKho && (() => {
                    const sumByCat = (
                      cat: "Lít" | "Lon",
                      field: "openingStock" | "in" | "out" | "loss" | "closingStock",
                    ) =>
                      flowSummary
                        .filter((r) => r.category === cat)
                        .reduce((s, r) => s + (Number(r[field]) || 0), 0);

                    const kpiCards = [
                      {
                        label: "Tồn đầu kỳ",
                        lit: sumByCat("Lít", "openingStock"),
                        lon: sumByCat("Lon", "openingStock"),
                        accent: "text-slate-700",
                        chip: "bg-slate-100 text-slate-600",
                      },
                      {
                        label: "Nhập kho (đã duyệt)",
                        lit: sumByCat("Lít", "in"),
                        lon: sumByCat("Lon", "in"),
                        accent: "text-emerald-700",
                        chip: "bg-emerald-50 text-emerald-700",
                      },
                      {
                        label: "Xuất & Hao hụt",
                        lit: sumByCat("Lít", "out") + sumByCat("Lít", "loss"),
                        lon: sumByCat("Lon", "out") + sumByCat("Lon", "loss"),
                        sub: `Hao hụt: ${formatNumber(sumByCat("Lít", "loss"))} L`,
                        accent: "text-rose-600",
                        chip: "bg-rose-50 text-rose-700",
                      },
                      {
                        label: "Tồn cuối sổ sách",
                        lit: sumByCat("Lít", "closingStock"),
                        lon: sumByCat("Lon", "closingStock"),
                        sub:
                          pendingApproval.slipCount > 0
                            ? `Chờ duyệt nhập: ${pendingApproval.slipCount} phiếu (${formatNumber(pendingApproval.liters)} L)`
                            : "Không có phiếu nhập chờ duyệt",
                        accent: "text-amber-700",
                        chip: "bg-amber-50 text-amber-800",
                      },
                    ];

                    return (
                      <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                              Tổng quan tồn kho &amp; lưu chuyển
                            </h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em] mt-1">
                              Tồn đầu · Nhập đã duyệt · Xuất · Hao hụt · Tồn cuối toàn kho SKB
                            </p>
                          </div>
                          {renderBoLocKyBaoCao("summary", false)}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {kpiCards.map((c) => (
                            <div
                              key={c.label}
                              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2"
                            >
                              <span
                                className={cn(
                                  "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                  c.chip,
                                )}
                              >
                                {c.label}
                              </span>
                              <div className="flex items-baseline justify-between gap-2 pt-1">
                                <span
                                  className={cn(
                                    "font-mono text-2xl font-black tabular-nums",
                                    c.accent,
                                  )}
                                >
                                  {formatNumber(c.lit)}{" "}
                                  <span className="text-xs font-bold text-slate-400">
                                    Lít
                                  </span>
                                </span>
                                <span className="font-mono text-xs font-black text-slate-600 tabular-nums">
                                  {formatNumber(c.lon)}{" "}
                                  <span className="text-[10px] font-bold text-slate-400">
                                    Lon
                                  </span>
                                </span>
                              </div>
                              {c.sub && (
                                <p className="text-[11px] font-bold text-slate-400">
                                  {c.sub}
                                </p>
                              )}
                            </div>
                          ))}
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
                                {flowSummary.map((item) => (
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
                                    <td className="py-4 px-6 font-mono text-right text-xs font-bold text-slate-500 tabular-nums">
                                      {formatNumber(item.openingStock)}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-right text-xs font-bold text-emerald-600 tabular-nums">
                                      {formatNumber(item.in)}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-right text-xs font-bold text-rose-500 tabular-nums">
                                      {formatNumber(item.out)}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-right text-xs font-bold tabular-nums">
                                      {item.loss > 0 ? (
                                        <span className="text-amber-600">
                                          {formatNumber(item.loss)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-right text-xs font-black text-slate-900 tabular-nums">
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
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>

                        {/* BẢNG KIỂM SOÁT GIAO KEG ĐVTV (20L vs 20,6L) & HAO HỤT ĐỊNH MỨC */}
                        <Card
                          title="Kiểm soát Giao Keg ĐVTV & Hao hụt định mức (0,6 L/keg)"
                          noPadding
                        >
                          <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-[10px] font-black uppercase text-slate-400 block">
                                Tổng Keg giao ĐVTV (ký 20L)
                              </span>
                              <span className="font-mono text-lg font-black text-slate-900 tabular-nums">
                                {formatNumber(baoCaoKegDVTV.totals.dvtvKegsDelivered)} Keg
                              </span>
                              <span className="block text-[10px] font-bold text-slate-500 tabular-nums">
                                Khách ký: {formatNumber(baoCaoKegDVTV.totals.dvtvLitersDelivered)} L · Thực kho: {formatNumber(baoCaoKegDVTV.totals.dvtvInternalLiters)} L
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-amber-200">
                              <span className="text-[10px] font-black uppercase text-amber-700 block">
                                Hao hụt định mức (0,6L/keg)
                              </span>
                              <span className="font-mono text-lg font-black text-amber-700 tabular-nums">
                                {formatNumber(baoCaoKegDVTV.totals.dvtvExpectedLoss06)} L
                              </span>
                              <span className="block text-[10px] font-bold text-slate-500">
                                Chênh quy chuẩn ĐVTV vs 20,6L
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-emerald-200">
                              <span className="text-[10px] font-black uppercase text-emerald-700 block">
                                Hao hụt đã ghi sổ (LOSS)
                              </span>
                              <span className="font-mono text-lg font-black text-emerald-700 tabular-nums">
                                {formatNumber(baoCaoKegDVTV.totals.dvtvActualLoss)} L
                              </span>
                              <span className="block text-[10px] font-bold text-slate-500">
                                Toàn kho: {formatNumber(baoCaoKegDVTV.totals.allActualLoss)} L
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-[#141A23] text-white">
                              <span className="text-[10px] font-black uppercase text-amber-400 block">
                                Chênh chưa ghi bù ĐVTV
                              </span>
                              <span
                                className={cn(
                                  "font-mono text-lg font-black tabular-nums",
                                  baoCaoKegDVTV.totals.dvtvUnrecordedGap > 0
                                    ? "text-rose-300"
                                    : "text-emerald-300",
                                )}
                              >
                                {baoCaoKegDVTV.totals.dvtvUnrecordedGap > 0 ? "+" : ""}
                                {formatNumber(baoCaoKegDVTV.totals.dvtvUnrecordedGap)} L
                              </span>
                              <span className="block text-[10px] font-bold text-slate-300 tabular-nums">
                                BNC &amp; FV (20,6L): {formatNumber(baoCaoKegDVTV.totals.bncFvKegsDelivered)} Keg
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-50/50">
                                  <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-3.5 px-6">
                                    Đơn vị / Nhóm
                                  </th>
                                  <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-3.5 px-4 text-center">
                                    Quy chuẩn Keg
                                  </th>
                                  <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-3.5 px-4 text-right">
                                    Khách nhận (OUT)
                                  </th>
                                  <th className="font-bold text-[10px] text-sky-700 uppercase tracking-widest py-3.5 px-4 text-right">
                                    Thực kho (20,6L/keg)
                                  </th>
                                  <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-3.5 px-4 text-right">
                                    Tổng Keg giao
                                  </th>
                                  <th className="font-bold text-[10px] text-amber-600 uppercase tracking-widest py-3.5 px-4 text-right">
                                    Hao hụt chuẩn (0,6L)
                                  </th>
                                  <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-3.5 px-4 text-right">
                                    Đã ghi LOSS
                                  </th>
                                  <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-3.5 px-6 text-right">
                                    Chênh lệch
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {baoCaoKegDVTV.rows.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={8}
                                      className="py-8 text-center text-slate-400 font-bold"
                                    >
                                      Chưa có giao dịch xuất bia Lít/Keg trong kỳ đang xem.
                                    </td>
                                  </tr>
                                ) : (
                                  baoCaoKegDVTV.rows.map((r) => (
                                    <tr
                                      key={r.unitId}
                                      className="hover:bg-slate-50 transition-colors"
                                    >
                                      <td className="py-3.5 px-6 font-bold text-slate-900">
                                        {r.unitName}
                                      </td>
                                      <td className="py-3.5 px-4 text-center">
                                        <span
                                          className={cn(
                                            "px-2.5 py-0.5 rounded-full text-[10px] font-black",
                                            r.isStandard206
                                              ? "bg-sky-100 text-sky-800"
                                              : "bg-amber-100 text-amber-800",
                                          )}
                                        >
                                          {r.isStandard206
                                            ? "20,6 L/keg · chuẩn gốc"
                                            : "Ký 20L · thực 20,6L"}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 tabular-nums">
                                        {formatNumber(r.litersDelivered)} L
                                      </td>
                                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-700 tabular-nums">
                                        {formatNumber(r.internalLiters)} L
                                      </td>
                                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 tabular-nums">
                                        {formatNumber(r.kegsDelivered)} Keg
                                      </td>
                                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700 tabular-nums">
                                        {r.expectedStandardLoss > 0
                                          ? `${formatNumber(r.expectedStandardLoss)} L`
                                          : "—"}
                                      </td>
                                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                                        {r.actualLossRecorded > 0
                                          ? `${formatNumber(r.actualLossRecorded)} L`
                                          : "—"}
                                      </td>
                                      <td className="py-3.5 px-6 text-right font-mono font-black tabular-nums">
                                        {Math.abs(r.unrecordedGap) < 0.01 ? (
                                          <span className="text-emerald-600">Khớp</span>
                                        ) : r.unrecordedGap > 0 ? (
                                          <span className="text-rose-600">
                                            Thiếu {formatNumber(r.unrecordedGap)} L
                                          </span>
                                        ) : (
                                          <span className="text-amber-600">
                                            +{formatNumber(Math.abs(r.unrecordedGap))} L
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </div>
                    );
                  })()}

                  {activeTab === "reports" && (
                    <div className="space-y-8">
                      {isOwner && conSotPhieuDaHuy.soPhieu > 0 && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-[12px] font-bold text-rose-700 leading-relaxed">
                            {conSotPhieuDaHuy.soPhieu} phiếu đã hủy còn sót dữ liệu ({conSotPhieuDaHuy.dong.length} dòng hàng
                            {conSotPhieuDaHuy.phieu.length ? `, ${conSotPhieuDaHuy.phieu.length} tờ phiếu nhập` : ""}). Phiếu hủy phải xoá hẳn —
                            sổ số phiếu chỉ giữ ghi chú "đã hủy".
                          </p>
                          <button
                            onClick={handleXoaHanPhieuDaHuy}
                            disabled={loading}
                            className="shrink-0 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 disabled:opacity-40"
                          >
                            Xoá hẳn dữ liệu phiếu hủy
                          </button>
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-100 rounded-2xl w-fit premium-shadow shrink-0">
                          {(
                            [
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
                        {renderBoLocKyBaoCao(reportSubTab, true)}
                      </div>

                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                    {chuaCoSoBaoCao.length > 0 && (
                      <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50 flex flex-wrap items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="flex-1 min-w-[200px] text-[12px] font-bold text-slate-700">
                          <strong>{chuaCoSoBaoCao.length} chứng từ</strong> trong
                          kỳ đang xem chưa có số phiếu — thường là lượt nạp từ
                          tệp.
                        </p>
                        {(reportSubTab === "in" ? quyen.ghiNhap : quyen.ghiXuat) && (
                          <button
                            onClick={capSoTrongBaoCao}
                            disabled={dangCapSo}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-125 disabled:opacity-40"
                          >
                            {dangCapSo ? "Đang cấp số..." : "Cấp số phiếu"}
                          </button>
                        )}
                      </div>
                    )}
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
                                Số phiếu
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
                              <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">
                                Ghi chú
                              </th>
                              {/* Xoá giao dịch: chỉ admin. Báo cáo chỉ bày dòng ĐÃ
                                  vào tồn (phiếu nhập đã ký ảnh), nên người khác
                                  không có gì xoá được ở đây — ẩn hẳn cột. */}
                              {isOwner && (
                                <th className="font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6 text-center">
                                  Thao tác
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredTransactionsForReport
                              .filter((t) =>
                                reportSubTab === "in"
                                  ? trongNhatKyNhap(t)
                                  : trongNhatKyXuat(t),
                              )
                              /*
                                ĐÃ BỎ HẾT DẤU HIỆU "DÒNG GỘP" (16/09/2026):
                                nhãn chữ, vạch vàng bên trái, icon xếp lớp và
                                nền vàng nhạt của dòng.

                                Những dòng cùng một lượt vẫn nhận ra được vì
                                chúng cùng ngày, cùng mã lô và cột Ghi chú đã
                                ghi sẵn "[Món 1/2]". Bốn dấu hiệu nữa cho cùng
                                một chuyện là thừa, và màu vàng trong bảng làm
                                mắt tưởng có gì bất thường.

                                `referenceGroupId` vẫn nguyên trong dữ liệu —
                                đây chỉ là chuyện bày ra màn hình.
                              */
                              .map((t) => {
                                return (
                                  <tr
                                    key={t.id}
                                    className="hover:bg-slate-50 transition-colors relative group/row"
                                  >
                                    <td className="py-4 px-6 relative">
                                      <div className="text-[11px] font-bold text-slate-900 font-mono flex items-center gap-2">
                                        {formatDate(t.date)}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 whitespace-nowrap">
                                      {(() => {
                                        const so = soPhieuCuaDong(t, bangSo);
                                        if (!so)
                                          return (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                                              Chưa có số
                                            </span>
                                          );
                                        return (
                                          <span
                                            title={so.daHuy ? "Phiếu đã hủy" : undefined}
                                            className={cn(
                                              "font-mono text-[11px] font-black",
                                              so.daHuy
                                                ? "text-rose-500 line-through"
                                                : "text-slate-900",
                                            )}
                                          >
                                            {so.soPhieu}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex flex-col">
                                        <div className="font-bold text-slate-900 text-sm leading-tight">
                                          {t.productName}
                                          {/*
                                            Hao hụt nằm CHUNG bảng với hàng
                                            giao, nên phải nói rõ nó không lên
                                            công nợ — nếu không người đọc cộng
                                            cả cột và đòi đối tác trả tiền phần
                                            mình làm mất.
                                          */}
                                          {laDongHaoHut(t) && (
                                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-tighter inline-flex items-center gap-1 align-middle">
                                              Hao hụt · không ghi công nợ
                                            </span>
                                          )}
                                          {t.dieuChinh && (
                                            <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-tighter inline-flex items-center gap-1 align-middle">
                                              Điều chỉnh công nợ · không rời kho
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">
                                          {t.category}
                                          {t.type === "IN" && t.batchNumber && (
                                            <span className="text-amber-600">
                                              {" "}· Lô {t.batchNumber}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                      <span
                                        className={cn(
                                          "font-mono font-black text-sm",
                                          t.type === "IN"
                                            ? "text-emerald-600"
                                            : laDongHaoHut(t)
                                              ? "text-amber-600"
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
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-2 min-w-[100px]">
                                        <span className="text-xs text-slate-400 italic">
                                          {ghiChuHienThi(
                                            t.notes,
                                            t.partnerName,
                                          ) || "—"}
                                        </span>
                                        {/* Ảnh biên bản của CHUYẾN chứa dòng này (bảng ảnh chứng từ). */}
                                        {(() => {
                                          const anhDong = anhCuaDong(t);
                                          return anhDong.length > 0 ? (
                                            <a
                                              href={anhDong[0]}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="h-6 px-1.5 bg-primary/5 text-primary rounded flex items-center gap-1 hover:bg-primary hover:text-white transition-all text-[10px] font-black"
                                              title="Mở ảnh biên bản của chuyến"
                                            >
                                              <ImageIcon className="w-3 h-3" />
                                              {anhDong.length}
                                            </a>
                                          ) : null;
                                        })()}
                                      </div>
                                    </td>
                                    {isOwner && (
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
                                    )}
                                  </tr>
                                );
                              })}
                            {filteredTransactionsForReport.filter((t) =>
                              reportSubTab === "in"
                                ? trongNhatKyNhap(t)
                                : trongNhatKyXuat(t),
                            ).length === 0 && (
                              <tr>
                                <td
                                  colSpan={isOwner ? 8 : 7}
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
                </div>
                  )}
                </>
              );
            })()}

            {/*
              PHÂN HỆ DOANH THU ĐÃ GỠ (25/09/2026), theo yêu cầu của Khoa.

              Doanh thu ở đây là số TÍNH RA từ xuất kho nhân đơn giá, không
              phải dữ liệu nạp vào — nên gỡ màn hình đi không làm mất số liệu
              gốc nào: mọi lần xuất vẫn nằm nguyên trong `transactions`, và
              tiền vẫn tính được bất cứ lúc nào từ đó.

              Dữ liệu cũ trong collection `revenue` trên Firestore CỐ Ý KHÔNG
              XOÁ — đó là dấu vết của thời nạp từ tệp Excel, xoá là không lấy
              lại được, mà giữ thì không tốn gì ngoài dung lượng.
            */}

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
                          className="hidden md:flex px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all items-center gap-3"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Xác nhận {selectedInTransitIds.length} đơn đã chọn
                        </button>
                      )}
                  </div>
                </div>

                {/*
                  TRÊN ĐIỆN THOẠI: mỗi đơn một THẺ, không phải một hàng bảng.

                  Bảng có 7 cột nên trên máy 375px chỉ hiện được ba cột rưỡi;
                  muốn thấy số lượng gửi và nút xác nhận phải lướt ngang, xem
                  xong lại lướt ngược về mới tích được ô chọn. Vy phản ánh
                  đúng chỗ này. Thẻ xếp dọc thì mọi thông tin của một đơn nằm
                  gọn trong một khung, không còn lướt ngang lần nào.

                  Bảng vẫn giữ nguyên cho màn hình lớn (md trở lên) — ở đó bảy
                  cột vừa đủ, và nhìn nhiều đơn một lúc lại nhanh hơn thẻ.
                */}
                <div className="md:hidden space-y-3">
                  {inTransitGroups.length > 0 ? (
                    <>
                      {daDuocDuyet && (
                        <label className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 premium-shadow">
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary/20"
                            checked={
                              selectedInTransitIds.length ===
                                inTransitGroups.length &&
                              inTransitGroups.length > 0
                            }
                            onChange={(e) => {
                              setSelectedInTransitIds(
                                e.target.checked
                                  ? inTransitGroups.map((g) => g.id)
                                  : [],
                              );
                            }}
                          />
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            Chọn tất cả ({inTransitGroups.length} đơn)
                          </span>
                        </label>
                      )}

                      {inTransitGroups.map(({ id, group, sheetNumber }) => {
                        const firstTrx = group[0];
                        const totalQty = group.reduce(
                          (sum, t) => sum + t.quantity,
                          0,
                        );
                        const combinedNotes = Array.from(
                          new Set(group.map((t) => t.notes).filter(Boolean)),
                        ).join(", ");
                        const dangChon = selectedInTransitIds.includes(id);

                        return (
                          <div
                            key={id}
                            className={cn(
                              "bg-white rounded-2xl border premium-shadow overflow-hidden transition-all",
                              dangChon
                                ? "border-primary/40 ring-2 ring-primary/15"
                                : "border-slate-100",
                            )}
                          >
                            {/* Bấm chỗ nào trong khối trên cũng tích được ô
                                chọn — ô vuông 20px một mình thì khó trúng. */}
                            <label className="flex items-start gap-3 p-4 pb-3">
                              {daDuocDuyet && (
                                <input
                                  type="checkbox"
                                  className="w-5 h-5 mt-0.5 shrink-0 text-primary rounded border-slate-300 focus:ring-primary/20"
                                  checked={dangChon}
                                  onChange={() => {
                                    setSelectedInTransitIds((prev) =>
                                      prev.includes(id)
                                        ? prev.filter((x) => x !== id)
                                        : [...prev, id],
                                    );
                                  }}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="font-black text-slate-900 text-base leading-none">
                                    {/* Số phiếu thật nếu đã cấp; chưa cấp thì
                                        mới rơi về số đếm tạm. */}
                                    {soPhieuTheoNguon.get(id) ? (
                                      <span className="font-mono">
                                        {soPhieuTheoNguon.get(id)}
                                      </span>
                                    ) : (
                                      <>Phiếu {sheetNumber}</>
                                    )}
                                  </span>
                                  <span className="font-mono font-black text-base text-amber-600 leading-none shrink-0">
                                    {formatNumber(totalQty)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-1.5">
                                  <span className="text-[10px] font-mono font-bold text-slate-400">
                                    {formatDate(firstTrx.date)}
                                  </span>
                                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest shrink-0">
                                    SL gửi
                                  </span>
                                </div>
                              </div>
                            </label>

                            <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-tighter text-slate-700 max-w-full truncate">
                                {firstTrx.partnerName}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-tighter text-slate-500">
                                {group.length} mặt hàng
                              </span>
                              {/*
                                Hao hụt chờ theo đơn: không nằm trong "SL gửi"
                                vì nó không giao cho đối tác, nhưng phải nói ra
                                là có — xác nhận đơn là nó được ghi nhận theo.
                              */}
                              {(haoHutChoTheoDon.get(id) || 0) > 0 && (
                                <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-tighter text-amber-700">
                                  Kèm hao hụt{" "}
                                  {formatNumber(haoHutChoTheoDon.get(id) || 0)}
                                </span>
                              )}
                            </div>

                            {combinedNotes && (
                              <p className="px-4 pb-3 text-[11px] text-slate-500 font-medium italic leading-snug">
                                {combinedNotes}
                              </p>
                            )}

                            <div className="flex items-stretch gap-2 px-4 pb-4">
                              <button
                                onClick={() => {
                                  setSelectedInTransitGroup(group);
                                  const qtyMap: Record<string, number> = {};
                                  group.forEach((t) => {
                                    qtyMap[t.productId] = parseFloat(
                                      (
                                        (qtyMap[t.productId] || 0) + t.quantity
                                      ).toFixed(4),
                                    );
                                  });
                                  setActualReceivedQtyMap(qtyMap);
                                  // Mở ra là chưa khớp gì, người kho dò từng
                                  // loại — xem ghi chú ở `handleBulkConfirm`.
                                  setMatchedProductIds(new Set());
                                  setSoThucNhanText({});
                                  setLossReason("");
                                  setAnhCho([]);
                                  setShowLossModal(true);
                                }}
                                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Xác nhận cả phiếu
                              </button>
                              {isOwner && (
                                <button
                                  onClick={() =>
                                    handleDeleteInTransitGroup(group)
                                  }
                                  className="px-4 bg-rose-50 text-rose-500 rounded-xl active:scale-95 transition-all"
                                  title="Xóa toàn bộ đơn"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Chừa chỗ cho thanh xác nhận dán đáy. */}
                      {daDuocDuyet && selectedInTransitIds.length > 0 && (
                        <div className="h-20" />
                      )}
                    </>
                  ) : (
                    <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-[0.2em] text-xs bg-white rounded-2xl border border-slate-100">
                      Không có đơn hàng nào đang đi đường.
                    </div>
                  )}
                </div>

                {/*
                  Thanh xác nhận hàng loạt dán đáy màn hình điện thoại. Nút ở
                  đầu trang thì tích xong mười đơn phải cuộn ngược lên mới bấm
                  được; dán đáy thì lúc nào cũng trong tầm ngón cái.
                */}
                {daDuocDuyet && selectedInTransitIds.length > 0 && (
                  <div className="md:hidden fixed inset-x-0 bottom-0 z-40 p-3 bg-white/90 backdrop-blur-xl border-t border-slate-200">
                    <button
                      onClick={handleBulkConfirm}
                      className="w-full py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Xác nhận {selectedInTransitIds.length} đơn đã chọn
                    </button>
                  </div>
                )}

                <Card noPadding className="hidden md:block premium-shadow overflow-hidden">
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
                                    {soPhieuTheoNguon.get(id) ? (
                                      <span className="font-mono">
                                        {soPhieuTheoNguon.get(id)}
                                      </span>
                                    ) : (
                                      <>Phiếu số: {sheetNumber}</>
                                    )}
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
                                        // Mở ra là chưa khớp gì, người kho dò
                                        // từng loại — xem `handleBulkConfirm`.
                                        setMatchedProductIds(new Set());
                                              setSoThucNhanText({});
                                        setLossReason("");
                                        setAnhCho([]);
                                        setShowLossModal(true);
                                      }}
                                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Xác nhận cả phiếu
                                    </button>

                                    {/* Xoá đơn: chỉ admin (21/10/2026) —
                                        xoá dữ liệu là xoá luôn ảnh. */}
                                    {isOwner && (
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
                        onClick={() => {
                          // Đã chọn ảnh thì bấm trượt ra nền không được đóng —
                          // đóng là bỏ ảnh. Dùng nút X / Hủy.
                          if (!anhCho.length) dongKhungXacNhan();
                        }}
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
                              </div>
                            </div>
                            <button
                              onClick={() => dongKhungXacNhan()}
                              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                              <X className="w-5 h-5 text-slate-400" />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 py-3 sm:p-8 sm:pt-4 space-y-3 sm:space-y-6 overflow-y-auto">
                          {/* ẢNH MINH CHỨNG LÊN ĐẦU (20/11/2026): trên điện thoại
                              nằm dưới danh sách mặt hàng thì phải cuộn tận đáy
                              mới thấy chỗ chụp — mà đó là việc bắt buộc. */}
                          <div className="space-y-3">
                            {/* Nhãn ngắn lại: bản trước dài quá nên trên điện
                                thoại vắt xuống dòng thứ hai còn trơ mỗi chữ
                                "BUỘC)". */}
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1 block">
                              Ảnh minh chứng
                              <span className="text-rose-500"> *</span>
                            </label>

                            {/*
                              HAI NÚT NHỎ, XẾP NGANG. (Nút quét phiếu bằng AI đã
                              bỏ 19/11/2026: nay chụp HIỆN TRƯỜNG, không chụp giấy.)
                              Chúng chỉ là chỗ bấm một lần rồi thôi; chiếm ba
                              khối lớn chồng lên nhau thì đẩy ảnh minh chứng
                              xuống tận đáy, phải cuộn mới thấy. Chỗ cần rộng
                              là ẢNH, để đối chiếu chữ viết tay với số lượng ở
                              trên.
                            */}
                            <div className="grid grid-cols-2 gap-2">
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
                                    const o = e.target;
                                    const { ds: moi, hong } = await taoTepCho(o.files);
                                    o.value = "";
                                    if (hong) baoAnhKhongDoc(hong);
                                    if (moi.length) setAnhCho((cu) => [...cu, ...moi]);
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
                                    const o = e.target;
                                    const { ds: moi, hong } = await taoTepCho(o.files);
                                    o.value = "";
                                    if (hong) baoAnhKhongDoc(hong);
                                    if (moi.length) setAnhCho((cu) => [...cu, ...moi]);
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
                            {/*
                              Ảnh đang chọn (chưa lưu) và ảnh đã có của chuyến.
                              Xác nhận lần hai (từng phần) thì ảnh lần trước
                              vẫn còn — ảnh mới được THÊM vào, không thay.
                            */}
                            {(() => {
                              const daCo = [
                                ...new Set(selectedInTransitGroup.map(maChungTuCuaDong)),
                              ].flatMap((c) => anhTheoChungTu.get(c) || []);
                              return daCo.length > 0 ? (
                                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                  Chuyến này đã có {daCo.length} ảnh biên bản —
                                  ảnh chọn thêm sẽ được cộng vào, không thay.
                                </p>
                              ) : null;
                            })()}
                            <ChonAnh ds={anhCho} onDoi={setAnhCho} />
                          </div>
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

                          {/*
                            HAO HỤT ĐI KÈM PHIẾU — chỉ để đọc, không có ô nhập.
                            Số này lấy thẳng từ tệp BBGN, người kho không sửa ở
                            đây; muốn sửa thì sửa tệp rồi nạp lại.

                            Mỗi dòng nói rõ nó có được ghi nhận lần này không:
                            hao hụt chỉ đi theo mặt hàng ĐÃ TÍCH khớp. Không nói
                            ra thì người dùng tích ba trên năm mặt hàng, tưởng
                            hao hụt vào hết, rồi hai dòng còn lại treo lại mà
                            không hiểu vì sao.
                          */}
                          {haoHutCuaPhieuDangXac.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1 block leading-snug">
                                Hao hụt đi kèm phiếu này
                              </label>
                              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 divide-y divide-amber-200/70 overflow-hidden">
                                {haoHutCuaPhieuDangXac.map((h) => {
                                  const seGhi = matchedProductIds.has(
                                    h.productId,
                                  );
                                  const dv =
                                    products.find((x) => x.id === h.productId)
                                      ?.unit || "đơn vị";
                                  return (
                                    <div
                                      key={h.id}
                                      className="flex items-center gap-2 px-3 py-2.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="text-[12px] font-black text-slate-800 leading-snug break-words">
                                          {h.productName}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-tighter mt-0.5 text-slate-400">
                                          {seGhi ? (
                                            <span className="text-emerald-600">
                                              Ghi nhận cùng lần xác nhận này
                                            </span>
                                          ) : (
                                            <span className="text-slate-400">
                                              Chưa tích mặt hàng — hao hụt chờ
                                              lượt sau
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-mono font-black text-sm text-amber-700 shrink-0">
                                        {formatNumber(h.quantity)}
                                      </span>
                                      <span className="text-[10px] font-black text-amber-600/70 uppercase shrink-0">
                                        {dv}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 leading-relaxed ml-1">
                                Phần hao hụt KHÔNG lên công nợ và không lên hóa
                                đơn — chỉ trừ vào tồn kho. Số lấy từ tệp đã nạp.
                              </p>
                            </div>
                          )}

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


                        </div>

                        {/* Chân hộp thoại: chừa thêm đệm dưới cho thanh điều hướng của điện
                            thoại, không thì nút Xác nhận nằm sát mép và bấm hay trượt. */}
                        <div className="px-4 py-3 pb-4 sm:p-8 sm:pt-4 border-t border-slate-100 bg-slate-50/30 flex gap-2 sm:gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => dongKhungXacNhan()}
                          >
                            Hủy
                          </Button>
                          <Button
                            className="flex-[2] bg-emerald-500 hover:bg-emerald-600"
                            onClick={handleReportLoss}
                            loading={loading}
                            disabled={
                              loading ||
                              (anhCho.length === 0 &&
                                !selectedInTransitGroup.some(
                                  (t) => (anhTheoChungTu.get(maChungTuCuaDong(t)) || []).length > 0,
                                ))
                            }
                          >
                            {anhCho.length > 0
                              ? `XÁC NHẬN HOÀN TẤT (+${anhCho.length} ẢNH)`
                              : selectedInTransitGroup.some(
                                    (t) => (anhTheoChungTu.get(maChungTuCuaDong(t)) || []).length > 0,
                                  )
                                ? "XÁC NHẬN HOÀN TẤT"
                                : "Cần ảnh minh chứng"}
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
            {activeTab === "export" && !quyen.ghiXuat && (
              <div className="max-w-lg mx-auto text-center py-20 space-y-3">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-black text-slate-900">
                  Tài khoản này không ghi được chiều xuất
                </p>
                <p className="text-[12px] font-bold text-slate-500 leading-relaxed">
                  Vai trò hiện tại là <strong>{tenVaiTro(userRole)}</strong> —
                  vẫn xem được mọi số liệu, chỉ không ghi được ở chiều này. Cần
                  ghi thì nhờ chủ sở hữu đổi vai trò trong mục Người dùng — đổi
                  xong là màn hình này tự mở ra.
                </p>
              </div>
            )}

            {activeTab === "export" &&
              quyen.ghiXuat &&
              renderNhapXuatForm("export")}

            {activeTab === "danhba" && (
              <DanhBa
                laAdmin={isOwner}
                uid={currentUserProfile?.uid || auth.currentUser?.uid || ""}
                email={currentUserProfile?.email || user || ""}
                taiKhoan={
                  isOwner
                    ? allUserProfiles.map((u) => ({
                        uid: u.uid,
                        email: u.email,
                        name: u.name,
                        role: u.role,
                      }))
                    : []
                }
                bao={showNotification}
              />
            )}

            {activeTab === "settings" && isOwner && (
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

                {isOwner && (
                  <Card title="Xoá riêng phần nhập kho">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        Xoá toàn bộ giao dịch nhập kho, các phiếu nhập kèm ảnh
                        đã ký, và các dòng phiếu nhập trong Sổ số phiếu.{" "}
                        <span className="font-black text-slate-700">
                          Tồn đầu kỳ được giữ nguyên.
                        </span>{" "}
                        Xuất kho, đối tác và danh mục sản phẩm cũng giữ nguyên.
                      </p>

                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                        <p className="text-[11px] font-black text-rose-800">
                          Sẽ xoá{" "}
                          {transactions.filter((t) => t.type === "IN").length}{" "}
                          giao dịch nhập kho
                        </p>
                        <p className="text-[11px] font-black text-emerald-700 mt-1">
                          Giữ lại{" "}
                          {
                            transactions.filter((t) => t.type === "OPENING")
                              .length
                          }{" "}
                          dòng tồn đầu kỳ
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        loading={loading}
                        onClick={handleXoaToanBoNhap}
                      >
                        <Trash2 className="w-4 h-4" /> Xoá toàn bộ dữ liệu nhập
                        kho
                      </Button>

                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                        Xoá luôn ảnh phiếu đã ký trên Cloudinary — dữ liệu và
                        ảnh đi một cụm. Chỉ muốn nạp lại số liệu thì nạp đè tệp,
                        không cần xoá. Muốn xoá cả tồn đầu kỳ thì dùng "Dọn
                        sạch" ở thanh bên. Không khôi phục lại được.
                      </p>
                    </div>
                  </Card>
                )}

                {isOwner && (
                  <Card title="Xoá riêng phần xuất kho">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        Xoá toàn bộ giao dịch xuất kho — kể cả dòng hao hụt và
                        đơn đang đi đường — cùng các dòng phiếu xuất trong Sổ số
                        phiếu, để nạp lại tệp từ đầu. Nhập kho, tồn đầu kỳ,
                        phiếu đã ký và đối tác được giữ nguyên.
                      </p>

                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                        <p className="text-[11px] font-black text-rose-800">
                          Đang có{" "}
                          {
                            transactions.filter((t) =>
                              LOAI_CHIEU_XUAT.includes(t.type),
                            ).length
                          }{" "}
                          giao dịch xuất kho trong hệ thống
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        loading={loading}
                        onClick={handleXoaToanBoXuat}
                      >
                        <Trash2 className="w-4 h-4" /> Xoá toàn bộ giao dịch
                        xuất kho
                      </Button>

                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                        Bộ đếm số phiếu xuất đặt lại theo, nên phiếu xuất sau
                        khi xoá đánh lại từ đầu. Bộ đếm bên nhập không bị đụng
                        tới — số phiếu nhập đã in ra giấy, cấp lại là trùng số
                        thật. Không khôi phục lại được.
                      </p>
                    </div>
                  </Card>
                )}

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

                {/*
                  LƯỢT GỌI FIREBASE — ĐO THẬT, không ước tính. Số của mọi máy
                  cộng lại, mỗi máy gửi lên năm phút một lần nên có thể trễ
                  tới năm phút. Xem src/lib/doLuong.ts.
                */}
                <Card title="Lượt gọi Firebase · đo thật">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-bold text-slate-500">
                        Hôm nay theo ngày hạn mức{" "}
                        <span className="font-mono text-slate-700">{ngayHanMuc()}</span>{" "}
                        (giờ Mỹ — đặt lại lúc 14h–15h chiều giờ Việt Nam)
                      </p>
                      <button
                        onClick={() => void taiDoLuong(7)}
                        disabled={dangTaiDoLuong}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <RefreshCw className={cn("w-3 h-3", dangTaiDoLuong && "animate-spin")} />
                        Làm mới
                      </button>
                    </div>

                    <div className="space-y-4">
                      {goiHomNay.map((g) => (
                        <div key={g.loai} className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[12px] font-black text-slate-700">{g.ten}</span>
                            <span className="text-[12px] font-bold text-slate-500 tabular-nums">
                              <strong className="text-slate-900">{formatNumber(g.da)}</strong> /{" "}
                              {formatNumber(g.moc)} · dự báo cuối ngày ~{formatNumber(g.duBao)}
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                g.muc === "nguy"
                                  ? "bg-rose-500"
                                  : g.muc === "chu-y"
                                    ? "bg-amber-400"
                                    : "bg-emerald-500",
                              )}
                              style={{ width: `${Math.min(100, g.phanTram)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <p className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          7 ngày gần nhất
                        </p>
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                              <th className="px-3 py-1.5 text-left">Ngày</th>
                              <th className="px-3 py-1.5 text-right">Đọc</th>
                              <th className="px-3 py-1.5 text-right">Ghi</th>
                              <th className="px-3 py-1.5 text-right">Xoá</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doLuong.slice(0, 7).map((d) => (
                              <tr key={d.ngay} className="border-t border-slate-100 font-bold text-slate-600 tabular-nums">
                                <td className="px-3 py-1.5 font-mono">{d.ngay}</td>
                                <td className={cn("px-3 py-1.5 text-right", mucDo(d.doc, MOC_THAM_CHIEU.doc) === "nguy" && "text-rose-600")}>
                                  {formatNumber(d.doc)}
                                </td>
                                <td className="px-3 py-1.5 text-right">{formatNumber(d.ghi)}</td>
                                <td className="px-3 py-1.5 text-right">{formatNumber(d.xoa)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <p className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Hôm nay ai gọi nhiều nhất
                        </p>
                        <div className="divide-y divide-slate-100">
                          {xepNguoi(doLuong.find((x) => x.ngay === ngayHanMuc())?.nguoi)
                            .slice(0, 8)
                            .map((n) => (
                              <div key={n.khoa} className="px-3 py-1.5 flex items-center justify-between gap-2 text-[12px] font-bold">
                                <span className="truncate text-slate-600">{n.khoa.replace(/_gmail_com$/, "")}</span>
                                <span className="tabular-nums text-slate-700 shrink-0">
                                  {formatNumber(n.so.doc)} đọc · {formatNumber(n.so.ghi)} ghi
                                </span>
                              </div>
                            ))}
                        </div>
                        <p className="px-3 py-2 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                          Máy này từ lúc mở app: {formatNumber(BO_DEM.tongPhien.doc)} đọc ·{" "}
                          {formatNumber(BO_DEM.tongPhien.ghi)} ghi · {formatNumber(BO_DEM.tongPhien.xoa)} xoá
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
                      Mốc so sánh là hạn mức miễn phí mỗi ngày của Firestore bản Standard
                      (50.000 đọc · 20.000 ghi · 20.000 xoá). Cơ sở dữ liệu của app là bản
                      ENTERPRISE nên hạn mức và cách tính tiền có thể khác — số chính xác
                      xem ở Firebase Console → Usage and billing. Mỗi lần mở app tốn khoảng{" "}
                      <strong className="text-slate-600">{formatNumber(storageForecast.docsPerAppOpen)}</strong>{" "}
                      lượt đọc (đọc trọn các bảng).
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
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                      {profile.pinLocked ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                                          <Lock className="w-3 h-3" aria-hidden="true" />
                                          Đang khóa PIN ({Number(profile.pinFailCount || PIN_MAX_ATTEMPTS)}/{PIN_MAX_ATTEMPTS})
                                        </span>
                                      ) : Number(profile.pinFailCount || 0) > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                                          Sai PIN {profile.pinFailCount}/{PIN_MAX_ATTEMPTS} lần
                                        </span>
                                      ) : profile.pinMustChange ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">
                                          Dùng PIN tạm · chờ đổi
                                        </span>
                                      ) : profile.pinHash ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                          Đã đặt mã PIN
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                          Chưa đặt mã PIN
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {laChuSoHuuGoc ? (
                                    <>
                                      <span className="px-3 py-2 rounded-xl bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                                        Toàn quyền
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setCapLaiPinTarget(profile)}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-colors border",
                                          profile.pinLocked
                                            ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                            : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
                                        )}
                                        title="Cấp lại mã PIN cho Chủ sở hữu"
                                      >
                                        {profile.pinLocked ? (
                                          <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                                        ) : (
                                          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                                        )}
                                        <span>
                                          {profile.pinLocked ? "Mở khóa PIN" : "Cấp lại PIN"}
                                        </span>
                                      </button>
                                    </>
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
                                          const nhan = DANH_SACH_VAI_TRO.find(
                                            (v) => v.ma === newRole,
                                          );
                                          if (
                                            newRole !== "PENDING" &&
                                            !window.confirm(
                                              `Đổi vai trò của ${profile.email} thành "${nhan?.ten ?? newRole}"?

${nhan?.moTa ?? ""}

QUAN TRỌNG: phân quyền Firestore phải là bản mới nhất. Nếu chưa dán lại firestore.rules trong Firebase Console thì người này sẽ MẤT HẾT quyền thay vì được thêm.`,
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
                                        {/*
                                          Danh sách và câu mô tả lấy từ
                                          src/lib/quyen.ts — cùng một nơi giao
                                          diện dùng để ẩn hiện nút, nên nhãn
                                          không thể nói khác quyền thật.
                                        */}
                                        {vaiTroDeChon(profile.role).map((v) => (
                                          <option
                                            key={v.ma}
                                            value={v.ma}
                                            title={v.moTa}
                                          >
                                            {v.ten}
                                          </option>
                                        ))}
                                      </select>

                                      <button
                                        type="button"
                                        onClick={() => setCapLaiPinTarget(profile)}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-colors border",
                                          profile.pinLocked
                                            ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                            : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
                                        )}
                                        title={
                                          profile.pinLocked
                                            ? "Mở khóa & cấp lại mã PIN 6 số"
                                            : "Cấp mã PIN tạm hoặc xóa PIN cũ"
                                        }
                                      >
                                        {profile.pinLocked ? (
                                          <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                                        ) : (
                                          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                                        )}
                                        <span>
                                          {profile.pinLocked
                                            ? "Mở khóa & Cấp PIN"
                                            : "Cấp lại PIN"}
                                        </span>
                                      </button>

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

            {/*
              PHÂN HỆ LỊCH SỬ ĐÃ GỠ (28/09/2026), theo yêu cầu của Khoa.

              Nó chỉ bày lại danh sách giao dịch để đọc — không sửa, không xoá.
              Mà hai bảng "Chi tiết nhật ký nhập/xuất kho" trong Báo cáo tổng
              hợp đã liệt kê đúng những giao dịch ấy, kèm lọc theo ngày, theo
              đối tác, xem ảnh chứng từ và nút xoá. Hai màn hình đọc cùng một
              dữ liệu thì người dùng phải nhớ xem thứ mình cần nằm ở đâu.
            */}

            {activeTab === "debt" && daDuocDuyet && quyen.xemXuat && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Công nợ · Hóa đơn
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {theCongNo === "chua-xuat"
                        ? "Đơn còn phải xuất hóa đơn · tải tệp TEMPLATE"
                        : "Điền số và ngày hóa đơn · tra lại · in mẫu Chốt"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-100 rounded-2xl w-fit premium-shadow">
                    {(
                      [
                        {
                          id: "chua-xuat",
                          label: "Chưa xuất hóa đơn",
                          icon: Calculator,
                        },
                        {
                          id: "da-xuat",
                          label: "Đã xuất hóa đơn",
                          icon: CheckCircle,
                        },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheCongNo(t.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                          theCongNo === t.id
                            ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                            : "text-slate-400 hover:text-slate-900 hover:bg-slate-50",
                        )}
                      >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Card>
                  <div className="space-y-6">
                    <DebtExport
                      phan={theCongNo === "da-xuat" ? "da" : "chua"}
                      transactions={giaoDichConHieuLuc}
                      products={products}
                      /* Danh mục ghep: Firestore co the con thieu bo phan BNC,
                         ma thieu ma BP la hoa don sai khach. */
                      partners={donVi}
                      /* Tờ đã bị thay thế (bản lưu) không thuộc công nợ. */
                      hoaDon={hoaDon.filter((h) => !h.biThayTheBoi)}
                      onSaveHoaDon={handleSaveHoaDon}
                      /* Không truyền onGhiDieuChinh: điều chỉnh vào lượt kế
                         tiếp đã thay bằng HÓA ĐƠN THAY THẾ (21/11/2026) — khung
                         cũ chỉ còn xem lại lần đã ghi. */
                      onXoaDieuChinh={isOwner ? handleXoaDieuChinh : undefined}
                    />

                    {/*
                      KHỐI "XUẤT HÓA ĐƠN LÊN SAP" ĐÃ GỠ (29/09/2026).

                      Quy trình phát hành hóa đơn nay đi qua tệp TEMPLATE: tải
                      tệp ở ngay trên, mang sang hệ thống hóa đơn, rồi về điền
                      số thật. Khối SAP là đường thứ hai làm cùng việc ấy, mà
                      hai đường cho một việc thì sớm muộn lệch nhau.

                      Phép dựng tệp SAP vẫn còn nguyên ở `src/lib/sapExport.ts`
                      và `sapTemplate*.ts` cùng các phép kiểm của chúng — con
                      agent SAP ngoài app còn dùng tới.
                    */}

                    {/*
                      Tra cứu nằm NGAY DƯỚI bảng điền số, trong cùng một thẻ.
                      Bảng trên là đơn của đợt đang khai — để điền cho xong;
                      bảng dưới là toàn bộ hóa đơn đã ghi, không phụ thuộc đợt
                      — để tra lại và in mẫu Chốt.
                    */}
                    {theCongNo === "da-xuat" && (
                      <TraCuuHoaDon
                        transactions={giaoDichConHieuLuc}
                        products={products}
                        partners={donVi}
                        hoaDon={hoaDon}
                        /* Nút xoá chỉ hiện với chủ sở hữu, và chỉ ở những hóa
                           đơn mồ côi. */
                        onXoaMoCoi={isOwner ? handleXoaHoaDon : undefined}
                        /* Tải ảnh phiếu xuất theo hóa đơn: kế toán, DNC, admin. */
                        anhTheoChungTu={
                          isOwner || vaiTroXem === "KE_TOAN" || vaiTroXem === "DNC"
                            ? anhTheoChungTu
                            : undefined
                        }
                        bao={showNotification}
                        onThayThe={
                          quyen.doanhThu && quyen.ghiXuat ? handleThayTheHoaDon : undefined
                        }
                        nguoi={currentUserProfile?.email || user || ""}
                      />
                    )}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "xuong" && daDuocDuyet && quyen.lapPhieuXuong && (
              <XuongSanXuatPanel
                products={products}
                transactions={giaoDichConHieuLuc}
                slips={slips}
                approvedSlips={approvedSlips}
                anhTheoChungTu={anhTheoChungTu}
                keHoach={keHoach}
                danhGia={danhGia}
                kiemKeBon={kiemKeBon}
                kiemKeKeg={kiemKeKeg}
                currentUserName={currentUserProfile?.name || user || ""}
                busy={loading}
                onGuiPhieuGiao={handleGuiPhieuXuong}
                onLuuDanhGia={handleLuuDanhGia}
                onLuuKiemKeBon={handleLuuKiemKeBon}
                onLuuKiemKeKegLit={handleLuuKiemKeKegLit}
                nhatKyPhieuContent={renderNhatKyPhieuChungTu()}
                tonDauContent={renderTonDauVaNapLe()}
                isAdmin={isOwner}
                onDuyetKiemKeKeg={handleDuyetKiemKeKeg}
                onXoaDanhGia={handleXoaDanhGia}
                onXoaKiemKeBon={handleXoaKiemKeBon}
                onXoaKiemKeKeg={handleXoaKiemKeKeg}
              />
            )}

            {activeTab === "ql-xuong" && daDuocDuyet && (quyen.duyetXuong || isOwner) && (
              <QuanLyXuongPanel
                products={products}
                transactions={giaoDichConHieuLuc}
                slips={slips}
                approvedSlips={approvedSlips}
                anhTheoChungTu={anhTheoChungTu}
                keHoach={keHoach}
                danhGia={danhGia}
                kiemKeBon={kiemKeBon}
                kiemKeKeg={kiemKeKeg}
                isAdmin={isOwner}
                laGiamSatXuong={vaiTroXem === "QUAN_LY_XUONG" || isOwner}
                busy={loading}
                onDuyetRao1={handleDuyetRao1}
                onKyNhay={isOwner ? handleKyNhayPhieu : undefined}
                onTraLaiPhieu={handleTraLaiPhieu}
                onMoBieuMau={(code) => setBieuMauCode(code)}
                onLuuKeHoach={handleLuuKeHoach}
                onDuyetDanhGia={handleDuyetDanhGia}
                onXoaDanhGia={handleXoaDanhGia}
                onDuyetKiemKeBon={handleDuyetKiemKeBon}
                onXoaKiemKeBon={handleXoaKiemKeBon}
                onDuyetKiemKeKeg={handleDuyetKiemKeKeg}
                onXoaKiemKeKeg={handleXoaKiemKeKeg}
                onLuuKiemKeKegLit={handleLuuKiemKeKegLit}
                nhatKyPhieuContent={renderNhatKyPhieuChungTu()}
              />
            )}

            {activeTab === "kho-tong" && daDuocDuyet && quyen.xemKho && (
              <KhoTongNxtPanel
                products={products}
                partners={donVi}
                transactions={giaoDichConHieuLuc}
                countedTransactions={countedTransactions}
                slips={slips}
                approvedSlips={approvedSlips}
                anhTheoChungTu={anhTheoChungTu}
                kiemKeKeg={kiemKeKeg}
                canApproveGate2={quyen.duyetKhoTong || isOwner}
                canApproveKiemKe={vaiTroXem === "KE_TOAN" || isOwner}
                canWriteInventory={quyen.ghiNhap || quyen.ghiXuat || isOwner}
                isAdmin={isOwner}
                busy={loading}
                onDuyetRao2={handleDuyetRao2}
                onTraLaiPhieu={handleTraLaiPhieu}
                onMoBieuMau={(code) => setBieuMauCode(code)}
                onLuuKiemKeKegLit={handleLuuKiemKeKegLit}
                onDuyetKiemKeKeg={handleDuyetKiemKeKeg}
                onXoaKiemKeKeg={handleXoaKiemKeKeg}
                soKeg={soKeg}
                canGhiSoKeg={isOwner || vaiTroXem === "KE_TOAN"}
                onThemSoKeg={handleThemSoKeg}
                onXoaSoKeg={handleXoaSoKeg}
              />
            )}

            {activeTab === "ketoan-dashboard" &&
              daDuocDuyet &&
              quyen.xemKeHoachDashboard && (
                <KeToanDashboardPanel
                  products={products}
                  transactions={giaoDichConHieuLuc}
                  countedTransactions={countedTransactions}
                  slips={slips}
                  approvedSlips={approvedSlips}
                  anhTheoChungTu={anhTheoChungTu}
                  keHoach={keHoach}
                  kiemKeBon={kiemKeBon}
                />
              )}

            {activeTab === "bnc" && daDuocDuyet && quyen.xemXuat && (
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
                    anhCua={anhCuaDong}
                  />
                </Card>
              </div>
            )}


            {activeTab === "partners" && quyen.xemXuat && (
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
                        {/* Xoá: chỉ admin. */}
                        {isOwner && (
                          <button
                            onClick={() => handleDeletePartner(p.id)}
                            className="p-2 hover:bg-rose-50 rounded-lg transition-colors group/del"
                            title="Xóa đối tác"
                          >
                            <Trash2 className="w-4 h-4 text-gray-300 group-hover/del:text-rose-500" />
                          </button>
                        )}
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
      </NguonChuKyMau.Provider>

      {bieuMauCode && (
        <BieuMauDienTuModal
          code={bieuMauCode}
          transactions={transactions}
          products={products}
          partners={donVi}
          slips={slips}
          anhTheoPhieu={anhTheoChungTu}
          chuKyMau={chuKyMauTheoId}
          onClose={() => setBieuMauCode(null)}
        />
      )}

      {/* Đăng ký chữ ký mẫu: bắt buộc lần đầu (không đóng được), hoặc đổi mẫu. */}
      {pinUnlocked &&
        canSyncData &&
        canChuKy(userRole) &&
        daTaiChuKyMau &&
        (!mauCuaToi || moDoiChuKy) && (
          <DangKyChuKy
            ten={(currentUserProfile?.name || auth.currentUser?.displayName || "").trim()}
            email={currentUserProfile?.email || auth.currentUser?.email || ""}
            laDoiMau={!!mauCuaToi}
            onLuu={async (net, rong, cao) => {
              const ok = await handleLuuChuKyMau(net, rong, cao);
              if (ok) setMoDoiChuKy(false);
              return ok;
            }}
            onDong={mauCuaToi ? () => setMoDoiChuKy(false) : undefined}
          />
        )}

      {choKy && mauCuaToi && (
        <HopKy
          yeuCau={choKy}
          mau={mauCuaToi}
          ten={mauCuaToi.ten}
          onKy={async (pin) => {
            const loi = await xacMinhPinKhiKy(pin);
            if (loi) return loi;
            choKy.xong(mauCuaToi);
            setChoKy(null);
            return null;
          }}
          onHuy={() => {
            choKy.xong(null);
            setChoKy(null);
          }}
        />
      )}
    </div>
  );
}
