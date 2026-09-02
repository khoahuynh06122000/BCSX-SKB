import { useEffect, useRef } from "react";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";

/**
 * MÀN HÌNH ĐĂNG NHẬP
 *
 * Nền là ẢNH CHỤP NHÀ NẤU của BaNa Brew House — xưởng bia thủ công trên đỉnh Bà
 * Nà, nơi mọi con số trong app này bắt đầu. Ảnh phủ kín màn hình, phủ lên một
 * lớp tối nghiêng từ trái sang để chữ đọc được, và trôi rất khẽ theo con trỏ.
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
  /** Mã commit của bản đang chạy, để đối chiếu khi có sự cố. */
  maBuild: string;
}

/** Các phân hệ của hệ thống, bày ra để người mới biết mình sắp vào đâu. */
const PHAN_HE = ["Nhập kho", "Xuất kho", "Công nợ", "Báo cáo", "Đơn BNC"];

const CAC_BUOC = [
  "Đăng nhập bằng tài khoản Google của bạn.",
  "Tài khoản vào trạng thái CHỜ DUYỆT — chưa xem được số liệu, đây là bình thường.",
  "Báo chủ sở hữu duyệt. Duyệt xong chỉ cần tải lại trang.",
];

export default function ManHinhDangNhap({
  onLogin,
  isAuthenticating,
  authError,
  maBuild,
}: Props) {
  const anhRef = useRef<HTMLDivElement>(null);

  /**
   * Ảnh nền trôi rất khẽ theo con trỏ.
   *
   * Ghi thẳng vào `style.transform` chứ không qua state React: mỗi khung hình
   * mà gọi setState là dựng lại cả cây giao diện 60 lần một giây.
   *
   * Biên độ chỉ 14px trên một tấm ảnh đã phóng to 6% — đủ để màn hình có chiều
   * sâu, chưa đủ để ai đó nhận ra là ảnh đang nhúc nhích. Ảnh nền mà trôi rõ
   * thì thành phiền, nhất là với người vào đây mỗi ngày.
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
    const chay = () => {
      muot.x += (dich.x - muot.x) * 0.04;
      muot.y += (dich.y - muot.y) * 0.04;
      if (anhRef.current) {
        anhRef.current.style.transform = `scale(1.06) translate(${muot.x * -14}px, ${muot.y * -14}px)`;
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
    <div className="relative h-screen overflow-hidden bg-[#1a0f05] text-white">
      {/* Ảnh nhà nấu, phủ kín màn hình */}
      <div
        ref={anhRef}
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/nen-xuong-bia.webp)",
          transform: "scale(1.06)",
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

      {/* Thanh trên */}
      <header className="absolute top-0 z-30 flex w-full items-center justify-between gap-4 px-[4%] py-6">
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
      <main className="relative z-20 flex h-full items-center px-[4%]">
        <div className="w-full max-w-xl py-24">
          <p
            className="text-[0.7rem] font-bold uppercase tracking-[0.32em] text-[#f7c948]"
            style={{ animation: "dn-hien-len 0.7s ease-out both" }}
          >
            BaNa Brew House · 1.400m
          </p>

          <h1
            className="dn-tieu-de mt-4"
            style={{ animation: "dn-hien-len 0.9s ease-out 0.06s both" }}
          >
            Tinh hoa
            <br />
            Bia Bà Nà
          </h1>

          <p
            className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/75"
            style={{ animation: "dn-hien-len 1s ease-out 0.12s both" }}
          >
            Hệ thống quản trị kho bia của Sun World Ba Na Hills. Nhập kho có chữ
            ký, xuất kho theo lô, công nợ và hóa đơn — tất cả trong một chỗ.
          </p>

          {authError && (
            <div className="mt-6 flex max-w-md gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/15 p-4 backdrop-blur">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-200" />
              <p className="text-xs font-bold leading-relaxed text-rose-50">
                {authError}
              </p>
            </div>
          )}

          <button
            onClick={onLogin}
            disabled={isAuthenticating}
            className="mt-7 flex w-fit items-center gap-5 rounded-full bg-black/55 py-1.5 pl-6 pr-1.5 font-bold backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-black/75 active:translate-y-0 disabled:opacity-60"
            style={{ animation: "dn-hien-len 1.1s ease-out 0.18s both" }}
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

          {/*
            ĐĂNG KÝ TÀI KHOẢN MỚI.

            App đăng nhập bằng Google nên KHÔNG có form đăng ký riêng: lần đầu
            bấm nút trên chính là đăng ký. Nhưng màn hình cũ không nói ra, nên
            người mới nhìn vào tưởng app thiếu chỗ đăng ký rồi đi hỏi — đúng
            chuyện đã xảy ra.

            Nói thành ba bước chứ không viết một câu: điều người mới cần biết
            không phải "bấm nút nào" mà là "bấm xong rồi sao nữa" — họ sẽ dừng ở
            màn hình chờ duyệt và cần biết đó là bình thường.
          */}
          <div
            className="dn-kinh mt-9 max-w-md rounded-2xl p-5"
            style={{ animation: "dn-hien-len 1.2s ease-out 0.24s both" }}
          >
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
              {CAC_BUOC.map((buoc, i) => (
                <li key={buoc} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[0.65rem] font-black text-white/90">
                    {i + 1}
                  </span>
                  <span className="text-[0.78rem] leading-relaxed text-white/70">
                    {buoc}
                  </span>
                </li>
              ))}
            </ol>
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
