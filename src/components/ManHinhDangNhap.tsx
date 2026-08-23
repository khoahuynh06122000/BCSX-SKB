import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

/**
 * MÀN HÌNH ĐĂNG NHẬP
 *
 * Nền chuyển màu toả tròn, bọt bia bay lên không ngừng, ly bia ở giữa nghiêng
 * theo con trỏ, hoa bia và hạt lúa mạch trôi quanh và BỊ ĐẨY RA khi con trỏ
 * lại gần. Chọn loại bia bên phải thì cả nền lẫn ly đổi màu.
 *
 * HÌNH VẼ BẰNG SVG, KHÔNG DÙNG ẢNH. Mẫu thiết kế gốc dựng trên mấy tệp mô hình
 * 3D và ảnh lon nước ngọt tải từ máy chủ ngoài. App này không có ảnh sản phẩm
 * bia nào — danh mục chỉ lưu tên, mã vật tư và dung tích, còn Cloudinary chỉ
 * chứa ảnh biên bản. Nên hình ở đây vẽ thẳng bằng SVG: đúng chủ đề bia, không
 * phụ thuộc tệp bên ngoài, không thêm một đường hỏng khi mạng chập chờn — mà
 * màn hình đăng nhập thì hỏng là không ai vào được.
 *
 * Hai loại bia lấy từ chính danh mục thật: Golden Bridge Helles Lager (bia
 * vàng) và Wings Dark Lager (bia đen).
 */

interface Props {
  onLogin: () => void;
  isAuthenticating: boolean;
  authError: string;
  /** Mã commit của bản đang chạy, để đối chiếu khi có sự cố. */
  maBuild: string;
}

type LoaiBia = "vang" | "den";

/** Bảng màu của bia trong ly, đổi theo loại. */
const MAU_BIA: Record<LoaiBia, { dam: string; nhat: string; bot: string }> = {
  vang: { dam: "#b4791b", nhat: "#f7c948", bot: "#fff6de" },
  den: { dam: "#3d1109", nhat: "#8a3520", bot: "#f0dcc8" },
};

const BIA = [
  {
    id: "vang" as LoaiBia,
    ten: "Golden Bridge",
    phu: "Helles Lager",
    dvt: "Lít",
  },
  {
    id: "den" as LoaiBia,
    ten: "Wings Dark",
    phu: "Dark Lager",
    dvt: "Lít",
  },
];

/** Hoa bia và hạt lúa mạch trôi quanh: vị trí, cỡ, lớp trước hay sau. */
const HAT = [
  { top: "22%", left: "26%", co: 84, loai: "hoa", truoc: true },
  { top: "62%", left: "38%", co: 52, loai: "lua", truoc: true },
  { top: "30%", left: "66%", co: 96, loai: "hoa", truoc: true },
  { top: "14%", left: "52%", co: 60, loai: "lua", truoc: true },
  { top: "76%", left: "20%", co: 66, loai: "hoa", truoc: true },
  { top: "46%", left: "78%", co: 74, loai: "lua", truoc: true },
  { top: "16%", left: "40%", co: 44, loai: "hoa", truoc: false },
  { top: "54%", left: "58%", co: 38, loai: "lua", truoc: false },
  { top: "82%", left: "34%", co: 42, loai: "hoa", truoc: false },
] as const;

/** Chu kỳ trôi của từng hạt, giây. Lệch nhau để không trôi thành hàng. */
const CHU_KY = [5, 7, 6, 8, 5.5, 6.5, 9, 11, 10];

