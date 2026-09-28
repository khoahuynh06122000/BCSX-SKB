/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BẢNG HÓA ĐƠN ĐÃ XUẤT — GỌN TRƯỚC, CHI TIẾT KHI CẦN.
 *
 * Mặc định MỘT DÒNG CHO MỘT TỜ HÓA ĐƠN, chỉ sáu cột:
 *
 *     Số hóa đơn · Ngày hóa đơn · Ngày giao · Đơn vị ·
 *     Sau thuế SKB→DNC · Sau thuế DNC→ĐVTV
 *
 * Bản trước bày thẳng 17 cột × mọi dòng hàng: mười một hóa đơn thành bốn mươi
 * dòng, mỗi dòng mười bảy con số. Đọc bảng ấy không ra được câu hỏi thường gặp
 * nhất — tờ này bao nhiêu tiền — vì số tiền của một tờ nằm rải trên bảy dòng.
 *
 * Bấm vào một dòng thì bung ra đúng các cột còn lại của riêng tờ đó: mã vật
 * tư, tên hàng hóa, đơn vị tính, số lượng, và hai khối giá đầy đủ.
 *
 * TỆP XUẤT RA KHÔNG ĐỔI. Nút "Xuất mẫu Chốt" vẫn dựng đúng 18 cột phẳng như
 * sheet của bộ phận — gọn ở màn hình là chuyện bày ra để đọc, không phải
 * chuyện dữ liệu.
 *
 * MỘT CHỖ DỰNG CHO MỌI NƠI HIỆN HÓA ĐƠN: bảng điền số của đợt đang khai, và
 * phần tra cứu bên dưới. Chép thành hai bản thì sửa một cột phải nhớ sửa cả
 * hai chỗ, và quên một chỗ là hai bảng lệch nhau mà không có gì báo.
 */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
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
   * Phần tra cứu cố ý KHÔNG truyền: ở đó người ta đi tìm một tờ hóa đơn cũ, và
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
  "px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500 border-b border-slate-200 whitespace-nowrap";
const THP =
  "px-2 py-2 text-[9px] font-black uppercase tracking-wide text-slate-400 whitespace-nowrap";

const tien = (n: number) => formatNumber(Math.round(n));
const cong = (ds: DongCongNo[], lay: (d: DongCongNo) => number) =>
  ds.reduce((t, d) => t + (Number(lay(d)) || 0), 0);

