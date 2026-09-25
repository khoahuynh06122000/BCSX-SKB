/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BẢNG HÓA ĐƠN ĐÃ XUẤT — DỰNG THEO SHEET "CHỐT".
 *
 * Thứ tự cột bám tệp Excel của bộ phận, đảo hai cột lên đầu:
 *
 *     Số hóa đơn · Ngày hóa đơn · Ngày giao bia · Đơn vị · Mã BP · Mã vật tư ·
 *     Tên hàng hóa · ĐVT · Số lượng · [Đơn giá · Thành tiền · VAT · Sau thuế] ·
 *     [Đơn giá · Thành tiền · VAT · Sau thuế]
 *
 * Khác tệp gốc ba chỗ, đều theo yêu cầu của người dùng:
 *
 *   - BỎ CỘT STT. Số thứ tự trong tệp chỉ để đánh dấu dòng khi in ra giấy;
 *     trên màn hình nó chiếm một cột mà không ai tra theo nó.
 *   - "SKB - TLĐ" gọi thẳng là ĐƠN GIÁ, cho khớp cột cùng nghĩa ở khối bên
 *     cạnh. Tiêu đề khối bên trên đã nói rõ đó là chặng nào.
 *   - MÃ BP ĐỨNG CẠNH ĐƠN VỊ. Trong tệp nó nằm ở cột cuối, cách tên đơn vị cả
 *     mười mấy cột — mà mã BP chính là mã của đơn vị ấy, đọc rời nhau thì phải
 *     lia mắt hai đầu bảng để ghép.
 *
 * Trong sheet, số hóa đơn nằm ở cột M và ngày hóa đơn ở cột B — người tra phải
 * lia mắt hai đầu bảng mới ghép được một tờ hóa đơn. Đưa hai cột ấy lên đầu thì
 * nhìn là thấy; các cột còn lại giữ nguyên vị trí để đối chiếu với tệp Excel
 * không phải dò lại.
 *
 * BỀ NGANG PHẢI VỪA MÀN HÌNH, KHÔNG KÉO NGANG.
 *
 * 17 cột mà vẫn vừa được là nhờ cắt đúng chỗ tốn chỗ nhất — TIÊU ĐỀ, chứ
 * không phải số liệu. "Thành tiền sau thuế" viết hoa giãn chữ chiếm gần 150px
 * mỗi cột, trong khi con số bên dưới chỉ hơn 80px; hai cột như vậy ăn mất 300
 * px mà không chở thêm thông tin nào. Rút còn "Sau thuế" thì cột co theo số.
 *
 * Đệm ô cũng hạ từ 12px xuống 8px mỗi bên: 17 cột thì mỗi 4px tiết kiệm được
 * 136px.
 *
 * MỘT CHỖ DỰNG CHO MỌI NƠI HIỆN HÓA ĐƠN. Bảng này dùng ở cả hai phần của thẻ
 * "Đã xuất hóa đơn": bảng điền số của đợt đang khai, và phần tra cứu bên dưới.
 * Chép thành hai bản thì sửa một cột phải nhớ sửa cả hai chỗ, và quên một chỗ
 * là hai bảng lệch nhau mà không có gì báo — đúng cái đã xảy ra với chính bảng
 * này.
 */

import type { DongCongNo } from "../lib/congNo";
import { ngayVn } from "../lib/soPhieu";
import { cn, formatNumber } from "../lib/utils";
import ONgay from "./ONgay";

/** Một tờ hóa đơn: phần đầu chung, và các dòng hàng bên dưới. */
export interface KhoiChot {
  /** Khoá để nơi gọi biết đang sửa tờ nào. */
  khoa: string;
  soHoaDon: string;
  /** yyyy-MM-dd */
  ngayHoaDon: string;
  dong: DongCongNo[];
}

interface Props {
  khoi: KhoiChot[];
  /**
   * Cho sửa số và ngày ngay trên bảng. Không truyền thì bảng chỉ để đọc.
   *
   * Thẻ tra cứu cố ý KHÔNG truyền: ở đó người ta đi tìm một tờ hóa đơn cũ, và
   * một ô nhập giữa màn hình tra cứu là lời mời sửa nhầm.
   */
  onSua?: (
    khoa: string,
    truong: "soHoaDon" | "ngayHoaDon",
    giaTri: string,
  ) => void;
  /** Số app gợi ý, hiện mờ trong ô khi chưa điền. */
  goiYSo?: (khoa: string) => string;
  /** Chiều cao tối đa trước khi cuộn dọc. */
  cao?: string;
}

const TH =
  "px-2 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500 border-b border-slate-200 whitespace-nowrap";
const TD = "px-2 py-2 whitespace-nowrap";
const TDS = "px-2 py-2 text-right tabular-nums whitespace-nowrap";

const tien = (n: number) => formatNumber(Math.round(n));

