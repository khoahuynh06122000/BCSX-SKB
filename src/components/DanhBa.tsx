/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MÀN DANH BẠ — thẻ nhân viên + khung hồ sơ kiểu MySun (thông tin bên trái,
 * Sơ đồ vị trí bên phải). Admin thêm: khung "Tài khoản chưa gắn với nhân
 * viên", gắn tay / chọn người khác / khai tay hồ sơ ngoài MySun. Phép tính ở
 * `src/lib/danhBa.ts`.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Contact, Mail, Phone, Search, UserRound, X } from "lucide-react";
import { db } from "../firebase";
import {
  capTuGan,
  chuCaiDau,
  chuoiQuanLyDuoi,
  goiYGan,
  khopTim,
  kiemKhaiTay,
  mauTen,
  soDuoiQuyen,
  taiKhoanHoatDong,
  viSaoChuaGan,
  type NhanSu,
  type TaiKhoanGan,
} from "../lib/danhBa";
import { tenVaiTro } from "../lib/quyen";
import { cn } from "../lib/utils";

interface Props {
  /** Admin thật (OWNER): thấy toàn bộ + gắn / khai tay. */
  laAdmin: boolean;
  uid: string;
  email: string;
  /** Danh sách tài khoản (chỉ admin có). */
  taiKhoan: TaiKhoanGan[];
  bao: (chu: string, kieu?: "success" | "error") => void;
}

/* Tự gắn chạy MỘT lần mỗi phiên khi admin mở Danh bạ (như app Kiểm kê). */
let daTuGanPhienNay = false;

function Avatar({ ten, lon }: { ten: string; lon?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center text-white font-black",
        lon ? "w-20 h-20 text-2xl" : "w-11 h-11 text-[13px]",
      )}
      style={{ background: mauTen(ten) }}
    >
      {chuCaiDau(ten)}
    </div>
  );
}

const nutNho =
  "px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:border-primary hover:text-primary text-left disabled:opacity-40";