export default function BangChotHoaDon({
  khoi,
  onSua,
  goiYSo,
  cao = "max-h-[600px]",
}: Props) {
  /*
   * Mở NHIỀU tờ cùng lúc, không phải một tờ tại một lúc.
   *
   * Việc thường làm là đối chiếu hai tờ với nhau; mở tờ này mà tờ kia tự đóng
   * thì phải nhớ số trong đầu rồi bấm qua bấm lại.
   */
  const [dangMo, setDangMo] = useState<Set<string>>(new Set());
  const bat = (k: string) =>
    setDangMo((cu) => {
      const m = new Set(cu);
      if (m.has(k)) m.delete(k);
      else m.add(k);
      return m;
    });

  if (khoi.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[13px] font-bold text-slate-400">
        Không có hóa đơn nào.
      </p>
    );
  }

  return (
    <div className={cn("overflow-auto", cao)}>
      <table className="w-full text-left text-[13px] font-bold text-slate-600 min-w-[860px]">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th className={TH} />
            <th className={TH}>Số hóa đơn</th>
            <th className={TH}>Ngày HĐ</th>
            <th className={TH}>Ngày giao</th>
            <th className={TH}>Đơn vị</th>
            <th className={cn(TH, "text-right")}>Sau thuế SKB → DNC</th>
            <th className={cn(TH, "text-right")}>Sau thuế DNC → ĐVTV</th>
          </tr>
        </thead>
        <tbody>
          {khoi.map((k) => {
            const dau = k.dong[0];
            const mo = dangMo.has(k.khoa);
            return [
              <tr
                key={k.khoa}
                className={cn(
                  "border-t border-slate-100 hover:bg-slate-50/70 transition-colors",
                  mo && "bg-slate-50",
                )}
              >
                <td className="pl-3 pr-1 py-2 w-9">
                  <button
                    onClick={() => bat(k.khoa)}
                    title={mo ? "Thu lại" : "Xem chi tiết hàng hóa"}
                    className="p-1 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                  >
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform",
                        mo && "rotate-90",
                      )}
                    />
                  </button>
                </td>

                <td className="px-3 py-2">
                  {onSua ? (
                    <input
                      value={k.soHoaDon}
                      onChange={(e) =>
                        onSua(k.khoa, "soHoaDon", e.target.value)
                      }
                      placeholder={goiYSo?.(k.khoa) || ""}
                      className={cn(
                        "w-44 px-2.5 py-2 rounded-lg border bg-white text-[13px] font-black font-mono outline-none focus:border-primary",
                        k.soHoaDon.trim()
                          ? "border-slate-200"
                          : "border-amber-300 placeholder:text-amber-400",
                      )}
                    />
                  ) : (
                    <span className="font-mono font-black text-slate-900">
                      {k.soHoaDon || "—"}
                    </span>
                  )}
                </td>

                <td className="px-3 py-2">
                  {onSua ? (
                    <ONgay
                      value={k.ngayHoaDon}
                      onChange={(v: string) => onSua(k.khoa, "ngayHoaDon", v)}
                      className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-bold outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="font-mono text-slate-700">
                      {k.ngayHoaDon ? ngayVn(k.ngayHoaDon) : "—"}
                    </span>
                  )}
                </td>

                <td className="px-3 py-2 whitespace-nowrap">
                  {dau?.ngayGiaoBia || "—"}
                </td>
                <td className="px-3 py-2 text-slate-900 whitespace-nowrap">
                  {dau?.donVi || "—"}
                  {/* Mã BP đi kèm tên đơn vị chứ không thành một cột riêng:
                      nó là mã CỦA đơn vị đó, tách ra chỉ tốn thêm một cột. */}
                  <span className="ml-1.5 font-mono text-[11px] font-bold text-slate-400">
                    {dau?.maBp}
                  </span>
                </td>

                <td className="px-3 py-2 text-right tabular-nums font-black text-slate-900 whitespace-nowrap">
                  {tien(cong(k.dong, (d) => d.sauThueSkb))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-black text-slate-900 whitespace-nowrap">
                  {tien(cong(k.dong, (d) => d.sauThueDnc))}
                </td>
              </tr>,

              mo && (
                <tr key={`${k.khoa}-ct`} className="bg-slate-50/60">
                  <td />
                  <td colSpan={6} className="px-3 pb-3">
                    <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full text-left text-[12px] font-bold text-slate-600 min-w-[900px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className={THP} colSpan={4} />
                            <th
                              colSpan={4}
                              className="px-2 py-2 text-[9px] font-black uppercase tracking-wide text-white bg-[#1F4E5F] text-center"
                            >
                              SKB - DNC
                            </th>
                            <th
                              colSpan={4}
                              className="px-2 py-2 text-[9px] font-black uppercase tracking-wide text-white bg-[#6B4E71] text-center"
                            >
                              DNC xuất BNC và ĐVTV
                            </th>
                          </tr>
                          <tr>
                            {[
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
                              <th
                                key={`${h}-${i}`}
                                className={cn(
                                  THP,
                                  "border-b border-slate-200",
                                  i >= 3 && "text-right",
                                )}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {k.dong.map((r, i) => (
                            <tr
                              key={`${k.khoa}-${r.stt}-${i}`}
                              className="border-t border-slate-100"
                            >
                              <td className="px-2 py-2 font-mono text-slate-400 whitespace-nowrap">
                                {r.maVatTu}
                              </td>
                              <td className="px-2 py-2 text-slate-900 min-w-[160px]">
                                {r.tenHangHoa}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                {r.dvt}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                {formatNumber(r.soLuong)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                {tien(r.donGiaSkb)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                {tien(r.thanhTienSkb)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                {tien(r.vatSkb)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap text-slate-900">
                                {tien(r.sauThueSkb)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                {tien(r.donGiaDnc)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                {tien(r.thanhTienDnc)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                {tien(r.vatDnc)}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap text-slate-900">
                                {tien(r.sauThueDnc)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
