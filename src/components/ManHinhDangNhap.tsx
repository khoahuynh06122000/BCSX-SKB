import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck, UserPlus } from "lucide-react";

/**
 * MÀN HÌNH ĐĂNG NHẬP
 *
 * Nền chuyển màu toả tròn, bọt bia bay lên không ngừng, ly bia ở giữa nghiêng
 * theo con trỏ, hoa bia và hạt lúa mạch trôi quanh và BỊ ĐẨY RA khi con trỏ
 * lại gần. Chọn loại bia bên phải thì cả nền lẫn ly đổi màu.
 *
 * DÙNG ẢNH LON THẬT NẾU CÓ, KHÔNG CÓ THÌ VẼ BẰNG SVG. Thả ba tệp PNG nền
 * trong vào `public/` là ảnh tự thay cho hình vẽ, không phải sửa dòng code nào. Chưa có tệp thì quay về hình vẽ —
 * không vỡ, không ô trắng. Xem `ANH_LON` bên dưới.
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

/**
 * Ba loại bia Sun KraftBeer · Bà Nà Signature, khớp với danh mục trong app:
 *   caubang → Bia Golden Bridge Helles Lager       (Cầu Vàng, lon đỏ)
 *   laudai  → Bia Lunar Castle Dry hop Pale Ale    (Lâu Đài Mặt Trăng, lon trắng)
 *   atlas   → Bia Wings Dark Lager                 (Sức Mạnh Atlas, lon đen)
 */
type LoaiBia = "caubang" | "laudai" | "atlas";

/**
 * BA ẢNH LON TĨNH — dựng sẵn từ file bao bì của bộ phận.
 *
 * ẢNH CHỤP LON THẬT của bộ phận, đã qua `scripts/chuan-hoa-anh-lon.py`: tách
 * nền trắng, lật lại tấm bị lật gương, và xoá hạt nước đọng. Xem
 * `public/README-anh-lon.md`.
 *
 * TRƯỚC ĐÂY LÀ MỘT LON QUAY 3D, dựng lại từng khung hình bằng canvas. Đã làm ba
 * vòng: ảnh chụp mặt trước/mặt sau (nhoè ở hai hông), cuộn nhãn 360° (hết nhoè
 * nhưng đỉnh và đáy không ra dáng lon), rồi nhìn chếch có nắp khui (đúng dáng
 * nhưng đủ rồi). Chủ sở hữu quyết định bỏ.
 *
 * Đổi lại được ba thứ: màn hình đăng nhập hết một vòng vẽ chạy liên tục, ba lon
 * cùng hiện nên nói được đúng cái cần nói — đây là ba vị bia của Bà Nà — và bộ
 * mã nhẹ đi gần một nghìn dòng.
 *
 * Thiếu tệp nào thì RIÊNG loại đó quay về hình vẽ SVG — không vỡ, không ô
 * trắng. Bắt lỗi bằng `onError` chứ không kiểm tra trước: không có cách nào hỏi
 * trình duyệt "tệp này có tồn tại không" mà không tải thử.
 */
const ANH_LON: Record<LoaiBia, string> = {
  caubang: "/lon-cau-vang.webp",
  laudai: "/lon-lau-dai-mat-trang.webp",
  atlas: "/lon-suc-manh-atlas.webp",
};

/**
 * Thứ tự ba lon đứng trên màn hình, từ trái sang phải.
 *
 * CỐ ĐỊNH, không xếp lại theo loại đang chọn. Xếp lại thì mỗi lần đổi loại là
 * ba lon nhảy chỗ, mắt phải bám theo — mà chúng chỉ là hình minh hoạ. Loại đang
 * chọn chỉ bước lên trước và sáng lên.
 */
const THU_TU_LON: LoaiBia[] = ["laudai", "caubang", "atlas"];

/**
 * Màu bia trong ly khi chưa có ảnh lon, lấy theo đúng tông của từng lon:
 * Cầu Vàng vàng hổ phách, Lâu Đài Mặt Trăng vàng nhạt trong, Atlas nâu đen.
 */
const MAU_BIA: Record<LoaiBia, { dam: string; nhat: string; bot: string }> = {
  caubang: { dam: "#a8541a", nhat: "#f0a92c", bot: "#fff1d6" },
  laudai: { dam: "#b98f2a", nhat: "#f7dc7a", bot: "#f4fbf8" },
  atlas: { dam: "#241606", nhat: "#6b4415", bot: "#e8d5b0" },
};

/** Tên loại theo mã, cho phần mô tả ảnh. */
const TEN_BIA: Record<LoaiBia, string> = {
  caubang: "Cầu Vàng",
  laudai: "Lâu Đài Mặt Trăng",
  atlas: "Sức Mạnh Atlas",
};

/** Tên lớp CSS đổi màu nền. Cầu Vàng là mặc định nên không cần lớp riêng. */
const LOP_NEN: Record<LoaiBia, string> = {
  caubang: "",
  laudai: "dn-laudai",
  atlas: "dn-atlas",
};

