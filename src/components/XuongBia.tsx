/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * XƯỞNG BIA BÀ NÀ — hình minh hoạ cho màn hình đăng nhập.
 *
 * Ba thùng lên men bằng đồng: nắp vòm, thân trụ, đáy côn, nối nhau bằng đường
 * ống có van, hơi bốc lên khỏi ống thoát. Đó là thứ ai nhìn cũng đọc ra ngay là
 * một xưởng bia — và cũng đúng là nơi mọi con số trong app này bắt đầu.
 *
 * VẼ HẲN BẰNG SVG, KHÔNG DÙNG ẢNH. Chỗ này trước đây lần lượt là: lon quay 3D
 * dựng bằng canvas (ba vòng), lon dựng từ file bao bì, rồi ảnh chụp lon thật.
 * Vòng nào cũng vướng chuyện ảnh — nhoè ở hai hông, cắt nền ăn vào thân lon,
 * hạt nước đọng, viền trắng ăn sẵn vào điểm ảnh. Hình vẽ thì không có chỗ nào
 * để hỏng: không tệp để tải, không nền để tách, nét sắc ở mọi cỡ màn hình, và
 * cả hình nặng chưa tới một phần mười một tấm ảnh.
 *
 * ĐÁY CÔN, KHÔNG PHẢI ĐÁY BẰNG. Thùng lên men thật đều có đáy côn để men lắng
 * xuống rồi tháo ra qua van dưới cùng. Vẽ đáy bằng thì ra cái bồn chứa nước.
 *
 * BA THÙNG, KHÔNG PHẢI MỘT. Xưởng có ba vị bia; ba thùng cao thấp khác nhau vừa
 * đúng nghiệp vụ vừa cho bố cục một nhịp điệu. Ô kính quan sát trên mỗi thùng
 * mang màu của loại đang chọn, nên hàng nút chọn bia phía dưới vẫn còn việc.
 */

interface Props {
  /** Màu bia đang chọn — đổ vào ô kính quan sát của ba thùng. */
  mau: { dam: string; nhat: string; bot: string };
  /** Tên loại đang chọn, cho trình đọc màn hình. */
  ten: string;
}

/** Vàng đồng: nét, chỗ bắt sáng, chỗ khuất. */
const NET = "#e9c483";
const DONG_TOI = "#6d4d18";
const NEN_THUNG = "#20150a";

/**
 * Một thùng lên men.
 *
 * `x` là trục thùng, `r` nửa bề rộng thân, `dinh` là đỉnh vòm, `than` là chỗ
 * thân kết thúc và đáy côn bắt đầu. Vẽ theo trục chứ không theo góc trái trên:
 * thùng nào cũng đối xứng qua trục của nó, viết theo trục thì mỗi con số chỉ
 * phải nhớ một lần.
 */
