import { useState } from "react";
import { Stethoscope, Copy, Check } from "lucide-react";
import {
  auth,
  db,
  doc,
  getDocFromServer,
  getDocs,
  collection,
  firestoreDatabaseId,
  firebaseProjectId,
} from "../firebase";
import type { UserRole } from "../types";

/**
 * TỰ CHẨN ĐOÁN QUYỀN
 *
 * Khi ai đó báo "không lưu được", có tới bốn nguyên nhân khác nhau mà nhìn từ
 * ngoài giống hệt nhau:
 *
 *   1. Vai trò trong hồ sơ chưa đủ (VIEWER / PENDING).
 *   2. Vai trò đủ rồi nhưng firestore.rules trên máy chủ còn là bản cũ.
 *   3. Rules đã dán, nhưng dán nhầm sang CƠ SỞ DỮ LIỆU KHÁC — Firebase cho
 *      phép nhiều database trong một project và tab Rules là của riêng từng
 *      cái. Dán vào "(default)" trong khi app đang dùng database tên khác thì
 *      publish bao nhiêu lần cũng không có tác dụng.
 *   4. Hồ sơ người dùng chưa từng được tạo, hoặc tạo dưới một UID khác.
 *
 * Đoán qua lại giữa bốn thứ này rất tốn thời gian của người đang cần làm việc.
 * Bảng này đọc thẳng trạng thái thật rồi nói ra, để người dùng chụp màn hình
 * gửi đi là biết ngay phải sửa ở đâu.
 *
 * CỐ Ý ĐỌC TỪ MÁY CHỦ (`getDocFromServer`) chứ không đọc bộ nhớ đệm: chẩn đoán
 * mà dựa vào bản sao cũ trong máy thì có khi lại báo đúng trong khi máy chủ
 * đang từ chối.
 *
 * KHÔNG ghi thử gì cả. Muốn biết chắc quyền ghi thì phải ghi thật một tài
 * liệu, mà tài liệu rác lọt vào sổ kho còn phiền hơn cái nó chẩn đoán.
 */

interface Props {
  /** Vai trò app đang áp dụng, để so với vai trò máy chủ đang lưu. */
  vaiTroTrongApp: UserRole;
}

interface Muc {
  ten: string;
  giaTri: string;
  tot: boolean | null;
}

