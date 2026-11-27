/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TAB "SỰ CỐ HỆ THỐNG" (chỉ admin) — khối 3 + 4 của hệ báo sự cố (src/lib/suCo.ts).
 *   · Sự cố đang mở   — bot agent/canh_bao.py ghi `su_co`; admin đánh dấu đã xử lý
 *                        (bot thôi nhắc) rồi được hỏi ghi bài học.
 *   · Lỗi 24 giờ      — `loi_app` gộp theo nội dung.
 *   · Thông báo bộ phận — dải trên đầu app cho mọi người (`thong_bao_app`).
 *   · Sổ tay & bài học — `so_tay`; bài học có dấu hiệu nhận diện thì bot báo ♻️ TÁI PHÁT.
 * Đọc bằng getDocs lúc mở tab / bấm Tải lại — không nghe liên tục (giữ hạn mức đọc).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, limit, orderBy, query, where } from "firebase/firestore";
import { BookOpen, Bug, Megaphone, RefreshCw, Siren } from "lucide-react";
import { db } from "../firebase";
import { getDocs, setDoc, updateDoc, writeBatch } from "../lib/firestoreDem";
import { cn } from "../lib/utils";
import { vnNorm } from "../lib/danhBa";
import {
  gopLoi,
  mucNhomLoi,
  PHAN_LAM_TAM,
  soanThongBao,
  TEN_MUC,
  type LoiApp,
  type MucSoTay,
  type MucSuCo,
  type SuCo,
  type ThongBaoApp,
} from "../lib/suCo";
import { KHO_LOI_APP } from "../lib/ghiLoi";

type Viec = "suco" | "loi" | "thongbao" | "sotay";

const mauMuc: Record<MucSuCo, string> = {
  S1: "bg-rose-100 text-rose-700 border-rose-200",
  S2: "bg-orange-100 text-orange-700 border-orange-200",
  S3: "bg-amber-50 text-amber-700 border-amber-200",
};
const nut = "px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-black text-slate-600 hover:text-primary hover:border-primary/40";
const o = "w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] font-bold outline-none focus:border-primary";
const gio = (s?: string) => {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString("vi-VN", { hour12: false });
};

