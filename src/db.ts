/**
 * Lớp tương thích Firestore trên nền Supabase.
 *
 * App.tsx (rất lớn, ~8.900 dòng) trước đây dùng API kiểu Firestore
 * (collection/doc/onSnapshot/setDoc/updateDoc/deleteDoc/writeBatch...).
 * Thay vì viết lại ~60 điểm gọi rải rác — rủi ro cao — ta cung cấp đúng bộ
 * hàm đó nhưng chạy trên Supabase (Postgres + Realtime). Nhờ các cột trong DB
 * được đặt tên camelCase KHỚP CHÍNH XÁC với object phía client, dữ liệu đi qua
 * mà không cần lớp chuyển đổi tên trường.
 *
 * onSnapshot = fetch lần đầu + subscribe postgres_changes rồi refetch mỗi khi
 * bảng thay đổi (đơn giản, đúng, khớp hành vi realtime của Firestore).
 */
import { supabase } from './supabaseClient';

// "db" chỉ là sentinel để giữ nguyên chữ ký collection(db, ...) / doc(db, ...).
export const db = { __supabase: true } as const;

type CollectionRef = { __type: 'collection'; table: string };
type DocRef = { __type: 'doc'; table: string; id: string };
type Constraint =
  | { __type: 'where'; field: string; op: string; value: unknown }
  | { __type: 'orderBy'; field: string; dir: 'asc' | 'desc' };
type QueryRef = { __type: 'query'; table: string; constraints: Constraint[] };

export function collection(_db: unknown, table: string): CollectionRef {
  return { __type: 'collection', table };
}

export function doc(_db: unknown, table: string, id: string): DocRef {
  return { __type: 'doc', table, id };
}

export function query(
  ref: CollectionRef | QueryRef,
  ...constraints: Constraint[]
): QueryRef {
  return { __type: 'query', table: ref.table, constraints };
}

