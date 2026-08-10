-- ============================================================================
-- BiaLogistics (Quản lý Kho Bia) — Supabase schema
-- Chạy toàn bộ file này trong Supabase SQL Editor (một lần, khi setup project mới).
--
-- Ghi chú thiết kế:
--  * Tên cột dùng camelCase (đặt trong nháy kép) để KHỚP CHÍNH XÁC với các
--    interface trong src/types.ts. Nhờ đó code phía client có thể gọi thẳng
--    supabase.from('transactions').upsert(transactionObject) mà KHÔNG cần một
--    lớp chuyển đổi tên trường — giảm tối đa rủi ro khi sửa file App.tsx lớn.
--  * "date"/"deliveryDate" lưu dạng text (ISO string) để giữ nguyên đúng chuỗi
--    mà app đang tạo ra, tránh mọi thay đổi định dạng/timezone bất ngờ.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Dọn sạch (an toàn khi chạy lại) — KHÔNG đụng tới auth.users
-- ---------------------------------------------------------------------------
drop table if exists public.transactions cascade;
drop table if exists public.revenue cascade;
drop table if exists public.partners cascade;
drop table if exists public.products cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------------
-- 1. Bảng dữ liệu nghiệp vụ
-- ---------------------------------------------------------------------------
create table public.products (
  "id"              text primary key,
  "name"            text not null,
  "category"        text not null,               -- 'Lon' | 'Lít' | 'Chai'
  "unit"            text not null,
  "price"           numeric not null default 0,
  "conversionFactor"  numeric,
  "capacityPerUnit"   numeric not null default 0
);

create table public.partners (
  "id"       text primary key,
  "sapCode"  text,
  "name"     text not null,
  "phone"    text,
  "address"  text,
  "type"     text not null                        -- SUPPLIER | AGENT | RESTAURANT | INDIVIDUAL
);

create table public.transactions (
  "id"                 text primary key,
  "date"               text not null,             -- ISO string
  "type"               text not null,             -- IN | OUT | OPENING | LOSS | DAMAGE
  "productId"          text not null,
  "productName"        text,
  "category"           text,
  "quantity"           numeric not null default 0,
  "partnerId"          text,
  "partnerName"        text,
  "notes"              text,
  "batchNumber"        text,
  "evidencePhotoUrl"   text,
  "evidencePhotoUrls"  text[],
  "createdBy"          text,
  "referenceGroupId"   text,
  "status"             text,                      -- completed | in_transit
  "originalQuantity"   numeric,
  "deliveryDate"       text
);
create index transactions_date_idx on public.transactions ("date" desc);
create index transactions_product_idx on public.transactions ("productId");

create table public.revenue (
  "id"            text primary key,
  "date"          text not null,
  "productName"   text not null,
  "materialCode"  text,
  "unit"          text,
  "quantity"      numeric not null default 0,
  "unitPrice"     numeric not null default 0,
  "totalAmount"   numeric not null default 0,
  "vatAmount"     numeric,
  "invoiceNumber" text,
  "partnerName"   text,
  "partnerId"     text,
  "deptCode"      text
);
create index revenue_invoice_idx on public.revenue ("invoiceNumber");