export default function KiemTraQuyen({ vaiTroTrongApp }: Props) {
  const [dangChay, setDangChay] = useState(false);
  const [muc, setMuc] = useState<Muc[] | null>(null);
  const [ketLuan, setKetLuan] = useState("");
  const [daChep, setDaChep] = useState(false);

  const chay = async () => {
    setDangChay(true);
    setDaChep(false);
    const ds: Muc[] = [];
    const u = auth.currentUser;

    ds.push({ ten: "Email", giaTri: u?.email || "(chưa đăng nhập)", tot: !!u });
    ds.push({ ten: "UID", giaTri: u?.uid || "—", tot: !!u });
    ds.push({
      ten: "Email đã xác minh",
      giaTri: u?.emailVerified ? "rồi" : "CHƯA",
      // Chưa xác minh là chặn thẳng: isOwner() trong rules đòi điều kiện này.
      tot: !!u?.emailVerified,
    });
    ds.push({ ten: "Project", giaTri: firebaseProjectId || "—", tot: null });
    ds.push({
      ten: "Cơ sở dữ liệu",
      giaTri: firestoreDatabaseId,
      tot: null,
    });

    let vaiTroMayChu = "";
    if (u) {
      try {
        const snap = await getDocFromServer(doc(db, "users", u.uid));
        if (!snap.exists()) {
          ds.push({
            ten: "Hồ sơ trên máy chủ",
            giaTri: "KHÔNG CÓ",
            tot: false,
          });
        } else {
          vaiTroMayChu = (snap.data() as { role?: string }).role || "PENDING";
          ds.push({
            ten: "Vai trò máy chủ đang lưu",
            giaTri: vaiTroMayChu,
            tot: vaiTroMayChu === "OWNER" || vaiTroMayChu === "STAFF",
          });
        }
      } catch (e: any) {
        ds.push({
          ten: "Hồ sơ trên máy chủ",
          giaTri: "không đọc được — " + (e?.code || e?.message || "lỗi"),
          tot: false,
        });
      }
    }

    ds.push({
      ten: "Vai trò app đang dùng",
      giaTri: vaiTroTrongApp,
      tot: vaiTroTrongApp === "OWNER" || vaiTroTrongApp === "STAFF",
    });

    let docDuoc = false;
    try {
      await getDocs(collection(db, "partners"));
      docDuoc = true;
      ds.push({ ten: "Thử đọc dữ liệu", giaTri: "được", tot: true });
    } catch (e: any) {
      ds.push({
        ten: "Thử đọc dữ liệu",
        giaTri: "BỊ TỪ CHỐI — " + (e?.code || "lỗi"),
        tot: false,
      });
    }

    // Kết luận: chỉ nói một việc cần làm, không liệt kê hết khả năng.
    const duQuyen = vaiTroMayChu === "OWNER" || vaiTroMayChu === "STAFF";
    if (!u) {
      setKetLuan("Chưa đăng nhập.");
    } else if (!vaiTroMayChu) {
      setKetLuan(
        "Máy chủ chưa có hồ sơ cho tài khoản này. Đăng xuất, đăng nhập lại một lần để app tạo hồ sơ, rồi nhờ chủ sở hữu duyệt trong mục Người dùng.",
      );
    } else if (!duQuyen) {
      setKetLuan(
        `Vai trò máy chủ đang lưu là ${vaiTroMayChu} — vai trò này không được ghi dữ liệu. Chủ sở hữu vào mục Người dùng đổi thành STAFF hoặc OWNER, rồi đăng xuất và đăng nhập lại.`,
      );
    } else if (!u.emailVerified && vaiTroMayChu === "OWNER") {
      setKetLuan(
        "Vai trò là OWNER nhưng email chưa được xác minh, mà phân quyền đòi email đã xác minh. Xác minh email của tài khoản Google này, hoặc đổi tạm sang vai trò STAFF.",
      );
    } else if (!docDuoc) {
      setKetLuan(
        `Vai trò là ${vaiTroMayChu} mà đọc còn bị từ chối, nghĩa là phân quyền trên máy chủ chưa đúng. Chủ sở hữu dán lại firestore.rules — nhớ chọn đúng cơ sở dữ liệu "${firestoreDatabaseId}" ở đầu tab Rules — rồi bấm Publish.`,
      );
    } else {
      setKetLuan(
        `Vai trò là ${vaiTroMayChu} và đọc được bình thường. Nếu vẫn không lưu được thì phân quyền ghi trên máy chủ còn là bản cũ: chủ sở hữu vào Firebase Console → Firestore Database, chọn đúng cơ sở dữ liệu "${firestoreDatabaseId}", vào tab Rules dán lại firestore.rules mới nhất rồi bấm Publish.`,
      );
    }

    setMuc(ds);
    setDangChay(false);
  };

  const chep = async () => {
    if (!muc) return;
    const vanBan =
      muc.map((m) => `${m.ten}: ${m.giaTri}`).join("\n") +
      "\n\nKết luận: " +
      ketLuan;
    try {
      await navigator.clipboard.writeText(vanBan);
      setDaChep(true);
    } catch {
      /* trình duyệt chặn thì người dùng tự chụp màn hình */
    }
  };

  return (
    <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-slate-400" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Kiểm tra quyền
          </p>
        </div>
        <button
          onClick={chay}
          disabled={dangChay}
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-125 disabled:opacity-40"
        >
          {dangChay ? "Đang kiểm..." : "Kiểm tra"}
        </button>
      </div>

      <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
        Báo "không lưu được" thì bấm nút này rồi gửi kết quả cho người quản trị.
        Nó chỉ ra đúng chỗ đang chặn, khỏi phải thử đi thử lại.
      </p>

      {muc && (
        <div className="space-y-2 pt-1">
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            {muc.map((m) => (
              <div
                key={m.ten}
                className="flex items-start justify-between gap-3 px-3 py-1.5 border-b border-slate-50 last:border-b-0"
              >
                <span className="text-[11px] font-bold text-slate-400 shrink-0">
                  {m.ten}
                </span>
                <span
                  className={
                    "text-[11px] font-black text-right break-all " +
                    (m.tot === false
                      ? "text-rose-600"
                      : m.tot === true
                        ? "text-emerald-600"
                        : "text-slate-700")
                  }
                >
                  {m.giaTri}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-[11px] font-bold text-amber-900 leading-relaxed">
              {ketLuan}
            </p>
          </div>

          <button
            onClick={chep}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-slate-400 flex items-center gap-1.5"
          >
            {daChep ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {daChep ? "Đã chép" : "Chép kết quả"}
          </button>
        </div>
      )}
    </div>
  );
}