function HoaBia({ mau }: { mau: string }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <g fill={mau} opacity="0.92">
        <ellipse cx="32" cy="14" rx="9" ry="7" />
        <ellipse cx="24" cy="24" rx="10" ry="8" />
        <ellipse cx="40" cy="24" rx="10" ry="8" />
        <ellipse cx="32" cy="33" rx="11" ry="8.5" />
        <ellipse cx="25" cy="43" rx="9" ry="7" />
        <ellipse cx="39" cy="43" rx="9" ry="7" />
        <ellipse cx="32" cy="52" rx="7" ry="6" />
      </g>
      <path
        d="M32 6v6"
        stroke={mau}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function LuaMach({ mau }: { mau: string }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <path
        d="M32 60V22"
        stroke={mau}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <g fill={mau} opacity="0.92">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <ellipse
              cx="24"
              cy={24 + i * 9}
              rx="6.5"
              ry="4"
              transform={`rotate(-35 24 ${24 + i * 9})`}
            />
            <ellipse
              cx="40"
              cy={24 + i * 9}
              rx="6.5"
              ry="4"
              transform={`rotate(35 40 ${24 + i * 9})`}
            />
          </g>
        ))}
        <ellipse cx="32" cy="16" rx="5" ry="8" />
      </g>
    </svg>
  );
}