export function where(field: string, op: string, value: unknown): Constraint {
  return { __type: 'where', field, op, value };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Constraint {
  return { __type: 'orderBy', field, dir };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConstraints(qb: any, constraints: Constraint[] = []) {
  for (const c of constraints) {
    if (c.__type === 'where') {
      switch (c.op) {
        case '==': qb = qb.eq(c.field, c.value); break;
        case '!=': qb = qb.neq(c.field, c.value); break;
        case '>': qb = qb.gt(c.field, c.value); break;
        case '>=': qb = qb.gte(c.field, c.value); break;
        case '<': qb = qb.lt(c.field, c.value); break;
        case '<=': qb = qb.lte(c.field, c.value); break;
        case 'in': qb = qb.in(c.field, c.value as unknown[]); break;
        default: break;
      }
    } else if (c.__type === 'orderBy') {
      qb = qb.order(c.field, { ascending: c.dir !== 'desc' });
    }
  }
  return qb;
}

// --- Snapshot giả lập kiểu Firestore --------------------------------------
type Row = Record<string, unknown> & { id: string };

function makeDocSnapshot(id: string, row: Row | null) {
  return {
    id,
    exists: () => row !== null,
    data: () => row ?? undefined,
  };
}

function makeQuerySnapshot(rows: Row[]) {
  const docs = rows.map((r) => ({
    id: r.id,
    exists: () => true,
    data: () => r,
  }));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (fn: (d: (typeof docs)[number]) => void) => docs.forEach(fn),
  };
}

// --- Đọc một lần ------------------------------------------------------------
export async function getDocFromServer(ref: DocRef) {
  const { data, error } = await supabase
    .from(ref.table)
    .select('*')
    .eq('id', ref.id)
    .maybeSingle();
  if (error) throw error;
  return makeDocSnapshot(ref.id, (data as Row) ?? null);
}
export const getDoc = getDocFromServer;

export async function getDocs(q: QueryRef | CollectionRef) {
  let qb = supabase.from(q.table).select('*');
  qb = applyConstraints(qb, (q as QueryRef).constraints);
  const { data, error } = await qb;
  if (error) throw error;
  return makeQuerySnapshot((data as Row[]) ?? []);
}

// --- Realtime ---------------------------------------------------------------
let channelSeq = 0;

export function onSnapshot(
  ref: DocRef | QueryRef | CollectionRef,
  onNext: (snap: any) => void,
  onError?: (err: unknown) => void,
) {
  let active = true;
  const table = ref.table;

  const fetchAndEmit = async () => {
    try {
      if (ref.__type === 'doc') {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('id', ref.id)
          .maybeSingle();
        if (error) throw error;
        if (active) onNext(makeDocSnapshot(ref.id, (data as Row) ?? null));
      } else {
        let qb = supabase.from(table).select('*');
        qb = applyConstraints(qb, (ref as QueryRef).constraints);
        const { data, error } = await qb;
        if (error) throw error;
        if (active) onNext(makeQuerySnapshot((data as Row[]) ?? []));
      }
    } catch (e) {
      if (active && onError) onError(e);
    }
  };

  // Phát ngay lần đầu
  fetchAndEmit();

  // Lắng nghe thay đổi và refetch
  const channel = supabase
    .channel(`rt-${table}-${channelSeq++}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => {
        fetchAndEmit();
      },
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

// --- Ghi --------------------------------------------------------------------
export async function setDoc(ref: DocRef, data: Record<string, unknown>) {
  const row = { ...data, id: ref.id };
  const { error } = await supabase.from(ref.table).upsert(row);
  if (error) throw error;
}

export async function updateDoc(ref: DocRef, patch: Record<string, unknown>) {
  const { error } = await supabase.from(ref.table).update(patch).eq('id', ref.id);
  if (error) throw error;
}

export async function deleteDoc(ref: DocRef) {
  const { error } = await supabase.from(ref.table).delete().eq('id', ref.id);
  if (error) throw error;
}

// --- Batch (gom nhiều thao tác cùng commit) --------------------------------
type BatchOp =
  | { kind: 'set'; ref: DocRef; data: Record<string, unknown> }
  | { kind: 'update'; ref: DocRef; patch: Record<string, unknown> }
  | { kind: 'delete'; ref: DocRef };

export function writeBatch(_db?: unknown) {
  const ops: BatchOp[] = [];
  return {
    set(ref: DocRef, data: Record<string, unknown>) {
      ops.push({ kind: 'set', ref, data });
    },
    update(ref: DocRef, patch: Record<string, unknown>) {
      ops.push({ kind: 'update', ref, patch });
    },
    delete(ref: DocRef) {
      ops.push({ kind: 'delete', ref });
    },
    async commit() {
      // Gom các 'set' theo bảng để upsert hàng loạt (nhanh hơn).
      const setsByTable: Record<string, Row[]> = {};
      // Gom các 'delete' theo bảng để xoá theo mảng id.
      const deletesByTable: Record<string, string[]> = {};

      for (const op of ops) {
        if (op.kind === 'set') {
          (setsByTable[op.ref.table] ||= []).push({
            ...op.data,
            id: op.ref.id,
          } as Row);
        } else if (op.kind === 'delete') {
          (deletesByTable[op.ref.table] ||= []).push(op.ref.id);
        }
      }

      for (const [table, rows] of Object.entries(setsByTable)) {
        const { error } = await supabase.from(table).upsert(rows);
        if (error) throw error;
      }

      // 'update' chạy tuần tự vì mỗi bản có patch riêng.
      for (const op of ops) {
        if (op.kind === 'update') {
          const { error } = await supabase
            .from(op.ref.table)
            .update(op.patch)
            .eq('id', op.ref.id);
          if (error) throw error;
        }
      }

      for (const [table, ids] of Object.entries(deletesByTable)) {
        const { error } = await supabase.from(table).delete().in('id', ids);
        if (error) throw error;
      }
    },
  };
}