export default function BangChotHoaDon({
  khoi,
  onSua,
  goiYSo,
  cao = "max-h-[600px]",
}: Props) {
  if (khoi.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[13px] font-bold text-slate-400">
        Không có hóa đơn nào.
      </p>
    );
  }

  return (
    <div className={cn("overflow-auto", cao)}>
      <table className="w-full text-left text-[12px] font-bold text-slate-600 min-w-[1180px]">
        <thead className="bg-slate-50 sticky top-0 z-10">
          {/* Hai khối giá tô hai màu như trong tệp: hai bộ cột Đơn giá /
              Thành tiền / VAT / Sau thuế giống hệt nhau, mà hai chặng chỉ lệch
              vài phần trăm nên đọc nhầm cũng không lộ ra. */}
          <tr>
            <th className={TH} colSpan={9} />
            <th
              colSpan={4}
              className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-[#1F4E5F] text-center border-b border-slate-200"
            >
              SKB - DNC
            </th>
            <th
              colSpan={4}
              className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-[#6B4E71] text-center border-b border-slate-200"
            >
              DNC xuất BNC và ĐVTV
            </th>
          </tr>
          <tr>
            {[
              "Số hóa đơn",
              "Ngày HĐ",
              "Ngày giao",
              "Đơn vị",
              "Mã BP",
              "Mã vật tư",
              "Tên hàng hóa",
              "ĐVT",
              "Số lượng",
              "Đơn giá",
              "Thành tiền",
              "VAT",
              "Sau thuế",
              "Đơn giá",
              "Thành tiền",
              "VAT",
              "Sau thuế",
            ].map((h, i) => (
              <th key={`${h}-${i}`} className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {khoi.map((k) =>
            k.dong.map((r, i) => (
              <tr
                key={`${k.khoa}-${r.stt}-${i}`}
                className={cn(
                  "border-t border-slate-100",
                  i === 0 && "border-t-2 border-slate-200",
                )}
              >
                {/*
                  SỐ HÓA ĐƠN VÀ NGÀY GỘP Ô THEO TỜ HÓA ĐƠN.
                  Trong Excel chúng lặp trên từng dòng vì Excel không có cách
                  nào khác. Trên màn hình, một số lặp chín lần chỉ tốn chỗ và
                  làm người đọc tưởng là chín số khác nhau.
                */}
                {i === 0 && (
                  <>
                    <td
                      rowSpan={k.dong.length}
                      className="px-2 py-2 align-top border-r border-slate-100 bg-slate-50/50"
                    >
                      {onSua ? (
                        <input
                          value={k.soHoaDon}
                          onChange={(e) =>
                            onSua(k.khoa, "soHoaDon", e.target.value)
                          }
                          placeholder={goiYSo?.(k.khoa) || ""}
                          className={cn(
                            "w-40 px-2 py-2 rounded-lg border bg-white text-[13px] font-black font-mono outline-none focus:border-primary",
                            k.soHoaDon.trim()
                              ? "border-slate-200"
                              : "border-amber-300 placeholder:text-amber-400",
                          )}
                        />
                      ) : (
                        <span className="font-mono font-black text-[13px] text-slate-900">
                          {k.soHoaDon || "—"}
                        </span>
                      )}
                    </td>
                    <td
                      rowSpan={k.dong.length}
                      className="px-2 py-2 align-top border-r border-slate-100 bg-slate-50/50"
                    >
                      {onSua ? (
                        <ONgay
                          value={k.ngayHoaDon}
                          onChange={(v: string) =>
                            onSua(k.khoa, "ngayHoaDon", v)
                          }
                          className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-bold outline-none focus:border-primary"
                        />
                      ) : (
                        <span className="font-mono text-[13px] text-slate-700">
                          {k.ngayHoaDon ? ngayVn(k.ngayHoaDon) : "—"}
                        </span>
                      )}
                    </td>
                  </>
                )}
                <td className={TD}>{r.ngayGiaoBia}</td>
                <td className={TD}>{r.donVi}</td>
                <td className="px-2 py-2 font-mono text-slate-400 whitespace-nowrap">
                  {r.maBp}
                </td>
                <td className="px-2 py-2 font-mono text-slate-400 whitespace-nowrap">
                  {r.maVatTu}
                </td>
                {/* Cột duy nhất được xuống dòng: tên bia dài, mà bắt nó một
                    dòng thì cả bảng phải nới theo nó. */}
                <td className="px-2 py-2 text-slate-900 min-w-[150px]">
                  {r.tenHangHoa}
                </td>
                <td className={TD}>{r.dvt}</td>
                <td className={TDS}>{formatNumber(r.soLuong)}</td>
                <td className={TDS}>{tien(r.donGiaSkb)}</td>
                <td className={TDS}>{tien(r.thanhTienSkb)}</td>
                <td className={TDS}>{tien(r.vatSkb)}</td>
                <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap text-slate-900">
                  {tien(r.sauThueSkb)}
                </td>
                <td className={TDS}>{tien(r.donGiaDnc)}</td>
                <td className={TDS}>{tien(r.thanhTienDnc)}</td>
                <td className={TDS}>{tien(r.vatDnc)}</td>
                <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap text-slate-900">
                  {tien(r.sauThueDnc)}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