/** Ly bia vẽ bằng SVG: thân thuỷ tinh, lớp bia, lớp bọt, quai cầm. */
function LyBia({ loai }: { loai: LoaiBia }) {
  const m = MAU_BIA[loai];
  return (
    <svg viewBox="0 0 280 400" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="dn-bia" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={m.dam} />
          <stop offset="38%" stopColor={m.nhat} />
          <stop offset="72%" stopColor={m.dam} />
          <stop offset="100%" stopColor={m.dam} />
        </linearGradient>
        <linearGradient id="dn-kinh" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.30)" />
          <stop offset="22%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="88%" stopColor="rgba(255,255,255,0.22)" />
        </linearGradient>
        <clipPath id="dn-than">
          <path d="M62 96h156l-16 268a20 20 0 0 1-20 19H98a20 20 0 0 1-20-19L62 96z" />
        </clipPath>
      </defs>

      {/* Quai cầm */}
      <path
        d="M218 150c40 0 54 22 54 52s-16 52-56 52"
        fill="none"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="17"
        strokeLinecap="round"
      />

      {/* Bia trong ly */}
      <g clipPath="url(#dn-than)">
        <rect x="52" y="150" width="180" height="250" fill="url(#dn-bia)" />
        {/* Bọt li ti nổi trong bia */}
        {[
          [92, 330, 5],
          [128, 300, 4],
          [166, 340, 6],
          [110, 250, 3.5],
          [180, 270, 4.5],
          [148, 215, 3],
          [96, 200, 4],
          [188, 200, 3],
        ].map(([x, y, r], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill="rgba(255,255,255,0.5)"
          />
        ))}
      </g>

      {/* Lớp bọt trên miệng ly */}
      <g clipPath="url(#dn-than)">
        <path
          d="M52 150c14-16 30 8 46-6s28 12 44 0 30 10 46-2 26 6 44-4v34H52z"
          fill={m.bot}
        />
      </g>
      <ellipse cx="140" cy="104" rx="82" ry="20" fill={m.bot} />
      <ellipse
        cx="140"
        cy="99"
        rx="82"
        ry="20"
        fill="#ffffff"
        opacity="0.55"
      />

      {/* Thành ly thuỷ tinh */}
      <path
        d="M62 96h156l-16 268a20 20 0 0 1-20 19H98a20 20 0 0 1-20-19L62 96z"
        fill="url(#dn-kinh)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="3"
      />
      {/* Vệt sáng dọc thân */}
      <path
        d="M86 118l-8 232"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M196 124l-6 216"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ManHinhDangNhap({
  onLogin,
  isAuthenticating,
  authError,
  maBuild,
}: Props) {
  const [loai, setLoai] = useState<LoaiBia>("vang");
  const nenRef = useRef<HTMLDivElement>(null);
  const lyRef = useRef<HTMLDivElement>(null);
  const lopTruocRef = useRef<HTMLDivElement>(null);
  const lopSauRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  const mau = MAU_BIA[loai];

  /** Bọt bia bay lên: sinh liên tục rồi tự dọn khi bay hết màn hình. */
  useEffect(() => {
    const oBot = botRef.current;
    if (!oBot) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const hen = window.setInterval(() => {
      // Tab bị ẩn thì đừng sinh thêm: trình duyệt gom hết vào một lúc khi quay
      // lại, màn hình đầy bọt cùng lúc rồi giật.
      if (document.hidden) return;
      const b = document.createElement("div");
      b.className = "dn-bot";
      const co = Math.random() * 18 + 8;
      b.style.width = `${co}px`;
      b.style.height = `${co}px`;
      b.style.left = `${Math.random() * 100}%`;
      b.style.bottom = "-40px";
      const giay = Math.random() * 6 + 4;
      b.style.animation = `dn-bot-bay ${giay}s linear forwards`;
      oBot.appendChild(b);
      window.setTimeout(() => b.remove(), giay * 1000);
    }, 400);

    return () => window.clearInterval(hen);
  }, []);

  /*
   * Vòng lặp chuyển động: ly nghiêng theo con trỏ, hai lớp hạt trôi ngược
   * chiều nhau cho có chiều sâu, và mỗi hạt bị con trỏ đẩy ra.
   *
   * Ghi thẳng vào `style.transform` chứ không qua state React: mỗi khung hình
   * mà gọi setState là dựng lại cả cây giao diện 60 lần một giây, máy yếu sẽ
   * khựng ngay.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chuot = { x: 0, y: 0, px: -9999, py: -9999 };
    const muot = { x: 0, y: 0 };
    const trangThai = new WeakMap<
      Element,
      { rx: number; ry: number; goc: number }
    >();

    const theoChuot = (e: MouseEvent) => {
      chuot.x = e.clientX / window.innerWidth - 0.5;
      chuot.y = e.clientY / window.innerHeight - 0.5;
      chuot.px = e.clientX;
      chuot.py = e.clientY;
    };
    window.addEventListener("mousemove", theoChuot);

    let id = 0;
    const chay = () => {
      const t = Date.now() * 0.001;
      muot.x += (chuot.x - muot.x) * 0.05;
      muot.y += (chuot.y - muot.y) * 0.05;

      if (lyRef.current) {
        lyRef.current.style.transform = `perspective(1200px) rotateY(${muot.x * 18}deg) rotateX(${-muot.y * 12}deg)`;
      }
      if (lopTruocRef.current) {
        lopTruocRef.current.style.transform = `translate(${muot.x * 60}px, ${muot.y * 60}px)`;
      }
      if (lopSauRef.current) {
        lopSauRef.current.style.transform = `translate(${muot.x * -30}px, ${muot.y * -30}px)`;
      }

      document.querySelectorAll<HTMLElement>(".dn-hat").forEach((hat, i) => {
        const o = hat.getBoundingClientRect();
        const dx = chuot.px - (o.left + o.width / 2);
        const dy = chuot.py - (o.top + o.height / 2);
        const kc = Math.sqrt(dx * dx + dy * dy);

        let dichX = 0;
        let dichY = 0;
        let nhanh = 1;
        // Trong bán kính 400px thì bị đẩy ra, càng gần càng mạnh.
        if (kc < 400 && kc > 0) {
          const luc = (400 - kc) / 400;
          dichX = (dx / kc) * luc * -80;
          dichY = (dy / kc) * luc * -80;
          nhanh = 1 + luc * 5;
        }

        const cu = trangThai.get(hat) ?? {
          rx: 0,
          ry: 0,
          goc: (i * 137) % 360,
        };
        cu.rx += (dichX - cu.rx) * 0.1;
        cu.ry += (dichY - cu.ry) * 0.1;
        cu.goc += 0.2 * nhanh;
        trangThai.set(hat, cu);

        const chuKy = CHU_KY[i % CHU_KY.length];
        const pha = (t + i * 0.7) * ((Math.PI * 2) / chuKy);
        const noiY = Math.sin(pha) * 15;
        const nghieng = Math.cos(pha) * 6;

        hat.style.transform = `translate(${cu.rx}px, ${cu.ry + noiY}px) rotate(${cu.goc + nghieng}deg)`;
      });

      id = requestAnimationFrame(chay);
    };
    id = requestAnimationFrame(chay);

    return () => {
      window.removeEventListener("mousemove", theoChuot);
      cancelAnimationFrame(id);
    };
  }, []);

  const hatTruoc = useMemo(() => HAT.filter((h) => h.truoc), []);
  const hatSau = useMemo(() => HAT.filter((h) => !h.truoc), []);

  const veHat = (
    ds: readonly (typeof HAT)[number][],
    lech: number,
    mo: number,
  ) =>
    ds.map((h, i) => (
      <div
        key={`${h.top}-${h.left}`}
        className="dn-hat absolute pointer-events-none"
        style={{
          top: h.top,
          left: h.left,
          width: h.co,
          height: h.co,
          opacity: mo,
          filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.35))",
        }}
        data-i={i + lech}
      >
        {h.loai === "hoa" ? (
          <HoaBia mau={mau.nhat} />
        ) : (
          <LuaMach mau={mau.bot} />
        )}
      </div>
    ));

  return (
    <div
      ref={nenRef}
      className={`dn-nen relative h-screen overflow-hidden text-white ${loai === "den" ? "dn-den" : ""}`}
    >
      {/* Bọt bia */}
      <div
        ref={botRef}
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      />

      {/* Thanh trên */}
      <header className="fixed top-0 z-40 flex w-full items-center justify-between gap-4 px-[4%] py-6">
        <div className="flex items-center gap-2 shrink-0">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 8V16M8 12H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="text-[1.15rem]"
            style={{ fontFamily: "Galada, cursive" }}
          >
            Bia Bà Nà
          </span>
        </div>

        {/*
          Không phải thanh điều hướng: chưa đăng nhập thì chẳng đi đâu được.
          Đây là danh sách phân hệ của hệ thống, để người mới biết mình sắp vào
          đâu — nút bấm không dẫn tới đâu chỉ làm người ta bực.
        */}
        <div className="dn-kinh dn-nav hidden gap-1 rounded-full p-1.5 lg:flex">
          {["Nhập kho", "Xuất kho", "Công nợ", "Báo cáo", "Đơn BNC"].map(
            (t, i) => (
              <span
                key={t}
                className={`rounded-full px-4 py-2 text-[0.8rem] font-medium ${
                  i === 0
                    ? "bg-[#f7c948] text-[#2a1a02]"
                    : "text-white/70"
                }`}
              >
                {t}
              </span>
            ),
          )}
        </div>

        <span className="dn-kinh shrink-0 rounded-full px-4 py-2 font-mono text-[10px] tracking-widest text-white/70">
          build {maBuild}
        </span>
      </header>

      {/* Hạt lớp sau */}
      <div
        ref={lopSauRef}
        className="pointer-events-none absolute inset-0 z-0"
      >
        {veHat(hatSau, hatTruoc.length, 0.55)}
      </div>

      {/* Ly bia ở giữa */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div
          ref={lyRef}
          className="dn-ly h-[58vh] max-h-[560px] w-auto"
          style={{ aspectRatio: "280 / 400" }}
        >
          <LyBia loai={loai} />
        </div>
      </div>

      {/* Hạt lớp trước */}
      <div
        ref={lopTruocRef}
        className="pointer-events-none absolute inset-0 z-30"
      >
        {veHat(hatTruoc, 0, 1)}
      </div>

      {/* Nội dung */}
      <main className="relative z-20 flex h-full items-center px-[4%] pt-24">
        <div className="flex h-full w-full items-stretch justify-between gap-6">
          {/* Cột trái */}
          <div className="flex h-full max-w-xl flex-col gap-6 py-16">
            <h1 className="dn-tieu-de" style={{ animation: "dn-hien-len 0.9s ease-out both" }}>
              Tinh hoa
              <br />
              Bia Bà Nà
            </h1>

            <p className="max-w-md text-[0.95rem] leading-relaxed text-white/70">
              Hệ thống quản trị kho bia của Sun World Ba Na Hills.
              <br />
              Nhập kho có chữ ký, xuất kho theo lô, công nợ và hóa đơn —
              <br />
              tất cả trong một chỗ.
            </p>

            {authError && (
              <div className="flex max-w-md gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/15 p-4 backdrop-blur">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-200" />
                <p className="text-xs font-bold leading-relaxed text-rose-50">
                  {authError}
                </p>
              </div>
            )}

            <div>
              <button
                onClick={onLogin}
                disabled={isAuthenticating}
                className="flex w-fit items-center gap-5 rounded-full bg-black/50 py-1.5 pl-6 pr-1.5 font-bold transition-all hover:-translate-y-0.5 hover:bg-black/70 active:translate-y-0 disabled:opacity-60"
              >
                <span className="text-sm">
                  {isAuthenticating ? "Đang xác thực..." : "Đăng nhập bằng Google"}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f7c948] text-[#2a1a02]">
                  {isAuthenticating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  )}
                </span>
              </button>
            </div>

            <div className="mt-auto flex max-w-md items-start gap-3">
              <div className="dn-kinh flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                <ShieldCheck className="h-5 w-5 text-white/80" />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.7rem] uppercase tracking-[0.15em] text-white/60">
                  Cần được phê duyệt
                </span>
                <span className="text-[0.8rem] font-semibold leading-snug text-white/85">
                  Lần đầu đăng nhập, tài khoản ở trạng thái chờ cho tới khi chủ
                  sở hữu duyệt.
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải */}
          <div className="hidden h-full w-[420px] flex-col items-end justify-between py-16 text-right lg:flex">
            <div className="flex flex-col items-end gap-5">
              <div className="flex gap-3">
                {BIA.map((b) => {
                  const dangChon = loai === b.id;
                  const m = MAU_BIA[b.id];
                  return (
                    <button
                      key={b.id}
                      onClick={() => setLoai(b.id)}
                      className={`dn-kinh group relative w-[140px] cursor-pointer rounded-[28px] p-4 pt-8 text-center transition-all duration-300 ${
                        dangChon
                          ? "border-[#f7c948]"
                          : "hover:border-white/40"
                      }`}
                      style={
                        dangChon
                          ? { borderColor: "#f7c948" }
                          : undefined
                      }
                    >
                      <div className="mx-auto mb-3 h-24 w-16 transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-8deg] group-hover:scale-110">
                        <svg viewBox="0 0 64 96" className="h-full w-full" aria-hidden="true">
                          <rect
                            x="14"
                            y="10"
                            width="36"
                            height="80"
                            rx="8"
                            fill={m.dam}
                          />
                          <rect
                            x="14"
                            y="10"
                            width="12"
                            height="80"
                            rx="6"
                            fill="rgba(255,255,255,0.22)"
                          />
                          <rect
                            x="14"
                            y="38"
                            width="36"
                            height="20"
                            fill={m.bot}
                            opacity="0.9"
                          />
                          <ellipse cx="32" cy="10" rx="18" ry="5" fill="rgba(255,255,255,0.5)" />
                        </svg>
                      </div>
                      <div className="flex flex-col text-[0.72rem] leading-tight">
                        <span className="font-semibold">{b.ten}</span>
                        <span className="text-white/60">{b.phu}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.7rem] uppercase tracking-[0.15em] text-white/50">
                Chọn để đổi tông màn hình
              </p>
            </div>

            <h2 className="dn-tieu-de self-end text-right">
              Tươi mới
              <br />
              Mỗi ngày
            </h2>
          </div>
        </div>
      </main>
    </div>
  );
}