export default function DanhBa({ laAdmin, uid, email, taiKhoan, bao }: Props) {
  const [ds, setDs] = useState<NhanSu[] | null>(null);
  const [loi, setLoi] = useState("");
  const [tim, setTim] = useState("");
  /* Mặc định chỉ hiện người CÓ tài khoản app (anh Khoa 23/11/2026: 838 thẻ
     không cần đọc); gõ tìm thì tìm trong cả danh bạ. */
  const [loc, setLoc] = useState<"" | "tk" | "chua" | "nghi">("tk");
  const [soHien, setSoHien] = useState(60);
  const [moHoSo, setMoHoSo] = useState<NhanSu | null>(null);
  const [khai, setKhai] = useState<{ t: TaiKhoanGan | null; cu: NhanSu | null } | null>(null);
  const dangTuGan = useRef(false);

  const tai = useCallback(async () => {
    try {
      const snap = await getDocs(
        laAdmin
          ? collection(db, "nhan_su")
          : query(collection(db, "nhan_su"), where("coTaiKhoan", "==", true)),
      );
      setDs(snap.docs.map((d) => ({ ...(d.data() as NhanSu), ma_nv: d.id })));
      setLoi("");
    } catch (e) {
      setDs([]);
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, [laAdmin]);

  useEffect(() => {
    void tai();
  }, [tai]);

  /* ------------------------------------------------ gắn tài khoản */
  const gan = async (t: TaiKhoanGan, r: NhanSu | null, cuaAi?: NhanSu) => {
    const b = writeBatch(db);
    const luc = new Date().toISOString();
    // Bỏ gắn chỗ cũ của tài khoản này (một tài khoản ↔ một nhân viên).
    (ds || [])
      .filter((x) => x.uid === t.uid && x.ma_nv !== r?.ma_nv)
      .forEach((x) =>
        b.set(
          doc(db, "nhan_su", x.ma_nv),
          { uid: "", emailTaiKhoan: "", coTaiKhoan: false, ganLuc: luc, ganBoi: email },
          { merge: true },
        ),
      );
    if (r)
      b.set(
        doc(db, "nhan_su", r.ma_nv),
        { uid: t.uid, emailTaiKhoan: t.email, coTaiKhoan: true, ganLuc: luc, ganBoi: email },
        { merge: true },
      );
    else if (cuaAi)
      b.set(
        doc(db, "nhan_su", cuaAi.ma_nv),
        { uid: "", emailTaiKhoan: "", coTaiKhoan: false, ganLuc: luc, ganBoi: email },
        { merge: true },
      );
    await b.commit();
  };

  const ganVaTaiLai = async (t: TaiKhoanGan, r: NhanSu) => {
    if (r.uid && r.uid !== t.uid) {
      if (!window.confirm(`Nhân viên này đang gắn với tài khoản ${r.emailTaiKhoan || r.uid}. Chuyển sang ${t.email}?`))
        return;
    }
    try {
      await gan(t, r);
      bao(`Đã gắn ${t.email} với ${r.ho_ten}`);
      await tai();
    } catch (e) {
      bao(`Chưa gắn được: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  /* Tự gắn KHÔNG cần duyệt: email trùng, hoặc họ tên trùng đúng cả dấu với đúng 1 người. */
  useEffect(() => {
    if (!laAdmin || !ds || !ds.length || !taiKhoan.length || daTuGanPhienNay || dangTuGan.current) return;
    dangTuGan.current = true;
    daTuGanPhienNay = true;
    const cap = capTuGan(taiKhoan, ds);
    if (!cap.length) return;
    (async () => {
      try {
        const b = writeBatch(db);
        const luc = new Date().toISOString();
        cap.forEach(({ t, r }) =>
          b.set(
            doc(db, "nhan_su", r.ma_nv),
            { uid: t.uid, emailTaiKhoan: t.email, coTaiKhoan: true, ganLuc: luc, ganBoi: `${email} (tự gắn)` },
            { merge: true },
          ),
        );
        await b.commit();
        bao(`Đã tự gắn ${cap.length} tài khoản với nhân viên trong danh bạ`);
        await tai();
      } catch (e) {
        console.warn("tu gan", e);
      }
    })();
  }, [laAdmin, ds, taiKhoan, email, tai, bao]);

  const banThan = useMemo(() => (ds || []).find((r) => r.uid === uid), [ds, uid]);
  const taiKhoanCua = (r: NhanSu) => (r.uid ? taiKhoan.find((t) => t.uid === r.uid) : undefined);

  const loc2 = useMemo(() => {
    return (ds || [])
      .filter((r) => {
        if (!laAdmin && r.dang_lam === false) return false;
        if (loc === "nghi") return r.dang_lam === false;
        if (laAdmin && loc && r.dang_lam === false) return false;
        if (loc === "tk" && !r.coTaiKhoan && !tim.trim()) return false;
        if (loc === "chua" && r.coTaiKhoan) return false;
        return khopTim(r, tim);
      })
      .sort((a, b) => String(a.ho_ten || "").localeCompare(String(b.ho_ten || ""), "vi"));
  }, [ds, laAdmin, loc, tim]);

  const moiNhat = useMemo(
    () => (ds || []).reduce((a, r) => (r.cap_nhat_luc && r.cap_nhat_luc > a ? r.cap_nhat_luc : a), ""),
    [ds],
  );

  if (!ds)
    return <p className="py-16 text-center text-sm font-black text-slate-400">Đang tải danh bạ…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Contact className="w-6 h-6 text-primary" /> Danh bạ nhân viên
          </h3>
          <p className="text-[12px] font-bold text-slate-500 mt-1">
            {laAdmin
              ? `Toàn bộ nhân viên Vp Bà Nà theo danh bạ MySun · ${ds.length} người${
                  moiNhat ? ` · cập nhật ${new Date(moiNhat).toLocaleString("vi-VN")}` : ""
                }`
              : "Chỉ hiện nhân viên đã có tài khoản app."}
          </p>
        </div>
        {banThan && (
          <button onClick={() => setMoHoSo(banThan)} className={cn(nutNho, "inline-flex items-center gap-1.5")}>
            <UserRound className="w-4 h-4" /> Hồ sơ của tôi
          </button>
        )}
      </div>

      {loi && (
        <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] font-bold text-amber-800">
          Danh bạ chưa sẵn sàng — thử lại sau. ({loi})
        </p>
      )}
      {!loi && ds.length === 0 && (
        <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-500">
          {laAdmin
            ? "Chưa có dữ liệu danh bạ — agent MySun chạy 17h Chủ nhật sẽ đưa vào."
            : "Chưa có nhân viên nào gắn tài khoản app."}
        </p>
      )}

      {laAdmin && ds.length > 0 && (
        <KhungGan
          ds={ds}
          taiKhoan={taiKhoan}
          onGan={ganVaTaiLai}
          onKhai={(t) => setKhai({ t, cu: null })}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={tim}
            onChange={(e) => {
              setTim(e.target.value);
              setSoHien(60);
            }}
            placeholder="Tìm theo tên, email, SĐT, mã NV…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:border-primary focus:outline-none premium-shadow"
          />
        </div>
        {laAdmin && (
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["tk", "Có tài khoản app"],
                ["", "Tất cả"],
                ["chua", "Chưa có tài khoản"],
                ["nghi", "Đã nghỉ việc"],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                onClick={() => {
                  setLoc(k);
                  setSoHien(60);
                }}
                className={cn(
                  "px-3 py-2 rounded-full text-[11px] font-black uppercase tracking-wide border transition-all",
                  loc === k
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-900",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[12px] font-bold text-slate-400">
        {loc2.length} nhân viên
        {loc === "tk" && !tim.trim() ? " có tài khoản app · gõ tên để tìm trong cả danh bạ" : ""}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loc2.slice(0, soHien).map((r) => (
          <button
            key={r.ma_nv}
            onClick={() => setMoHoSo(r)}
            className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 bg-white text-left hover:border-primary/40 hover:-translate-y-0.5 transition-all premium-shadow"
          >
            <Avatar ten={r.ho_ten} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-black text-slate-900 truncate">{r.ho_ten}</p>
              {r.chuc_danh && <p className="text-[12px] font-bold text-slate-600 truncate">{r.chuc_danh}</p>}
              {r.bo_phan && <p className="text-[11px] font-medium text-slate-400 truncate">{r.bo_phan}</p>}
              {laAdmin && r.coTaiKhoan && (
                <p className="text-[11px] font-black text-emerald-700 mt-0.5">👤 Có tài khoản app</p>
              )}
              {r.dang_lam === false && <p className="text-[11px] font-black text-rose-600">Đã nghỉ việc</p>}
            </div>
            {r.cap_do && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                Cấp {r.cap_do}
              </span>
            )}
          </button>
        ))}
      </div>
      {loc2.length > soHien && (
        <button
          onClick={() => setSoHien((n) => n + 60)}
          className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-[12px] font-black text-slate-600 hover:text-primary"
        >
          ▾ Xem thêm ({loc2.length - soHien})
        </button>
      )}

      {moHoSo && (
        <HoSoNhanVien
          r={moHoSo}
          ds={ds}
          laAdmin={laAdmin}
          taiKhoan={taiKhoanCua(moHoSo)}
          onDong={() => setMoHoSo(null)}
          onSua={() => {
            setKhai({ t: null, cu: moHoSo });
            setMoHoSo(null);
          }}
          onXoa={async () => {
            const r = moHoSo;
            if (!window.confirm(`Xóa hồ sơ ${r.ho_ten}? Tài khoản app gắn với hồ sơ này sẽ bỏ gắn.`)) return;
            try {
              await deleteDoc(doc(db, "nhan_su", r.ma_nv));
              setMoHoSo(null);
              bao("Đã xóa hồ sơ khai tay");
              await tai();
            } catch (e) {
              bao(`Chưa xóa được: ${e instanceof Error ? e.message : String(e)}`, "error");
            }
          }}
        />
      )}

      {khai && (
        <KhaiTay
          t={khai.t}
          cu={khai.cu}
          me={banThan}
          onDong={() => setKhai(null)}
          onLuu={async (v) => {
            try {
              if (khai.cu) {
                await setDoc(doc(db, "nhan_su", khai.cu.ma_nv), { ...v, cap_nhat_luc: new Date().toISOString() }, { merge: true });
                bao("Đã lưu");
              } else {
                const ma = "NB-" + Date.now().toString(36).toUpperCase().slice(-6);
                const luc = new Date().toISOString();
                await setDoc(doc(db, "nhan_su", ma), {
                  ...v,
                  ma_nv: ma,
                  dang_lam: true,
                  nguon: "app",
                  quan_ly: banThan ? chuoiQuanLyDuoi(banThan) : [],
                  so_cap_duoi: 0,
                  cap_nhat_luc: luc,
                  ...(khai.t
                    ? { uid: khai.t.uid, emailTaiKhoan: khai.t.email, coTaiKhoan: true, ganLuc: luc, ganBoi: email }
                    : { coTaiKhoan: false }),
                });
                bao(khai.t ? "Đã khai và gắn tài khoản" : "Đã khai hồ sơ");
              }
              setKhai(null);
              await tai();
            } catch (e) {
              bao(`Máy chủ chưa nhận hồ sơ: ${e instanceof Error ? e.message : String(e)}`, "error");
            }
          }}
        />
      )}
    </div>
  );
}

/* ================================================= khung hồ sơ */
function HoSoNhanVien({
  r,
  ds,
  laAdmin,
  taiKhoan,
  onDong,
  onSua,
  onXoa,
}: {
  r: NhanSu;
  ds: NhanSu[];
  laAdmin: boolean;
  taiKhoan?: TaiKhoanGan;
  onDong: () => void;
  onSua: () => void;
  onXoa: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onDong();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onDong]);
  const ql = Array.isArray(r.quan_ly) ? r.quan_ly : [];
  const dong = (k: string, v: ReactNode) =>
    v == null || v === "" ? null : (
      <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-slate-100 text-[13px]">
        <span className="font-bold text-slate-400">{k}</span>
        <span className="font-bold text-slate-800 break-words">{v}</span>
      </div>
    );
  const nut = (p: { ho_ten: string; chuc_danh?: string | null; so_duoi: number }, lv: number, toi: boolean) => (
    <div
      key={`${lv}-${p.ho_ten}`}
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-xl border bg-white",
        toi ? "border-primary ring-2 ring-primary/15" : "border-slate-200",
      )}
      style={{ marginLeft: Math.min(lv, 8) * 14 }}
      title={`${p.ho_ten}${p.chuc_danh ? ` — ${p.chuc_danh}` : ""}`}
    >
      <div
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-black"
        style={{ background: mauTen(p.ho_ten) }}
      >
        {chuCaiDau(p.ho_ten)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black text-slate-900 truncate">{p.ho_ten}</p>
        {p.chuc_danh && <p className="text-[11px] font-medium text-slate-500 truncate">{p.chuc_danh}</p>}
      </div>
      <span className="shrink-0 min-w-7 px-1.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-black text-slate-600 text-center">
        {p.so_duoi || 0}
      </span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onDong()}
    >
      <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-3xl overflow-y-auto grid grid-cols-1 md:grid-cols-2 animate-in zoom-in-95 duration-200">
        <button
          onClick={onDong}
          aria-label="Đóng"
          className="absolute top-3 right-3 p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center gap-2">
            <Avatar ten={r.ho_ten} lon />
            <h2 className="text-xl font-black text-slate-900">{r.ho_ten}</h2>
            {r.chuc_danh && <p className="text-[13px] font-bold text-slate-500">{r.chuc_danh}</p>}
          </div>
          <div>
            {r.cap_do &&
              dong(
                "Cấp",
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-black">Cấp {r.cap_do}</span>,
              )}
            {dong("Mã nhân viên", r.ma_nv)}
            {dong("Đơn vị", r.bo_phan)}
            {dong("Địa điểm làm việc", "Vp Bà Nà")}
            {dong(
              "Trạng thái làm việc",
              <span className={r.dang_lam === false ? "text-rose-600" : "text-emerald-700"}>
                {r.dang_lam === false ? "Đã nghỉ việc" : "Đang làm việc"}
              </span>,
            )}
            {r.email_cty &&
              dong(
                "Email công việc",
                <a href={`mailto:${r.email_cty}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Mail className="w-3.5 h-3.5" /> {r.email_cty}
                </a>,
              )}
            {r.sdt &&
              dong(
                "Số điện thoại",
                <a
                  href={`tel:${String(r.sdt).replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" /> {r.sdt}
                </a>,
              )}
            {laAdmin &&
              dong(
                "Tài khoản app",
                r.coTaiKhoan
                  ? `${r.emailTaiKhoan || ""}${taiKhoan ? ` · ${tenVaiTro(taiKhoan.role)}` : ""}`
                  : "Chưa có tài khoản",
              )}
            {laAdmin && r.nguon === "app" && dong("Nguồn", "Admin khai tay (ngoài MySun)")}
          </div>
          {laAdmin && r.nguon === "app" && (
            <div className="flex gap-2">
              <button onClick={onSua} className={nutNho}>
                ✎ Sửa thông tin
              </button>
              <button onClick={onXoa} className={cn(nutNho, "text-rose-600")}>
                🗑 Xóa hồ sơ khai tay
              </button>
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-50/70 space-y-3 md:border-l border-slate-100">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-500">Sơ đồ vị trí</h3>
          <div className="space-y-2">
            {ql.map((p, i) => nut({ ...p, so_duoi: soDuoiQuyen(p.ma_nv, p.so_duoi, ds) }, i, false))}
            {nut(
              { ho_ten: r.ho_ten, chuc_danh: r.chuc_danh, so_duoi: soDuoiQuyen(r.ma_nv, r.so_cap_duoi, ds) },
              ql.length,
              true,
            )}
          </div>
          <p className="text-[11px] font-bold text-slate-400">
            {ql.length
              ? "Số bên phải = số người quản lý trực tiếp."
              : "Chưa có sơ đồ quản lý — danh bạ sẽ cập nhật ở lần đồng bộ tới."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================= khung gắn tài khoản (admin) */
function KhungGan({
  ds,
  taiKhoan,
  onGan,
  onKhai,
}: {
  ds: NhanSu[];
  taiKhoan: TaiKhoanGan[];
  onGan: (t: TaiKhoanGan, r: NhanSu) => Promise<void>;
  onKhai: (t: TaiKhoanGan) => void;
}) {
  const [moChon, setMoChon] = useState("");
  const [go, setGo] = useState("");
  const daGan = useMemo(() => new Set(ds.filter((r) => r.uid).map((r) => r.uid as string)), [ds]);
  /* MỌI tài khoản đang hoạt động phải gắn với nhân viên — kể cả admin: chữ
     ký điện tử lấy họ tên, email MySun, mã CBNV từ đây (23/11/2026). */
  const chua = taiKhoan
    .filter((t) => taiKhoanHoatDong(t) && !daGan.has(t.uid))
    .sort(
      (a, b) =>
        tenVaiTro(a.role).localeCompare(tenVaiTro(b.role), "vi") ||
        String(a.name || "").localeCompare(String(b.name || ""), "vi"),
    );
  if (!chua.length)
    return (
      <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] font-bold text-emerald-800">
        Mọi tài khoản đang hoạt động đã gắn với nhân viên trong danh bạ.
      </p>
    );
  let nhomTruoc = "";
  const nutChon = (t: TaiKhoanGan, r: NhanSu) => (
    <button key={r.ma_nv} onClick={() => onGan(t, r)} className={nutNho}>
      {r.ho_ten} · {r.ma_nv} · {r.chuc_danh || ""}
      {r.bo_phan ? ` · ${r.bo_phan}` : ""}
      {r.dang_lam === false ? " · đã nghỉ" : ""}
    </button>
  );
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <div>
        <p className="text-[13px] font-black text-slate-900">
          Tài khoản chưa gắn với nhân viên ({chua.length}) — chưa gắn thì chưa ký điện tử được
        </p>
        <p className="text-[12px] font-medium text-slate-500 mt-0.5">
          Trùng họ tên hoặc email là app tự gắn. Còn lại ở đây là tên trùng nhiều người, nhân viên đã gắn tài
          khoản khác, hoặc không có trong danh bạ (thường là thời vụ, sinh viên thực tập, đã nghỉ việc).
        </p>
      </div>
      {chua.map((t) => {
        const nhom = tenVaiTro(t.role);
        const dauNhom = nhom !== nhomTruoc;
        nhomTruoc = nhom;
        const g = goiYGan(t, ds);
        const vs = g ? null : viSaoChuaGan(t, ds);
        const ketQua = moChon === t.uid ? ds.filter((r) => khopTim(r, go)).slice(0, 6) : [];
        return (
          <div key={t.uid} className="space-y-1.5">
            {dauNhom && (
              <p className="pt-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                {nhom} ({chua.filter((x) => tenVaiTro(x.role) === nhom).length})
              </p>
            )}
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-slate-900">
                    {t.name || "—"} <span className="font-medium text-slate-400">· {t.email}</span>
                  </p>
                  {g && (
                    <p className="text-[12px] font-medium text-slate-500">
                      Gợi ý: {g.r.ho_ten} · {g.r.chuc_danh || ""} · {g.r.bo_phan || ""} (trùng {g.lyDo})
                      {g.r.uid && ` — đang gắn với tài khoản ${g.r.emailTaiKhoan}`}
                    </p>
                  )}
                  {vs && <p className="text-[12px] font-medium text-slate-500">{vs.lyDo}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g && (
                    <button
                      onClick={() => onGan(t, g.r)}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-black"
                    >
                      Gắn
                    </button>
                  )}
                  {!g && (
                    <button onClick={() => onKhai(t)} className={nutNho}>
                      Khai thông tin & duyệt
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMoChon(moChon === t.uid ? "" : t.uid);
                      setGo(t.name || "");
                    }}
                    className={nutNho}
                  >
                    Chọn nhân viên khác…
                  </button>
                </div>
              </div>
              {vs && vs.chon.length > 0 && (
                <div className="flex flex-col gap-1">{vs.chon.slice(0, 8).map((r) => nutChon(t, r))}</div>
              )}
              {moChon === t.uid && (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    value={go}
                    onChange={(e) => setGo(e.target.value)}
                    placeholder="Gõ tên, mã NV hoặc email…"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] font-bold outline-none focus:border-primary"
                  />
                  <div className="flex flex-col gap-1">{ketQua.map((r) => nutChon(t, r))}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================= khai tay (admin) */
function KhaiTay({
  t,
  cu,
  me,
  onDong,
  onLuu,
}: {
  t: TaiKhoanGan | null;
  cu: NhanSu | null;
  me?: NhanSu;
  onDong: () => void;
  onLuu: (v: { ho_ten: string; email_cty: string; sdt: string; chuc_danh: string; bo_phan: string; cap_do: string }) => Promise<void>;
}) {
  const [v, setV] = useState({
    ho_ten: cu?.ho_ten || t?.name || "",
    email_cty: cu?.email_cty || (/@(banahills|sungroup)\./i.test(t?.email || "") ? t?.email || "" : ""),
    sdt: cu?.sdt || "",
    chuc_danh: cu?.chuc_danh || "Nhân viên Kế toán",
    bo_phan: cu?.bo_phan || me?.bo_phan || "",
    cap_do: cu?.cap_do || "",
  });
  const [msg, setMsg] = useState("");
  const [dang, setDang] = useState(false);
  const ql = cu ? cu.quan_ly || [] : me ? chuoiQuanLyDuoi(me) : null;
  const qlTT = ql && ql.length ? ql[ql.length - 1] : null;
  const o = (k: keyof typeof v, nhan: string, kieu = "text") => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{nhan}</span>
      <input
        type={kieu}
        value={v[k]}
        onChange={(e) => setV({ ...v, [k]: e.target.value })}
        className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold outline-none focus:border-primary"
      />
    </label>
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[210] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onDong()}
    >
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900">
          {cu ? "Sửa hồ sơ khai tay" : "Khai thông tin & duyệt ngoài MySun"}
        </h3>
        {!cu && !me ? (
          <p className="text-[13px] font-bold text-rose-600">
            Tài khoản admin của anh/chị chưa gắn với nhân viên trong danh bạ — gắn trước để hồ sơ khai tay nằm dưới
            anh/chị trong sơ đồ vị trí.
          </p>
        ) : (
          <>
            <p className="text-[12px] font-bold text-slate-500">
              Quản lý trực tiếp: {qlTT ? `${qlTT.ho_ten}${qlTT.chuc_danh ? ` · ${qlTT.chuc_danh}` : ""}` : "—"}
              {t ? ` · gắn tài khoản ${t.email}` : ""}
            </p>
            {o("ho_ten", "Họ tên")}
            {o("email_cty", "Email công ty", "email")}
            {o("sdt", "Số điện thoại", "tel")}
            {o("chuc_danh", "Chức danh")}
            {o("bo_phan", "Đơn vị")}
            {o("cap_do", "Cấp")}
          </>
        )}
        {msg && <p className="text-[12px] font-bold text-rose-600">{msg}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onDong} className={nutNho}>
            Hủy
          </button>
          {(cu || me) && (
            <button
              disabled={dang}
              onClick={async () => {
                const k = kiemKhaiTay(v);
                if (k.loi) return setMsg(k.loi);
                if (k.canhBao && !window.confirm(k.canhBao)) return;
                setDang(true);
                setMsg("");
                const s = Object.fromEntries(Object.entries(v).map(([a, b]) => [a, String(b).trim()])) as typeof v;
                await onLuu(s);
                setDang(false);
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-black disabled:opacity-40"
            >
              {cu ? "Lưu" : t ? "Lưu & gắn tài khoản" : "Lưu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
