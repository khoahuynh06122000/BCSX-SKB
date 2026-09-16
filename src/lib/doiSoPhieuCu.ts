/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐỔI SỐ PHIẾU NHẬP KIỂU CŨ SANG ĐÚNG MÃ PHIẾU IN RA GIẤY
 *
 * Việc làm MỘT LẦN, sau khi đổi cách đánh số ngày 15/09/2026.
 *
 * VÌ SAO ĐỔI ĐƯỢC MÀ KHÔNG PHẢI VIẾT LẠI LỊCH SỬ. Số `51260001` chưa bao giờ
 * in ra giấy: tờ phiếu nhập từ đầu đã mang mã `PN-260911-01`, còn `51260001`
 * chỉ là con số THỨ HAI mà app tự đặt thêm cho riêng sổ. Đổi nó là bỏ con số
 * thừa ấy đi để sổ khớp lại với giấy, chứ không phải đổi số của một chứng từ
 * đã phát hành.
 *
 * Mã phiếu thật nằm sẵn ngay trong bản ghi, ở trường `nguon` — lúc cấp số app
 * ghi `nguon: slipCode`. Nên không phải đi tra ở đâu khác, và không phải đoán.
 *
 * CHỈ ĐỔI CHIỀU NHẬP. Phiếu xuất thì `60260001` là số DUY NHẤT nó từng có —
 * không có tờ giấy nào mang số khác để khớp về. Đổi nó là viết lại một số đã
 * phát hành, nên để nguyên (Khoa chốt 16/09/2026).
 *
 * PHIẾU HỦY ĐI THEO PHIẾU GỐC. Hủy `51260001` thì bản ghi hủy là `52260001`;
 * đổi số gốc mà bỏ quên nó thì hai bản ghi trỏ vào hai số không còn tồn tại,
 * và sổ mất luôn dấu vết ai hủy phiếu nào.
 *
 * Tệp này chỉ TÍNH RA việc phải làm, không chạm Firestore — phần ghi nằm ở nơi
 * gọi, xem `App.tsx`.
 */

import {
  docSoPhieu,
  soPhieuHuy,
  type GhiSoPhieu,
} from "./soPhieu";

/** Một bản ghi cần đổi số. */
export interface ViecDoiSo {
  /** Số đang nằm trong sổ, cũng là khoá tài liệu cũ. */
  soCu: string;
  /** Số mới — đúng mã phiếu in ra giấy. */
  soMoi: string;
  /** Bản ghi mới, đã thay số và đã sửa lại liên kết hủy. */
  ghiMoi: GhiSoPhieu;
}

/** Một bản ghi KHÔNG đổi, kèm lý do — để người dùng biết vì sao nó ở lại. */
export interface BoQua {
  soPhieu: string;
  lyDo: string;
}

export interface KeHoachDoiSo {
  viec: ViecDoiSo[];
  boQua: BoQua[];
}

/** Số này có phải kiểu cũ của chiều NHẬP không. */
function laNhapKieuCu(g: GhiSoPhieu): boolean {
  const p = docSoPhieu(g?.soPhieu);
  if (!p || p.kieu !== "cu") return false;
  return p.loai === "NHAP" || p.loai === "HUY_NHAP";
}

/**
 * Dựng kế hoạch đổi số.
 *
 * KHÔNG ĐỔI GÌ CẢ NẾU CÓ MỘT CHỖ VA CHẠM. Mỗi việc đều kiểm trước xem số mới
 * đã có ai dùng chưa; đã có thì bỏ qua bản ghi đó kèm lý do, chứ không ghi đè.
 * Ghi đè ở đây là mất hẳn một chứng từ.
 */
