import { useMemo, useRef, useState } from "react";
import { ImageDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ImportSlip, Transaction } from "../types";
import {
  doAnhCu,
  doDungLuong,
  thayTrongMang,
  type ChoConAnh,
} from "../lib/anhCu";
import { db, doc, updateDoc } from "../firebase";
import { uploadToCloudinary } from "../lib/cloudinary";

/**
 * CHUYỂN ẢNH CŨ TỪ FIRESTORE SANG CLOUDINARY
 *
 * Ảnh chụp từ bản app hiện tại đã nằm sẵn trên Cloudinary, Firestore chỉ giữ
 * đường dẫn. Nhưng tài liệu tạo từ bản đầu vẫn mang nguyên khối base64 trong
 * mình — xem `src/lib/anhCu.ts` để biết vì sao phải dọn.
 *
 * CÁCH LÀM AN TOÀN, theo đúng thứ tự này:
 *
 *   1. Tải ảnh lên Cloudinary TRƯỚC.
 *   2. Có đường dẫn thật rồi mới ghi đè vào Firestore.
 *
 * Không bao giờ xoá trước rồi tải sau: tải hỏng giữa chừng là mất hẳn tấm ảnh,
 * mà ảnh phiếu ký là chứng từ duyệt số liệu — mất nó thì hàng rơi khỏi tồn kho
 * và không có cách nào dựng lại.
 *
 * Chạy TỪNG TẤM MỘT, không gộp lô. Chậm hơn, nhưng hỏng ở tấm nào thì chỉ tấm
 * đó không xong, những tấm trước đã an toàn trên Cloudinary. Bấm chạy lại là
 * tiếp tục từ chỗ dở, vì lần dò sau không còn thấy tấm đã chuyển nữa.
 */

interface Props {
  transactions: Transaction[];
  slips: ImportSlip[];
}

export default function ChuyenAnhCu({ transactions, slips }: Props) {
  const [dangChay, setDangChay] = useState(false);
  const [daXong, setDaXong] = useState(0);
  const [loi, setLoi] = useState<string[]>([]);
  const [xongHet, setXongHet] = useState(false);
  const dungLai = useRef(false);

  const kq = useMemo(
    () => doAnhCu(transactions, slips),
    [transactions, slips],
  );

  const chay = async () => {
    if (
      !window.confirm(
        `Chuyển ${kq.cho.length} tấm ảnh đang nằm trong Firestore sang Cloudinary?\n\n` +
          `Giải phóng khoảng ${doDungLuong(kq.tongByte)} trong cơ sở dữ liệu.\n\n` +
          "Ảnh được tải lên Cloudinary xong mới ghi đè, nên không có lúc nào ảnh bị mất. " +
          "Đừng đóng trang khi đang chạy.",
      )
    )
      return;

    setDangChay(true);
    setDaXong(0);
    setLoi([]);
    setXongHet(false);
    dungLai.current = false;

    // Bản chụp danh sách lúc bấm nút. `transactions`/`slips` là dữ liệu sống,
    // nó đổi ngay dưới chân trong lúc chạy nếu đọc trực tiếp.
    const danhSach = [...kq.cho];
    const loiMoi: string[] = [];
    let dem = 0;

    for (const c of danhSach) {
      if (dungLai.current) break;
      try {
        await chuyenMot(c, transactions, slips);
        dem++;
        setDaXong(dem);
      } catch (e: any) {
        loiMoi.push(`${c.moTa}: ${e?.message || "lỗi không rõ"}`);
        setLoi([...loiMoi]);
      }
    }

    setDangChay(false);
    setXongHet(true);
  };

  return (
    <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-3">
      <div className="flex items-center gap-2">
        <ImageDown className="w-4 h-4 text-slate-400" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Ảnh cũ còn nằm trong cơ sở dữ liệu
        </p>
      </div>

      <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
        Ảnh chụp từ bản app hiện tại đã nằm trên Cloudinary, Firestore chỉ giữ
        đường dẫn. Riêng tài liệu tạo từ bản đầu còn mang nguyên ảnh trong mình.
        Nút này tải chúng lên Cloudinary rồi thay bằng đường dẫn.
      </p>

      {kq.cho.length === 0 ? (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">
            Không còn ảnh nào nằm trong cơ sở dữ liệu. Toàn bộ ảnh đã ở
            Cloudinary.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { nhan: "Tấm ảnh", so: String(kq.cho.length) },
              { nhan: "Tài liệu", so: String(kq.soTaiLieu) },
              { nhan: "Dung lượng", so: doDungLuong(kq.tongByte) },
            ].map((o) => (
              <div
                key={o.nhan}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {o.nhan}
                </p>
                <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">
                  {o.so}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={chay}
              disabled={dangChay}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-125 disabled:opacity-40"
            >
              {dangChay
                ? `Đang chuyển ${daXong}/${kq.cho.length}...`
                : "Chuyển sang Cloudinary"}
            </button>
            {dangChay && (
              <button
                onClick={() => {
                  dungLai.current = true;
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-rose-300 hover:text-rose-600"
              >
                Dừng
              </button>
            )}
          </div>

          {dangChay && (
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all"
                style={{
                  width: `${Math.round((daXong / kq.cho.length) * 100)}%`,
                }}
              />
            </div>
          )}
        </>
      )}

      {xongHet && (
        <p className="text-[11px] font-bold text-slate-600">
          Đã chuyển {daXong} tấm. Dừng giữa chừng hoặc còn lỗi thì bấm lại — nó
          chỉ làm tiếp phần chưa xong.
        </p>
      )}

      {loi.length > 0 && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-black text-amber-800">
              {loi.length} tấm chưa chuyển được — ảnh vẫn còn nguyên, không mất
            </p>
          </div>
          {loi.slice(0, 5).map((m, i) => (
            <p key={i} className="text-[10px] font-bold text-amber-800 pl-6">
              {m}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Chuyển đúng một tấm: tải lên trước, ghi đè sau.
 *
 * Đọc lại mảng từ danh sách đang có trong bộ nhớ ngay trước khi ghi, chứ không
 * dùng bản chụp lúc bấm nút — giữa chừng có thể ai đó vừa thêm ảnh vào cùng
 * tài liệu, ghi bản cũ đè lên là xoá mất tấm của họ.
 */
async function chuyenMot(
  c: ChoConAnh,
  transactions: Transaction[],
  slips: ImportSlip[],
) {
  const url = await uploadToCloudinary(c.base64);

  if (c.loai === "transaction") {
    if (c.truong === "evidencePhotoUrl") {
      await updateDoc(doc(db, "transactions", c.id), {
        evidencePhotoUrl: url,
      });
      return;
    }
    const t = transactions.find((x) => x.id === c.id);
    await updateDoc(doc(db, "transactions", c.id), {
      evidencePhotoUrls: thayTrongMang(t?.evidencePhotoUrls, c.chiSo, url),
    });
    return;
  }

  const s = slips.find((x) => (x.id || x.code) === c.id);
  await updateDoc(doc(db, "slips", c.id), {
    signedPhotoUrls: thayTrongMang(s?.signedPhotoUrls, c.chiSo, url),
  });
}
