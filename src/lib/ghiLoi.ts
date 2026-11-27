/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * APP TỰ GHI LỖI NGƯỜI DÙNG GẶP → bảng `loi_app` (khối 1 của hệ báo sự cố,
 * xem src/lib/suCo.ts). Học theo `ghiLoiApp` của app Kiểm kê.
 *
 * - Nghe `error` + `unhandledrejection` của trình duyệt, cộng mọi chỗ app gọi
 *   `ghiLoiApp` (lỗi Firestore, thông báo lỗi đỏ).
 * - Bỏ lỗi rớt mạng; che khoá / token; gộp trùng trong một phiên (cùng câu lỗi
 *   chỉ ghi một lần mỗi 10 phút).
 * - Hàng đợi trong trình duyệt (≤ 30 mục) — chưa đăng nhập / mất mạng thì giữ
 *   lại, gửi khi có phiên. Ghi hỏng thì thôi, KHÔNG BAO GIỜ làm app gãy thêm.
 */

import { collection, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { setDoc } from "./firestoreDem";
import { cheLoi, khoaGop, laLoiMang, type LoiApp } from "./suCo";

export const KHO_LOI_APP = "loi_app";
const KHOA_HANG_DOI = "bcsx_loi_q_v1";
const KHOA_MAY = "bcsx_may_v1";
const TOI_DA_HANG_DOI = 30;
const NGHI_GOP_MS = 10 * 60 * 1000;

let nguCanh: { man: string; vaiTro: string; ten: string; duocGhi: boolean } = {
  man: "",
  vaiTro: "",
  ten: "",
  duocGhi: false,
};
const daGhiLuc = new Map<string, number>();
let dangGui = false;

/** App báo tab đang mở + vai trò. `duocGhi` = tài khoản đã duyệt (luật chỉ cho người đã duyệt ghi). */
export function datNguCanhLoi(n: Partial<typeof nguCanh>): void {
  nguCanh = { ...nguCanh, ...n };
  if (nguCanh.duocGhi) void guiHangDoi();
}

function maMay(): string {
  try {
    let m = localStorage.getItem(KHOA_MAY);
    if (!m) {
      m = Math.random().toString(36).slice(2, 10);
      localStorage.setItem(KHOA_MAY, m);
    }
    return m;
  } catch {
    return "";
  }
}

function loaiMay(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const he = /iphone|ipad/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /windows/i.test(ua) ? "Windows" : /mac os/i.test(ua) ? "Mac" : "Khác";
  const tr = /edg\//i.test(ua) ? "Edge" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : /firefox/i.test(ua) ? "Firefox" : "Khác";
  return `${he} · ${tr}`;
}

function docHangDoi(): Omit<LoiApp, "uid">[] {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA_HANG_DOI) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function ghiHangDoi(ds: Omit<LoiApp, "uid">[]): void {
  try {
    localStorage.setItem(KHOA_HANG_DOI, JSON.stringify(ds.slice(-TOI_DA_HANG_DOI)));
  } catch {
    /* hết chỗ thì thôi */
  }
}

/** Ghi một lỗi. Gọi được ở mọi nơi, không ném lỗi. */
export function ghiLoiApp(loai: string, thongDiep: unknown, ma = "", chiTiet: unknown = ""): void {
  try {
    const cau = cheLoi(thongDiep);
    if (!cau || laLoiMang(cau)) return;
    const k = `${loai}|${khoaGop(cau)}`;
    const truoc = daGhiLuc.get(k) || 0;
    if (Date.now() - truoc < NGHI_GOP_MS) return;
    daGhiLuc.set(k, Date.now());
    const muc: Omit<LoiApp, "uid"> = {
      luc: new Date().toISOString(),
      loai,
      thongDiep: cau,
      ma: String(ma || "").slice(0, 60),
      chiTiet: cheLoi(chiTiet, 1500),
      ban: typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "",
      man: nguCanh.man,
      may: maMay(),
      loaiMay: loaiMay(),
      vaiTro: nguCanh.vaiTro,
      ten: nguCanh.ten.slice(0, 80),
    };
    ghiHangDoi([...docHangDoi(), muc]);
    void guiHangDoi();
  } catch {
    /* bộ ghi lỗi không được làm hỏng app */
  }
}

async function guiHangDoi(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (dangGui || !uid || !nguCanh.duocGhi) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const ds = docHangDoi();
  if (!ds.length) return;
  dangGui = true;
  try {
    let i = 0;
    for (; i < ds.length; i++) {
      try {
        await setDoc(doc(collection(db, KHO_LOI_APP)), { ...ds[i], uid, daXuLy: false });
      } catch {
        break;
      }
    }
    // mục chưa gửi (từ chỗ hỏng trở đi) giữ lại cho lần sau
    ghiHangDoi(ds.slice(i));
  } finally {
    dangGui = false;
  }
}

let daNghe = false;
/** Gắn bộ nghe lỗi trình duyệt — gọi một lần lúc khởi động app. */
export function batDauNgheLoi(): void {
  if (daNghe || typeof window === "undefined") return;
  daNghe = true;
  window.addEventListener("error", (e) => {
    const err = (e as ErrorEvent).error;
    ghiLoiApp("js", (e as ErrorEvent).message || err?.message || "Lỗi không rõ", "", err?.stack || `${(e as ErrorEvent).filename}:${(e as ErrorEvent).lineno}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = (e as PromiseRejectionEvent).reason;
    ghiLoiApp("promise", r?.message || r, r?.code || "", r?.stack || "");
  });
  window.addEventListener("online", () => void guiHangDoi());
}