function Thung({
  x,
  r,
  dinh,
  than,
  mau,
  id,
}: {
  x: number;
  r: number;
  dinh: number;
  than: number;
  mau: Props["mau"];
  id: string;
}) {
  /** Nửa chiều cao hình bầu dục của nắp vòm — nhìn hơi chếch từ trên. */
  const vom = r * 0.34;
  /** Đáy côn thu về một cửa tháo nhỏ. */
  const conH = r * 0.9;
  const cua = r * 0.16;
  const dayThan = than;
  const dayCon = than + conH;

  /** Ô kính quan sát: khe dọc lệch trái, đúng phía đón sáng. */
  const kx = x - r * 0.42;
  const kTren = dinh + vom + (dayThan - dinh - vom) * 0.2;
  const kDuoi = dayThan - (dayThan - dinh - vom) * 0.12;
  const kR = Math.max(4, r * 0.11);
  /** Mức bia trong ô kính, chừa khoảng bọt phía trên. */
  const mucBia = kTren + (kDuoi - kTren) * 0.24;

  return (
    <g>
      <defs>
        {/*
          Bóng hình trụ: tối ở hai mép, sáng lệch trái. Không có nó thì thân
          thùng là một mảng phẳng, nhìn ra cái hộp chứ không ra hình trụ.
        */}
        <linearGradient id={`tru-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4a3311" />
          <stop offset="18%" stopColor="#a97c2e" />
          <stop offset="36%" stopColor="#f0cf95" />
          <stop offset="58%" stopColor="#b5862f" />
          <stop offset="100%" stopColor="#3d2a0d" />
        </linearGradient>
        {/* Nắp vòm sáng hơn thân: nó hứng ánh sáng từ trên xuống. */}
        <linearGradient id={`vom-${id}`} x1="0" y1="1" x2="0.3" y2="0">
          <stop offset="0%" stopColor="#8a6522" />
          <stop offset="100%" stopColor="#f7dfae" />
        </linearGradient>
      </defs>

      {/* Ống thoát hơi trên đỉnh vòm */}
      <path
        d={`M${x - 6} ${dinh - 26} h12 v18 h-12 z`}
        fill="#a97c2e"
        stroke={NET}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Nắp vòm */}
      <path
        d={`M${x - r} ${dinh + vom} A ${r} ${vom} 0 0 1 ${x + r} ${dinh + vom} Z`}
        fill={`url(#vom-${id})`}
        stroke={NET}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Thân trụ */}
      <rect
        x={x - r}
        y={dinh + vom}
        width={r * 2}
        height={dayThan - dinh - vom}
        fill={`url(#tru-${id})`}
        stroke={NET}
        strokeWidth="2.5"
      />

      {/* Đáy côn */}
      <path
        d={`M${x - r} ${dayThan} L${x - cua} ${dayCon} h${cua * 2} L${x + r} ${dayThan} Z`}
        fill={`url(#tru-${id})`}
        stroke={NET}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Van tháo men dưới đáy côn */}
      <rect
        x={x - cua * 0.7}
        y={dayCon}
        width={cua * 1.4}
        height="12"
        rx="2"
        fill="#a97c2e"
        stroke={NET}
        strokeWidth="2"
      />

      {/* Hai đai thép quanh thân */}
      {[0.42, 0.72].map((t) => (
        <line
          key={t}
          x1={x - r}
          y1={dinh + vom + (dayThan - dinh - vom) * t}
          x2={x + r}
          y2={dinh + vom + (dayThan - dinh - vom) * t}
          stroke={DONG_TOI}
          strokeWidth="2"
          opacity="0.55"
        />
      ))}

      {/* Cửa thăm: hình bầu dục vì nhìn trên mặt cong */}
      <ellipse
        cx={x + r * 0.4}
        cy={dinh + vom + (dayThan - dinh - vom) * 0.55}
        rx={r * 0.2}
        ry={r * 0.26}
        fill="none"
        stroke={NET}
        strokeWidth="2"
        opacity="0.8"
      />

      {/* Ô kính quan sát: thấy mức bia và lớp bọt */}
      <rect
        x={kx - kR}
        y={kTren}
        width={kR * 2}
        height={kDuoi - kTren}
        rx={kR}
        fill={NEN_THUNG}
        stroke={NET}
        strokeWidth="2"
      />
      <rect
        x={kx - kR + 2}
        y={mucBia}
        width={kR * 2 - 4}
        height={kDuoi - mucBia - 2}
        rx={Math.max(1, kR - 2)}
        fill={mau.nhat}
      />
      <rect
        x={kx - kR + 2}
        y={mucBia}
        width={kR * 2 - 4}
        height={Math.min(8, (kDuoi - mucBia) * 0.28)}
        rx="3"
        fill={mau.bot}
      />
    </g>
  );
}

/** Một dải hơi mảnh bốc lên, uốn nhẹ. */
function Hoi({ x, y, cao }: { x: number; y: number; cao: number }) {
  return (
    <path
      d={`M${x} ${y} c -9 -${cao * 0.3}, 9 -${cao * 0.5}, 0 -${cao}`}
      fill="none"
      stroke="#ffffff"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.16"
    />
  );
}