export default function SuCoHeThong({ email, bao }: { email: string; bao: (m: string, t?: "success" | "error") => void }) {
  const [viec, setViec] = useState<Viec>("suco");
  const [dangTai, setDangTai] = useState(false);
  const [suCo, setSuCo] = useState<SuCo[]>([]);
  const [loi, setLoi] = useState<LoiApp[]>([]);
  const [tb, setTb] = useState<ThongBaoApp[]>([]);
  const [soTay, setSoTay] = useState<MucSoTay[]>([]);
  const [sua, setSua] = useState<MucSoTay | null>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const tu = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [a, b, c, d] = await Promise.all([
        getDocs(query(collection(db, "su_co"), orderBy("capNhatLuc", "desc"), limit(60))),
        getDocs(query(collection(db, KHO_LOI_APP), where("luc", ">=", tu), orderBy("luc", "desc"), limit(500))),
        getDocs(query(collection(db, "thong_bao_app"), orderBy("luc", "desc"), limit(30))),
        getDocs(collection(db, "so_tay")),
      ]);
      setSuCo(a.docs.map((x) => ({ ...(x.data() as SuCo), id: x.id })).filter((x) => !x.id.startsWith("_")));
      setLoi(b.docs.map((x) => ({ ...(x.data() as LoiApp), id: x.id })));
      setTb(c.docs.map((x) => ({ ...(x.data() as ThongBaoApp), id: x.id })));
      setSoTay(d.docs.map((x) => ({ ...(x.data() as MucSoTay), id: x.id })));
    } catch (e) {
      bao(`Chưa tải được: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setDangTai(false);
    }
  }, [bao]);
  useEffect(() => {
    void tai();
  }, [tai]);

  const luc = () => new Date().toISOString();

  /* ------------------------------ sự cố */
  const dangMo = suCo.filter((s) => !s.dongLuc && !s.daXuLy);
  const daDong = suCo.filter((s) => s.dongLuc || s.daXuLy).slice(0, 20);
  const xuLySuCo = async (s: SuCo) => {
    try {
      await updateDoc(doc(db, "su_co", s.id), { daXuLy: true, xuLyLuc: luc(), xuLyBoi: email });
      bao("Đã đánh dấu đã xử lý — bot thôi nhắc sự cố này");
      if (window.confirm("Ghi bài học cho sự cố này? (để bot nhận ra nếu nó quay lại)")) {
        setViec("sotay");
        setSua({
          id: `app-${Date.now()}`,
          loai: "bai_hoc",
          tieuDe: s.tieuDe,
          muc: s.muc,
          trieuChung: s.dauHieu,
          maSuCo: s.id,
          khoaNhanDien: s.id.split("|")[0],
        });
      }
      await tai();
    } catch (e) {
      bao(`Máy chủ chưa nhận: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  /* ------------------------------ lỗi 24 giờ */
  const nhom = useMemo(() => gopLoi(loi), [loi]);
  const xuLyNhom = async (ids: string[]) => {
    try {
      const lo = writeBatch(db);
      ids.slice(0, 450).forEach((id) => lo.update(doc(db, KHO_LOI_APP, id), { daXuLy: true }));
      await lo.commit();
      bao("Đã đánh dấu cả nhóm lỗi là đã xử lý");
      await tai();
    } catch (e) {
      bao(`Máy chủ chưa nhận: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  /* ------------------------------ thông báo bộ phận */
  const [tbKieu, setTbKieu] = useState<"dang_loi" | "da_sua">("dang_loi");
  const [tbPhan, setTbPhan] = useState(PHAN_LAM_TAM[0].phan);
  const [tbGio, setTbGio] = useState("");
  const [tbNoiDung, setTbNoiDung] = useState(() => soanThongBao("dang_loi", PHAN_LAM_TAM[0].phan));
  const soanLai = (k: typeof tbKieu, p: string, g: string) => setTbNoiDung(soanThongBao(k, p, g));
  const batThongBao = async () => {
    if (!tbNoiDung.trim()) return;
    try {
      const lo = writeBatch(db);
      // Bật "đã sửa xong" thì tắt các tin "đang lỗi" đang bật.
      if (tbKieu === "da_sua") tb.filter((x) => x.bat && x.kieu === "dang_loi").forEach((x) => lo.update(doc(db, "thong_bao_app", x.id), { bat: false }));
      const id = `tb-${Date.now()}`;
      lo.set(doc(db, "thong_bao_app", id), { id, kieu: tbKieu, phan: tbPhan, noiDung: tbNoiDung.trim().slice(0, 600), bat: true, luc: luc(), boi: email });
      await lo.commit();
      bao("Đã bật thông báo — mọi người thấy ở đầu app trong vài phút");
      await tai();
    } catch (e) {
      bao(`Máy chủ chưa nhận: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };
  const tatThongBao = async (x: ThongBaoApp) => {
    try {
      await updateDoc(doc(db, "thong_bao_app", x.id), { bat: false });
      await tai();
    } catch (e) {
      bao(`Máy chủ chưa nhận: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  /* ------------------------------ sổ tay */
  const [tim, setTim] = useState("");
  const soTayLoc = useMemo(() => {
    const q = vnNorm(tim);
    return soTay
      .filter((x) => !q || vnNorm([x.tieuDe, x.trieuChung, x.nguyenNhan, x.xuLy, x.chanTaiPhat, x.khoaNhanDien].join(" ")).includes(q))
      .sort((a, b) => (a.loai === b.loai ? String(b.ngaySua || b.capNhatLuc || "").localeCompare(String(a.ngaySua || a.capNhatLuc || "")) : a.loai === "huong_dan" ? -1 : 1));
  }, [soTay, tim]);
  const luuSoTay = async () => {
    if (!sua || !sua.tieuDe.trim()) return bao("Thiếu tiêu đề", "error");
    try {
      const ghi = Object.fromEntries(Object.entries({ ...sua, capNhatBoi: email, capNhatLuc: luc() }).filter(([, v]) => v !== undefined));
      await setDoc(doc(db, "so_tay", sua.id), ghi);
      bao("Đã lưu vào sổ tay");
      setSua(null);
      await tai();
    } catch (e) {
      bao(`Máy chủ chưa nhận: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  const the = (id: Viec, nhan: string, Icon: typeof Siren, so?: number) => (
    <button
      key={id}
      onClick={() => setViec(id)}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wide border",
        viec === id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200",
      )}
    >
      <Icon className="w-4 h-4" /> {nhan}
      {!!so && <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px]">{so}</span>}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Siren className="w-6 h-6 text-rose-600" /> Sự cố hệ thống
          </h3>
          <p className="text-[12px] font-bold text-slate-500 mt-1">
            Bot kiểm 17h hằng ngày trên máy admin, báo Telegram. Lỗi người dùng gặp được app tự ghi.
          </p>
        </div>
        <button onClick={() => void tai()} className={cn(nut, "inline-flex items-center gap-1.5")} disabled={dangTai}>
          <RefreshCw className={cn("w-4 h-4", dangTai && "animate-spin")} /> Tải lại
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {the("suco", "Sự cố đang mở", Siren, dangMo.length)}
        {the("loi", "Lỗi 24 giờ", Bug, nhom.filter((n) => !n.daXuLy).length)}
        {the("thongbao", "Thông báo bộ phận", Megaphone, tb.filter((x) => x.bat).length)}
        {the("sotay", "Sổ tay & bài học", BookOpen)}
      </div>

      {viec === "suco" && (
        <div className="space-y-2">
          {!dangMo.length && (
            <p className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[13px] font-bold text-emerald-800">
              Không có sự cố nào đang mở.
            </p>
          )}
          {dangMo.map((s) => (
            <div key={s.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-black text-slate-900">
                  <span className={cn("mr-2 px-2 py-0.5 rounded-full border text-[10px]", mauMuc[s.muc])}>{TEN_MUC[s.muc]}</span>
                  {s.tieuDe}
                  {s.taiPhat && <span className="ml-2 text-[11px] text-rose-600">♻️ tái phát</span>}
                </p>
                <button onClick={() => void xuLySuCo(s)} className={nut}>Đánh dấu đã xử lý</button>
              </div>
              <p className="text-[12px] font-bold text-slate-600">{s.dauHieu}</p>
              {s.lyDo?.length ? <ul className="list-disc ml-5 text-[12px] text-slate-600">{s.lyDo.map((x) => <li key={x}>{x}</li>)}</ul> : null}
              {s.canLam && <p className="text-[12px] font-black text-slate-800">Cần làm: {s.canLam}</p>}
              {s.traO && <p className="text-[11px] font-bold text-slate-500">🔎 Tra ở: {s.traO}</p>}
              <p className="text-[10px] font-mono text-slate-400">{s.id} · mở {gio(s.moLuc)} · cập nhật {gio(s.capNhatLuc)}</p>
            </div>
          ))}
          {daDong.length > 0 && (
            <details className="pt-2">
              <summary className="text-[12px] font-black text-slate-500 cursor-pointer">Đã đóng gần đây ({daDong.length})</summary>
              <div className="mt-2 space-y-1">
                {daDong.map((s) => (
                  <p key={s.id} className="text-[12px] text-slate-500">
                    {TEN_MUC[s.muc]} · {s.tieuDe} · {gio(s.dongLuc || s.capNhatLuc)} {s.daXuLy ? "· admin đã xử lý" : "· tự ổn lại"}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {viec === "loi" && (
        <div className="space-y-2">
          {!nhom.length && <p className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[13px] font-bold text-emerald-800">24 giờ qua không ai gặp lỗi.</p>}
          {nhom.map((n) => {
            const m = mucNhomLoi(n);
            return (
              <div key={n.khoa} className={cn("p-4 rounded-2xl bg-white border space-y-1", n.daXuLy ? "border-slate-100 opacity-60" : "border-slate-200")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[13px] font-black text-slate-900 break-words min-w-0 flex-1">
                    <span className={cn("mr-2 px-2 py-0.5 rounded-full border text-[10px]", mauMuc[m])}>{m}</span>
                    {n.thongDiep}
                  </p>
                  {!n.daXuLy && <button onClick={() => void xuLyNhom(n.ids)} className={nut}>Đã xử lý</button>}
                </div>
                <p className="text-[11px] font-bold text-slate-500">
                  {n.soNguoi} người · {n.soLan} lần · {n.soMay} máy · màn {n.man.join(", ") || "—"} · bản {n.ban.join(", ") || "—"} · {n.loai}
                  {n.ma ? ` · ${n.ma}` : ""} · {gio(n.dau)} → {gio(n.cuoi)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {viec === "thongbao" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <p className="text-[13px] font-black text-slate-900">Soạn thông báo</p>
            <div className="flex gap-2">
              {(["dang_loi", "da_sua"] as const).map((k) => (
                <button key={k} onClick={() => { setTbKieu(k); soanLai(k, tbPhan, tbGio); }} className={cn(nut, tbKieu === k && "border-slate-900 text-slate-900")}>
                  {k === "dang_loi" ? "⚠ Đang lỗi" : "✅ Đã sửa xong"}
                </button>
              ))}
            </div>
            <select value={tbPhan} onChange={(e) => { setTbPhan(e.target.value); soanLai(tbKieu, e.target.value, tbGio); }} className={o}>
              {PHAN_LAM_TAM.map((x) => <option key={x.phan}>{x.phan}</option>)}
            </select>
            {tbKieu === "dang_loi" && (
              <input value={tbGio} onChange={(e) => { setTbGio(e.target.value); soanLai(tbKieu, tbPhan, e.target.value); }} placeholder="Từ mấy giờ (vd 14h30) — tuỳ chọn" className={o} />
            )}
            <textarea value={tbNoiDung} onChange={(e) => setTbNoiDung(e.target.value)} rows={5} className={o} />
            <p className="text-[11px] font-semibold text-slate-400">Viết theo hệ quả nghiệp vụ, không nói chuyện máy chủ. Bật "Đã sửa xong" tự tắt các tin "Đang lỗi".</p>
            <button onClick={() => void batThongBao()} className="px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-black">Bật thông báo</button>
          </div>
          <div className="space-y-2">
            {tb.map((x) => (
              <div key={x.id} className={cn("p-3 rounded-xl border text-[12px]", x.bat ? "bg-white border-amber-300" : "bg-slate-50 border-slate-100 text-slate-400")}>
                <p className="font-bold">{x.noiDung}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px]">{gio(x.luc)} · {x.bat ? "ĐANG BẬT" : "đã tắt"}</span>
                  {x.bat && <button onClick={() => void tatThongBao(x)} className={nut}>Tắt</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viec === "sotay" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm (không cần dấu)…" className={cn(o, "flex-1 min-w-48")} />
            <button onClick={() => setSua({ id: `app-${Date.now()}`, loai: "bai_hoc", tieuDe: "", muc: "S2" })} className={nut}>+ Thêm mục</button>
          </div>
          <p className="text-[11px] font-semibold text-slate-400">
            Bot xuất sổ tay ra docs/SO-TAY-SU-CO.md (repo công khai) — không ghi tên người, khoá, số tiền vào đây.
          </p>
          {sua && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
              <div className="flex gap-2">
                <select value={sua.loai} onChange={(e) => setSua({ ...sua, loai: e.target.value as MucSoTay["loai"] })} className={o}>
                  <option value="bai_hoc">Bài học (lỗi đã sửa)</option>
                  <option value="huong_dan">Hướng dẫn xử lý</option>
                </select>
                <select value={sua.muc} onChange={(e) => setSua({ ...sua, muc: e.target.value as MucSuCo })} className={o}>
                  {(["S1", "S2", "S3"] as const).map((m) => <option key={m} value={m}>{TEN_MUC[m]}</option>)}
                </select>
              </div>
              {(
                [
                  ["tieuDe", "Tiêu đề"],
                  ["trieuChung", "Triệu chứng (người dùng thấy gì)"],
                  ["nguyenNhan", "Nguyên nhân gốc"],
                  ["kiemTra", "Kiểm tra"],
                  ["xuLy", "Xử lý"],
                  ["chanTaiPhat", "Chặn tái phát (quy tắc để không tái phạm)"],
                  ["khoaNhanDien", "Dấu hiệu nhận diện (chuỗi trong câu lỗi / đầu mã sự cố, cách nhau bằng |)"],
                ] as [keyof MucSoTay, string][]
              ).map(([k, nhan]) => (
                <label key={k} className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{nhan}</span>
                  <textarea rows={k === "tieuDe" || k === "khoaNhanDien" ? 1 : 2} value={String(sua[k] ?? "")} onChange={(e) => setSua({ ...sua, [k]: e.target.value })} className={o} />
                </label>
              ))}
              <div className="flex gap-2">
                <button onClick={() => void luuSoTay()} className="px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-black">Lưu</button>
                <button onClick={() => setSua(null)} className={nut}>Huỷ</button>
              </div>
            </div>
          )}
          {soTayLoc.map((x) => (
            <details key={x.id} className="p-3 rounded-xl bg-white border border-slate-200">
              <summary className="cursor-pointer text-[13px] font-black text-slate-900">
                <span className={cn("mr-2 px-2 py-0.5 rounded-full border text-[10px]", mauMuc[x.muc] || mauMuc.S3)}>{TEN_MUC[x.muc] || x.muc}</span>
                {x.loai === "huong_dan" ? "📘 " : "🧠 "}
                {x.tieuDe}
                {x.taiPhatLan ? <span className="ml-2 text-[11px] text-rose-600">♻️ tái phát {x.taiPhatLan} lần</span> : null}
              </summary>
              <div className="mt-2 space-y-1 text-[12px] text-slate-700">
                {x.trieuChung && <p><b>Triệu chứng:</b> {x.trieuChung}</p>}
                {x.nguyenNhan && <p><b>Nguyên nhân:</b> {x.nguyenNhan}</p>}
                {x.kiemTra && <p><b>Kiểm tra:</b> {x.kiemTra}</p>}
                {x.xuLy && <p><b>Xử lý:</b> {x.xuLy}</p>}
                {x.chanTaiPhat && <p><b>Chặn tái phát:</b> {x.chanTaiPhat}</p>}
                {x.khoaNhanDien && <p className="font-mono text-[11px] text-slate-500">Nhận diện: {x.khoaNhanDien}</p>}
                <p className="text-[10px] text-slate-400">{x.banSua ? `Sửa ở ${x.banSua} · ` : ""}{x.ngaySua || ""} {x.capNhatBoi ? `· ${x.capNhatBoi}` : ""}</p>
                <button onClick={() => setSua(x)} className={nut}>Sửa</button>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