-- ---------------------------------------------------------------------------
-- 2. Hồ sơ người dùng (thay cho user_configs) — gắn với Supabase Auth
-- ---------------------------------------------------------------------------
create table public.profiles (
  "id"         uuid primary key references auth.users(id) on delete cascade,
  "email"      text,
  "name"       text,
  "role"       text not null default 'VIEWER' check ("role" in ('OWNER','STAFF','VIEWER')),
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Trigger: tự tạo profile khi có user Auth mới.
--    User ĐẦU TIÊN của hệ thống -> OWNER; các user sau -> VIEWER.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  existing_count int;
begin
  select count(*) into existing_count from public.profiles;
  insert into public.profiles ("id", "email", "name", "role")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when existing_count = 0 then 'OWNER' else 'VIEWER' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Helper: đọc role của user hiện tại (dùng trong RLS).
--    SECURITY DEFINER để tránh đệ quy RLS khi đọc bảng profiles.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
security definer set search_path = public
stable
as $$
  select "role" from public.profiles where "id" = auth.uid();
$$;

create or replace function public.is_owner() returns boolean
  language sql security definer set search_path = public stable
  as $$ select public.current_user_role() = 'OWNER'; $$;

create or replace function public.is_staff() returns boolean
  language sql security definer set search_path = public stable
  as $$ select public.current_user_role() in ('OWNER','STAFF'); $$;

create or replace function public.is_viewer() returns boolean
  language sql security definer set search_path = public stable
  as $$ select public.current_user_role() in ('OWNER','STAFF','VIEWER'); $$;

-- ---------------------------------------------------------------------------
-- 5. Bật RLS + policy (mirror tinh thần firestore.rules)
--    VIEWER: đọc | STAFF: đọc + tạo/sửa | OWNER: toàn quyền + xoá
-- ---------------------------------------------------------------------------
alter table public.products     enable row level security;
alter table public.partners     enable row level security;
alter table public.transactions enable row level security;
alter table public.revenue      enable row level security;
alter table public.profiles     enable row level security;

-- products (danh mục sản phẩm): đọc cho mọi user đăng nhập, sửa/xoá OWNER
create policy products_read   on public.products for select using (public.is_viewer());
create policy products_write  on public.products for insert with check (public.is_staff());
create policy products_update on public.products for update using (public.is_staff());
create policy products_delete on public.products for delete using (public.is_owner());

-- partners
create policy partners_read   on public.partners for select using (public.is_viewer());
create policy partners_write  on public.partners for insert with check (public.is_staff());
create policy partners_update on public.partners for update using (public.is_staff());
create policy partners_delete on public.partners for delete using (public.is_owner());

-- transactions: staff xoá được bản in_transit, còn lại OWNER
create policy transactions_read   on public.transactions for select using (public.is_viewer());
create policy transactions_write  on public.transactions for insert with check (public.is_staff());
create policy transactions_update on public.transactions for update using (public.is_staff());
create policy transactions_delete on public.transactions for delete
  using (public.is_owner() or (public.is_staff() and "status" = 'in_transit'));

-- revenue
create policy revenue_read   on public.revenue for select using (public.is_viewer());
create policy revenue_write  on public.revenue for insert with check (public.is_staff());
create policy revenue_update on public.revenue for update using (public.is_staff());
create policy revenue_delete on public.revenue for delete using (public.is_owner());

-- profiles: ai cũng đọc được (để hiển thị tên người tạo / danh sách user cho OWNER),
-- user tự sửa name của mình; đổi role chỉ qua Admin API (server, service-role, bỏ RLS).
create policy profiles_read        on public.profiles for select using (auth.uid() is not null);
create policy profiles_update_self on public.profiles for update using (auth.uid() = "id");

-- ---------------------------------------------------------------------------
-- 6. Bật Realtime cho 4 bảng nghiệp vụ (thay onSnapshot của Firestore)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.partners;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.revenue;
alter publication supabase_realtime add table public.profiles;

-- ---------------------------------------------------------------------------
-- 7. Seed dữ liệu gốc (products + partners) — từ src/constants.ts
-- ---------------------------------------------------------------------------
insert into public.products ("id","name","category","unit","price","conversionFactor","capacityPerUnit") values
  ('p1','Bia Golden Bridge Helles Lager','Lít','Lít',45000,1,1000),
  ('p2','Bia Wings Dark Lager','Lít','Lít',48000,1,1000),
  ('p4','Bia Golden Bridge Helles Lager lon330ml','Lon','Lon',15833,1,330),
  ('p5','Bia Wings Dark Lager 330ml','Lon','Lon',17083,1,330),
  ('p10','Bia Volcano Kiss dry hop lager','Lít','Lít',58000,1,1000),
  ('p11','Bia Helios Wheat Lager','Lít','Lít',53000,1,1000),
  ('p12','Bia Eclipse Plaza Dry Hop Wheat','Lít','Lít',54000,1,1000),
  ('p14','Bia Golden Zest','Lít','Lít',47000,1,1000),
  ('p15','Bia Lunar Castle Dry hop Pale Ale','Lít','Lít',55000,1,1000),
  ('p16','Bia Time Gate Light Lager','Lít','Lít',45000,1,1000),
  ('p17','Bia Lunar Castle Dry hop Pale Ale 330ml','Lon','Lon',17500,1,330)
on conflict ("id") do nothing;

insert into public.partners ("id","sapCode","name","type") values
  ('SKB-BNC','SKB-BNC','SKB-BNC','SUPPLIER'),
  ('AD0104','AD0104','APC','AGENT'),
  ('AC0118','AC0118','BNG','AGENT'),
  ('AC0132','AC0132','Capella','AGENT'),
  ('AC0107','AC0107','FV','AGENT'),
  ('AD0106','AD0106','HTI','AGENT'),
  ('AC0103','AC0103','ITC','AGENT'),
  ('AC0104','AC0104','NVT','AGENT'),
  ('AC0129','AC0129','CCP','AGENT'),
  ('AC0105','AC0105','PVD','AGENT'),
  ('AD0114','AD0114','Hà Nam','AGENT'),
  ('AD0103','AD0103','BNC','AGENT'),
  ('AC0128','AC0128','OHL','AGENT'),
  ('AC0102','AC0102','MGS','AGENT'),
  ('AD0101','AD0101','Cát Bà','AGENT'),
  ('AB0117','AB0117','SHD','AGENT'),
  ('AB0125','AB0125','PQC','AGENT'),
  ('AC0130','AC0130','Serena','AGENT'),
  ('AA0101','AA0101','SPA','AGENT'),
  ('AD0100','AD0100','HLS','AGENT'),
  ('AD0115','AD0115','SVT','AGENT'),
  ('AD0112','AD0112','FSS','AGENT'),
  ('Ngiao','','Khách ngoại giao','AGENT'),
  ('SYSTEM_SYNC','SYNC','Tin Tin (Hệ thống)','AGENT')
on conflict ("id") do nothing;

-- Xong. Sau khi chạy file này, đăng ký tài khoản đầu tiên trên app -> tự động là OWNER.