export default function XuongBia({ mau, ten }: Props) {
  /**
   * Trục và kích thước ba thùng: giữa cao nhất, hai bên thấp hơn.
   *
   * `than` suy ngược từ CHÓP ĐÁY chứ không đặt tay: đáy côn cao bằng 0,9 bán
   * kính, mà thùng giữa to hơn nên côn của nó cũng dài hơn. Đặt `than` bằng
   * nhau cho cả ba thì chóp thùng giữa thò xuống dưới, chọc xuyên qua bệ.
   */
  const CHOP_DAY = 436;
  const thung = [
    { id: "t1", x: 168, r: 76, dinh: 176 },
    { id: "t2", x: 380, r: 92, dinh: 122 },
    { id: "t3", x: 592, r: 76, dinh: 176 },
  ].map((t) => ({ ...t, than: CHOP_DAY - t.r * 0.9 }));

  return (
    <svg
      viewBox="0 0 760 470"
      className="h-full w-full"
      role="img"
      aria-label={`Xưởng bia Bà Nà — đang chọn ${ten}`}
      style={{ filter: "drop-shadow(0 26px 46px rgba(0,0,0,0.5))" }}
    >
      <defs>
        <linearGradient id="xb-be" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a7229" />
          <stop offset="100%" stopColor="#4a3411" />
        </linearGradient>
      </defs>

      {/*
        Hơi bốc lên khỏi ba ống thoát. Vẽ TRƯỚC thùng để nó chìm ra phía sau,
        đúng như hơi thật — đè lên trước thì thành khói phủ mặt thùng.
      */}
      {thung.map((t) => (
        <g key={`h-${t.id}`}>
          <Hoi x={t.x - 7} y={t.dinh - 30} cao={66} />
          <Hoi x={t.x + 6} y={t.dinh - 30} cao={52} />
        </g>
      ))}

      {/*
        Đường ống nối ba thùng. Đây là thứ biến ba cái thùng rời rạc thành một
        dây chuyền — không có nó thì hình chỉ là ba hình trụ đứng cạnh nhau.
      */}
      <path
        d="M168 214 H592"
        stroke="#4a3311"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M168 214 H592"
        stroke="#c39443"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Van trên đường ống */}
      {[274, 486].map((x) => (
        <g key={x}>
          <rect
            x={x - 10}
            y={204}
            width="20"
            height="20"
            rx="3"
            fill="#a97c2e"
            stroke={NET}
            strokeWidth="2"
          />
          <line
            x1={x}
            y1={198}
            x2={x}
            y2={230}
            stroke={NET}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Ba thùng: hai bên trước, thùng giữa vẽ sau nên nằm trên */}
      {[thung[0], thung[2], thung[1]].map((t) => (
        <Thung key={t.id} {...t} mau={mau} />
      ))}

      {/* Đồng hồ áp suất gắn trên thân thùng giữa */}
      <g>
        <circle cx={380} cy={176} r="27" fill={NEN_THUNG} stroke={NET} strokeWidth="3" />
        <circle cx={380} cy={176} r="20" fill="none" stroke="#c39443" strokeWidth="1.5" opacity="0.7" />
        {/* Vạch chia quanh mặt đồng hồ */}
        {[-2.2, -1.6, -1.0, -0.4, 0.2].map((g) => (
          <line
            key={g}
            x1={380 + Math.cos(g) * 15}
            y1={176 + Math.sin(g) * 15}
            x2={380 + Math.cos(g) * 19}
            y2={176 + Math.sin(g) * 19}
            stroke="#c39443"
            strokeWidth="2"
          />
        ))}
        {/* Kim chỉ lệch phải, như đang chạy */}
        <line
          x1={380}
          y1={176}
          x2={394}
          y2={164}
          stroke={mau.bot}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={380} cy={176} r="3.5" fill={NET} />
      </g>

      {/* Bệ xưởng — mặt bệ ngay dưới van tháo của ba thùng */}
      <rect x="66" y="448" width="628" height="16" rx="4" fill="url(#xb-be)" />
      <rect x="66" y="448" width="628" height="3" rx="1.5" fill={NET} opacity="0.55" />

      {/*
        Hai thùng gỗ nhỏ dưới chân — nhắc tới phần bia đã đóng, tức phần mà kho
        bắt đầu đếm. Đó cũng là việc của cả cái app này.
      */}
      {[92, 668].map((x) => (
        <g key={x}>
          <path
            d={`M${x - 25} 402 q4 -9 25 -9 q21 0 25 9 v37 q-4 9 -25 9 q-21 0 -25 -9 z`}
            fill="#6d4d18"
            stroke={NET}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1={x - 24} y1={412} x2={x + 24} y2={412} stroke={NET} strokeWidth="1.5" opacity="0.6" />
          <line x1={x - 24} y1={429} x2={x + 24} y2={429} stroke={NET} strokeWidth="1.5" opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}
