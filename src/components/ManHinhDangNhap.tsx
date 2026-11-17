import { type CSSProperties, useEffect, useRef } from "react";
import { AlertCircle, ArrowRight, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";

/**
 * MÀN HÌNH ĐĂNG NHẬP
 *
 * Nền là ẢNH CHỤP NHÀ NẤU của BaNa Brew House — xưởng bia thủ công trên đỉnh Bà
 * Nà, nơi mọi con số trong app này bắt đầu. Ảnh phủ kín màn hình, phủ lên một
 * lớp tối nghiêng từ trái sang để chữ đọc được, tự phóng và trôi rất chậm, và
 * lệch thêm một chút theo con trỏ.
 *
 * VÌ SAO LÀ ẢNH CHỤP CHỨ KHÔNG PHẢI HÌNH VẼ. Chỗ giữa màn hình này đã lần lượt
 * là: lon bia quay 3D dựng bằng canvas (ba vòng), lon dựng từ file bao bì, ảnh
 * chụp lon thật, rồi hình vẽ ba thùng nấu bằng SVG. Vòng nào cũng loay hoay
 * quanh MỘT CÁI LON, trong khi thứ app này phục vụ là cả một xưởng bia. Chủ sở
 * hữu chốt: lấy ảnh xưởng bia thật rồi dựng lại cả màn hình quanh nó.
 *
 * BỎ THEO: bọt bia bay lên, hoa bia và hạt lúa mạch trôi quanh, ba thẻ chọn
 * loại bia đổi tông màn hình. Trên một tấm ảnh thật thì tất cả những thứ ấy
 * thành nhiễu — ảnh đã làm xong phần việc của chúng.
 *
 * Ảnh nằm ở `public/nen-xuong-bia.webp`, chụp tại BaNa Brew House. Thiếu tệp
 * thì nền lùi về màu nâu đồng đặc — chữ vẫn đọc được, không vỡ.
 */

interface Props {
  onLogin: () => void;
  isAuthenticating: boolean;
  authError: string;
  /** Email đang ở luồng Quên PIN / mở khóa PIN để hướng dẫn đăng nhập lại. */
  resetPendingEmail?: string | null;
  /** Hiệu ứng mờ thoát nhẹ khi chuyển sang bước PIN / App */
  isLeaving?: boolean;
  /** Mã commit của bản đang chạy, để đối chiếu khi có sự cố. */
  maBuild: string;
}

/**
 * Hệ số phóng đáy của ảnh nền.
 *
 * Phải lớn hơn 1 đủ để ảnh còn phủ kín màn hình sau khi trôi: phần trôi cộng
 * phần lệch theo con trỏ tối đa 2% mỗi bên, nên 1,075 chừa 3,75% — dư một
 * khoảng an toàn. Để 1,0 thì lúc ảnh trôi sẽ lòi ra một dải nền trống ở mép.
 *
 * Dùng ĐƠN VỊ PHẦN TRĂM cho phần trôi, không dùng điểm ảnh: cùng một con số
 * điểm ảnh thì trên màn hình 1440px là an toàn mà trên điện thoại 375px là
 * tràn mép.
 */
const PHONG_DAY = 1.075;

/** Các phân hệ của hệ thống, bày ra để người mới biết mình sắp vào đâu. */
const PHAN_HE = ["Nhập kho", "Xuất kho", "Công nợ", "Báo cáo", "Đơn BNC"];

/** Các bọt ga vàng li ti sủi tăm bên trong thân ly bia 3D */
const BOT_BIA: Array<{ cx: number; cy: number; r: number; t: string; d: string }> = [
  { cx: 88, cy: 112, r: 2.1, t: "0s", d: "2.6s" },
  { cx: 102, cy: 116, r: 1.4, t: "0.5s", d: "2.2s" },
  { cx: 114, cy: 110, r: 2.4, t: "0.9s", d: "3.0s" },
  { cx: 95, cy: 104, r: 1.3, t: "1.4s", d: "2.4s" },
  { cx: 122, cy: 115, r: 1.8, t: "0.2s", d: "2.8s" },
  { cx: 107, cy: 102, r: 1.6, t: "1.8s", d: "2.5s" },
  { cx: 84, cy: 100, r: 1.2, t: "1.1s", d: "2.1s" },
  { cx: 118, cy: 106, r: 2.0, t: "2.1s", d: "2.9s" },
];

const cssVar = (vars: Record<string, string>): CSSProperties =>
  vars as CSSProperties;

export default function ManHinhDangNhap({
  onLogin,
  isAuthenticating,
  authError,
  resetPendingEmail,
  isLeaving = false,
  maBuild,
}: Props) {
  const anhRef = useRef<HTMLDivElement>(null);
  const lyRef = useRef<HTMLDivElement>(null);

  /**
   * ẢNH NỀN TỰ PHÓNG VÀ TRÔI RẤT CHẬM, cộng thêm một chút lệch theo con trỏ,
   * đồng thời truyền chuyển động 4D mượt cho ly bia 3D trong cùng 1 vòng rAF.
   *
   * Ghi thẳng vào `style.transform` chứ không qua state React: mỗi khung hình
   * mà gọi setState là dựng lại cả cây giao diện 60 lần một giây.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dich = { x: 0, y: 0 };
    const muot = { x: 0, y: 0 };
    const theoChuot = (e: MouseEvent) => {
      dich.x = e.clientX / window.innerWidth - 0.5;
      dich.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", theoChuot);

    let id = 0;
    let goc = 0;
    const chay = (moc: number) => {
      if (!goc) goc = moc;
      const t = (moc - goc) / 1000;

      muot.x += (dich.x - muot.x) * 0.04;
      muot.y += (dich.y - muot.y) * 0.04;

      /*
       * BA CHU KỲ LỆCH NHAU (28, 34, 41 giây) thay vì một chu kỳ chung.
       */
      const phong = PHONG_DAY + 0.035 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 28));
      const lechX = Math.sin((2 * Math.PI * t) / 34) * 1.4 + muot.x * -1.2;
      const lechY = Math.sin((2 * Math.PI * t) / 41) * 1 + muot.y * -1.2;

      if (anhRef.current) {
        anhRef.current.style.transform = `scale(${phong}) translate(${lechX}%, ${lechY}%)`;
      }
      if (lyRef.current) {
        const noiY = Math.sin(t * 1.7) * 4;
        const nghiengY = Math.sin(t * 1.05) * 8 + muot.x * 20;
        const nghiengX = Math.cos(t * 0.85) * 4 - muot.y * 14;
        lyRef.current.style.transform = `perspective(760px) translateY(${noiY.toFixed(2)}px) rotateX(${nghiengX.toFixed(2)}deg) rotateY(${nghiengY.toFixed(2)}deg)`;
      }
      id = requestAnimationFrame(chay);
    };
    id = requestAnimationFrame(chay);

    return () => {
      window.removeEventListener("mousemove", theoChuot);
      cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#1a0f05] text-white">
      {/* Ảnh nhà nấu, phủ kín màn hình */}
      <div
        ref={anhRef}
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/nen-xuong-bia.webp)",
          // Khớp đúng trạng thái đầu của vòng chuyển động, để lúc vào trang
          // ảnh không nhảy một cái rồi mới trôi.
          transform: `scale(${PHONG_DAY})`,
          willChange: "transform",
        }}
      />

      {/*
        HAI LỚP PHỦ TỐI, KHÔNG PHẢI MỘT.

        Lớp ngang tối mạnh bên trái — chỗ đặt chữ — và nhạt dần sang phải để
        phần đồng sáng nhất của ảnh còn thở. Lớp dọc tối ở đáy, đỡ cho khối
        hướng dẫn đăng ký nằm dưới cùng.

        Một lớp phủ đều thì hoặc chữ khó đọc, hoặc cả tấm ảnh xám đi hết.
      */}
      {/* Màn rộng: tối mạnh bên trái, nhạt dần sang phải. */}
      <div
        className="absolute inset-0 z-10 hidden md:block"
        style={{
          background:
            "linear-gradient(100deg, rgba(12,7,2,0.94) 0%, rgba(12,7,2,0.86) 28%, rgba(12,7,2,0.5) 58%, rgba(12,7,2,0.24) 100%)",
        }}
      />
      {/*
        Điện thoại: chữ chiếm trọn bề ngang nên phủ tối ĐỀU, không nghiêng.
        Dùng chung lớp nghiêng của màn rộng thì mép phải màn hình còn nguyên
        mảng đồng sáng, và chữ nằm đè lên đó chìm hẳn.
      */}
      <div
        className="absolute inset-0 z-10 md:hidden"
        style={{
          background:
            "linear-gradient(160deg, rgba(12,7,2,0.9) 0%, rgba(12,7,2,0.82) 45%, rgba(12,7,2,0.7) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(12,7,2,0.8) 0%, rgba(12,7,2,0) 42%)",
        }}
      />

      {/* Lưới tọa độ mờ bên ngoài khung đăng nhập, phai dần để không đè ảnh nồi đồng */}
      <div
        aria-hidden="true"
        className="dn-ambient-grid pointer-events-none absolute inset-0 z-[12]"
      />

      {/* Thanh trên */}
      <header className="dn-anim-header absolute top-0 z-30 flex w-full items-center justify-between gap-4 px-[4%] py-6">
        <div className="flex shrink-0 items-center gap-2">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 8V16M8 12H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[1.15rem]" style={{ fontFamily: "Galada, cursive" }}>
            Bia Bà Nà
          </span>
        </div>

        {/*
          Không phải thanh điều hướng: chưa đăng nhập thì chẳng đi đâu được.
          Đây là danh sách phân hệ, để người mới biết mình sắp vào đâu — nút bấm
          không dẫn tới đâu chỉ làm người ta bực.
        */}
        <div className="dn-kinh dn-nav hidden gap-1 rounded-full p-1.5 lg:flex">
          {PHAN_HE.map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-4 py-2 text-[0.8rem] font-medium ${
                i === 0 ? "bg-[#f7c948] text-[#2a1a02]" : "text-white/70"
              }`}
            >
              {t}
            </span>
          ))}
        </div>

        <span className="dn-kinh shrink-0 rounded-full px-4 py-2 font-mono text-[10px] tracking-widest text-white/70">
          build {maBuild}
        </span>
      </header>

      {/* Nội dung */}
      <main className="relative z-20 flex min-h-[100dvh] items-center px-[4%]">
        <div className="w-full max-w-xl py-24 sm:py-20">
          <div className={isLeaving ? "dn-leaving" : ""}>
            <div className="dn-anim-eyebrow inline-flex w-fit flex-col">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.32em] text-[#f7c948]">
                BaNa Brew House · 1.400m
              </p>
              <span className="dn-ul-line" aria-hidden="true" />
            </div>

            <h1 className="dn-tieu-de dn-anim-tieu-de mt-3">
              Tinh hoa
              <br />
              Bia Bà Nà
            </h1>
          </div>

          {/* KHỐI ĐĂNG NHẬP TỐI GIẢN (HÌNH 2) — Theo mẫu PKT chuyển sang tông Đồng/Hổ phách SKB */}
          <div className={`dn-card-wrap relative mt-5 max-w-[392px] ${isLeaving ? "dn-leaving" : ""}`}>
            {/* 2 vòng quỹ đạo trôi nổi phía sau khung đăng nhập */}
            <div aria-hidden="true" className="pointer-events-none absolute -inset-16 overflow-visible">
              <div className="dn-ring dn-ring-1" />
              <div className="dn-ring dn-ring-2" />
            </div>

            <div
              className={`dn-khung-ao dn-anim-khung relative ${
                authError ? "dn-shake" : ""
              }`}
            >
              {/* Viền sáng & đường chạy sáng quay quanh toàn bộ khung đăng nhập */}
              <div aria-hidden="true" className="dn-vien-toa" />
              <div aria-hidden="true" className="dn-vien-chay" />

              <section
                aria-label="Đăng nhập hệ thống"
                className="dn-khung-dang-nhap relative z-20 px-6 pb-5 pt-4 text-center sm:px-7"
              >
                {/* Ly Bia Tươi 3D / 4D nghiêng theo chuột & nổi theo thời gian */}
                <div className="dn-ly-stage mx-auto mb-1.5 h-[122px] w-[190px]">
                  <div aria-hidden="true" className="dn-ly-hao-quang" />
                  <div aria-hidden="true" className="dn-ly-de-3d" />
                  <div ref={lyRef} className="dn-ly-3d-body relative z-10 h-full w-full">
                    <svg
                      className="h-full w-full overflow-visible"
                      viewBox="0 0 220 154"
                      aria-hidden="true"
                    >
                      <defs>
                        {/* Màu bia hổ phách khối trụ 3D */}
                        <linearGradient id="skbBeer3D" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#92400e" />
                          <stop offset="22%" stopColor="#f59e0b" />
                          <stop offset="48%" stopColor="#fde047" />
                          <stop offset="76%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#78350f" />
                        </linearGradient>
                        {/* Chiều sâu đáy ly pha lê */}
                        <linearGradient id="skbBeerDepth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                          <stop offset="65%" stopColor="rgba(217,119,6,0.05)" />
                          <stop offset="100%" stopColor="rgba(69,26,3,0.58)" />
                        </linearGradient>
                        {/* Lớp vỏ kính thủy tinh mờ */}
                        <linearGradient id="skbGlassShell" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                          <stop offset="18%" stopColor="rgba(255,255,255,0.08)" />
                          <stop offset="82%" stopColor="rgba(255,255,255,0.05)" />
                          <stop offset="100%" stopColor="rgba(254,243,199,0.24)" />
                        </linearGradient>
                        {/* Tia phản chiếu sáng bóng bên hông ly */}
                        <linearGradient id="skbGlassSheen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
                          <stop offset="50%" stopColor="rgba(255,255,255,0.26)" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
                        </linearGradient>
                        {/* Bọt bia trắng kem bồng bềnh 3D */}
                        <linearGradient id="skbFoam3D" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="65%" stopColor="#fef3c7" />
                          <stop offset="100%" stopColor="#fcd34d" />
                        </linearGradient>
                        {/* Vùng cắt giữ bia & bọt ga nằm trọn bên trong lòng ly */}
                        <clipPath id="skbBeerClip">
                          <path d="M74 58 L79 124 Q106 132 133 124 L138 58 Z" />
                        </clipPath>
                      </defs>

                      {/* Quai ly thủy tinh 3D bên phải */}
                      <path
                        d="M137 64 C162 64 166 76 165 92 C164 108 158 117 134 117"
                        fill="none"
                        stroke="rgba(254, 243, 199, 0.55)"
                        strokeWidth="8.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M138 64 C161 64 164 76 163 92 C162 107 156 116 135 116"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.28)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Bóng đổ nhẹ trên đĩa đế */}
                      <ellipse cx="106" cy="138" rx="34" ry="6" fill="rgba(0,0,0,0.45)" />

                      {/* Thân vỏ kính ngoài & đế thủy tinh dày */}
                      <path
                        d="M71 42 L77 128 Q106 138 135 128 L141 42 Z"
                        fill="url(#skbGlassShell)"
                        stroke="rgba(254, 243, 199, 0.52)"
                        strokeWidth="1.4"
                      />

                      {/* Khối bia hổ phách 3D + Sóng bề mặt + Bọt ga sủi */}
                      <g clipPath="url(#skbBeerClip)">
                        <rect x="70" y="56" width="72" height="78" fill="url(#skbBeer3D)" />
                        <rect x="70" y="56" width="72" height="78" fill="url(#skbBeerDepth)" />
                        {/* Mặt sóng bia chuyển động nhẹ */}
                        <path
                          d="M66 60 Q86 55 106 60 T146 60 L146 134 L66 134 Z"
                          fill="rgba(253, 224, 71, 0.24)"
                          className="dn-song-bia"
                        />
                        {/* Hạt ga vàng li ti sủi lên */}
                        {BOT_BIA.map((b) => (
                          <circle
                            key={`${b.cx}-${b.cy}`}
                            cx={b.cx}
                            cy={b.cy}
                            r={b.r}
                            fill="#fef9c3"
                            className="dn-bot-bia"
                            style={cssVar({ "--t": b.t, "--d": b.d })}
                          />
                        ))}
                      </g>

                      {/* 3 rãnh vát khối thủy tinh tạo cảm giác cốc vại Beer Plaza */}
                      <path
                        d="M86 68 L88 122 M106 69 L106 125 M126 68 L124 122"
                        stroke="rgba(120, 53, 15, 0.26)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />

                      {/* Bóng sáng thủy tinh dọc mép trái & đường viền miệng ly elip 3D */}
                      <path
                        d="M76 54 L80 121 L86 123 L83 54 Z"
                        fill="url(#skbGlassSheen)"
                        opacity="0.72"
                      />
                      <path
                        d="M78 127 Q106 136 134 127 L133 133 Q106 141 79 133 Z"
                        fill="rgba(255, 248, 225, 0.34)"
                      />
                      <ellipse
                        cx="106"
                        cy="43"
                        rx="35"
                        ry="6.5"
                        fill="none"
                        stroke="rgba(254, 243, 199, 0.55)"
                        strokeWidth="1.2"
                      />

                      {/* Vương miện bọt bia kem trắng 3D tràn nhẹ mép ly */}
                      <path
                        d="M69 50 C67 38 78 30 89 33 C94 23 111 21 120 29 C130 25 144 33 143 46 C145 53 138 58 131 56 C125 63 115 62 110 56 C103 61 93 60 88 55 C81 60 71 57 69 50 Z"
                        fill="url(#skbFoam3D)"
                        stroke="rgba(255,255,255,0.65)"
                        strokeWidth="0.9"
                      />
                      {/* Mảng bọt sánh vương tràn xuống thân trước */}
                      <path
                        d="M84 53 C87 62 91 63 94 55 C97 67 104 68 106 56"
                        fill="url(#skbFoam3D)"
                      />
                      {/* Giọt bọt bia rơi nhẹ theo thời gian */}
                      <circle
                        cx="123"
                        cy="58"
                        r="2.4"
                        fill="#fef3c7"
                        className="dn-giot-bot"
                      />

                      {/* Tia lấp lánh 3D bên ly */}
                      <g className="dn-ly-shine" fill="#fef08a">
                        <path d="M162 28 L164 33 L169 35 L164 37 L162 42 L160 37 L155 35 L160 33 Z" />
                        <path d="M56 44 L57.5 47.5 L61 49 L57.5 50.5 L56 54 L54.5 50.5 L51 49 L54.5 47.5 Z" />
                      </g>
                    </svg>
                  </div>
                </div>

              {/* Thương hiệu & tiêu đề gọn như mẫu PKT */}
              <p className="dn-brand-org text-[10px] font-bold uppercase tracking-[0.22em] text-[#fbbf24]">
                Sun World Bà Nà Hills
              </p>
              <p className="mt-1 text-[12.5px] font-medium text-white/75">
                BaNa Brew House · Xưởng & Kho
              </p>
              <h2 className="dn-card-title mt-1 text-[22px] font-semibold tracking-tight text-[#fefce8]">
                Kho Bia Nội Bộ
              </h2>
              <p
                className="mx-auto mt-1.5 max-w-[295px] text-[13px] leading-relaxed text-white/70"
                style={{ textWrap: "balance" }}
              >
                Nhập xuất tồn, duyệt phiếu 2 rào và truy xuất lô bia theo thời gian thực.
              </p>

              {resetPendingEmail !== undefined && resetPendingEmail !== null && (
                <div
                  role="status"
                  className="mt-3.5 flex gap-2.5 rounded-2xl border border-amber-300/35 bg-amber-400/15 p-3 text-left"
                >
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#f7c948]" aria-hidden="true" />
                  <p className="text-xs font-semibold leading-relaxed text-amber-50">
                    Đang cấp lại mã PIN
                    {resetPendingEmail ? ` cho ${resetPendingEmail}` : ""}. Đăng nhập lại bằng Google bên dưới để đặt 6 chữ số PIN mới.
                  </p>
                </div>
              )}

              {authError && (
                <div
                  role="alert"
                  className="dn-anim-loi mt-3.5 flex gap-2.5 rounded-2xl border border-rose-300/40 bg-rose-500/15 p-3 text-left"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" aria-hidden="true" />
                  <p className="text-xs font-bold leading-relaxed text-rose-50">
                    {authError}
                  </p>
                </div>
              )}

              {/* Nút viên nhộng 3 cột phát sáng */}
              <button
                type="button"
                onClick={onLogin}
                disabled={isAuthenticating}
                className="dn-nut-google mt-4 disabled:cursor-wait disabled:opacity-65"
              >
                <span className="dn-gicon">
                  {isAuthenticating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#b45309]" aria-hidden="true" />
                  ) : (
                    <svg className="h-[19px] w-[19px]" viewBox="0 0 48 48" aria-hidden="true">
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
                <span className="text-center text-[14px] font-extrabold tracking-tight text-[#231303]">
                  {isAuthenticating ? "Đang xác thực..." : "Đăng nhập bằng Google"}
                </span>
                <span className="dn-google-arrow" aria-hidden="true">
                  <ArrowRight className="h-4 w-4 text-[#231303]" />
                </span>
              </button>

              <p className="mt-3 text-[11.5px] leading-snug text-white/50">
                Đăng nhập lần đầu tự tạo tài khoản ở trạng thái chờ chủ sở hữu duyệt.
              </p>
              </section>
            </div>

            {/* Huy hiệu bảo mật ngay dưới khung đăng nhập */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-300/75" aria-hidden="true" />
                Bảo mật cấp doanh nghiệp
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-300/75" aria-hidden="true" />
                Dữ liệu nội bộ SKB
              </span>
            </div>
          </div>
        </div>
      </main>

      {/*
        Ghi nguồn ảnh. Ảnh không phải do app chụp, nên nói ra chỗ nó đến — vừa
        sòng phẳng, vừa để sau này ai muốn đổi thì biết đường đi tìm bản gốc.
      */}
      <p className="absolute bottom-5 right-[4%] z-30 text-[0.62rem] uppercase tracking-[0.18em] text-white/35">
        Ảnh: nhà nấu BaNa Brew House
      </p>
    </div>
  );
}