export function dungKeHoachDoiSo(ds: GhiSoPhieu[]): KeHoachDoiSo {
  const list = (ds || []).filter((g) => g?.soPhieu);

  /** Mọi số đang có trong sổ, để dò va chạm. */
  const dangCo = new Set(list.map((g) => String(g.soPhieu)));
  /** Số cũ → số mới, dựng trước để sửa lại liên kết hủy ở vòng sau. */
  const doiThanh = new Map<string, string>();

  const viec: ViecDoiSo[] = [];
  const boQua: BoQua[] = [];

  // Vòng 1 — chốt số mới cho từng bản ghi.
  list.forEach((g) => {
    if (!laNhapKieuCu(g)) return;

    const p = docSoPhieu(g.soPhieu)!;
    let soMoi = "";

    if (p.loai === "NHAP") {
      // Mã phiếu thật nằm ở `nguon`.
      const ma = String(g.nguon ?? "").trim();
      const pm = docSoPhieu(ma);
      if (!pm || pm.kieu !== "moi" || pm.loai !== "NHAP") {
        boQua.push({
          soPhieu: g.soPhieu,
          lyDo: `Chứng từ gốc "${ma || "(trống)"}" không phải mã phiếu nhập, không biết đổi thành số nào.`,
        });
        return;
      }
      soMoi = ma;
    } else {
      /*
       * Phiếu hủy: lấy số mới của phiếu GỐC rồi gắn đuôi hủy. Không đọc
       * `nguon` của chính nó — phiếu hủy chép lại `nguon` của phiếu gốc, nên
       * đọc thẳng sẽ ra số của phiếu gốc chứ không phải số hủy.
       */
      const goc = String(g.huyCho ?? "").trim();
      const bangGoc = list.find((x) => x.soPhieu === goc);
      const ma = String(bangGoc?.nguon ?? "").trim();
      const so = ma ? soPhieuHuy(ma) : null;
      if (!so) {
        boQua.push({
          soPhieu: g.soPhieu,
          lyDo: `Không tìm ra phiếu gốc "${goc || "(trống)"}" để suy số hủy mới.`,
        });
        return;
      }
      soMoi = so;
    }

    if (soMoi === g.soPhieu) return;
    if (dangCo.has(soMoi)) {
      // Nói luôn ai đang giữ số đó, để người dùng biết hai phiếu nào đụng nhau
      // mà đi xem lại — chỉ báo "đã có rồi" thì họ phải tự dò.
      const ai =
        list.find((x) => x.soPhieu === soMoi)?.soPhieu ||
        [...doiThanh.entries()].find(([, m]) => m === soMoi)?.[0] ||
        "";
      boQua.push({
        soPhieu: g.soPhieu,
        lyDo:
          `Số mới ${soMoi} đã có trong sổ rồi` +
          (ai ? ` (của phiếu ${ai})` : "") +
          ` — để nguyên, không ghi đè. Hai phiếu này đang cùng trỏ vào một mã phiếu, cần xem lại.`,
      });
      return;
    }

    dangCo.add(soMoi);
    doiThanh.set(g.soPhieu, soMoi);
  });

  /*
   * Vòng 1b — CẶP HỦY PHẢI ĐI CÙNG NHAU, HOẶC KHÔNG CÁI NÀO ĐI CẢ.
   *
   * Đây là chỗ suýt hỏng. Nếu phiếu hủy đổi được mà phiếu gốc của nó vướng va
   * chạm nên ở lại, thì số hủy mới `PN-260901-01-HUY` trông như đang hủy
   * `PN-260901-01` — trong khi số đó lại là một TỜ PHIẾU KHÁC vừa nhận. Còn
   * phiếu gốc thì ghi "đã hủy bởi 52260001", một số không còn tồn tại.
   *
   * Sổ lúc ấy vẫn đủ bản ghi, vẫn cộng ra đúng số lượng, chỉ có điều nó nói
   * sai ai hủy phiếu nào — và không có gì báo lỗi.
   *
   * Lặp cho tới khi ổn định: gỡ một cái ra có thể làm cái kia mất bạn đồng
   * hành, nên phải xét lại từ đầu.
   */
  for (let vong = 0; vong < list.length + 1; vong++) {
    let goRa = false;
    list.forEach((g) => {
      if (!doiThanh.has(g.soPhieu)) return;
      const doiTac = String(g.huyBoi ?? g.huyCho ?? "").trim();
      if (!doiTac) return;
      // Đối tác không nằm trong sổ đang xem thì thôi — đã báo ở chỗ khác.
      if (!list.some((x) => x.soPhieu === doiTac)) return;
      if (doiThanh.has(doiTac)) return;

      doiThanh.delete(g.soPhieu);
      boQua.push({
        soPhieu: g.soPhieu,
        lyDo: `Phiếu ${doiTac} đi cùng cặp hủy với nó không đổi được, nên giữ nguyên cả hai — đổi một mình thì sổ sẽ chỉ sai ai hủy phiếu nào.`,
      });
      goRa = true;
    });
    if (!goRa) break;
  }

  // Vòng 2 — dựng bản ghi mới, sửa luôn liên kết hủy sang số mới.
  list.forEach((g) => {
    const soMoi = doiThanh.get(g.soPhieu);
    if (!soMoi) return;

    const ghiMoi: GhiSoPhieu = {
      ...g,
      id: soMoi,
      soPhieu: soMoi,
    };
    // Hai đầu của cặp hủy phải trỏ sang số mới của nhau, nếu đầu kia cũng đổi.
    if (g.huyBoi && doiThanh.has(g.huyBoi)) ghiMoi.huyBoi = doiThanh.get(g.huyBoi);
    if (g.huyCho && doiThanh.has(g.huyCho)) ghiMoi.huyCho = doiThanh.get(g.huyCho);

    viec.push({ soCu: g.soPhieu, soMoi, ghiMoi });
  });

  /*
   * Đổi PHIẾU GỐC TRƯỚC, phiếu hủy sau.
   *
   * Nếu chạy giữa chừng thì dừng lại ở trạng thái dễ hiểu hơn: phiếu gốc đã
   * mang số mới, phiếu hủy còn số cũ nhưng vẫn trỏ đúng vào phiếu gốc.
   */
  viec.sort((a, b) => {
    const ha = a.ghiMoi.loai === "HUY_NHAP" ? 1 : 0;
    const hb = b.ghiMoi.loai === "HUY_NHAP" ? 1 : 0;
    return ha - hb || a.soCu.localeCompare(b.soCu);
  });

  return { viec, boQua };
}
