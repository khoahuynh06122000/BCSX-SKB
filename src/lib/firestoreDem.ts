/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CÁC HÀM FIRESTORE ĐÃ BỌC BỘ ĐO LƯỢT GỌI.
 *
 * Tách khỏi `src/firebase.ts` vì tệp đó khởi động Firebase ngay khi được nạp
 * (đọc khoá từ biến môi trường). Bộ cấp số phiếu cần các hàm này, và phép
 * kiểm của nó chạy trong Node không có khoá — nạp `firebase.ts` là sập. Tệp
 * này chỉ phụ thuộc `firebase/firestore` và `doLuong.ts`, nạp ở đâu cũng được.
 *
 * Mọi chỗ trong app lấy hàm Firestore qua `firebase.ts` (tệp đó lấy từ đây)
 * hoặc thẳng từ đây — không ai gọi `firebase/firestore` trực tiếp để đọc ghi.
 */

import {
  getDocs as fsGetDocs,
  getDoc as fsGetDoc,
  getDocFromServer as fsGetDocFromServer,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  onSnapshot as fsOnSnapshot,
  runTransaction as fsRunTransaction,
  writeBatch as fsWriteBatch,
} from "firebase/firestore";
import { BO_DEM, soDocCuaSnapshot } from "./doLuong";
import { SUC_KHOE } from "./sucKhoe";

/* =========================================================================
 * BỘ ĐO LƯỢT GỌI — gắn ở cửa duy nhất mọi lệnh Firestore của app đi qua.
 *
 * App, các component và bộ cấp số phiếu đều lấy hàm Firestore từ tệp này.
 * Bọc ngay tại đây thì mọi lượt đọc / ghi / xoá đều được đếm, kể cả những
 * đường gọi viết thêm sau này — không phải nhớ cài bộ đếm vào từng chỗ.
 *
 * Cách đếm theo đúng cách Firestore tính lượt: xem `src/lib/doLuong.ts`.
 *
 * Cũng ở cửa này, mọi lệnh ghi được `SUC_KHOE` theo dõi (treo quá lâu, máy
 * chủ từ chối) và mọi listener hỏng vì máy chủ được báo lên dải cảnh báo —
 * xem `src/lib/sucKhoe.ts`.
 * ========================================================================= */

const onSnapshot = ((ref: unknown, ...thamSo: any[]) => {
  // Lần ĐẦU snapshot về từ máy chủ thì tính cả bảng; sau đó chỉ tính dòng đổi.
  let daCoMayChu = false;
  const dem = (snap: any) => {
    const n = soDocCuaSnapshot(snap, !daCoMayChu);
    if (!snap?.metadata?.fromCache) daCoMayChu = true;
    BO_DEM.them("doc", n);
  };
  const i = thamSo.findIndex(
    (x) => typeof x === "function" || (x && typeof x.next === "function"),
  );
  // Listener hỏng thì Firestore đóng luôn nó — báo lên dải cảnh báo, rồi
  // vẫn chuyển lỗi cho hàm báo lỗi của nơi gọi như cũ.
  const baoLoi = (goc?: (e: unknown) => void) => (e: unknown) => {
    SUC_KHOE.baoLoiDoc(e);
    return goc?.(e);
  };
  if (i >= 0) {
    const goc = thamSo[i];
    if (typeof goc === "function") {
      thamSo[i + 1] = baoLoi(
        typeof thamSo[i + 1] === "function" ? thamSo[i + 1] : undefined,
      );
    }
    thamSo[i] =
      typeof goc === "function"
        ? (snap: any) => {
            dem(snap);
            return goc(snap);
          }
        : {
            ...goc,
            next: (snap: any) => {
              dem(snap);
              return goc.next(snap);
            },
            error: baoLoi(goc.error?.bind(goc)),
          };
  }
  return (fsOnSnapshot as any)(ref, ...thamSo);
}) as typeof fsOnSnapshot;

const getDocs = (async (...a: Parameters<typeof fsGetDocs>) => {
  const kq = await fsGetDocs(...a);
  if (!kq.metadata.fromCache) BO_DEM.them("doc", Math.max(1, kq.size));
  return kq;
}) as typeof fsGetDocs;

const getDoc = (async (...a: Parameters<typeof fsGetDoc>) => {
  const kq = await fsGetDoc(...a);
  if (!kq.metadata.fromCache) BO_DEM.them("doc", 1);
  return kq;
}) as typeof fsGetDoc;

const getDocFromServer = (async (...a: Parameters<typeof fsGetDocFromServer>) => {
  const kq = await fsGetDocFromServer(...a);
  BO_DEM.them("doc", 1);
  return kq;
}) as typeof fsGetDocFromServer;

const setDoc = (async (...a: any[]) => {
  await SUC_KHOE.theoDoiGhi((fsSetDoc as any)(...a));
  BO_DEM.them("ghi", 1);
}) as typeof fsSetDoc;

const updateDoc = (async (...a: any[]) => {
  await SUC_KHOE.theoDoiGhi((fsUpdateDoc as any)(...a));
  BO_DEM.them("ghi", 1);
}) as typeof fsUpdateDoc;

const deleteDoc = (async (...a: Parameters<typeof fsDeleteDoc>) => {
  await SUC_KHOE.theoDoiGhi(fsDeleteDoc(...a));
  BO_DEM.them("xoa", 1);
}) as typeof fsDeleteDoc;

/** Lô ghi: đếm từng thao tác, chỉ cộng vào bộ đo khi lô ghi THÀNH CÔNG. */
const writeBatch = ((...a: Parameters<typeof fsWriteBatch>) => {
  const b: any = fsWriteBatch(...a);
  let ghi = 0;
  let xoa = 0;
  const set = b.set.bind(b);
  const update = b.update.bind(b);
  const del = b.delete.bind(b);
  const commit = b.commit.bind(b);
  b.set = (...x: any[]) => {
    ghi += 1;
    set(...x);
    return b;
  };
  b.update = (...x: any[]) => {
    ghi += 1;
    update(...x);
    return b;
  };
  b.delete = (...x: any[]) => {
    xoa += 1;
    del(...x);
    return b;
  };
  b.commit = async () => {
    await SUC_KHOE.theoDoiGhi(commit());
    BO_DEM.them("ghi", ghi);
    BO_DEM.them("xoa", xoa);
  };
  return b;
}) as typeof fsWriteBatch;

/**
 * Giao dịch Firestore (bộ cấp số phiếu dùng). Firestore có thể chạy lại hàm
 * nhiều lần khi đụng độ — mỗi lần chạy lại là lượt đọc / ghi thật, nên đếm cả.
 */
const runTransaction = ((dbx: any, hamGoc: any, ...con: any[]) =>
  SUC_KHOE.theoDoiGhi((fsRunTransaction as any)(
    dbx,
    (tx: any) => {
      const boc = {
        get: async (...x: any[]) => {
          const kq = await tx.get(...x);
          BO_DEM.them("doc", 1);
          return kq;
        },
        set: (...x: any[]) => {
          BO_DEM.them("ghi", 1);
          tx.set(...x);
          return boc;
        },
        update: (...x: any[]) => {
          BO_DEM.them("ghi", 1);
          tx.update(...x);
          return boc;
        },
        delete: (...x: any[]) => {
          BO_DEM.them("xoa", 1);
          tx.delete(...x);
          return boc;
        },
      };
      return hamGoc(boc);
    },
    ...con,
  ))) as typeof fsRunTransaction;

export {
  onSnapshot,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
};