/** Màu thân lon trên thẻ chọn, và màu nhấn của từng loại. */
const BIA: {
  id: LoaiBia;
  ten: string;
  phu: string;
  than: string;
  nhan: string;
}[] = [
  {
    id: "caubang",
    ten: "Cầu Vàng",
    phu: "Golden Bridge Helles Lager",
    than: "#9e2020",
    nhan: "#f0a92c",
  },
  {
    id: "laudai",
    ten: "Lâu Đài Mặt Trăng",
    phu: "Lunar Castle Dry Hop Pale Ale",
    than: "#e9efe9",
    nhan: "#1c7f7a",
  },
  {
    id: "atlas",
    ten: "Sức Mạnh Atlas",
    phu: "Atlas Wings Dark Lager",
    than: "#17140f",
    nhan: "#d8ab48",
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
  const [loai, setLoai] = useState<LoaiBia>("caubang");
  /**
   * Loại nào không tải được ảnh thì đánh dấu lại và dùng hình vẽ.
   *
   * Nhớ theo TỪNG LOẠI chứ không phải một cờ chung: có thể mới có ảnh Cầu Vàng
   * mà chưa có hai lon kia, lúc đó Cầu Vàng vẫn hiện ảnh thật.
   */
  const [anhHong, setAnhHong] = useState<Record<LoaiBia, boolean>>({
    caubang: false,
    laudai: false,
    atlas: false,
  });
  /** Vòng luân phiên tự động, người dùng tự bấm chọn thì dừng. */
  const [tuDong, setTuDong] = useState(true);
  const nenRef = useRef<HTMLDivElement>(null);
  const lyRef = useRef<HTMLDivElement>(null);
  const lopTruocRef = useRef<HTMLDivElement>(null);
  const lopSauRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  const mau = MAU_BIA[loai];

  /*
   * Ba loại bia luân phiên, mỗi loại một nhịp rồi chuyển.
   *
   * Bỏ nhịp khi tab bị ẩn: quay ở tab người ta không nhìn chỉ tốn pin, mà quay
   * xong quay lại thì loại đang hiện đã trôi đi đâu mất.
   */
  useEffect(() => {
    if (!tuDong) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setLoai((cu) => {
        const i = BIA.findIndex((b) => b.id === cu);
        return BIA[(i + 1) % BIA.length].id;
      });
    }, 4600);
    return () => window.clearInterval(id);
  }, [tuDong]);


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
      className={`dn-nen relative h-screen overflow-hidden text-white ${LOP_NEN[loai]}`}
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

      {/* Ba lon bia ở giữa — ảnh thật nếu có, không thì hình vẽ */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div
          ref={lyRef}
          className="dn-ly h-[52vh] max-h-[520px] w-auto"
          style={{ aspectRatio: "760 / 460" }}
        >
          {/* Hai lớp lồng nhau: lớp ngoài hiện lên lúc vào trang, lớp trong
              lắc không ngừng. Phải tách vì hoạt ảnh CSS đè transform đặt bằng
              style — gộp lại là mất phần nghiêng theo con trỏ mà vòng rAF ghi
              vào `.dn-ly`. Xem chú thích trong index.css. */}
          <div className="dn-vao h-full">
            <div className="dn-lac h-full">
              <div className="flex h-full items-end justify-center">
                {THU_TU_LON.map((id) => {
                  const dangChon = id === loai;
                  return (
                    <div
                      key={id}
                      className="h-full transition-all duration-700 ease-out"
                      style={{
                        /*
                          Lon đang chọn cao hết khung và đứng trước; hai lon kia
                          thấp hơn, lùi vào và mờ đi. Chồng mép âm để ba lon
                          đứng sát nhau như xếp trên kệ, chứ không rời ra thành
                          ba tấm ảnh dán cạnh nhau.
                        */
                        height: dangChon ? "100%" : "78%",
                        marginInline: dangChon ? "-3.5%" : "-4.5%",
                        /*
                          Hai lon kia mờ 0,75 chứ không mờ hẳn: mờ quá thì nền
                          ăn màu vào chúng, lon đen hoá xanh theo nền. Cũng
                          không giảm bão hoà nữa vì lý do ấy.
                        */
                        opacity: dangChon ? 1 : 0.75,
                        filter: dangChon
                          ? "drop-shadow(0 26px 44px rgba(0,0,0,0.55))"
                          : "drop-shadow(0 16px 28px rgba(0,0,0,0.45))",
                        zIndex: dangChon ? 2 : 1,
                      }}
                    >
                      {anhHong[id] ? (
                        <LyBia loai={id} />
                      ) : (
                        <img
                          src={ANH_LON[id]}
                          alt={`Lon ${TEN_BIA[id]}`}
                          className="h-full w-auto object-contain"
                          onError={() =>
                            setAnhHong((t) => ({ ...t, [id]: true }))
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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

            {/*
              ĐĂNG KÝ TÀI KHOẢN MỚI.

              App đăng nhập bằng Google nên KHÔNG có form đăng ký riêng: lần đầu
              bấm nút trên chính là đăng ký. Nhưng màn hình cũ không nói ra, nên
              người mới nhìn vào tưởng app thiếu chỗ đăng ký rồi đi hỏi — đúng
              chuyện đã xảy ra.

              Nói thành ba bước chứ không viết một câu: điều người mới cần biết
              không phải "bấm nút nào" mà là "bấm xong rồi sao nữa" — họ sẽ dừng
              ở màn hình chờ duyệt và cần biết đó là bình thường.
            */}
            <div className="dn-kinh mt-auto max-w-md rounded-2xl p-5">
              <div className="flex items-center gap-2.5">
                <UserPlus className="h-4 w-4 text-white/70" />
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-white/70">
                  Chưa có tài khoản?
                </span>
              </div>

              <p className="mt-2.5 text-[0.8rem] leading-relaxed text-white/75">
                Không cần đăng ký riêng và không phải đặt mật khẩu mới — bấm
                <strong className="text-white"> Đăng nhập bằng Google</strong> ở
                trên là tài khoản được tạo luôn.
              </p>

              <ol className="mt-4 space-y-2.5">
                {[
                  "Đăng nhập bằng tài khoản Google của bạn.",
                  "Tài khoản vào trạng thái CHỜ DUYỆT — chưa xem được số liệu, đây là bình thường.",
                  "Báo chủ sở hữu duyệt. Duyệt xong chỉ cần tải lại trang.",
                ].map((buoc, i) => (
                  <li key={buoc} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[0.65rem] font-black text-white/90">
                      {i + 1}
                    </span>
                    <span className="text-[0.78rem] leading-snug text-white/75">
                      {buoc}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-4 flex items-start gap-2.5 border-t border-white/10 pt-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                <span className="text-[0.72rem] leading-snug text-white/60">
                  Bước duyệt là để người ngoài không vào được sổ kho. Tài khoản
                  chờ duyệt không đọc và không ghi được gì.
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải */}
          <div className="hidden h-full w-[420px] flex-col items-end justify-between py-16 text-right lg:flex">
            <div className="flex flex-col items-end gap-5">
              {/*
                Ba thẻ trong cột rộng 420px, nên thẻ phải hẹp lại còn 124px chứ
                không giữ 140px như hồi hai loại — ba thẻ 140 cộng khoảng cách
                là tràn cột, đẩy vỡ bố cục.
              */}
              <div className="flex gap-2.5">
                {BIA.map((b) => {
                  const dangChon = loai === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        // Đã chọn tay thì đừng để vòng tự động cướp mất sau
                        // vài giây — người ta bấm là muốn xem đúng lon đó.
                        setTuDong(false);
                        setLoai(b.id);
                      }}
                      className="dn-kinh group relative w-[124px] cursor-pointer rounded-[24px] p-3 pt-6 text-center transition-all duration-300"
                      style={{
                        borderColor: dangChon ? b.nhan : undefined,
                        boxShadow: dangChon ? `0 0 0 1px ${b.nhan}, 0 18px 40px -18px ${b.nhan}` : undefined,
                      }}
                    >
                      {/*
                        Ô chọn loại luôn vẽ bằng SVG, không dùng ảnh.

                        Trước đây nó nhét ảnh chụp lon vào một ô cao 96px. Nay
                        chỉ còn ô nhãn trải phẳng 1400 × 720 — ép tấm đó vào ô
                        này thì vừa méo vừa tốn công giải mã ba tấm cỡ ấy cho
                        ba con tem bé xíu. Hình vẽ đã lấy đúng màu thân và màu
                        nhấn của từng loại nên vẫn phân biệt được ngay.
                      */}
                      <div className="mx-auto mb-2.5 h-24 w-16 transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-8deg] group-hover:scale-110">
                        <svg viewBox="0 0 64 96" className="h-full w-full" aria-hidden="true">
                          <rect x="14" y="10" width="36" height="80" rx="8" fill={b.than} />
                          <rect x="14" y="10" width="10" height="80" rx="5" fill="rgba(255,255,255,0.20)" />
                          {/* Dải nhãn giữa lon, lấy đúng màu nhấn của loại. */}
                          <rect x="14" y="40" width="36" height="18" fill={b.nhan} opacity="0.95" />
                          <ellipse cx="32" cy="10" rx="18" ry="5" fill="rgba(255,255,255,0.5)" />
                        </svg>
                      </div>
                      <div className="flex flex-col text-[0.68rem] leading-tight">
                        <span className="font-semibold" style={{ color: dangChon ? b.nhan : undefined }}>
                          {b.ten}
                        </span>
                        <span className="text-white/60">{b.phu}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.7rem] uppercase tracking-[0.15em] text-white/50">
                {tuDong ? "Ba vị bia luân phiên · bấm để giữ lại" : "Bấm để đổi tông màn hình"}
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
